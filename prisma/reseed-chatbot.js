const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Chargement du fichier chatbot_knowledge.json...');
  const jsonPath = path.join(__dirname, '../chatbot_knowledge.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const knowledgeEntries = JSON.parse(rawData);

  console.log('🌱 Nettoyage de la table ChatbotKnowledge...');
  await prisma.chatbotKnowledge.deleteMany();

  console.log(`🌱 Insertion de ${knowledgeEntries.length} entrées de connaissances...`);
  
  const dataToInsert = knowledgeEntries.map(entry => ({
    categorie: entry.categorie,
    question: entry.question,
    reponse: entry.reponse,
    motsCles: entry.motsCles,
    priorite: entry.priorite ?? 1,
    actif: entry.actif ?? true
  }));

  await prisma.chatbotKnowledge.createMany({
    data: dataToInsert
  });

  console.log('✅ Base de données chatbot réimportée avec succès !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
