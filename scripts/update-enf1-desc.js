const { Pool } = require('pg')

async function updateEnf1() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  const pool = new Pool({ connectionString })
  const client = await pool.connect()

  try {
    const newDescription = `L'École de Natation permet aux enfants d'acquérir les bases fondamentales en toute sécurité.
De l'apprentissage des techniques de nage jusqu'à l'obtention du Pass'Sports de l'Eau.

✅ Prérequis obligatoires :
- Sait déjà se déplacer seul dans l'eau sans se tenir (ne maîtrise pas encore les nages codifiées : crawl, dos, brasse)
- Autonome aux vestiaires

📌 Pour les nouveaux :
- Test de niveau à la rentrée. Changement de groupe possible par l'entraîneur (selon les places disponibles)`

    const res = await client.query(
      `UPDATE "groupes" SET description = $1, "updatedAt" = NOW() WHERE nom ILIKE '%ENF 1%' RETURNING id, nom;`,
      [newDescription]
    )

    console.log(`Mis à jour ${res.rowCount} groupe(s) :`, res.rows)
  } catch (err) {
    console.error('Erreur lors de la mise à jour ENF 1 :', err)
  } finally {
    client.release()
    await pool.end()
  }
}

updateEnf1()
