'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

interface LocationPoint {
  lat: number
  lng: number
  ville: string
  pays: string
  codePays: string
  count: number
}

interface LeafletTileMapProps {
  locations: LocationPoint[]
  mapStyle: 'dark' | 'light' | 'satellite'
  onSelectCity?: (loc: LocationPoint) => void
}

export default function LeafletTileMap({ locations, mapStyle, onSelectCity }: LeafletTileMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    if (!mapContainerRef.current) return
    let isMounted = true

    import('leaflet').then((LModule) => {
      if (!isMounted || !mapContainerRef.current) return
      const L = LModule.default || LModule

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapInstanceRef.current) {
        if ((mapContainerRef.current as any)._leaflet_id) {
          (mapContainerRef.current as any)._leaflet_id = null
        }

        const initialLat = locations.length > 0 ? locations[0].lat : 43.8333
        const initialLng = locations.length > 0 ? locations[0].lng : 5.0333

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 6,
          zoomControl: false,
        })

        L.control.zoom({ position: 'topleft' }).addTo(map)
        mapInstanceRef.current = map
      }

      const map = mapInstanceRef.current

      map.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer)
        }
      })

      let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      let attribution = '&copy; OpenStreetMap contributors'
      let subdomains = ['a', 'b', 'c']

      if (mapStyle === 'dark') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        attribution = '&copy; OpenStreetMap &copy; CARTO'
        subdomains = ['a', 'b', 'c', 'd']
      } else if (mapStyle === 'light') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        attribution = '&copy; OpenStreetMap &copy; CARTO'
        subdomains = ['a', 'b', 'c', 'd']
      } else if (mapStyle === 'satellite') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        attribution = '&copy; Esri World Imagery'
        subdomains = []
      }

      const tileOptions: any = { attribution, maxZoom: 19 }
      if (subdomains.length > 0) tileOptions.subdomains = subdomains

      const tileLayer = L.tileLayer(tileUrl, tileOptions)
      tileLayer.on('tileerror', () => {
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
      })
      tileLayer.addTo(map)

      markersRef.current.forEach((m) => map.removeLayer(m))
      markersRef.current = []

      const totalVisits = locations.reduce((sum, l) => sum + l.count, 0) || 1
      const maxCount = Math.max(...locations.map((l) => l.count), 1)

      if (locations.length > 0) {
        locations.forEach((loc) => {
          const sizeRatio = loc.count / maxCount
          const radius = Math.max(6, Math.min(32, Math.sqrt(loc.count) * 3.8 + 3))

          let color = '#10b981'
          let fillColor = '#10b981'

          if (loc.count >= 15 || sizeRatio > 0.35) {
            color = '#f43f5e'
            fillColor = '#ef4444'
          } else if (loc.count >= 5 || sizeRatio > 0.12) {
            color = '#f59e0b'
            fillColor = '#f59e0b'
          }

          const pct = Math.round((loc.count / totalVisits) * 100)

          const marker = L.circleMarker([loc.lat, loc.lng], {
            radius,
            color,
            weight: 2,
            opacity: 0.9,
            fillColor,
            fillOpacity: 0.5,
          }).addTo(map)

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; padding: 6px; text-align: center; min-width: 140px;">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; display: flex; align-items: center; justify-content: center; gap: 4px;">
                📍 ${loc.ville} <span style="font-size: 11px; color: #64748b;">(${loc.codePays})</span>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${loc.pays}</div>
              <div style="margin-top: 8px; display: inline-block; padding: 4px 10px; background: linear-gradient(to right, #2563eb, #3b82f6); color: white; border-radius: 9999px; font-weight: 800; font-size: 11px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${loc.count} visite${loc.count > 1 ? 's' : ''} (${pct}%)
              </div>
            </div>
          `

          marker.bindPopup(popupContent)
          if (onSelectCity) {
            marker.on('click', () => onSelectCity(loc))
          }
          markersRef.current.push(marker)
        })

        if (locations.length > 1) {
          const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]))
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 })
        }
      }

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize()
        }
      }, 150)
    })

    return () => {
      isMounted = false
    }
  }, [locations, mapStyle, onSelectCity])

  return <div ref={mapContainerRef} className="w-full h-full min-h-[520px] relative z-10" />
}
