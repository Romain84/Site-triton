export {
  sendEmail,
  sendAdminNotification,
  getInscriptionConfirmationEmail,
  getCommandeConfirmationEmail,
  getAdminNewInscriptionEmail,
  getAdminNewCommandeEmail,
  getPasswordResetEmail,
  getSmtpSettings,
  createSmtpTransport,
  sanitizeEmailHeader,
  encryptSmtpPassword,
  decryptSmtpPassword,
} from './service'

export {
  queueEmail,
  triggerQueueProcessing,
  processEmailQueue,
} from './queue'

export type { SmtpSettings } from './service'
