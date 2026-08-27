import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { queueEmail } from '@/lib/email'
import { formatLongDateFr } from '@/lib/date'
import crypto from 'crypto'

const reserverSchema = z.object({
  creneauId: z.string().min(1, 'Le créneau est requis'),
  candidatId: z.string().optional().nullable(),
  nomEnfant: z.string().min(1, "Le nom de l'enfant est requis"),
  prenomEnfant: z.string().min(1, "Le prénom de l'enfant est requis"),
  dateNaissance: z.string().optional().nullable(),
  age: z.number().int().optional().nullable(),
  nomParent: z.string().optional().nullable(),
  emailParent: z.string().min(1, "L'adresse email est requise").email('Adresse email invalide'),
  telephoneParent: z.string().min(1, "Le numéro de téléphone est requis"),
  niveauEstime: z.string().optional().nullable(),
  remarques: z.string().max(1000).optional().nullable(),
  code: z.string().optional().nullable(),
})

function formatCalendarDateTime(date: Date, timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(date)
  const y = d.getFullYear()
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(h).padStart(2, '0')
  const min = String(m).padStart(2, '0')
  return `${y}${mon}${day}T${hour}${min}00`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = reserverSchema.parse(body)

    // Vérification des paramètres globaux de réservation
    const settings = await prisma.settings.findFirst({
      select: {
        afficherBoutonTest: true,
        codeAccesTestsNage: true,
      },
    })

    const isGlobalOpen = settings?.afficherBoutonTest !== false
    const requiredCode = settings?.codeAccesTestsNage?.trim() || null
    const providedCode = (validated.code || request.headers.get('x-tests-code') || '').trim()

    // 1. Si les réservations sont fermées globalement
    if (!isGlobalOpen) {
      if (!requiredCode || providedCode !== requiredCode) {
        return NextResponse.json(
          { error: 'Les réservations de tests de niveau sont actuellement fermées.' },
          { status: 403 }
        )
      }
    }

    // 2. Si un mot de passe / code d'accès est requis
    if (requiredCode) {
      if (providedCode !== requiredCode) {
        return NextResponse.json(
          { error: 'Mot de passe ou code d’accès incorrect pour valider la réservation.' },
          { status: 403 }
        )
      }
    }

    // Token unique pour l'inscription et le téléchargement iCal
    const token = crypto.randomBytes(16).toString('hex')

    // Transaction atomique pour éviter toute sur-réservation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Récupérer le créneau et verrouiller la session
      const creneau = await tx.creneauTestNage.findUnique({
        where: { id: validated.creneauId },
        include: {
          session: true,
          inscriptions: {
            where: { statut: { not: 'annule' } },
          },
        },
      })

      if (!creneau || !creneau.actif || !creneau.session.actif) {
        throw new Error('Ce créneau n\'est plus disponible.')
      }

      // 2. Vérifier la capacité maximale
      if (creneau.inscriptions.length >= creneau.capacite) {
        throw new Error(`Ce créneau de ${creneau.session.dureeMinutes} minutes est désormais complet. Veuillez sélectionner un autre horaire.`)
      }

      // 2bis. CONTRÔLE ANTI-DOUBLON STRICT : Un enfant ne peut pas avoir plus d'un créneau actif
      const nomClean = validated.nomEnfant.trim()
      const prenomClean = validated.prenomEnfant.trim()

      const existingInscription = await tx.inscriptionTestNage.findFirst({
        where: {
          statut: { not: 'annule' },
          OR: [
            ...(validated.candidatId ? [{ candidatId: validated.candidatId }] : []),
            {
              nomEnfant: { equals: nomClean, mode: 'insensitive' },
              prenomEnfant: { equals: prenomClean, mode: 'insensitive' },
            },
          ],
        },
        include: {
          creneau: {
            include: {
              session: true,
            },
          },
        },
      })

      if (existingInscription) {
        const dateFr = formatLongDateFr(existingInscription.creneau.session.date)
        throw new Error(
          `L'enfant ${existingInscription.prenomEnfant} ${existingInscription.nomEnfant} a déjà une réservation confirmée pour le ${dateFr} à ${existingInscription.creneau.heureDebut}. Un enfant ne peut pas réserver un deuxième créneau.`
        )
      }

      // 3. Réconciliation ou détection d'un candidat "hors listing"
      let finalCandidatId = validated.candidatId || null
      let isHorsListing = false

      if (finalCandidatId) {
        const existingCandidat = await tx.candidatTestNage.findUnique({
          where: { id: finalCandidatId },
        })
        if (existingCandidat) {
          isHorsListing = existingCandidat.statut === 'hors_listing'
          await tx.candidatTestNage.update({
            where: { id: finalCandidatId },
            data: {
              statut: isHorsListing ? 'hors_listing' : 'planifie',
              emailParent: validated.emailParent.trim().toLowerCase(),
              telephoneParent: validated.telephoneParent.trim(),
              nomParent: validated.nomParent ? validated.nomParent.trim() : undefined,
            },
          })
        }
      } else {
        // Le parent n'a pas sélectionné un candidat dans la liste déroulante
        // Vérifier si le nom et prénom correspondent quand même à un candidat pré-enregistré
        const matchedCandidat = await tx.candidatTestNage.findFirst({
          where: {
            nom: { equals: nomClean, mode: 'insensitive' },
            prenom: { equals: prenomClean, mode: 'insensitive' },
          },
        })

        if (matchedCandidat) {
          finalCandidatId = matchedCandidat.id
          isHorsListing = matchedCandidat.statut === 'hors_listing'
          await tx.candidatTestNage.update({
            where: { id: matchedCandidat.id },
            data: {
              statut: isHorsListing ? 'hors_listing' : 'planifie',
              emailParent: validated.emailParent.trim().toLowerCase(),
              telephoneParent: validated.telephoneParent.trim(),
              nomParent: validated.nomParent ? validated.nomParent.trim() : undefined,
            },
          })
        } else {
          // L'enfant n'est pas dans le listing : on crée une fiche candidat avec le statut "hors_listing"
          isHorsListing = true
          const createdHorsListing = await tx.candidatTestNage.create({
            data: {
              sessionId: creneau.sessionId,
              nom: nomClean.toUpperCase(),
              prenom: prenomClean,
              dateNaissance: validated.dateNaissance ? new Date(validated.dateNaissance) : null,
              age: validated.age || null,
              nomParent: validated.nomParent ? validated.nomParent.trim() : null,
              emailParent: validated.emailParent.trim().toLowerCase(),
              telephoneParent: validated.telephoneParent.trim(),
              statut: 'hors_listing',
              commentaireCoach: '⚠️ HORS LISTING (Non présent dans l\'import initial)',
            },
          })
          finalCandidatId = createdHorsListing.id
        }
      }

      // 4. Créer l'inscription liée
      const inscription = await tx.inscriptionTestNage.create({
        data: {
          creneauId: validated.creneauId,
          candidatId: finalCandidatId,
          nomEnfant: validated.nomEnfant.trim().toUpperCase(),
          prenomEnfant: validated.prenomEnfant.trim(),
          dateNaissance: validated.dateNaissance ? new Date(validated.dateNaissance) : null,
          age: validated.age || null,
          nomParent: validated.nomParent ? validated.nomParent.trim() : null,
          emailParent: validated.emailParent.trim().toLowerCase(),
          telephoneParent: validated.telephoneParent.trim(),
          niveauEstime: validated.niveauEstime || null,
          remarques: validated.remarques || null,
          statut: isHorsListing ? 'hors_listing' : 'inscrit',
          token,
        },
      })

      return {
        inscription,
        creneau,
        session: creneau.session,
      }
    })

    // Envoi de l'email de confirmation aux parents avec ajout à l'agenda
    try {
      const dateFormatted = formatLongDateFr(result.session.date)
      const dtStart = formatCalendarDateTime(result.session.date, result.creneau.heureDebut)
      const dtEnd = formatCalendarDateTime(result.session.date, result.creneau.heureFin)

      const eventTitle = `Test de Nage - ${result.inscription.prenomEnfant} ${result.inscription.nomEnfant}`
      const eventDesc = `Test individuel de niveau de natation (${result.session.dureeMinutes} min).\nLieu : ${result.session.lieu}\nConsignes : Merci de vous présenter dans le hall d'entrée 5 minutes avant l'heure de votre créneau avec maillot de bain, bonnet et lunettes.`

      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${dtStart}/${dtEnd}&ctz=Europe/Paris&details=${encodeURIComponent(eventDesc)}&location=${encodeURIComponent(result.session.lieu)}`
      
      const outlookStart = `${dtStart.substring(0, 4)}-${dtStart.substring(4, 6)}-${dtStart.substring(6, 8)}T${dtStart.substring(9, 11)}:${dtStart.substring(11, 13)}:00`
      const outlookEnd = `${dtEnd.substring(0, 4)}-${dtEnd.substring(4, 6)}-${dtEnd.substring(6, 8)}T${dtEnd.substring(9, 11)}:${dtEnd.substring(11, 13)}:00`
      const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(eventTitle)}&startdt=${outlookStart}&enddt=${outlookEnd}&body=${encodeURIComponent(eventDesc)}&location=${encodeURIComponent(result.session.lieu)}`

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://triton-cavaillon.fr'
      const icsDownloadUrl = `${baseUrl}/api/tests-nage/ics?token=${token}`

      const icsAttachment = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Triton Club Cavaillon//Tests de Nage//FR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:test-nage-${result.inscription.id}@triton-cavaillon.fr`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART;TZID=Europe/Paris:${dtStart}`,
        `DTEND;TZID=Europe/Paris:${dtEnd}`,
        `SUMMARY:${eventTitle}`,
        `DESCRIPTION:${eventDesc.replace(/\n/g, '\\n')}`,
        `LOCATION:${result.session.lieu}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT30M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Rappel : Test de Nage au Triton Club Cavaillon dans 30 minutes',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n')

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
          <div style="background-color: #15803d; color: #ffffff; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Confirmation de votre Test de Nage</h1>
            <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Triton Club Cavaillon</p>
          </div>
          <div style="background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <p>Bonjour${result.inscription.nomParent ? ' ' + result.inscription.nomParent : ''},</p>
            <p>Nous vous confirmons l'inscription de votre enfant <strong>${result.inscription.prenomEnfant} ${result.inscription.nomEnfant}</strong> au test de niveau de natation :</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #15803d; padding: 16px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 0 0 8px;">📅 <strong>Date :</strong> ${dateFormatted}</p>
              <p style="margin: 0 0 8px;">⏰ <strong>Créneau :</strong> ${result.creneau.heureDebut} à ${result.creneau.heureFin}</p>
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 10px 14px; border-radius: 6px; margin: 8px 0;">
                <p style="margin: 0 0 2px; font-size: 11px; font-weight: bold; color: #92400e; text-transform: uppercase;">📍 Lieu :</p>
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #78350f;">${result.session.lieu}</p>
              </div>
              <p style="margin: 8px 0 0;">ℹ️ <strong>Session :</strong> ${result.session.titre}</p>
            </div>

            <!-- ─── BOUTONS AJOUT À L'AGENDA ─── -->
            <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 13px; font-weight: bold; color: #1e293b;">
                📅 Ajouter ce test à votre calendrier :
              </p>
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 4px;">
                    <a href="${gcalUrl}" target="_blank" style="display: inline-block; background-color: #15803d; color: #ffffff; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: bold;">
                      + Google Agenda
                    </a>
                  </td>
                  <td style="padding: 4px;">
                    <a href="${outlookUrl}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: bold;">
                      + Outlook
                    </a>
                  </td>
                  <td style="padding: 4px;">
                    <a href="${icsDownloadUrl}" target="_blank" style="display: inline-block; background-color: #475569; color: #ffffff; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: bold;">
                      Apple / iCal (.ics)
                    </a>
                  </td>
                </tr>
              </table>
            </div>

            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 8px; color: #065f46; font-size: 14px;">🩱 Consignes importantes pour le test :</h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #047857;">
                <li>Merci de vous présenter <strong>5 minutes avant l'heure</strong> de votre créneau dans le hall d'entrée de la piscine.</li>
                <li>Prévoir impérativement : <strong>maillot de bain, bonnet de bain et lunettes de natation</strong>.</li>
                <li>Le test dure ${result.session.dureeMinutes} minutes avec un éducateur diplômé du club.</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${baseUrl}/tests-de-nage?token=${token}" style="display: inline-block; background-color: #f8fafc; color: #475569; border: 1px solid #cbd5e1; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-size: 13px; font-weight: bold;">
                🔄 Modifier ou annuler mon créneau
              </a>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              En cas d'empêchement ou pour toute question, vous pouvez contacter le club à l'adresse : <a href="mailto:tritoncavaillon@gmail.com" style="color: #15803d; font-weight: bold;">tritoncavaillon@gmail.com</a>.
            </p>
            <p style="font-size: 13px; color: #64748b; margin: 0;">À très bientôt au bord des bassins !<br><strong>L'équipe du Triton Club Cavaillon</strong></p>
          </div>
        </div>
      `

      await queueEmail({
        to: result.inscription.emailParent,
        subject: `Confirmation Test de Nage : ${result.inscription.prenomEnfant} ${result.inscription.nomEnfant} (${result.creneau.heureDebut})`,
        html: emailHtml,
        attachments: [
          {
            filename: `test-nage-${result.inscription.prenomEnfant.toLowerCase()}.ics`,
            content: icsAttachment,
            contentType: 'text/calendar; charset=utf-8',
          },
        ],
      })
    } catch (mailErr) {
      console.warn("Impossible d'envoyer l'email de confirmation du test de nage:", mailErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Inscription confirmée avec succès !',
      data: {
        id: result.inscription.id,
        nomEnfant: result.inscription.nomEnfant,
        prenomEnfant: result.inscription.prenomEnfant,
        date: result.session.date,
        heureDebut: result.creneau.heureDebut,
        heureFin: result.creneau.heureFin,
        lieu: result.session.lieu,
        consignes: result.session.consignes,
      },
    })
  } catch (error: any) {
    console.error('Erreur réservation test de nage:', error)

    if (error instanceof z.ZodError) {
      const fieldErrors = error.flatten().fieldErrors
      const firstErrorMessage = Object.values(fieldErrors).flat()[0] || 'Veuillez vérifier les informations saisies'
      return NextResponse.json(
        { error: firstErrorMessage, details: error.flatten() },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error?.message || "Une erreur est survenue lors de l'enregistrement de votre réservation." },
      { status: 400 }
    )
  }
}
