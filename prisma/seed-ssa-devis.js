const { Client } = require('pg')
const crypto = require('crypto')

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:TritonNewSite84@localhost:5432/postgres?schema=public'

async function seedSSADevis() {
  const client = new Client({ connectionString })
  await client.connect()

  console.log('Connecté à la BDD pour initialiser le devis SSA...')

  try {
    // Vérifier si le devis existe déjà
    const checkRes = await client.query(`SELECT id, numero FROM devis WHERE numero = 'DEV-2026-0001' OR titre LIKE '%SSA%' LIMIT 1`)
    if (checkRes.rows.length > 0) {
      console.log(`Le devis SSA existe déjà : ${checkRes.rows[0].numero} (ID: ${checkRes.rows[0].id})`)
      await client.end()
      return
    }

    const devisId = 'dev_' + crypto.randomBytes(12).toString('hex')
    const numero = 'DEV-2026-0001'
    const titre = 'Formation Surveillant Sauveteur Aquatique (SSA) & Secourisme (PSE1 / PSE2)'
    const clientNom = 'Bénéficiaire Formation SSA'
    const clientEmail = 'tritoncavaillon@gmail.com'
    const clientTelephone = '04 90 71 00 00'
    const clientAdresse = 'Piscine Alphonse Roudière, 84300 Cavaillon'
    const now = new Date()
    const validite = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const notes = 'Règlement échelonné possible en 3 fois sans frais par chèques ou virement. Attestation et diplômes délivrés à l\'issue des épreuves.'

    await client.query(
      `INSERT INTO devis (
        id, numero, titre, "clientNom", "clientEmail", "clientTelephone", "clientAdresse",
        "dateEmission", "dateValidite", statut, "totalHT", "totalTVA", "totalTTC", notes, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        devisId,
        numero,
        titre,
        clientNom,
        clientEmail,
        clientTelephone,
        clientAdresse,
        now,
        validite,
        'brouillon',
        750.00,
        0.00,
        750.00,
        notes,
        now,
        now,
      ]
    )

    const lignes = [
      {
        id: 'lig_' + crypto.randomBytes(12).toString('hex'),
        description: 'Formation SSA (Surveillant Sauveteur Aquatique) - Préparation technique, physique et théorique aux épreuves de sauvetage aquatique, réglementation des baignades et entraînements en bassin.',
        quantite: 1,
        prixUnitaire: 350.00,
        total: 350.00,
        ordre: 0,
      },
      {
        id: 'lig_' + crypto.randomBytes(12).toString('hex'),
        description: 'Formation Secourisme PSE1 (Premiers Secours en Équipe de niveau 1) - Acquisition des compétences de secours et gestes d\'urgence en équipe.',
        quantite: 1,
        prixUnitaire: 200.00,
        total: 200.00,
        ordre: 1,
      },
      {
        id: 'lig_' + crypto.randomBytes(12).toString('hex'),
        description: 'Formation Secourisme PSE2 (Premiers Secours en Équipe de niveau 2) - Prise en charge d\'équipe avec matériel, immobilisations et bilans approfondis.',
        quantite: 1,
        prixUnitaire: 200.00,
        total: 200.00,
        ordre: 2,
      },
    ]

    for (const l of lignes) {
      await client.query(
        `INSERT INTO lignes_devis (
          id, "devisId", description, quantite, "prixUnitaire", total, ordre, "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [l.id, devisId, l.description, l.quantite, l.prixUnitaire, l.total, l.ordre, now, now]
      )
    }

    console.log(`✅ Devis ${numero} créé avec succès ! Total : 750.00 € (SSA 350€, PSE1 200€, PSE2 200€)`)
  } catch (error) {
    console.error('Erreur lors de l\'insertion du devis SSA :', error)
  } finally {
    await client.end()
  }
}

seedSSADevis()
