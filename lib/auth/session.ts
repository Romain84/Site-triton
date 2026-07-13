import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'
import { getSessionSecretKey } from './session-secret'

export interface CoachSession {
  coachId: string
  email: string
  prenom: string
  nom: string | null
}

export interface AdminSession {
  userId: string
  email: string
  role: string
}

export async function createCoachSession(coach: CoachSession) {
  const secretKey = getSessionSecretKey()
  const token = await new SignJWT({ ...coach, type: 'coach' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secretKey)

  const cookieStore = await cookies()
  cookieStore.set('coach_session', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return token
}

export async function getCoachSession(): Promise<CoachSession | null> {
  const secretKey = getSessionSecretKey()
  const cookieStore = await cookies()
  const token = cookieStore.get('coach_session')?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secretKey)

    if (payload.type !== 'coach') return null

    return {
      coachId: payload.coachId as string,
      email: payload.email as string,
      prenom: payload.prenom as string,
      nom: payload.nom as string | null,
    }
  } catch {
    return null
  }
}

export async function deleteCoachSession() {
  const cookieStore = await cookies()
  cookieStore.delete('coach_session')
}

export async function createAdminSession(admin: AdminSession) {
  const secretKey = getSessionSecretKey()
  const token = await new SignJWT({ ...admin, type: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secretKey)

  const cookieStore = await cookies()
  cookieStore.set('admin_session', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return token
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const secretKey = getSessionSecretKey()
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_session')?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secretKey)

    if (payload.type !== 'admin') return null

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}

export async function deleteAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
}
