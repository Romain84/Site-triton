import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface CommandePDF {
  numeroCommande: string
  date: Date | string
  prenom: string
  nom: string
  email: string
  prenomNageur: string
  nomNageur: string
  telephone?: string | null
  lignes: Array<{
    nom: string
    quantite: number
    prixUnitaire: number
    taille?: string | null
    couleur?: string | null
    textePersonnalise?: string | null
  }>
  total: number
  statut: string
  statutPaiement: string
}

export function generateCommandePDF(commande: CommandePDF): jsPDF {
  const doc = new jsPDF()

  // En-tête
  doc.setFontSize(20)
  doc.setTextColor(0, 188, 212) // Primary color
  doc.text('Triton Club Cavaillon', 105, 20, { align: 'center' })

  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Bon de commande', 105, 30, { align: 'center' })

  // Numéro de commande
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Commande #${commande.numeroCommande}`, 14, 45)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const dateStr = new Date(commande.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.text(`Date : ${dateStr}`, 14, 52)

  // Informations client
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Client', 14, 65)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${commande.prenom} ${commande.nom}`, 14, 72)
  doc.text(`Email : ${commande.email}`, 14, 78)
  if (commande.telephone) {
    doc.text(`Tél : ${commande.telephone}`, 14, 84)
  }

  // Nageur
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Nageur', 120, 65)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${commande.prenomNageur} ${commande.nomNageur}`, 120, 72)

  // Tableau des articles
  const tableData = commande.lignes.map((ligne) => [
    ligne.nom + 
      (ligne.taille ? `\nTaille: ${ligne.taille}` : '') + 
      (ligne.couleur ? `\nCouleur: ${ligne.couleur}` : '') + 
      (ligne.textePersonnalise ? `\nPersonnalisation: ${ligne.textePersonnalise}` : ''),
    ligne.quantite.toString(),
    `${ligne.prixUnitaire.toFixed(2)} €`,
    `${(ligne.quantite * ligne.prixUnitaire).toFixed(2)} €`,
  ])

  autoTable(doc, {
    startY: 95,
    head: [['Article', 'Qté', 'Prix unit.', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 188, 212],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
  })

  // Total
  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total : ${commande.total.toFixed(2)} €`, 195, finalY, { align: 'right' })

  // Statuts
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const statutPaiementLabel = commande.statutPaiement === 'paye' ? 'Payé' : commande.statutPaiement === 'en_attente' ? 'En attente' : 'Échoué'
  const statutLabel = commande.statut === 'livree' ? 'Livrée' : commande.statut === 'expediee' ? 'Expédiée' : commande.statut === 'confirmee' ? 'Confirmée' : commande.statut === 'en_preparation' ? 'En préparation' : 'En attente'

  doc.text(`Paiement : ${statutPaiementLabel}`, 14, finalY)
  doc.text(`Statut : ${statutLabel}`, 14, finalY + 6)

  // Pied de page
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text('Triton Club Cavaillon - contact@tritoncavaillon.fr', 105, 285, { align: 'center' })

  return doc
}

interface RecapFournisseurPDF {
  dateDebut?: string
  dateFin?: string
  recap: Array<{
    produitNom: string
    taille?: string
    couleur?: string
    quantiteTotal: number
    prixCoutantHT: number
    prixFlocageHT: number
    totalHT: number
    totalTTC: number
    totalVente: number
    beneficeTotal: number
  }>
  totaux: {
    quantiteTotal: number
    totalAchatHT: number
    totalAchatTTC: number
    totalVente: number
    beneficeTotal: number
  }
  nbCommandes: number
}

export function generateRecapFournisseurPDF(data: RecapFournisseurPDF): jsPDF {
  const doc = new jsPDF('landscape')

  // En-tête
  doc.setFontSize(18)
  doc.setTextColor(0, 188, 212)
  doc.text('Triton Club Cavaillon', 148, 15, { align: 'center' })

  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Récapitulatif Fournisseur', 148, 25, { align: 'center' })

  // Période
  doc.setFontSize(10)
  let periodeText = 'Toutes les commandes'
  if (data.dateDebut && data.dateFin) {
    periodeText = `Du ${new Date(data.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(data.dateFin).toLocaleDateString('fr-FR')}`
  } else if (data.dateDebut) {
    periodeText = `À partir du ${new Date(data.dateDebut).toLocaleDateString('fr-FR')}`
  } else if (data.dateFin) {
    periodeText = `Jusqu'au ${new Date(data.dateFin).toLocaleDateString('fr-FR')}`
  }
  doc.text(periodeText, 148, 32, { align: 'center' })
  doc.text(`${data.nbCommandes} commande(s)`, 148, 38, { align: 'center' })

  // Tableau
  const tableData = data.recap.map((item) => [
    item.produitNom,
    item.taille || '-',
    item.couleur || '-',
    item.quantiteTotal.toString(),
    `${(item.prixCoutantHT * item.quantiteTotal).toFixed(2)} €`,
    `${(item.totalTTC * item.quantiteTotal).toFixed(2)} €`,
    `${item.totalVente.toFixed(2)} €`,
    `${item.beneficeTotal.toFixed(2)} €`,
  ])

  // Ligne totaux
  tableData.push([
    'TOTAL',
    '',
    '',
    data.totaux.quantiteTotal.toString(),
    `${data.totaux.totalAchatHT.toFixed(2)} €`,
    `${data.totaux.totalAchatTTC.toFixed(2)} €`,
    `${data.totaux.totalVente.toFixed(2)} €`,
    `${data.totaux.beneficeTotal.toFixed(2)} €`,
  ])

  autoTable(doc, {
    startY: 45,
    head: [['Produit', 'Taille', 'Couleur', 'Qté', 'Coût HT', 'Coût TTC', 'Vente TTC', 'Bénéfice']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 188, 212],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' },
      7: { cellWidth: 30, halign: 'right' },
    },
    didParseCell: (hookData) => {
      // Style pour la ligne total
      if (hookData.row.index === tableData.length - 1) {
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.fillColor = [232, 245, 233]
      }
    },
  })

  // Date de génération
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 14, 200)

  return doc
}
