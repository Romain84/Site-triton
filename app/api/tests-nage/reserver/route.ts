import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { queueEmail } from '@/lib/email'
import { formatLongDateFr } from '@/lib/date'
import crypto from 'crypto'

const reserverSchema = z.object({
  creneauId: z.string().min(1, 'Le créneau est requis'),
  candidatId: z.string().optional().nullable(),
  nomEnfant: z.string().min(2, "Le nom de l'enfant doit comporter au moins 2 caractères"),
  prenomEnfant: z.string().min(2, "Le prénom de l'enfant doit comporter au moins 2 caractères"),
  dateNaissance: z.string().optional().nullable(),
  age: z.number().int().min(3).max(99).optional().nullable(),
  nomParent: z.string().optional().nullable(),
  emailParent: z.string().email('Adresse email invalide'),
  telephoneParent: z.string().min(6, 'Numéro de téléphone invalide'),
  niveauEstime: z.string().optional().nullable(),
  remarques: z.string().max(500).optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = reserverSchema.parse(body)

    // Token unique pour l'inscription
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

      // 2. Vérifier la capacité maximale (2 nageurs par défaut)
      if (creneau.inscriptions.length >= creneau.capacite) {
        throw new Error('Ce créneau de 5 minutes est désormais complet. Veuillez sélectionner un autre horaire.')
      }

      // 3. Créer l'inscription
      const inscription = await tx.inscriptionTestNage.create({
        data: {
          creneauId: validated.creneauId,
          candidatId: validated.candidatId || null,
          nomEnfant: validated.nomEnfant.trim().toUpperCase(),
          prenomEnfant: validated.prenomEnfant.trim(),
          dateNaissance: validated.dateNaissance ? new Date(validated.dateNaissance) : null,
          age: validated.age || null,
          nomParent: validated.nomParent ? validated.nomParent.trim() : null,
          emailParent: validated.emailParent.trim().toLowerCase(),
          telephoneParent: validated.telephoneParent.trim(),
          niveauEstime: validated.niveauEstime || null,
          remarques: validated.remarques || null,
          statut: 'inscrit',
          token,
        },
      })

      // 4. Si rattaché à un candidat pré-enregistré, mettre à jour son statut
      if (validated.candidatId) {
        await tx.candidatTestNage.update({
          where: { id: validated.candidatId },
          data: {
            statut: 'planifie',
            emailParent: validated.emailParent.trim().toLowerCase(),
            telephoneParent: validated.telephoneParent.trim(),
            nomParent: validated.nomParent || undefined,
          },
        })
      }

      return {
        inscription,
        creneau,
        session: creneau.session,
      }
    })

    // Envoi de l'email de confirmation aux parents (en tâche de fond sécurisée)
    try {
      const dateFormatted = formatLongDateFr(result.session.date)
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
              <p style="margin: 0 0 8px;">⏰ <strong>Créneau précis :</strong> ${result.creneau.heureDebut} à ${result.creneau.heureFin} (durée : 5 minutes)</p>
              <p style="margin: 0 0 8px;">📍 <strong>Lieu :</strong> ${result.session.lieu}</p>
              <p style="margin: 0;">ℹ️ <strong>Session :</strong> ${result.session.titre}</p>
            </div>

            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 8px; color: #065f46; font-size: 14px;">🩱 Consignes importantes pour le test :</h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #047857;">
                <li>Merci de vous présenter <strong>5 minutes avant l'heure</strong> de votre créneau au bord du bassin.</li>
                <li>Prévoir impérativement : <strong>maillot de bain, bonnet de bain et lunettes de natation</strong>.</li>
                <li>Le test dure 5 minutes avec un entraîneur diplômé du club pour orienter votre enfant vers le groupe le plus adapté.</li>
              </ul>
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
      return NextResponse.json(
        { error: 'Veuillez vérifier les informations saisies', details: error.flatten() },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error?.message || "Une erreur est survenue lors de l'enregistrement de votre réservation." },
      { status: 400 }
    )
  }
}
