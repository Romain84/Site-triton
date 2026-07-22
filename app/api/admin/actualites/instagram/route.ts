import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const instaLogger = logger.withContext('Instagram')

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '').trim()
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { articleId, customCaption } = body

    if (!articleId) {
      return NextResponse.json({ error: 'ID d\'article requis' }, { status: 400 })
    }

    const article = await prisma.actualite.findUnique({
      where: { id: articleId },
    })

    if (!article) {
      return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 })
    }

    // Récupérer les clés Instagram depuis les Paramètres DB ou .env
    const settings = await prisma.settings.findFirst()
    const instagramAccountId = settings?.instagramAccountId || process.env.INSTAGRAM_ACCOUNT_ID
    const instagramAccessToken = settings?.instagramAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN

    if (!instagramAccountId || !instagramAccessToken) {
      return NextResponse.json(
        {
          error:
            'Compte Instagram non configuré. Veuillez renseigner votre ID de compte Instagram Business et votre Access Token dans l\'administration Paramètres.',
          configured: false,
        },
        { status: 400 }
      )
    }

    // Vérifier l'URL de l'image de l'article
    const baseUrl = (process.env.NEXT_PUBLIC_URL || 'https://www.tritoncavaillon.fr').replace(/\/$/, '')
    let imageUrl = article.image

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'L\'article doit posséder une image de couverture pour pouvoir être publié sur Instagram.' },
        { status: 400 }
      )
    }

    if (imageUrl.startsWith('/')) {
      imageUrl = `${baseUrl}${imageUrl}`
    }

    const articleUrl = `${baseUrl}/actualites/${article.slug}`
    const rawText = stripHtml(article.contenu || '').slice(0, 300)

    const caption =
      customCaption ||
      `🏊‍♂️ ACTUALITÉ TRITON CLUB CAVAILLON\n\n📌 ${article.titre}\n\n${rawText}${
        rawText.length >= 300 ? '...' : ''
      }\n\n👉 Lire la suite sur notre site :\n${articleUrl}\n\n#TritonClubCavaillon #Natation #Cavaillon #SportVauclusien #FFN`

    // Étape 1 : Création du conteneur de média via Meta Graph API
    const containerUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media`
    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: instagramAccessToken,
      }),
    })

    const containerData = await containerRes.json()

    if (!containerRes.ok || !containerData.id) {
      instaLogger.error('Erreur création conteneur Instagram Meta:', containerData)
      return NextResponse.json(
        {
          error:
            containerData.error?.message ||
            'Échec de la création du conteneur de post sur l\'API Meta Instagram.',
        },
        { status: 400 }
      )
    }

    const creationId = containerData.id

    // Étape 2 : Publication effective du conteneur
    const publishUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media_publish`
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: instagramAccessToken,
      }),
    })

    const publishData = await publishRes.json()

    if (!publishRes.ok || !publishData.id) {
      instaLogger.error('Erreur publication finale Instagram Meta:', publishData)
      return NextResponse.json(
        {
          error:
            publishData.error?.message ||
            'Échec de la publication finale du post sur Instagram.',
        },
        { status: 400 }
      )
    }

    instaLogger.info(`Article ${article.titre} publié sur Instagram. ID Post: ${publishData.id}`)

    return NextResponse.json({
      success: true,
      postId: publishData.id,
      message: 'Article publié automatiquement sur le fil Instagram du club !',
    })
  } catch (error: any) {
    instaLogger.error('Erreur lors de la publication Instagram', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur lors de la publication Instagram' },
      { status: 500 }
    )
  }
}
