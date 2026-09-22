import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { genererDevisPDF } from '@/lib/pdf/devis-pdf-generator'
import { queueEmail } from '@/lib/email/queue'
import { sanitizeEmailHeader } from '@/lib/email/service'

const adminLogger = logger.withContext('AdminDevis')

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const devis = await prisma.devis.findUnique({
      where: { id },
      include: {
        lignes: {
          orderBy: { ordre: 'asc' },
        },
      },
    })

    if (!devis) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    if (!devis.clientEmail) {
      return NextResponse.json({ error: 'Le devis n\'a pas d\'adresse e-mail client enregistrée' }, { status: 400 })
    }

    const settings = await prisma.settings.findFirst()
    const emailClub = settings?.emailClub || 'tritoncavaillon@gmail.com'

    // Générer le PDF
    const pdfBuffer = genererDevisPDF({
      numero: devis.numero,
      titre: devis.titre,
      clientNom: devis.clientNom,
      clientEmail: devis.clientEmail,
      clientTelephone: devis.clientTelephone,
      clientAdresse: devis.clientAdresse,
      dateEmission: devis.dateEmission,
      dateValidite: devis.dateValidite,
      totalHT: devis.totalHT,
      totalTVA: devis.totalTVA,
      totalTTC: devis.totalTTC,
      notes: devis.notes,
      lignes: devis.lignes.map(l => ({
        description: l.description,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        total: l.total,
      })),
    })

    const dateValiditeStr = new Date(devis.dateValidite).toLocaleDateString('fr-FR')

    // Envoyer au client
    await queueEmail({
      to: sanitizeEmailHeader(devis.clientEmail),
      replyTo: sanitizeEmailHeader(emailClub),
      subject: sanitizeEmailHeader(`[Triton Club Cavaillon] Votre devis N° ${devis.numero} - ${devis.titre}`),
      text: `Bonjour ${devis.clientNom},\n\nVeuillez trouver ci-joint le devis N° ${devis.numero} concernant "${devis.titre}" d'un montant de ${devis.totalTTC.toFixed(2)} €.\nCe devis est valable jusqu'au ${dateValiditeStr}.\n\nPour toute question ou validation, n'hésitez pas à nous contacter.\n\nCordialement,\nTriton Club Cavaillon`,
      html: `
        <p>Bonjour <strong>${devis.clientNom}</strong>,</p>
        <p>Veuillez trouver ci-joint votre devis <strong>N° ${devis.numero}</strong> concernant :</p>
        <p style="font-size: 16px; font-weight: bold; color: #166534;">${devis.titre}</p>
        <p>Montant total : <strong>${devis.totalTTC.toFixed(2)} €</strong> (TVA non applicable, art. 293 B du CGI)</p>
        <p>Ce devis est valable jusqu'au : <strong>${dateValiditeStr}</strong>.</p>
        <p>Pour le valider, merci de nous retourner un exemplaire signé avec la mention manuscrite <em>« Bon pour accord et acceptation du devis »</em>.</p>
        <p>Le règlement peut être effectué par <strong>virement bancaire</strong> (nos coordonnées bancaires RIB Crédit Mutuel sont apposées sur le devis) ou par chèque à l&apos;ordre du <em>Triton Club Cavaillon</em>.</p>
        <br>
        <p>Bien cordialement,<br><strong>Triton Club Cavaillon</strong><br>Piscine Alphonse Roudière, 84300 Cavaillon</p>
      `,
      attachments: [
        {
          filename: `devis-${devis.numero}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    // Mettre à jour le statut en 'envoye'
    const updated = await prisma.devis.update({
      where: { id },
      data: { statut: 'envoye' },
    })

    return NextResponse.json({
      success: true,
      message: `Devis ${devis.numero} envoyé par e-mail à ${devis.clientEmail} avec succès`,
      devis: updated,
    })
  } catch (error) {
    adminLogger.error('Erreur lors de l\'envoi du devis par e-mail', error)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi de l\'email' }, { status: 500 })
  }
}
