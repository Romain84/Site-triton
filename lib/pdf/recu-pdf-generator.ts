import jsPDF from 'jspdf'

interface DonationPDFData {
  numeroRecu: string
  typeDonateur: 'particulier' | 'entreprise'
  nomDonateur: string
  adresseDonateur: string
  siren?: string | null
  montant: number
  montantLettres: string
  dateDon: Date | string
  natureDon: 'numeraire' | 'cheque' | 'virement' | 'nature' | 'abandon_frais'
  descriptionNature?: string | null
  modePaiement?: string | null
  dateEmission?: Date | string | null
  
  // Paramètres du club
  nomClub?: string | null
  signatureBase64?: string | null
  nomSignataireRecu?: string | null
  titreSignataireRecu?: string | null
}

/**
 * Génère un reçu fiscal de don (CERFA) haut de gamme, moderne et professionnel sur une seule page A4.
 * Conforme aux exigences de la direction générale des Finances publiques (DGFiP)
 * pour les particuliers (Art. 200 CGI) et les entreprises (Art. 238 bis CGI).
 */
export function generateDonationPDF(data: DonationPDFData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const marginX = 15
  const pageWidth = 210
  const contentWidth = pageWidth - 2 * marginX // 180 mm
  let currentY = 15

  const dateDonFr = new Date(data.dateDon).toLocaleDateString('fr-FR')
  const dateEmissionFr = data.dateEmission 
    ? new Date(data.dateEmission).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR')
  
  const clubNom = data.nomClub || 'Triton Club Cavaillon'
  const signNom = data.nomSignataireRecu || 'Le Président'
  const signTitre = data.titreSignataireRecu || 'Président'

  // --- 1. EN-TÊTE PROFESSIONNEL ET DESIGN ---
  // Ligne décorative supérieure (bleu marine / or ou gris foncé)
  doc.setLineWidth(1)
  doc.setDrawColor(15, 23, 42) // Slate 900
  doc.line(marginX, currentY, marginX + contentWidth, currentY)
  
  currentY += 6

  // Logo de la République Française & Titre Principal
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text('RÉPUBLIQUE FRANÇAISE', marginX, currentY)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text('Liberté · Égalité · Fraternité', marginX, currentY + 3.5)

  // Titre principal à droite
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text('REÇU FISCAL POUR DON', pageWidth - marginX, currentY + 1, { align: 'right' })
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  const codeCerfa = data.typeDonateur === 'entreprise' ? 'Formulaire 2041-MEC-SD (Cerfa n° 16216)' : 'Formulaire 2041-RD (Cerfa n° 11580)'
  doc.text(codeCerfa, pageWidth - marginX, currentY + 4.5, { align: 'right' })

  currentY += 12

  // Numéro de reçu & Référence légale (encadré de mise en valeur)
  doc.setFillColor(248, 250, 252) // Slate 50
  doc.setDrawColor(226, 232, 240) // Slate 200
  doc.setLineWidth(0.3)
  doc.rect(marginX, currentY, contentWidth, 12, 'F')
  doc.rect(marginX, currentY, contentWidth, 12, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text(`REÇU FISCAL N° : ${data.numeroRecu}`, marginX + 4, currentY + 7.5)

  doc.setFont('helvetica', 'normal')
  const articleLoi = data.typeDonateur === 'entreprise' 
    ? 'Mécénat d\'Entreprise - Article 238 bis du CGI'
    : 'Don aux Œuvres - Article 200 du CGI'
  doc.text(articleLoi, pageWidth - marginX - 4, currentY + 7.5, { align: 'right' })

  currentY += 18

  // --- 2. BLOC BÉNÉFICIAIRE (ORGANISME) ---
  doc.setLineWidth(0.35)
  doc.setDrawColor(203, 213, 225) // Slate 300
  doc.rect(marginX, currentY, contentWidth, 36)

  // En-tête du bloc
  doc.setFillColor(241, 245, 249) // Slate 100
  doc.rect(marginX + 0.1, currentY + 0.1, contentWidth - 0.2, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 41, 59)
  doc.text('1. ORGANISME BÉNÉFICIAIRE', marginX + 3, currentY + 4.2)
  doc.line(marginX, currentY + 6, marginX + contentWidth, currentY + 6)

  // Contenu Organisme
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  
  doc.text(`Nom / Dénomination : ${clubNom}`, marginX + 4, currentY + 11.5)
  doc.text('Adresse : Piscine Alphonse Roudière, Bd Jean Moulin, Quartier La Clède, 84300 Cavaillon', marginX + 4, currentY + 17)
  doc.text('Numéros d\'identification : SIRET 44866606500017 · SIREN 448666065 · RNA W841000669', marginX + 4, currentY + 22.5)
  doc.text('Objet : Pratique et promotion des activités de natation sportive et de loisir', marginX + 4, currentY + 28)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Statut : Association loi 1901 d\'utilité/intérêt général sportive', marginX + 4, currentY + 33)

  currentY += 41

  // --- 3. BLOC DONATEUR ---
  const isEntreprise = data.typeDonateur === 'entreprise'
  const donateurH = isEntreprise ? 25 : 20
  doc.rect(marginX, currentY, contentWidth, donateurH)

  // En-tête
  doc.setFillColor(241, 245, 249)
  doc.rect(marginX + 0.1, currentY + 0.1, contentWidth - 0.2, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('2. DONATEUR', marginX + 3, currentY + 4.2)
  doc.line(marginX, currentY + 6, marginX + contentWidth, currentY + 6)

  // Contenu Donateur
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)

  if (isEntreprise) {
    doc.text(`Raison sociale : ${data.nomDonateur}`, marginX + 4, currentY + 11.5)
    doc.text(`Numéro SIREN / SIRET : ${data.siren || '-'}`, marginX + 4, currentY + 17)
    doc.text(`Adresse du siège social : ${data.adresseDonateur} · Pays : France`, marginX + 4, currentY + 22.5)
  } else {
    doc.text(`Nom et Prénom : ${data.nomDonateur}`, marginX + 4, currentY + 11.5)
    doc.text(`Adresse du domicile : ${data.adresseDonateur} · Pays de résidence : France`, marginX + 4, currentY + 17)
  }

  currentY += donateurH + 5

  // --- 4. BLOC CARACTÉRISTIQUES DU DON ---
  const hasDetails = data.descriptionNature && (data.natureDon === 'nature' || data.natureDon === 'abandon_frais')
  const detailsH = hasDetails ? 18 : 0
  const versementH = 34 + detailsH
  doc.rect(marginX, currentY, contentWidth, versementH)

  // En-tête
  doc.setFillColor(241, 245, 249)
  doc.rect(marginX + 0.1, currentY + 0.1, contentWidth - 0.2, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('3. CARACTÉRISTIQUES DU VERSEMENT', marginX + 3, currentY + 4.2)
  doc.line(marginX, currentY + 6, marginX + contentWidth, currentY + 6)

  // Contenu Versement
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)

  // Ligne 1 : Montant & Date
  doc.text(`Date du versement : ${dateDonFr}`, marginX + 4, currentY + 11.5)
  doc.setFont('helvetica', 'bold')
  doc.text(`Montant : ${data.montant.toFixed(2)} EUR`, marginX + 110, currentY + 11.5)
  doc.setFont('helvetica', 'normal')

  // Ligne 2 : Montant en toutes lettres
  const lettresWrapped = doc.splitTextToSize(`Somme versée en lettres : ${data.montantLettres}`, contentWidth - 8)
  doc.text(lettresWrapped, marginX + 4, currentY + 17)

  // Ligne 3 : Nature & Mode de paiement
  const natureLabels: Record<string, string> = {
    numeraire: 'Numéraire (Espèces)',
    cheque: 'Chèque',
    virement: 'Virement bancaire',
    nature: 'Don en nature',
    abandon_frais: 'Abandon de frais par un bénévole'
  }
  const natureLabel = natureLabels[data.natureDon] || data.natureDon
  const paiementDetail = data.modePaiement ? ` (${data.modePaiement})` : ''
  doc.text(`Nature du versement : ${natureLabel}${paiementDetail}`, marginX + 4, currentY + 22.5)

  // Ligne 4 : Certification
  const certifText = "L'organisme certifie que le donateur a versé cette somme sans aucune contrepartie directe ou indirecte sous forme de biens ou de services au profit de la personne qui a effectué le versement."
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)
  doc.text(doc.splitTextToSize(certifText, contentWidth - 8), marginX + 4, currentY + 27.5)

  // Description des dons en nature ou frais abandonnés
  if (hasDetails) {
    doc.setDrawColor(241, 245, 249)
    doc.line(marginX + 3, currentY + 33, marginX + contentWidth - 3, currentY + 33)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(30, 41, 59)
    doc.text('Description et valorisation détaillée du don :', marginX + 4, currentY + 37.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(15, 23, 42)
    const descWrapped = doc.splitTextToSize(data.descriptionNature || '', contentWidth - 8)
    doc.text(descWrapped, marginX + 4, currentY + 41.5)
  }

  currentY += versementH + 5

  // --- 5. BLOC AVANTAGES FISCAUX ---
  doc.setDrawColor(203, 213, 225)
  doc.rect(marginX, currentY, contentWidth, 18)

  // En-tête
  doc.setFillColor(241, 245, 249)
  doc.rect(marginX + 0.1, currentY + 0.1, contentWidth - 0.2, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 41, 59)
  doc.text('4. RÉDUCTION D\'IMPÔT APPLICABLE', marginX + 3, currentY + 4.2)
  doc.line(marginX, currentY + 6, marginX + contentWidth, currentY + 6)

  // Contenu avantage
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(51, 65, 85)
  if (isEntreprise) {
    const isText = "Ce reçu fiscal donne droit à une réduction d'impôt sur les sociétés (IS) de 60 % du montant du don, pris dans la limite de 20 000 € ou de 5 ‰ (pour mille) du chiffre d'affaires hors taxes de l'entreprise (Article 238 bis du CGI)."
    doc.text(doc.splitTextToSize(isText, contentWidth - 8), marginX + 4, currentY + 10.5)
  } else {
    const irText = "Ce reçu fiscal donne droit à une réduction d'impôt sur le revenu (IR) de 66 % du montant du don, pris dans la limite de 20 % du revenu imposable (Article 200 du CGI). Les abandons de frais par les bénévoles ouvrent également droit à cette réduction fiscale."
    doc.text(doc.splitTextToSize(irText, contentWidth - 8), marginX + 4, currentY + 10.5)
  }

  currentY += 23

  // --- 6. SIGNATURE DE L'ORGANISME ---
  doc.rect(marginX, currentY, contentWidth, 38)

  doc.setFillColor(241, 245, 249)
  doc.rect(marginX + 0.1, currentY + 0.1, contentWidth - 0.2, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('5. SIGNATURE DU REPRÉSENTANT DE L\'ORGANISME', marginX + 3, currentY + 4.2)
  doc.line(marginX, currentY + 6, marginX + contentWidth, currentY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.text('Fait à : Cavaillon', marginX + 5, currentY + 12)
  doc.text(`Le : ${dateEmissionFr}`, marginX + 5, currentY + 18)
  doc.text(`Nom : ${signNom}`, marginX + 5, currentY + 24)
  doc.text(`Qualité : ${signTitre}`, marginX + 5, currentY + 30)

  // Insertion de la signature fac-similé
  const signatureX = pageWidth - marginX - 65
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text('Signature fac-similé du représentant :', signatureX, currentY + 11)

  if (data.signatureBase64) {
    try {
      let format = 'PNG'
      if (data.signatureBase64.includes('image/jpg') || data.signatureBase64.includes('image/jpeg')) {
        format = 'JPEG'
      } else if (data.signatureBase64.includes('image/webp')) {
        format = 'WEBP'
      }
      const base64Clean = data.signatureBase64.replace(/^data:image\/\w+;base64,/, '')
      doc.addImage(base64Clean, format, signatureX + 2, currentY + 13, 50, 20)
    } catch {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text('[ Signature électronique enregistrée ]', signatureX + 5, currentY + 20)
    }
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('[ Signature du Président habilité ]', signatureX + 5, currentY + 20)
  }

  // --- 7. PIED DE PAGE LÉGAL ---
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  
  // Rappel de la pénalité fiscale article 1740 A
  const warningText = "Attention : La délivrance d'un reçu fiscal mentionnant des sommes ou des versements inexacts est passible d'une amende fiscale égale à 25 % des sommes y figurant de manière indue (Article 1740 A du CGI)."
  doc.text(doc.splitTextToSize(warningText, contentWidth), marginX, 281)
  
  // Mentions club
  const clubText = "Triton Club Cavaillon · Association sportive loi 1901 d'intérêt général · Piscine Alphonse Roudière, Bd Jean Moulin, Quartier La Clède, 84300 Cavaillon · SIRET 44866606500017 · RNA W841000669"
  doc.text(clubText, pageWidth / 2, 288, { align: 'center' })

  return doc
}
