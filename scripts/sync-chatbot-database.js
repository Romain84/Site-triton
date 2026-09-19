const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function main() {
  console.log('🔄 Début de la synchronisation de la base de connaissances Chatbot...')

  // 1. Mettre à jour l'adresse de la piscine
  await pool.query(`
    UPDATE chatbot_knowledge
    SET reponse = 'Les entraînements du club se déroulent à la **piscine municipale Alphonse Roudière (ou Alphonse Ringrave)**, située Avenue Jean Moulin, Quartier La Clède, 84300 Cavaillon.',
        "updatedAt" = NOW()
    WHERE question ILIKE '%se trouve%Triton%' OR question ILIKE '%adresse%';
  `)
  console.log('✅ Adresse de la piscine mise à jour.')

  // 2. Mettre à jour les informations de contact (zéro guichet, zéro téléphone)
  await pool.query(`
    UPDATE chatbot_knowledge
    SET reponse = 'Le Triton Club Cavaillon est une association gérée par des bénévoles. Pour nous joindre, utilisez notre **[formulaire de contact](/contact)** en ligne ou écrivez-nous par e-mail à **tritoncavaillon@gmail.com**.\n\n*Important : Le club ne dispose d''aucune permanence physique au bord du bassin, d''aucun guichet et d''aucun accueil téléphonique.*',
        "updatedAt" = NOW()
    WHERE question ILIKE '%contacter le club%' OR question ILIKE '%secretariat%';
  `)
  console.log('✅ Coordonnées et règles de contact mises à jour.')

  // 3. Mettre à jour la question sur les tarifs
  const reponseTarifs = `Voici les tarifs annuels officiels du Triton Club Cavaillon (licence FFN comprise) :
- **École de Natation Française (ENF 1 & 2)** : 168 € / an (1 cours/semaine) ou 238 € / an (2 cours/semaine)
- **Avenirs (1, 2, 3)** : 248 € / an
- **Avenirs Loisirs** : 168 € / an
- **Jeunes / Juniors Loisirs** : 218 € / an
- **Adultes Loisirs (1 & 2)** : 230 € / an
- **Compétition (Benjamins 1 & 2, Juniors, Adultes)** : 220 € / an (+ caution compétition de 50 € à 100 €)
- **Natation Artistique** : 218 € / an
- **AquaFitness** : 200 € / an (1 cours/semaine) ou 350 € / an (2 cours/semaine)
- **Formation SSA (ex-BNSSA)** : 750 € (inclus entraînements, PSE1 + PSE2 avec la Croix-Blanche) ou 500 € net avec formule engagement club (4 jours de surveillance).

Retrouvez la grille complète sur notre **[page des groupes](/groupes)** et inscrivez-vous en ligne sur notre **[page d'inscription](/inscription)**.`

  await pool.query(`
    UPDATE chatbot_knowledge
    SET reponse = $1, "updatedAt" = NOW()
    WHERE question ILIKE '%tarifs pour la saison%' OR question ILIKE '%tarifs du club%';
  `, [reponseTarifs])
  console.log('✅ Tarifs officiels mis à jour.')

  // 4. Mettre à jour la question sur la formation BNSSA / SSA
  const reponseSsa = `Oui ! Le club prépare à la formation diplômante **SSA – Surveillant Sauveteur Aquatique (ex-BNSSA)** en partenariat officiel avec la **Croix-Blanche** (secourisme complet **PSE1 et PSE2 inclus**).
- **Tarif complet** : 750 € (formation complète, cours en bassin, PSE1, PSE2, examen).
- **Tarif réduit engagement club** : 500 € net (remboursement de 250 € pour 4 journées de surveillance assurées avec la Croix-Blanche).
- **Créneaux** : Le jeudi soir de 19h30 à 21h30 (ou 20h00 à 21h30) à la piscine de Cavaillon.
- **Début des entraînements** : Jeudi 1er octobre 2026.
- **Conditions** : Dès 16 ans (17 ans pour l'examen) et validation d'un test natatoire préalable avec un MNS du club.

Consultez tous les détails sur notre **[page d'inscription](/inscription#section-cmqqrybvb0009y838lq5orh1o)**.`

  await pool.query(`
    UPDATE chatbot_knowledge
    SET question = 'Proposez-vous la formation SSA ou BNSSA ?',
        reponse = $1,
        "updatedAt" = NOW()
    WHERE question ILIKE '%BNSSA%' OR question ILIKE '%SSA%';
  `, [reponseSsa])
  console.log('✅ Formation SSA / BNSSA mise à jour.')

  // 5. Mettre à jour les modalités d'inscription (100% MonClub en ligne)
  await pool.query(`
    UPDATE chatbot_knowledge
    SET reponse = 'L''adhésion se fait **exclusivement en ligne** via notre plateforme partenaire **[MonClub](https://tritoncavaillon.monclub.app/login)** (accessible directement depuis notre [page d''inscription](/inscription)).\n\nLe paiement s''effectue par carte bancaire ou prélèvement en 1 fois ou 3 fois sans frais sur MonClub. Le club n''accepte pas les chèques, espèces, virements manuels, chèques-vacances ANCV ni Pass''Sport.',
        "updatedAt" = NOW()
    WHERE question ILIKE '%inscrire au club%';
  `)
  console.log('✅ Modalités MonClub mises à jour.')

  console.log('🎉 Synchronisation terminée avec succès !')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors de la synchronisation :', e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })
