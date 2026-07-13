import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api/response'
import { handleRouteError, requireAdmin } from '@/lib/api/guards'
import crypto from 'crypto'

async function getOvhTime(): Promise<number> {
  try {
    const response = await fetch('https://eu.api.ovh.com/1.0/auth/time')
    if (response.ok) {
      const text = await response.text()
      return Number(text)
    }
  } catch { /* noop */ }
  return Math.round(Date.now() / 1000)
}

async function ovhRequest(
  method: string,
  url: string,
  appKey: string,
  appSecret: string,
  consumerKey: string,
  bodyData: any = null
) {
  const ovhTime = await getOvhTime()
  const body = bodyData ? JSON.stringify(bodyData) : ''
  
  // Formula: "$1$" + SHA1_HEX(AS + "+" + CK + "+" + METHOD + "+" + QUERY + "+" + BODY + "+" + TSTAMP)
  const signString = `${appSecret}+${consumerKey}+${method}+${url}+${body}+${ovhTime}`
  const signature = '$1$' + crypto.createHash('sha1').update(signString).digest('hex')

  const response = await fetch(url, {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Ovh-Application': appKey,
      'X-Ovh-Consumer': consumerKey,
      'X-Ovh-Signature': signature,
      'X-Ovh-Timestamp': String(ovhTime),
    },
    body: method === 'GET' ? undefined : body,
  })

  if (!response.ok) {
    const text = await response.text()
    let parsedErr = text
    try {
      const json = JSON.parse(text)
      parsedErr = json.message || text
    } catch { /* noop */ }
    throw new Error(`OVH (${response.status}) : ${parsedErr}`)
  }

  return response.json()
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    let settings = await prisma.settings.findFirst()
    if (!settings) {
      settings = await prisma.settings.create({ data: {} })
    }

    const hasCreds = !!(
      settings.ovhApplicationKey &&
      settings.ovhApplicationSecret &&
      settings.ovhConsumerKey &&
      settings.ovhServiceName
    )

    const serviceName = settings.ovhServiceName || 'vps-248c64f5.vps.ovh.net'

    const maskedCreds = {
      ovhApplicationKey: settings.ovhApplicationKey ? `${settings.ovhApplicationKey.slice(0, 4)}***` : '',
      ovhApplicationSecret: settings.ovhApplicationSecret ? '***' : '',
      ovhConsumerKey: settings.ovhConsumerKey ? `${settings.ovhConsumerKey.slice(0, 4)}***` : '',
      ovhServiceName: serviceName,
    }

    if (!hasCreds) {
      return apiSuccess({
        configured: false,
        settings: maskedCreds,
        status: null,
        restorePoints: []
      })
    }

    // Appels API OVH
    try {
      const baseUrl = `https://eu.api.ovh.com/1.0/vps/${settings.ovhServiceName}`
      
      const status = await ovhRequest(
        'GET',
        `${baseUrl}/automatedBackup`,
        settings.ovhApplicationKey!,
        settings.ovhApplicationSecret!,
        settings.ovhConsumerKey!
      )

      const restorePoints = await ovhRequest(
        'GET',
        `${baseUrl}/automatedBackup/restorePoints`,
        settings.ovhApplicationKey!,
        settings.ovhApplicationSecret!,
        settings.ovhConsumerKey!
      )

      return apiSuccess({
        configured: true,
        settings: maskedCreds,
        status,
        restorePoints
      })
    } catch (ovhErr: any) {
      return apiSuccess({
        configured: true,
        settings: maskedCreds,
        status: null,
        restorePoints: [],
        ovhError: ovhErr.message || 'Impossible de se connecter aux API OVH. Vérifiez vos identifiants.'
      })
    }
  } catch (error) {
    return handleRouteError(error, 'Erreur lors du traitement de la requête OVH')
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { action } = body

    let settings = await prisma.settings.findFirst()
    if (!settings) {
      settings = await prisma.settings.create({ data: {} })
    }

    if (action === 'saveSettings') {
      const {
        ovhApplicationKey,
        ovhApplicationSecret,
        ovhConsumerKey,
        ovhServiceName
      } = body

      // Si l'utilisateur saisit '***', on conserve la valeur existante
      const newAppKey = ovhApplicationKey !== '***' && !ovhApplicationKey.endsWith('***')
        ? ovhApplicationKey
        : settings.ovhApplicationKey

      const newAppSecret = ovhApplicationSecret !== '***'
        ? ovhApplicationSecret
        : settings.ovhApplicationSecret

      const newConsumerKey = ovhConsumerKey !== '***' && !ovhConsumerKey.endsWith('***')
        ? ovhConsumerKey
        : settings.ovhConsumerKey

      await prisma.settings.update({
        where: { id: settings.id },
        data: {
          ovhApplicationKey: newAppKey || null,
          ovhApplicationSecret: newAppSecret || null,
          ovhConsumerKey: newConsumerKey || null,
          ovhServiceName: ovhServiceName || null,
        }
      })

      return apiSuccess({ message: 'Identifiants OVH sauvegardés avec succès !' })
    }

    if (action === 'triggerRestore') {
      const { restorePointDate } = body
      if (!restorePointDate) {
        return apiError('Date de point de restauration manquante', 400)
      }

      if (
        !settings.ovhApplicationKey ||
        !settings.ovhApplicationSecret ||
        !settings.ovhConsumerKey ||
        !settings.ovhServiceName
      ) {
        return apiError('Identifiants OVH non configurés', 400)
      }

      const url = `https://eu.api.ovh.com/1.0/vps/${settings.ovhServiceName}/automatedBackup/restore`
      
      const response = await ovhRequest(
        'POST',
        url,
        settings.ovhApplicationKey,
        settings.ovhApplicationSecret,
        settings.ovhConsumerKey,
        { restorePointDate }
      )

      return apiSuccess({
        message: 'Demande de restauration transmise à OVH avec succès !',
        response
      })
    }

    return apiError('Action inconnue', 400)
  } catch (error: any) {
    return handleRouteError(error, error.message || 'Erreur lors du traitement de l\'action OVH')
  }
}
