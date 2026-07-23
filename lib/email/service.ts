import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmtpSettings {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  nomExpediteur?: string // FIX: nom d'affichage dans le champ "From"
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: nodemailer.SendMailOptions['attachments']
}

// ─── Chiffrement SMTP ─────────────────────────────────────────────────────────

const SMTP_PASSWORD_PREFIX = 'enc:v1:'

/**
 * FIX CRITIQUE: lève une erreur explicite si aucun secret n'est configuré.
 * Avant : fallback sur 'triton-default-secret' (hardcodé → déchiffrable par
 * quiconque a accès au code source).
 * Après : l'application refuse de démarrer sans secret fort en production.
 */
function getSmtpEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET

  if (!secret) {
    // En développement local on tolère l'absence, mais on avertit clairement.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[SMTP] SESSION_SECRET ou JWT_SECRET doit être défini en production. ' +
        'Le chiffrement du mot de passe SMTP est impossible sans cette variable.'
      )
    }
    logger.warn(
      '[SMTP] SESSION_SECRET et JWT_SECRET sont absents. ' +
      'Utilisation d\'une clé de développement locale — NE PAS utiliser en production.'
    )
    // Clé de dev uniquement — explicitement marquée pour éviter toute confusion
    return crypto.createHash('sha256').update('dev-only-key-not-for-production').digest()
  }

  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Chiffre le mot de passe SMTP avant stockage en base (AES-256-GCM).
 */
export function encryptSmtpPassword(password: string): string {
  if (!password) return password
  if (password.startsWith(SMTP_PASSWORD_PREFIX)) return password

  const key = getSmtpEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${SMTP_PASSWORD_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

/**
 * Déchiffre le mot de passe SMTP (compatible legacy en clair).
 */
export function decryptSmtpPassword(value: string): string {
  if (!value) return value
  if (!value.startsWith(SMTP_PASSWORD_PREFIX)) return value

  const raw = value.slice(SMTP_PASSWORD_PREFIX.length)
  const [ivBase64, tagBase64, dataBase64] = raw.split(':')

  if (!ivBase64 || !tagBase64 || !dataBase64) {
    throw new Error('Format de mot de passe SMTP chiffré invalide')
  }

  const key = getSmtpEncryptionKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivBase64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'))

  return Buffer.concat([
    decipher.update(Buffer.from(dataBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

// ─── Sanitisation ─────────────────────────────────────────────────────────────

/**
 * Supprime les caractères de contrôle dangereux dans les en-têtes email
 * (protection header injection).
 */
export function sanitizeEmailHeader(value: string): string {
  return value.replace(/[\r\n\0]+/g, ' ').trim()
}

/**
 * FIX INJECTION HTML: échappe les caractères spéciaux HTML dans les données
 * utilisateur avant interpolation dans les templates.
 * Sans ça, un nom comme "<script>alert(1)</script>" serait injecté tel quel.
 */
function escapeHtml(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─── Transport SMTP ───────────────────────────────────────────────────────────

/**
 * Récupère la configuration SMTP depuis la base.
 */
export async function getSmtpSettings(): Promise<SmtpSettings | null> {
  const settings = await prisma.settings.findFirst()
  if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
    return null
  }

  let smtpPassword: string
  try {
    smtpPassword = decryptSmtpPassword(settings.smtpPassword)
  } catch (error) {
    logger.error('Impossible de déchiffrer le mot de passe SMTP', error)
    return null
  }

  return {
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort || 587,
    smtpUser: settings.smtpUser,
    smtpPassword,
    // FIX: nom d'affichage "Triton Club <club@gmail.com>" pour meilleure délivrabilité
    nomExpediteur: settings.nomClub || undefined,
  }
}

/**
 * FIX TYPE: caster explicitement en SMTPTransport.Options pour résoudre
 * l'ambiguïté de surcharge de nodemailer.createTransport().
 * (Erreur "host does not exist in type TransportOptions" avec @types/nodemailer récent)
 */
export function createSmtpTransport(settings: SmtpSettings) {
  const isGmailHost = /(^|\.)gmail\.com$/i.test(settings.smtpHost) || /(^|\.)googlemail\.com$/i.test(settings.smtpHost)
  const isGmailUser = /@gmail\.com$/i.test(settings.smtpUser) || /@googlemail\.com$/i.test(settings.smtpUser)
  const isGmail = isGmailHost || isGmailUser

  // Si c'est un compte Gmail, nettoyer automatiquement les espaces éventuels du mot de passe d'application (ex: "abcd efgh ijkl mnop")
  let cleanPassword = settings.smtpPassword || ''
  if (isGmail && cleanPassword) {
    cleanPassword = cleanPassword.replace(/\s+/g, '')
  }

  const transportOptions: SMTPTransport.Options & { family?: number } = {
    host: isGmail ? 'smtp.gmail.com' : settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpPort === 465,
    requireTLS: settings.smtpPort !== 465,
    auth: {
      user: settings.smtpUser?.trim(),
      pass: cleanPassword,
    },
    family: 4,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    dnsTimeout: 30000,
    tls: {
      minVersion: 'TLSv1.2',
      servername: isGmail ? 'smtp.gmail.com' : settings.smtpHost,
      rejectUnauthorized: false,
    },
  }

  return nodemailer.createTransport(transportOptions)
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const smtp = await getSmtpSettings()

    if (!smtp) {
      logger.warn('SMTP non configuré, email non envoyé')
      return false
    }

    const transporter = createSmtpTransport(smtp)

    // FIX: nom d'affichage dans le champ From
    const from = smtp.nomExpediteur
      ? `${smtp.nomExpediteur} <${smtp.smtpUser}>`
      : smtp.smtpUser

    await transporter.sendMail({
      from,
      to: sanitizeEmailHeader(options.to),
      subject: sanitizeEmailHeader(options.subject),
      html: options.html,
      text: options.text,
      replyTo: options.replyTo ? sanitizeEmailHeader(options.replyTo) : undefined,
      attachments: options.attachments,
    })

    logger.info(`Email envoyé à ${options.to}`)
    return true
  } catch (error) {
    logger.error('Erreur envoi email:', error)
    return false
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * FIX CSS DUPLIQUÉ: shell HTML commun à tous les templates.
 * Avant : les styles body/.container/.header/.footer étaient copiés-collés
 * dans chaque fonction → 4 copies à maintenir.
 * Après : un seul endroit à modifier pour changer la charte graphique.
 */
function buildEmailHtml(options: {
  accentColor: string
  headerContent: string
  bodyContent: string
  footerNote?: string
}): string {
  const footer = options.footerNote ?? 'Triton Club Cavaillon — Natation sportive et loisir'
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f0f0f0}
    .wrapper{max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden}
    .header{background:${options.accentColor};color:#fff;padding:20px;text-align:center}
    .header h1{margin:0;font-size:20px}
    .content{padding:24px}
    .info-box{background:#f9f9f9;padding:15px;border-radius:8px;margin:16px 0;border-left:4px solid ${options.accentColor}}
    .btn{display:inline-block;background:${options.accentColor};color:#fff !important;padding:11px 24px;text-decoration:none;border-radius:5px;font-weight:bold}
    .warning-box{background:#fff3e0;padding:15px;border-radius:8px;margin:16px 0;border-left:4px solid #ff9800}
    table.recap{width:100%;border-collapse:collapse;margin:16px 0}
    table.recap th{background:${options.accentColor};color:#fff;padding:10px;text-align:left}
    table.recap td{padding:9px 10px;border-bottom:1px solid #eee}
    .total-block{font-size:18px;font-weight:bold;text-align:right;padding:14px;background:#e3f2fd;border-radius:8px;margin-top:12px}
    .footer{text-align:center;padding:16px;color:#888;font-size:12px;border-top:1px solid #eee}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">${options.headerContent}</div>
    <div class="content">${options.bodyContent}</div>
    <div class="footer">${footer}</div>
  </div>
</body>
</html>`
}

// ─── Template : confirmation inscription ──────────────────────────────────────

export function getInscriptionConfirmationEmail(data: {
  prenomNageur: string
  nomNageur: string
  prenomParent: string
  nomParent: string
  groupe: string
  tarif: number | null
  plateformeInscription?: string // FIX: plus de valeur hardcodée
}) {
  // FIX INJECTION HTML: toutes les variables utilisateur sont échappées
  const prenomParent = escapeHtml(data.prenomParent)
  const nomParent    = escapeHtml(data.nomParent)
  const prenomNageur = escapeHtml(data.prenomNageur)
  const nomNageur    = escapeHtml(data.nomNageur)
  const groupe       = escapeHtml(data.groupe)
  const plateforme   = escapeHtml(data.plateformeInscription ?? 'MonClub')

  const subject = `Confirmation d'inscription — Triton Club Cavaillon`

  const html = buildEmailHtml({
    accentColor: '#00bcd4',
    headerContent: '<h1>Triton Club Cavaillon</h1>',
    bodyContent: `
      <h2>Confirmation de pré-inscription</h2>
      <p>Bonjour ${prenomParent} ${nomParent},</p>
      <p>Nous avons bien reçu votre demande de pré-inscription pour :</p>
      <div class="info-box">
        <p><strong>Nageur :</strong> ${prenomNageur} ${nomNageur}</p>
        <p><strong>Groupe :</strong> ${groupe}</p>
        ${data.tarif != null ? `<p><strong>Tarif :</strong> ${data.tarif} € / an</p>` : ''}
      </div>
      <h3>Prochaines étapes</h3>
      <ol>
        <li>Vous recevrez un lien d'accès à <strong>${plateforme}</strong> pour finaliser votre inscription</li>
        <li>Remplissez le questionnaire de santé</li>
        <li>Fournissez un certificat médical si nécessaire</li>
        <li>Procédez au paiement</li>
      </ol>
      <p>Un membre de notre équipe vous contactera sous 48h pour valider votre inscription.</p>
      <p>À très bientôt au bord du bassin !</p>
      <p><em>L'équipe du Triton Club Cavaillon</em></p>
    `,
  })

  const text = `Confirmation de pré-inscription — Triton Club Cavaillon

Bonjour ${data.prenomParent} ${data.nomParent},

Nous avons bien reçu votre demande de pré-inscription pour :
Nageur : ${data.prenomNageur} ${data.nomNageur}
Groupe : ${data.groupe}
${data.tarif != null ? `Tarif : ${data.tarif} € / an` : ''}

Prochaines étapes :
1. Vous recevrez un lien d'accès à ${data.plateformeInscription ?? 'MonClub'} pour finaliser votre inscription
2. Remplissez le questionnaire de santé
3. Fournissez un certificat médical si nécessaire
4. Procédez au paiement

Un membre de notre équipe vous contactera sous 48h.

L'équipe du Triton Club Cavaillon`

  return { subject, html, text }
}

// ─── Template : confirmation commande ────────────────────────────────────────

export function getCommandeConfirmationEmail(data: {
  numeroCommande: string
  prenom: string
  nom: string
  prenomNageur: string
  nomNageur: string
  lignes: Array<{
    nom: string
    quantite: number
    prix: number
    taille?: string | null
    couleur?: string | null
  }>
  total: number
}) {
  const prenom       = escapeHtml(data.prenom)
  const nom          = escapeHtml(data.nom)
  const prenomNageur = escapeHtml(data.prenomNageur)
  const nomNageur    = escapeHtml(data.nomNageur)
  const numeroCommande = escapeHtml(data.numeroCommande)

  const subject = `Commande #${data.numeroCommande} confirmée — Triton Club Cavaillon`

  const lignesHtml = data.lignes.map((l) => `
    <tr>
      <td>${escapeHtml(l.nom)}${l.taille ? `<br><small>Taille : ${escapeHtml(l.taille)}</small>` : ''}${l.couleur ? `<br><small>Couleur : ${escapeHtml(l.couleur)}</small>` : ''}</td>
      <td style="text-align:center">${l.quantite}</td>
      <td style="text-align:right">${(l.prix * l.quantite).toFixed(2)} €</td>
    </tr>`).join('')

  const html = buildEmailHtml({
    accentColor: '#00bcd4',
    headerContent: '<h1>Triton Club Cavaillon</h1><p style="margin:4px 0 0">Boutique</p>',
    bodyContent: `
      <h2>Merci pour votre commande !</h2>
      <div class="info-box" style="text-align:center">
        <p style="margin:0;font-size:13px">Numéro de commande</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:bold;color:#2e7d32">#${numeroCommande}</p>
      </div>
      <p>Bonjour ${prenom} ${nom},</p>
      <p>Votre commande a bien été enregistrée et votre paiement confirmé.</p>
      <p><strong>Pour :</strong> ${prenomNageur} ${nomNageur}</p>
      <table class="recap">
        <thead><tr><th>Article</th><th style="text-align:center">Qté</th><th style="text-align:right">Prix</th></tr></thead>
        <tbody>${lignesHtml}</tbody>
      </table>
      <div class="total-block">Total : ${data.total.toFixed(2)} €</div>
      <h3>Prochaines étapes</h3>
      <ol>
        <li>Votre commande sera préparée sous 24–48h</li>
        <li>Vous recevrez un email quand elle sera prête</li>
        <li>Retrait au club lors des entraînements</li>
      </ol>
      <p>À très bientôt !</p>
      <p><em>L'équipe du Triton Club Cavaillon</em></p>
    `,
  })

  const text = `Commande #${data.numeroCommande} confirmée — Triton Club Cavaillon

Bonjour ${data.prenom} ${data.nom},
Votre commande a bien été enregistrée. Pour : ${data.prenomNageur} ${data.nomNageur}

${data.lignes.map((l) => `- ${l.quantite}x ${l.nom} : ${(l.prix * l.quantite).toFixed(2)} €`).join('\n')}

Total : ${data.total.toFixed(2)} €`

  return { subject, html, text }
}

// ─── Template admin : nouvelle inscription ────────────────────────────────────

export function getAdminNewInscriptionEmail(data: {
  prenomNageur: string
  nomNageur: string
  prenomParent: string
  nomParent: string
  email: string
  telephone: string
  groupe: string
  tarif: number | null
}) {
  const prenomNageur = escapeHtml(data.prenomNageur)
  const nomNageur    = escapeHtml(data.nomNageur)
  const prenomParent = escapeHtml(data.prenomParent)
  const nomParent    = escapeHtml(data.nomParent)
  const email        = escapeHtml(data.email)
  const telephone    = escapeHtml(data.telephone)
  const groupe       = escapeHtml(data.groupe)

  const subject = `[ADMIN] Nouvelle pré-inscription — ${data.prenomNageur} ${data.nomNageur}`
  const adminUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/admin/inscriptions`

  const html = buildEmailHtml({
    accentColor: '#ff9800',
    headerContent: '<h1>Nouvelle pré-inscription</h1>',
    bodyContent: `
      <div class="info-box">
        <p class="label" style="color:#666;font-size:12px;text-transform:uppercase;margin:0">Nageur</p>
        <p style="font-weight:bold;margin:2px 0 12px">${prenomNageur} ${nomNageur}</p>
        <p class="label" style="color:#666;font-size:12px;text-transform:uppercase;margin:0">Groupe</p>
        <p style="font-weight:bold;margin:2px 0 12px">${groupe}</p>
        ${data.tarif != null ? `<p class="label" style="color:#666;font-size:12px;text-transform:uppercase;margin:0">Tarif</p><p style="font-weight:bold;margin:2px 0 0">${data.tarif} € / an</p>` : ''}
      </div>
      <div class="info-box">
        <p class="label" style="color:#666;font-size:12px;text-transform:uppercase;margin:0">Parent / Responsable</p>
        <p style="font-weight:bold;margin:2px 0 12px">${prenomParent} ${nomParent}</p>
        <p class="label" style="color:#666;font-size:12px;text-transform:uppercase;margin:0">Email</p>
        <p style="margin:2px 0 12px"><a href="mailto:${email}">${email}</a></p>
        <p class="label" style="color:#666;font-size:12px;text-transform:uppercase;margin:0">Téléphone</p>
        <p style="margin:2px 0 0"><a href="tel:${telephone}">${telephone}</a></p>
      </div>
      <p style="text-align:center;margin-top:20px">
        <a href="${adminUrl}" class="btn">Voir les inscriptions</a>
      </p>
    `,
  })

  const text = `NOUVELLE PRÉ-INSCRIPTION

Nageur : ${data.prenomNageur} ${data.nomNageur}
Groupe : ${data.groupe}
${data.tarif != null ? `Tarif : ${data.tarif} € / an` : ''}

Parent : ${data.prenomParent} ${data.nomParent}
Email : ${data.email}
Tél : ${data.telephone}`

  return { subject, html, text }
}

// ─── Template admin : nouvelle commande ──────────────────────────────────────

export function getAdminNewCommandeEmail(data: {
  numeroCommande: string
  prenom: string
  nom: string
  email: string
  prenomNageur: string
  nomNageur: string
  lignes: Array<{
    nom: string
    quantite: number
    prix: number
    taille?: string | null
    couleur?: string | null
  }>
  total: number
}) {
  const prenom       = escapeHtml(data.prenom)
  const nom          = escapeHtml(data.nom)
  const email        = escapeHtml(data.email)
  const prenomNageur = escapeHtml(data.prenomNageur)
  const nomNageur    = escapeHtml(data.nomNageur)
  const numeroCommande = escapeHtml(data.numeroCommande)

  const subject = `[ADMIN] Nouvelle commande #${data.numeroCommande} — ${data.total.toFixed(2)} €`
  const adminUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/admin/boutique?tab=commandes`

  const lignesHtml = data.lignes.map((l) => `
    <tr>
      <td>${escapeHtml(l.nom)}${l.taille ? `<br><small>Taille : ${escapeHtml(l.taille)}</small>` : ''}${l.couleur ? `<br><small>Couleur : ${escapeHtml(l.couleur)}</small>` : ''}</td>
      <td style="text-align:center">${l.quantite}</td>
      <td style="text-align:right">${(l.prix * l.quantite).toFixed(2)} €</td>
    </tr>`).join('')

  const html = buildEmailHtml({
    accentColor: '#4caf50',
    headerContent: `<h1>Nouvelle commande payée</h1><div style="font-size:24px;font-weight:bold;margin-top:6px">#${numeroCommande}</div>`,
    bodyContent: `
      <div class="info-box">
        <p class="label" style="color:#666;font-size:12px;text-transform:uppercase;margin:0">Client</p>
        <p style="font-weight:bold;margin:2px 0 4px">${prenom} ${nom}</p>
        <p style="margin:0"><a href="mailto:${email}">${email}</a></p>
        <p class="label" style="color:#666;font-size:12px;text-transform:uppercase;margin:12px 0 0">Pour le nageur</p>
        <p style="font-weight:bold;margin:2px 0 0">${prenomNageur} ${nomNageur}</p>
      </div>
      <table class="recap">
        <thead><tr><th>Article</th><th style="text-align:center">Qté</th><th style="text-align:right">Prix</th></tr></thead>
        <tbody>${lignesHtml}</tbody>
      </table>
      <div class="total-block">Total : ${data.total.toFixed(2)} €</div>
      <p style="text-align:center;margin-top:20px">
        <a href="${adminUrl}" class="btn">Gérer les commandes</a>
      </p>
    `,
  })

  const text = `NOUVELLE COMMANDE #${data.numeroCommande}

Client : ${data.prenom} ${data.nom} — ${data.email}
Pour : ${data.prenomNageur} ${data.nomNageur}

${data.lignes.map((l) => `- ${l.quantite}x ${l.nom} : ${(l.prix * l.quantite).toFixed(2)} €`).join('\n')}

Total : ${data.total.toFixed(2)} €`

  return { subject, html, text }
}

// ─── Notification admin générique ─────────────────────────────────────────────

/**
 * FIX DOUBLE DB: accepte les settings en paramètre optionnel pour éviter
 * une deuxième requête DB quand l'appelant a déjà chargé les settings.
 */
export async function sendAdminNotification(
  emailData: { subject: string; html: string; text: string },
  settingsOverride?: { emailNotification?: string | null; smtpUser?: string | null }
) {
  let adminEmail: string | null | undefined

  if (settingsOverride) {
    adminEmail = settingsOverride.emailNotification || settingsOverride.smtpUser
  } else {
    const settings = await prisma.settings.findFirst({
      select: { emailNotification: true, smtpUser: true },
    })
    adminEmail = settings?.emailNotification || settings?.smtpUser
  }

  if (!adminEmail) {
    logger.warn("Pas d'email admin configuré pour les notifications")
    return false
  }

  return sendEmail({
    to: adminEmail,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  })
}

// ─── Template : réinitialisation mot de passe ─────────────────────────────────

export function getPasswordResetEmail(data: {
  prenom: string
  resetUrl: string
  userType: 'coach' | 'admin'
}) {
  const prenom = escapeHtml(data.prenom)
  // resetUrl vient du serveur (token interne), pas d'un utilisateur — pas besoin d'escapeHtml
  // mais on valide qu'il commence bien par l'URL de base pour éviter une open redirect
  const safeResetUrl = data.resetUrl.startsWith(process.env.NEXT_PUBLIC_BASE_URL ?? 'http')
    ? data.resetUrl
    : '#invalid-url'

  const userTypeLabel = data.userType === 'coach' ? 'espace coach' : 'espace administration'
  const subject = `Réinitialisation de votre mot de passe — Triton Club Cavaillon`

  const html = buildEmailHtml({
    accentColor: '#00bcd4',
    headerContent: '<h1>Triton Club Cavaillon</h1>',
    bodyContent: `
      <h2>Réinitialisation de mot de passe</h2>
      <p>Bonjour ${prenom},</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe pour l'${userTypeLabel} du Triton Club Cavaillon.</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${safeResetUrl}" class="btn" style="color:#fff">Réinitialiser mon mot de passe</a>
      </p>
      <div class="warning-box">
        <strong>⚠️ Ce lien expire dans 1 heure.</strong>
        <p style="margin:6px 0 0">Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.</p>
      </div>
      <p style="font-size:13px;color:#666">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
      <p style="word-break:break-all;background:#e3f2fd;padding:10px;border-radius:5px;font-size:12px">${safeResetUrl}</p>
      <p><em>L'équipe du Triton Club Cavaillon</em></p>
    `,
  })

  const text = `Réinitialisation de mot de passe — Triton Club Cavaillon

Bonjour ${data.prenom},

Vous avez demandé à réinitialiser votre mot de passe pour l'${userTypeLabel} du Triton Club Cavaillon.

Cliquez sur ce lien pour réinitialiser votre mot de passe :
${safeResetUrl}

⚠️ Ce lien expire dans 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

L'équipe du Triton Club Cavaillon`

  return { subject, html, text }
}

