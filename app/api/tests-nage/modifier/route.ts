import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { queueEmail } from '@/lib/email'
import { formatLongDateFr } from '@/lib/date'

export const dynamic = 'force-dynamic'

const modifierSchema = z.object({
  token: z.string().min(8, 'Token invalide'),
  newCreneauId: z.string().min(1, 'Nouveau créneau requis'),
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
    const { token, newCreneauId } = modifierSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      // 1. Récupérer l'inscription existante
      const inscription = await tx.inscriptionTestNage.findUnique({
        where: { token },
        include: {
          creneau: {
            include: {
              session: true,
            },
          },
        },
      })

      if (!inscription) {
        throw new Error('Réservation introuvable.')
      }

      if (inscription.statut === 'annule') {
        throw new Error('Cette réservation a été annulée. Veuillez effectuer une nouvelle réservation.')
      }

      if (inscription.creneauId === newCreneauId) {
        throw new Error('Vous êtes déjà inscrit sur ce créneau.')
      }

      // 2. Vérifier la capacité du nouveau créneau
      const newCreneau = await tx.creneauTestNage.findUnique({
        where: { id: newCreneauId },
        include: {
          session: true,
          inscriptions: {
            where: { statut: { not: 'annule' } },
          },
        },
      })

      if (!newCreneau || !newCreneau.actif || !newCreneau.session.actif) {
        throw new Error("Le nouveau créneau n'est plus disponible.")
      }

      if (newCreneau.inscriptions.length >= newCreneau.capacite) {
        throw new Error(`Ce créneau de ${newCreneau.session.dureeMinutes} minutes est complet. Veuillez en choisir un autre.`)
      }

      // 3. Mettre à jour le créneau de l'inscription
      const updatedInscription = await tx.inscriptionTestNage.update({
        where: { id: inscription.id },
        data: {
          creneauId: newCreneauId,
          statut: 'inscrit',
        },
      })

      return {
        inscription: updatedInscription,
        oldCreneau: inscription.creneau,
        newCreneau,
        session: newCreneau.session,
      }
    })

    // Envoi de l'email de mise à jour avec le nouveau créneau et les nouveaux liens d'agenda
    try {
      const dateFormatted = formatLongDateFr(result.session.date)
      const dtStart = formatCalendarDateTime(result.session.date, result.newCreneau.heureDebut)
      const dtEnd = formatCalendarDateTime(result.session.date, result.newCreneau.heureFin)

      const eventTitle = `Test de Nage - ${result.inscription.prenomEnfant} ${result.inscription.nomEnfant}`
      const eventDesc = `Test individuel de niveau de natation (${result.session.dureeMinutes} min).\nLieu : ${result.session.lieu}\nConsignes : Rendez-vous dans le hall d'entrée 5 minutes avant l'heure de votre créneau.`

      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${dtStart}/${dtEnd}&ctz=Europe/Paris&details=${encodeURIComponent(eventDesc)}&location=${encodeURIComponent(result.session.lieu)}`
      
      const outlookStart = `${dtStart.substring(0, 4)}-${dtStart.substring(4, 6)}-${dtStart.substring(6, 8)}T${dtStart.substring(9, 11)}:${dtStart.substring(11, 13)}:00`
      const outlookEnd = `${dtEnd.substring(0, 4)}-${dtEnd.substring(4, 6)}-${dtEnd.substring(6, 8)}T${dtEnd.substring(9, 11)}:${dtEnd.substring(11, 13)}:00`
      const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(eventTitle)}&startdt=${outlookStart}&enddt=${outlookEnd}&body=${encodeURIComponent(eventDesc)}&location=${encodeURIComponent(result.session.lieu)}`

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://triton-cavaillon.fr'
      const icsDownloadUrl = `${baseUrl}/api/tests-nage/ics?token=${token}`
      const manageUrl = `${baseUrl}/tests-de-nage?token=${token}`

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
          <div style="background-color: #0284c7; color: #ffffff; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Modification de votre Test de Nage</h1>
            <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Triton Club Cavaillon</p>
          </div>
          <div style="background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <p>Bonjour${result.inscription.nomParent ? ' ' + result.inscription.nomParent : ''},</p>
            <p>Le créneau de test de niveau pour votre enfant <strong>${result.inscription.prenomEnfant} ${result.inscription.nomEnfant}</strong> a bien été modifié :</p>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 16px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 0 0 8px;">📅 <strong>Date :</strong> ${dateFormatted}</p>
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 10px 14px; border-radius: 6px; margin: 8px 0;">
                <p style="margin: 0 0 2px; font-size: 11px; font-weight: bold; color: #92400e; text-transform: uppercase;">📍 Lieu exact (Attention selon la période) :</p>
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #78350f;">${result.session.lieu}</p>
              </div>
              <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">(Ancien créneau : ${result.oldCreneau.heureDebut} - ${result.oldCreneau.heureFin})</p>
            </div>

            <!-- ─── BOUTONS AJOUT À L'AGENDA ─── -->
            <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 13px; font-weight: bold; color: #1e293b;">
                📅 Mettre à jour votre calendrier :
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
              <h3 style="margin: 0 0 8px; color: #065f46; font-size: 14px;">🩱 Consignes :</h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #047857;">
                <li>Merci de vous présenter <strong>5 minutes avant l'heure</strong> de votre créneau dans le hall d'entrée de la piscine.</li>
                <li>Prévoir impérativement : <strong>maillot de bain, bonnet de bain et lunettes de natation</strong>.</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${manageUrl}" style="display: inline-block; background-color: #e2e8f0; color: #1e293b; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: bold;">
                Gérer à nouveau mon rendez-vous
              </a>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              Pour toute question, contactez-nous à <a href="mailto:tritoncavaillon@gmail.com" style="color: #0284c7; font-weight: bold;">tritoncavaillon@gmail.com</a>.
            </p>
            <p style="font-size: 13px; color: #64748b; margin: 0;">À bientôt !<br><strong>L'équipe du Triton Club Cavaillon</strong></p>
          </div>
        </div>
      `

      await queueEmail({
        to: result.inscription.emailParent,
        subject: `Modification Test de Nage : ${result.inscription.prenomEnfant} ${result.inscription.nomEnfant} (${result.newCreneau.heureDebut})`,
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
      console.warn('Erreur envoi email modification test:', mailErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Votre créneau a bien été modifié !',
      data: {
        id: result.inscription.id,
        heureDebut: result.newCreneau.heureDebut,
        heureFin: result.newCreneau.heureFin,
        date: result.session.date,
        lieu: result.session.lieu,
      },
    })
  } catch (error: any) {
    console.error('Erreur modification test de nage:', error)
    return NextResponse.json(
      { error: error?.message || 'Une erreur est survenue lors de la modification de votre créneau.' },
      { status: 400 }
    )
  }
}
