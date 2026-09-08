// Coordonnées GPS de la Piscine Alphonse Roudière à Cavaillon (point de départ officiel)
export const DEPART_CAVAILLON = {
  nom: 'Piscine Alphonse Roudière, Cavaillon',
  adresse: 'Avenue Jean Moulin, 84300 Cavaillon',
  lat: 43.833249,
  lon: 5.039399,
}

// Catalogue des piscines et bassins régionaux fréquents (coordonnées et km indicatifs)
export interface PiscineRegionale {
  id: string
  nom: string
  ville: string
  departement: string
  lat: number
  lon: number
  distanceKmEstimee: number
}

export const PISCINES_REGIONALES: PiscineRegionale[] = [
  { id: 'aix-yves-blanc', nom: 'Piscine Yves Blanc', ville: 'Aix-en-Provence', departement: '13', lat: 43.5186, lon: 5.4606, distanceKmEstimee: 56 },
  { id: 'marseille-cnm', nom: 'Cercle des Nageurs de Marseille', ville: 'Marseille', departement: '13', lat: 43.2905, lon: 5.3524, distanceKmEstimee: 78 },
  { id: 'marseille-coubertin', nom: 'Piscine Pierre de Coubertin', ville: 'Marseille', departement: '13', lat: 43.2625, lon: 5.4055, distanceKmEstimee: 82 },
  { id: 'istres-nautipolis', nom: "Centre Aquatique d'Istres", ville: 'Istres', departement: '13', lat: 43.5133, lon: 4.9880, distanceKmEstimee: 46 },
  { id: 'salon-centre-nautique', nom: 'Centre Nautique de Salon', ville: 'Salon-de-Provence', departement: '13', lat: 43.6401, lon: 5.0972, distanceKmEstimee: 26 },
  { id: 'fos-complexe', nom: 'Piscine Municipale de Fos', ville: 'Fos-sur-Mer', departement: '13', lat: 43.4384, lon: 4.9458, distanceKmEstimee: 55 },
  { id: 'arles-guy-berthier', nom: 'Piscine Guy Berthier', ville: 'Arles', departement: '13', lat: 43.6653, lon: 4.6306, distanceKmEstimee: 45 },
  { id: 'toulon-port-marchand', nom: 'Piscine du Port Marchand', ville: 'Toulon', departement: '83', lat: 43.1186, lon: 5.9381, distanceKmEstimee: 122 },
  { id: 'hyeres-complexe', nom: "Complexe Aquatique d'Hyères", ville: 'Hyères', departement: '83', lat: 43.1205, lon: 6.1286, distanceKmEstimee: 139 },
  { id: 'saint-raphael', nom: 'Stade Nautique Alain Chateigner', ville: 'Saint-Raphaël', departement: '83', lat: 43.4252, lon: 6.7684, distanceKmEstimee: 168 },
  { id: 'antibes-jean-bouin', nom: "Stade Nautique d'Antibes", ville: 'Antibes', departement: '06', lat: 43.5855, lon: 7.1085, distanceKmEstimee: 196 },
  { id: 'nice-jean-bouin', nom: 'Piscine Olympique Jean Bouin', ville: 'Nice', departement: '06', lat: 43.7051, lon: 7.2831, distanceKmEstimee: 218 },
  { id: 'valbonne-nautipolis', nom: 'Complexe Aquatique Nautipolis', ville: 'Sophia Antipolis', departement: '06', lat: 43.6212, lon: 7.0423, distanceKmEstimee: 190 },
  { id: 'nimes-nemausa', nom: 'Stade Nautique Nemausa', ville: 'Nîmes', departement: '30', lat: 43.8167, lon: 4.3601, distanceKmEstimee: 62 },
  { id: 'montpellier-antigone', nom: "Piscine Olympique d'Antigone", ville: 'Montpellier', departement: '34', lat: 43.6074, lon: 3.8986, distanceKmEstimee: 108 },
  { id: 'ales-toboggan', nom: 'Centre Nautique Le Toboggan', ville: 'Alès', departement: '30', lat: 44.1281, lon: 4.0817, distanceKmEstimee: 98 },
  { id: 'gap-fontreyne', nom: 'Stade Nautique de Fontreyne', ville: 'Gap', departement: '05', lat: 44.5492, lon: 6.0684, distanceKmEstimee: 132 },
  { id: 'manosque-aqualudique', nom: 'Centre Aqualudique de Manosque', ville: 'Manosque', departement: '04', lat: 43.8344, lon: 5.7891, distanceKmEstimee: 66 },
  { id: 'digne-eaux-chaudes', nom: 'Complexe Aquatique des Eaux Chaudes', ville: 'Digne-les-Bains', departement: '04', lat: 44.0921, lon: 6.2307, distanceKmEstimee: 116 },
]

// Calcul de distance à vol d'oiseau (Haversine) en km
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Rayon Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function buildGoogleMapsUrl(destination: string): string {
  const origin = 'Piscine Alphonse Roudière, 84300 Cavaillon'
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`
}

export interface PiscineFrequenteConfig {
  id: string
  nom: string
  distanceKm: number
}

export function getDefaultPiscinesFrequentes(): PiscineFrequenteConfig[] {
  return [
    { id: 'aix', nom: 'Piscine Yves Blanc, Aix-en-Provence', distanceKm: 56 },
    { id: 'marseille', nom: 'Piscine Pierre de Coubertin, Marseille', distanceKm: 82 },
    { id: 'istres', nom: "Centre Aquatique d'Istres", distanceKm: 46 },
    { id: 'salon', nom: 'Centre Nautique de Salon-de-Provence', distanceKm: 26 },
    { id: 'fos', nom: 'Piscine Municipale de Fos-sur-Mer', distanceKm: 55 },
    { id: 'arles', nom: 'Piscine Guy Berthier, Arles', distanceKm: 45 },
    { id: 'toulon', nom: 'Piscine du Port Marchand, Toulon', distanceKm: 122 },
    { id: 'hyeres', nom: "Complexe Aquatique d'Hyères", distanceKm: 139 },
    { id: 'saint-raphael', nom: 'Stade Nautique Alain Chateigner, Saint-Raphaël', distanceKm: 168 },
    { id: 'antibes', nom: "Stade Nautique d'Antibes Jean Bouin", distanceKm: 196 },
    { id: 'nice', nom: 'Piscine Jean Bouin, Nice', distanceKm: 218 },
    { id: 'nimes', nom: 'Stade Nautique Nemausa, Nîmes', distanceKm: 62 },
    { id: 'montpellier', nom: "Piscine Olympique d'Antigone, Montpellier", distanceKm: 108 },
    { id: 'gap', nom: 'Stade Nautique de Fontreyne, Gap', distanceKm: 132 },
    { id: 'manosque', nom: 'Centre Aqualudique de Manosque', distanceKm: 66 },
    { id: 'digne', nom: 'Complexe Aquatique des Eaux Chaudes, Digne', distanceKm: 116 },
  ]
}

export function parsePiscinesFrequentes(rawJson: string | null | undefined): PiscineFrequenteConfig[] {
  if (!rawJson) return getDefaultPiscinesFrequentes()
  try {
    const parsed = JSON.parse(rawJson)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((p: any, idx: number) => ({
        id: p.id || `piscine_${idx}`,
        nom: String(p.nom || ''),
        distanceKm: Number(p.distanceKm) || 0,
      }))
    }
    return getDefaultPiscinesFrequentes()
  } catch {
    return getDefaultPiscinesFrequentes()
  }
}
