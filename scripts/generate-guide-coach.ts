import { genererGuideCoachPDF } from '../lib/pdf/guide-coach-pdf-generator'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

async function main() {
  console.log('Génération du guide officiel Espace Coach en cours...')
  const buffer = genererGuideCoachPDF()

  // 1. Sauvegarde dans public/uploads/
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadsDir, { recursive: true })
  const uploadPath = path.join(uploadsDir, 'guide-espace-coach.pdf')
  await writeFile(uploadPath, buffer)
  console.log(`✅ Guide sauvegardé dans public/uploads : ${uploadPath} (${buffer.length} octets)`)

  // 2. Sauvegarde dans les artifacts de l'agent
  const artifactDir = 'C:\\Users\\romain\\.gemini\\antigravity\\brain\\b9ab74d0-e7cb-4555-a191-d26958e63157'
  try {
    await mkdir(artifactDir, { recursive: true })
    const artifactPath = path.join(artifactDir, 'guide-espace-coach.pdf')
    await writeFile(artifactPath, buffer)
    console.log(`✅ Guide sauvegardé dans les artifacts : ${artifactPath}`)
  } catch (err) {
    console.warn('Impossible de copier dans les artifacts:', err)
  }
}

main().catch(console.error)
