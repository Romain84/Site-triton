import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { calculerFactureCoach } from '@/lib/facture-calculations'
import { genererNumeroFacture } from '@/lib/facture-utils'

const pdfLogger = logger.withContext('FacturePDFGenerator')

/**
 * Génère le fichier PDF définitif et professionnel d'une facture coach sous forme de Buffer.
 * Réutilise la mise en page premium avec barre de marque verte, tableaux stylisés, mentions légales et vacances.
 */
export async function genererFacturePDF(
  coachId: string,
  mois: number,
  annee: number
): Promise<{ buffer: Buffer; numero: string }> {
  // 1. Récupérer les informations du coach
  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
  })

  if (!coach) {
    throw new Error('Coach non trouvé')
  }

  // 2. Calculer les détails unifiés via le helper partagé
  const details = await calculerFactureCoach(coachId, mois, annee)

  // 3. Récupérer la facture ou générer un numéro si elle n'existe pas encore
  let facture = await prisma.factureCoach.findUnique({
    where: {
      coachId_mois_annee: {
        coachId,
        mois,
        annee,
      },
    },
  })

  let numero = facture?.numero
  if (!numero) {
    numero = genererNumeroFacture(coach.prenom, coach.nom, mois, annee, coachId)
  }

  // 4. Récupérer les vacances du mois
  const dateDebut = new Date(annee, mois - 1, 1)
  const dateFin = new Date(annee, mois, 0, 23, 59, 59)
  const vacances = await prisma.periodeVacances.findMany({
    where: {
      actif: true,
      OR: [
        { dateDebut: { gte: dateDebut, lte: dateFin } },
        { dateFin: { gte: dateDebut, lte: dateFin } },
        { AND: [{ dateDebut: { lte: dateDebut } }, { dateFin: { gte: dateFin } }] },
      ],
    },
    orderBy: {
      dateDebut: 'asc',
    },
  })

  // 5. Générer le PDF avec jsPDF
  const doc = new jsPDF()

  // Accent de marque - Barre verte en haut (4mm)
  doc.setFillColor(112, 193, 92) // #70c15c (Primary Club Green)
  doc.rect(0, 0, 210, 4, 'F')

  // En-tête principal "FACTURE" (Haut Gauche)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(15, 23, 42) // Slate 900
  doc.text('FACTURE', 20, 16)

  // Métadonnées Facture (Haut Droite)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105) // Slate 600
  doc.text('RÉFÉRENCE :', 140, 12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(numero, 140, 16)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text("DATE D'ÉMISSION :", 140, 23)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(new Date().toLocaleDateString('fr-FR'), 140, 27)

  // Ligne séparatrice horizontale sous l'en-tête
  doc.setDrawColor(226, 232, 240) // Slate 200
  doc.setLineWidth(0.5)
  doc.line(20, 32, 190, 32)

  // Colonnes d'informations (Émetteur & Destinataire)
  // --- ÉMETTEUR (COACH) ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(112, 193, 92) // Vert Triton
  doc.text('ÉMETTEUR (PRESTATAIRE)', 20, 38)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(`${coach.prenom} ${coach.nom || ''}`.toUpperCase(), 20, 43)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)
  
  let coachY = 48
  if (coach.adresse) {
    doc.text(`Adresse : ${coach.adresse}`, 20, coachY)
    coachY += 5
  }
  
  const contactParts = []
  if (coach.telephone) contactParts.push(`Tél : ${coach.telephone}`)
  if (coach.email) contactParts.push(`Email : ${coach.email}`)
  if (contactParts.length > 0) {
    doc.text(contactParts.join('  •  '), 20, coachY)
    coachY += 5
  }
  if (coach.siret) {
    doc.text(`SIRET : ${coach.siret}`, 20, coachY)
  }

  // --- DESTINATAIRE (CLUB) ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(112, 193, 92) // Vert Triton
  doc.text('DESTINATAIRE', 120, 38)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text('TRITON CLUB CAVAILLON', 120, 43)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)
  doc.text('Piscine couverte Alphonse Roudière', 120, 48)
  doc.text('Avenue Jean Moulin, quartier La Clède', 120, 53)
  doc.text('84300 Cavaillon', 120, 58)
  doc.text('Email : tritoncavaillon@gmail.com', 120, 63)

  // Ligne séparatrice horizontale avant la période
  const sepY = Math.max(coachY, 63) + 4
  doc.line(20, sepY, 190, sepY)

  // Période de facturation
  const periodY = sepY + 6
  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text('PÉRIODE DE FACTURATION :', 20, periodY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(`${moisNoms[mois - 1].toUpperCase()} ${annee}`, 20, periodY + 5)

  // Préparer les données du tableau
  const tableData: any[] = []

  // Planning fixe
  if (details.lignesPlanningFixe.length > 0) {
    tableData.push([{ content: 'PLANNING FIXE', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [22, 101, 52] } }])
    for (const ligne of details.lignesPlanningFixe) {
      tableData.push([
        ligne.description,
        `${ligne.heures.toFixed(2)} h`,
        `${ligne.montant.toFixed(2)} €`
      ])
    }
  }

  // Planning tournant
  if (details.lignesPlanningTournant.length > 0) {
    tableData.push([{ content: 'PLANNING TOURNANT', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [22, 101, 52] } }])
    for (const ligne of details.lignesPlanningTournant) {
      tableData.push([
        ligne.description,
        `${ligne.heures.toFixed(2)} h`,
        `${ligne.montant.toFixed(2)} €`
      ])
    }
  }

  // Remplacements effectués
  if (details.lignesRemplacements.length > 0) {
    tableData.push([{ content: 'REMPLACEMENTS EFFECTUÉS', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 64, 175] } }])
    for (const ligne of details.lignesRemplacements) {
      tableData.push([
        ligne.description,
        `+${ligne.heures.toFixed(2)} h`,
        `+${ligne.montant.toFixed(2)} €`
      ])
    }
  }

  // Absences
  if (details.lignesAbsences.length > 0) {
    tableData.push([{ content: 'ABSENCES DÉDUITES', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [254, 242, 242], textColor: [153, 27, 27] } }])
    for (const ligne of details.lignesAbsences) {
      tableData.push([
        ligne.description,
        `-${ligne.heures.toFixed(2)} h`,
        `-${ligne.montant.toFixed(2)} €`
      ])
    }
  }

  // Lignes manuelles
  if (details.lignesManuelles.length > 0) {
    tableData.push([{ content: 'AJOUTS & DÉDUCTIONS MANUELS', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [254, 243, 199], textColor: [146, 64, 14] } }])
    for (const ligne of details.lignesManuelles) {
      let heuresText: string
      let montantText: string

      if (ligne.type === 'competition' || ligne.type === 'forfait_regional') {
        heuresText = `${ligne.heures} demi-j.`
        montantText = `${ligne.montant.toFixed(2)} €`
      } else if (ligne.type === 'absence') {
        heuresText = `-${Math.abs(ligne.heures || 0).toFixed(2)} h`
        montantText = `-${Math.abs(ligne.montant).toFixed(2)} €`
      } else {
        heuresText = `${(ligne.heures || 0).toFixed(2)} h`
        montantText = `${ligne.montant.toFixed(2)} €`
      }

      tableData.push([
        ligne.description,
        heuresText,
        montantText
      ])
    }
  }

  // Créer le tableau
  autoTable(doc, {
    startY: periodY + 10,
    head: [['DÉSIGNATION', 'UNITÉS / QUANTITÉ', 'MONTANT']],
    body: tableData,
    theme: 'striped',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      lineColor: [241, 245, 249],
      textColor: [51, 65, 85]
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 35, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  })

  // Synthèse et totaux
  let currentY = (doc as any).lastAutoTable.finalY || (periodY + 10)

  const rightAlignX = 190
  const totalBoxWidth = 80
  const totalBoxStartX = rightAlignX - totalBoxWidth
  const totalBoxHeight = 18

  // Box Totaux
  doc.setFillColor(248, 250, 252)
  doc.rect(totalBoxStartX, currentY + 6, totalBoxWidth, totalBoxHeight, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(totalBoxStartX, currentY + 6, totalBoxWidth, totalBoxHeight, 'S')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text('TOTAL HEURES :', totalBoxStartX + 4, currentY + 11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`${details.totalHeures.toFixed(2)} h`, rightAlignX - 4, currentY + 11, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(112, 193, 92) // Vert Club
  doc.text('NET À PAYER :', totalBoxStartX + 4, currentY + 20)
  doc.setFontSize(11)
  doc.text(`${details.totalMontant.toFixed(2)} €`, rightAlignX - 4, currentY + 20, { align: 'right' })

  // Conditions
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text('CONDITIONS & PARAMÈTRES', 20, currentY + 10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(`• Taux horaire de base : ${details.tauxHoraire.toFixed(2)} €/h`, 20, currentY + 15)
  doc.text(`• Forfait compétition : ${details.forfaitDemiJournee.toFixed(2)} € / demi-journée`, 20, currentY + 19)
  doc.text(`• T.V.A. non applicable, art. 293 B du CGI`, 20, currentY + 23)

  currentY += 30

  // Vacances
  if (vacances.length > 0) {
    if (currentY > 260) {
      currentY = 255
    }

    const vacanceInlineStr = vacances
      .map((v) => {
        const debut = new Date(v.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        const fin = new Date(v.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        return `${v.nom} (${debut} au ${fin})`
      })
      .join('   •   ')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(15, 23, 42)
    doc.text('PÉRIODES DE VACANCES / FERMETURES (IMPACTANT LE PLANNING) :', 20, currentY)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text(vacanceInlineStr, 20, currentY + 4)
  }

  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text("Facture générée automatiquement via l'Espace Coach du Triton Club Cavaillon", 105, 288, { align: 'center' })

  // Convertir le PDF en buffer
  const arrayBuffer = doc.output('arraybuffer')
  const buffer = Buffer.from(arrayBuffer)

  return {
    buffer,
    numero,
  }
}
