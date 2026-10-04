/**
 * Utilitaires de formatage des durées et affichages pour la facturation des coachs.
 * Isolé de Prisma pour pouvoir être importé en toute sécurité par les composants Client ('use client').
 */

export function formatMinutesEnHM(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '0h00'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h${m.toString().padStart(2, '0')}`
}

export function formatHeuresEnHM(heures?: number | null): string {
  if (heures === undefined || heures === null || Math.abs(heures) < 0.001) return '0h00'
  const isNeg = heures < 0
  const totalMin = Math.round(Math.abs(heures) * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${isNeg ? '− ' : ''}${h}h${m.toString().padStart(2, '0')}`
}
