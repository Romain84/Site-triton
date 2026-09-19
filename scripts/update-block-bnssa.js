const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function main() {
  const contenu = {
    emoji: "🛟",
    label: "Sauvetage & Surveillance Aquatique",
    changement: "Le dispositif national de formation au sauvetage aquatique intègre désormais le SSA (Surveillant Sauveteur Aquatique), certificat de compétences opérationnelles de Sécurité Civile qui succède et complète la pratique du BNSSA. De plus, conformément au décret n° 2023-437 du 2 juin 2023, les sauveteurs diplômés peuvent assurer la surveillance en pleine autonomie de toutes les baignades et piscines d'accès payant ou gratuit pendant toute leur période d'ouverture.",
    introClub: "Le Triton Club Cavaillon, en partenariat officiel avec l'association de sécurité civile Croix-Blanche, propose une formation diplômante d'excellence associant préparation intensive en bassin, techniques de sauvetage opérationnel SSA et secourisme d'équipe complet PSE1/PSE2.",
    conditionsAcces: {
      texte: "La formation est ouverte aux personnes motivées souhaitant se former au métier de surveillant sauveteur aquatique en piscine, plan d'eau ou plage.",
      points: [
        "Avoir au moins 17 ans révolus au moment de l'examen (années 2010 et antérieures) ;",
        "Être apte médicalement à la pratique de la natation et du sauvetage aquatique ;",
        "Réussir le test natatoire préalable validé par un Maître-Nageur Sauveteur (MNS) du club ;",
        "Être en mesure de suivre avec assiduité les entraînements en bassin et les sessions de secourisme prévues."
      ],
      effectif: "La session sera ouverte à partir de 6 candidats minimum."
    },
    formationComplete: {
      intro: "Le cursus complet dispensé au Triton Club Cavaillon comprend l'ensemble des modules obligatoires :",
      formationSsa: "Formation théorique et pratique en bassin (sauvetage mannequin 100m, 250m PMT, secours à victime en détresse, réglementation et POSS) et techniques opérationnelles SSA (bouée tube, filin, planche de sauvetage / rescue board, prise en charge de traumatisé aquatique).",
      secourisme: {
        titre: "Pack Secourisme PSE1 + PSE2 inclus",
        texte: "Les formations Premiers Secours en Équipe de niveau 1 (PSE1) et de niveau 2 (PSE2) sont comprises dans le tarif de la formation SSA. Elles sont réalisées avec notre partenaire officiel Croix-Blanche. Vous n'avez donc pas à vous inscrire séparément au PSE1 et au PSE2."
      }
    },
    tarifComplet: "750",
    formuleReduction: {
      texte: "Une formule permettant de bénéficier d'un remboursement de 250 € est proposée aux candidats qui s'engagent à effectuer 4 journées de surveillance avec la Croix-Blanche pendant la saison.",
      note: "* Cette possibilité est soumise à l'acceptation de l'engagement et aux modalités définies avec la Croix-Blanche."
    },
    testNatatoire: {
      intro: "Avant le début de la formation, un test natatoire devra être validé par un MNS à la piscine de Cavaillon.",
      explication: "Ce test permet de vérifier que le candidat possède les capacités aquatiques nécessaires pour suivre la formation.",
      modalites: "Les modalités du test seront communiquées aux candidats inscrits ultérieurement."
    },
    debutFormation: {
      date: "Jeudi 1er octobre 2026",
      horaires: "Les entraînements ont lieu le jeudi soir de 19h30 à 21h30 à la Piscine Alphonse Roudière de Cavaillon.",
      effectif: "Effectif minimum : 6 candidats."
    },
    dejaTitulaireBnssa: {
      texte: "Si vous êtes déjà titulaire du BNSSA, votre diplôme reste pleinement valide. Pour votre recyclage quinquennal (maintien des acquis) ou pour compléter vos qualifications avec le certificat opérationnel SSA et le PSE2, contactez le club pour un parcours adapté.",
      action: "Contactez le club afin que nous puissions vous indiquer la démarche adaptée :"
    },
    avertissement: "Conformément au Code du sport, le titulaire du SSA/BNSSA a pour mission exclusive la surveillance, la prévention et le sauvetage. L'enseignement de la natation contre rémunération relève de la prérogative exclusive des Maîtres-Nageurs Sauveteurs (BPJEPS AAN)."
  }

  const titre = 'Formation SSA – Surveillant Sauveteur Aquatique (ex-BNSSA)'

  const res = await pool.query(
    `UPDATE inscription_blocks 
     SET titre = $1, contenu = $2, "updatedAt" = NOW() 
     WHERE id = $3 
     RETURNING id, titre`,
    [titre, JSON.stringify(contenu), 'cmqqrybvb0009y838lq5orh1o']
  )

  console.log('Bloc mis à jour avec succès :', res.rows[0])
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })
