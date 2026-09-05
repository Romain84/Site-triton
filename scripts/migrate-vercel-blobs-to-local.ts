import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

const downloadedCache = new Map<string, string>()

async function downloadAndSaveLocally(url: string, subfolder: string): Promise<string | null> {
  if (!url || typeof url !== 'string') return null
  if (!url.includes('blob.vercel-storage.com')) return url

  if (downloadedCache.has(url)) {
    return downloadedCache.get(url)!
  }

  try {
    console.log(`📥 Téléchargement de : ${url}`)
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`⚠️ Échec du téléchargement (${response.status}) pour : ${url}`)
      return url // Conserver l'URL d'origine si le téléchargement échoue
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extraire le nom du fichier depuis l'URL
    const urlObj = new URL(url)
    const rawFileName = path.basename(urlObj.pathname) || `media-${Date.now()}.webp`
    const fileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_')

    const targetDir = path.join(process.cwd(), 'public', 'uploads', subfolder)
    await fs.mkdir(targetDir, { recursive: true })

    const targetFile = path.join(targetDir, fileName)
    await fs.writeFile(targetFile, buffer)

    const localUrl = `/uploads/${subfolder}/${fileName}`
    downloadedCache.set(url, localUrl)
    console.log(`✅ Sauvegardé en local sous : ${localUrl}`)
    return localUrl
  } catch (err) {
    console.error(`❌ Erreur lors du téléchargement de ${url}:`, err)
    return url
  }
}

async function migrateHtmlContent(html: string | null | undefined, subfolder: string): Promise<string> {
  if (!html || typeof html !== 'string') return html || ''
  
  const blobRegex = /https:\/\/[a-zA-Z0-9._-]+\.public\.blob\.vercel-storage\.com\/[^\s"'<>)]+/g
  const matches = Array.from(new Set(html.match(blobRegex) || []))

  let updatedHtml = html
  for (const match of matches) {
    const local = await downloadAndSaveLocally(match, subfolder)
    if (local && local !== match) {
      updatedHtml = updatedHtml.split(match).join(local)
    }
  }

  return updatedHtml
}

async function main() {
  console.log('🚀 Début de la migration des images Vercel Blob vers le stockage local...')

  // 1. Actualites
  console.log('\n--- 1. Migration des Actualités ---')
  const actualites = await prisma.actualite.findMany()
  for (const actu of actualites) {
    let changed = false
    let newImage = actu.image
    let newContenu = actu.contenu

    if (actu.image && actu.image.includes('blob.vercel-storage.com')) {
      const local = await downloadAndSaveLocally(actu.image, 'actualites')
      if (local && local !== actu.image) {
        newImage = local
        changed = true
      }
    }

    if (actu.contenu && actu.contenu.includes('blob.vercel-storage.com')) {
      const localContenu = await migrateHtmlContent(actu.contenu, 'actualites')
      if (localContenu !== actu.contenu) {
        newContenu = localContenu
        changed = true
      }
    }

    if (changed) {
      await prisma.actualite.update({
        where: { id: actu.id },
        data: { image: newImage, contenu: newContenu },
      })
      console.log(`Actualité mise à jour : ${actu.titre}`)
    }
  }

  // 2. Paramètres du club
  console.log('\n--- 2. Migration des Paramètres (Logos & Signatures) ---')
  const settings = await prisma.settings.findFirst()
  if (settings) {
    let changed = false
    let newLogo = settings.logoUrl
    let newSignPres = settings.signaturePresidentUrl
    let newSignTres = settings.signatureTresoriereUrl

    if (settings.logoUrl && settings.logoUrl.includes('blob.vercel-storage.com')) {
      const local = await downloadAndSaveLocally(settings.logoUrl, 'logos')
      if (local && local !== settings.logoUrl) {
        newLogo = local
        changed = true
      }
    }

    if (settings.signaturePresidentUrl && settings.signaturePresidentUrl.includes('blob.vercel-storage.com')) {
      const local = await downloadAndSaveLocally(settings.signaturePresidentUrl, 'signatures')
      if (local && local !== settings.signaturePresidentUrl) {
        newSignPres = local
        changed = true
      }
    }

    if (settings.signatureTresoriereUrl && settings.signatureTresoriereUrl.includes('blob.vercel-storage.com')) {
      const local = await downloadAndSaveLocally(settings.signatureTresoriereUrl, 'signatures')
      if (local && local !== settings.signatureTresoriereUrl) {
        newSignTres = local
        changed = true
      }
    }

    if (changed) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: {
          logoUrl: newLogo,
          signaturePresidentUrl: newSignPres,
          signatureTresoriereUrl: newSignTres,
        },
      })
      console.log('Paramètres du club mis à jour avec les chemins locaux.')
    }
  }

  // 3. Coaches
  console.log('\n--- 3. Migration des Photos des Coaches ---')
  const coaches = await prisma.coach.findMany()
  for (const coach of coaches) {
    if (coach.photo && coach.photo.includes('blob.vercel-storage.com')) {
      const local = await downloadAndSaveLocally(coach.photo, 'coaches')
      if (local && local !== coach.photo) {
        await prisma.coach.update({
          where: { id: coach.id },
          data: { photo: local },
        })
        console.log(`Coach mis à jour : ${coach.prenom} ${coach.nom || ''}`)
      }
    }
  }

  // 4. Boutique Produits
  console.log('\n--- 4. Migration des Produits de la Boutique ---')
  const produits = await prisma.produit.findMany()
  for (const prod of produits) {
    let changed = false
    let newImage = prod.image
    let newImages = prod.images

    if (prod.image && prod.image.includes('blob.vercel-storage.com')) {
      const local = await downloadAndSaveLocally(prod.image, 'boutique')
      if (local && local !== prod.image) {
        newImage = local
        changed = true
      }
    }

    if (prod.images && typeof prod.images === 'string' && prod.images.includes('blob.vercel-storage.com')) {
      try {
        const parsed = JSON.parse(prod.images)
        if (Array.isArray(parsed)) {
          const updated: string[] = []
          for (const img of parsed) {
            if (typeof img === 'string' && img.includes('blob.vercel-storage.com')) {
              const local = await downloadAndSaveLocally(img, 'boutique')
              updated.push(local || img)
            } else {
              updated.push(img)
            }
          }
          newImages = JSON.stringify(updated)
          changed = true
        }
      } catch {
        const local = await downloadAndSaveLocally(prod.images, 'boutique')
        if (local && local !== prod.images) {
          newImages = local
          changed = true
        }
      }
    }

    if (changed) {
      await prisma.produit.update({
        where: { id: prod.id },
        data: { image: newImage, images: newImages },
      })
      console.log(`Produit mis à jour : ${prod.nom}`)
    }
  }

  // 5. Galerie
  console.log('\n--- 5. Migration de la Galerie Photos ---')
  const albums = await prisma.galerieAlbum.findMany()
  for (const album of albums) {
    if (album.couverture && album.couverture.includes('blob.vercel-storage.com')) {
      const local = await downloadAndSaveLocally(album.couverture, 'galerie')
      if (local && local !== album.couverture) {
        await prisma.galerieAlbum.update({
          where: { id: album.id },
          data: { couverture: local },
        })
      }
    }
  }

  const medias = await prisma.galerieMedia.findMany()
  for (const media of medias) {
    if (media.url && media.url.includes('blob.vercel-storage.com')) {
      const local = await downloadAndSaveLocally(media.url, 'galerie')
      if (local && local !== media.url) {
        await prisma.galerieMedia.update({
          where: { id: media.id },
          data: { url: local },
        })
      }
    }
  }

  console.log(`\n🎉 Migration terminée ! Total médias téléchargés et migrés : ${downloadedCache.size}`)
}

main()
  .catch((e) => {
    console.error('Erreur globale de migration:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
