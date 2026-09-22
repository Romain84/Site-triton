import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface LigneDevisItem {
  description: string
  quantite: number
  prixUnitaire: number
  total: number
}

export interface DevisPDFData {
  numero: string
  titre: string
  clientNom: string
  clientEmail?: string | null
  clientTelephone?: string | null
  clientAdresse?: string | null
  dateEmission: Date | string
  dateValidite: Date | string
  totalHT: number
  totalTVA: number
  totalTTC: number
  notes?: string | null
  lignes: LigneDevisItem[]
}

/**
 * Génère le buffer PDF d'un devis officiel aux couleurs et normes du Triton Club Cavaillon.
 */
export function genererDevisPDF(data: DevisPDFData): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 210
  const marginX = 16
  const contentWidth = pageWidth - 2 * marginX
  let currentY = 0

  // 1. Bandeau supérieur vert club
  doc.setFillColor(112, 193, 92) // #70c15c (Vert Triton)
  doc.rect(0, 0, pageWidth, 5, 'F')
  currentY = 16

  // 2. En-tête : Informations du Club (Gauche) & Titre Devis (Droite)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(15, 23, 42) // Slate 900
  doc.text('TRITON CLUB CAVAILLONNAIS', marginX, currentY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139) // Slate 500
  doc.text('Association sportive Loi 1901 (Triton Club Cavaillon) · Affiliée FFN', marginX, currentY + 4.5)
  doc.text('Piscine Alphonse Roudière · Avenue Jean Moulin, Quartier La Clède · 84300 Cavaillon', marginX, currentY + 8.5)
  doc.text('SIRET : 448 666 065 00017 · SIREN : 448 666 065 · RNA : W841000669 · APE : 93.12Z', marginX, currentY + 12.5)
  doc.text('Email : tritoncavaillon@gmail.com · Site web : https://tritoncavaillon.fr', marginX, currentY + 16.5)

  // Bloc DEVIS à droite
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(112, 193, 92) // Vert Club
  doc.text('DEVIS', pageWidth - marginX, currentY + 2, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(`N° ${data.numero}`, pageWidth - marginX, currentY + 8, { align: 'right' })

  const dateEmissionStr = new Date(data.dateEmission).toLocaleDateString('fr-FR')
  const dateValiditeStr = new Date(data.dateValidite).toLocaleDateString('fr-FR')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text(`Date : ${dateEmissionStr}`, pageWidth - marginX, currentY + 13.5, { align: 'right' })
  doc.text(`Valable jusqu'au : ${dateValiditeStr}`, pageWidth - marginX, currentY + 18, { align: 'right' })

  currentY += 28

  // Ligne de séparation élégante
  doc.setLineWidth(0.4)
  doc.setDrawColor(226, 232, 240) // Slate 200
  doc.line(marginX, currentY, marginX + contentWidth, currentY)
  currentY += 6

  // 3. Cadre Destinataire / Client (fond gris très doux)
  doc.setFillColor(248, 250, 252) // Slate 50
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(marginX, currentY, contentWidth, 24, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(112, 193, 92)
  doc.text('DESTINATAIRE / CLIENT :', marginX + 4, currentY + 5.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(data.clientNom, marginX + 4, currentY + 11.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105) // Slate 600
  const clientDetails = []
  if (data.clientEmail) clientDetails.push(`Email : ${data.clientEmail}`)
  if (data.clientTelephone) clientDetails.push(`Tél : ${data.clientTelephone}`)
  if (data.clientAdresse) clientDetails.push(`Adresse : ${data.clientAdresse}`)
  
  if (clientDetails.length > 0) {
    doc.text(clientDetails.join('   |   '), marginX + 4, currentY + 18)
  }

  currentY += 30

  // 4. Objet / Intitulé du devis
  if (data.titre) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(`Objet : ${data.titre}`, marginX, currentY)
    currentY += 6
  }

  // 5. Tableau des prestations via autoTable
  const tableRows = data.lignes.map((ligne, idx) => [
    (idx + 1).toString(),
    ligne.description,
    ligne.quantite.toString(),
    `${ligne.prixUnitaire.toFixed(2)} €`,
    `${ligne.total.toFixed(2)} €`,
  ])

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [['#', 'Désignation / Prestation', 'Qté', 'Prix Unit. (€)', 'Total Net (€)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85], // Slate 700
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' }, // Prestation
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  currentY = doc.lastAutoTable.finalY + 8

  // 6. Cadre Récapitulatif Total & TVA (à droite)
  const totalBoxWidth = 80
  const totalBoxX = pageWidth - marginX - totalBoxWidth
  const totalBoxHeight = 24

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(totalBoxX, currentY, totalBoxWidth, totalBoxHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Total HT :', totalBoxX + 4, currentY + 6)
  doc.text(`${data.totalHT.toFixed(2)} €`, pageWidth - marginX - 4, currentY + 6, { align: 'right' })

  doc.text('TVA (exonérée - art. 293 B CGI) :', totalBoxX + 4, currentY + 12)
  doc.text('0.00 €', pageWidth - marginX - 4, currentY + 12, { align: 'right' })

  // Total TTC mis en avant
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(112, 193, 92) // Vert Club
  doc.text('TOTAL NET À PAYER :', totalBoxX + 4, currentY + 19)
  doc.text(`${data.totalTTC.toFixed(2)} €`, pageWidth - marginX - 4, currentY + 19, { align: 'right' })

  // Bloc mentions & informations à gauche (largeur max = 90 mm pour ne jamais déborder sur le cadre total)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text(
    'TVA non applicable, art. 293 B du Code Général des Impôts (statut associatif).',
    marginX,
    currentY + 6,
    { maxWidth: 90 }
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(
    'Règlement par virement bancaire ou chèque à l\'ordre du Triton Club Cavaillon.',
    marginX,
    currentY + 14,
    { maxWidth: 90 }
  )

  currentY += totalBoxHeight + 6

  // Si notes / conditions particulières, les afficher proprement sous le cadre
  if (data.notes) {
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    const notesText = `Conditions : ${data.notes}`
    const splitNotes = doc.splitTextToSize(notesText, contentWidth - 8)
    const notesBoxHeight = Math.max(10, splitNotes.length * 4 + 5)

    doc.roundedRect(marginX, currentY, contentWidth, notesBoxHeight, 2, 2, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text(splitNotes, marginX + 4, currentY + 5)

    currentY += notesBoxHeight + 6
  } else {
    currentY += 4
  }

  // 7. Bon pour Accord & Signature (Bas de page)
  const signBoxHeight = 36
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(203, 213, 225) // Slate 300
  doc.setLineWidth(0.3)
  doc.roundedRect(marginX, currentY, contentWidth, signBoxHeight, 2, 2, 'D')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.text('BON POUR ACCORD ET ACCEPTATION DU DEVIS', marginX + 4, currentY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Mention manuscrite obligatoire : « Bon pour accord et acceptation du devis »', marginX + 4, currentY + 11)
  doc.text('Date :', marginX + 4, currentY + 18)
  doc.text('Nom et Signature du signataire :', marginX + 4, currentY + 25)

  // Coordonnées et modalités de règlement à droite
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text('Modalités de règlement :', pageWidth - marginX - 70, currentY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)
  doc.text('Virement bancaire ou chèque', pageWidth - marginX - 70, currentY + 11)
  doc.text('À l\'ordre : TRITON CLUB CAVAILLONNAIS', pageWidth - marginX - 70, currentY + 16)
  doc.text('RIB transmis à la validation du devis', pageWidth - marginX - 70, currentY + 21)

  // 8. Pied de page discret
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text('TRITON CLUB CAVAILLONNAIS · Association sportive Loi 1901 · SIRET : 448 666 065 00017 · RNA : W841000669 · Cavaillon', pageWidth / 2, 290, { align: 'center' })

  return Buffer.from(doc.output('arraybuffer'))
}
