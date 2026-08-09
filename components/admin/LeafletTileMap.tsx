'use client'

import { useEffect, useRef, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'

interface LocationPoint {
  lat: number
  lng: number
  ville: string
  pays: string
  codePays: string
  codePostal?: string
  region?: string
  count: number
}

interface LeafletTileMapProps {
  locations: LocationPoint[]
  mapStyle: 'dark' | 'light' | 'satellite'
  onSelectCity?: (loc: LocationPoint) => void
  selectedCity?: LocationPoint | null
  enableClustering?: boolean
}

export default function LeafletTileMap({ locations, mapStyle, onSelectCity, selectedCity, enableClustering = true }: LeafletTileMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)

  // Inject clustering CSS dynamically
  useEffect(() => {
    if (!enableClustering) return
    const id = 'markercluster-css'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css'
    document.head.appendChild(link)
    const link2 = document.createElement('link')
    link2.id = id + '-default'
    link2.rel = 'stylesheet'
    link2.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css'
    document.head.appendChild(link2)
  }, [enableClustering])

  const flyToLocation = useCallback((lat: number, lng: number, zoom: number = 12) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.5, easeLinearity: 0.25 })
    }
  }, [])

  // FlyTo when selectedCity changes
  useEffect(() => {
    if (selectedCity) {
      flyToLocation(selectedCity.lat, selectedCity.lng, 13)
    }
  }, [selectedCity, flyToLocation])

  useEffect(() => {
    if (!mapContainerRef.current) return
    let isMounted = true

    const initMap = async () => {
      const LModule = await import('leaflet')
      if (!isMounted || !mapContainerRef.current) return
      const L = LModule.default || LModule

      // Fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Initialize map only once
      if (!mapInstanceRef.current) {
        if ((mapContainerRef.current as any)._leaflet_id) {
          (mapContainerRef.current as any)._leaflet_id = null
        }
        const map = L.map(mapContainerRef.current, {
          center: [46.603354, 2.346301], // Centre de la France
          zoom: 6,
          zoomControl: false,
          attributionControl: true,
        })
        L.control.zoom({ position: 'bottomright' }).addTo(map)
        mapInstanceRef.current = map
      }

      const map = mapInstanceRef.current

      // Update tile layer
      map.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) map.removeLayer(layer)
      })

      let tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      let attribution = '&copy; OpenStreetMap &copy; CARTO'
      let subdomains = ['a', 'b', 'c', 'd']

      if (mapStyle === 'dark') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
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

      // Remove old markers
      if (markersLayerRef.current) {
        map.removeLayer(markersLayerRef.current)
        markersLayerRef.current = null
      }

      const totalVisits = locations.reduce((sum, l) => sum + l.count, 0) || 1
      const maxCount = Math.max(...locations.map((l) => l.count), 1)

      // Create markers
      const markers: any[] = []

      locations.forEach((loc) => {
        const sizeRatio = loc.count / maxCount
        const radius = Math.max(7, Math.min(35, Math.sqrt(loc.count) * 4 + 4))

        let color = '#10b981'
        let fillColor = '#10b981'
        if (loc.count >= 15 || sizeRatio > 0.35) {
          color = '#f43f5e'; fillColor = '#ef4444'
        } else if (loc.count >= 5 || sizeRatio > 0.12) {
          color = '#f59e0b'; fillColor = '#f59e0b'
        }

        const pct = Math.round((loc.count / totalVisits) * 100)

        const marker = L.circleMarker([loc.lat, loc.lng], {
          radius,
          color,
          weight: 2.5,
          opacity: 0.95,
          fillColor,
          fillOpacity: 0.55,
        })

        // Enhanced popup with more info
        const postalLine = loc.codePostal ? '<div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">📮 Code postal : <strong>' + loc.codePostal + '</strong></div>' : ''
        const regionLine = loc.region ? '<div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">🏛️ Région : <strong>' + loc.region + '</strong></div>' : ''
        const popupContent = `
          <div style="font-family: 'Inter', system-ui, sans-serif; padding: 8px 4px; min-width: 180px;">
            <div style="font-weight: 800; font-size: 14px; color: #0f172a; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 16px;">📍</span>
              <span>${loc.ville}</span>
              <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">${loc.codePays}</span>
            </div>
            ${postalLine}
            ${regionLine}
            <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">🌍 ${loc.pays}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-bottom: 8px;">📐 ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}</div>
            <div style="display: inline-block; padding: 5px 14px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border-radius: 9999px; font-weight: 800; font-size: 12px; box-shadow: 0 2px 8px rgba(37,99,235,0.3);">
              ${loc.count} visite${loc.count > 1 ? 's' : ''} · ${pct}%
            </div>
          </div>
        `
        marker.bindPopup(popupContent, { className: 'leaflet-popup-enhanced', maxWidth: 250 })

        // Hover effect
        marker.on('mouseover', function() {
          marker.setStyle({ weight: 4, fillOpacity: 0.8 })
          marker.openPopup()
        })
        marker.on('mouseout', function() {
          marker.setStyle({ weight: 2.5, fillOpacity: 0.55 })
        })
        if (onSelectCity) {
          marker.on('click', () => {
            onSelectCity(loc)
            map.flyTo([loc.lat, loc.lng], 12, { duration: 1.2 })
          })
        }
        markers.push(marker)
      })

      // Add markers - with or without clustering
      if (enableClustering && locations.length > 5) {
        try {
          // Dynamically load markercluster
          const MCScript = document.getElementById('leaflet-markercluster-js')
          if (!MCScript) {
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement('script')
              script.id = 'leaflet-markercluster-js'
              script.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
              script.onload = () => resolve()
              script.onerror = () => reject()
              document.head.appendChild(script)
            })
          }

          // Wait a tick for the plugin to register
          await new Promise(r => setTimeout(r, 100))

          if ((L as any).markerClusterGroup) {
            const clusterGroup = (L as any).markerClusterGroup({
              maxClusterRadius: 50,
              spiderfyOnMaxZoom: true,
              showCoverageOnHover: true,
              zoomToBoundsOnClick: true,
              iconCreateFunction: (cluster: any) => {
                const count = cluster.getChildCount()
                let sizeVal = 34
                let bgColor = '#10b981'
                let fontSize = 11
                if (count >= 20) { sizeVal = 50; bgColor = '#ef4444'; fontSize = 15 }
                else if (count >= 8) { sizeVal = 42; bgColor = '#f59e0b'; fontSize = 13 }
                const html = '<div style="background:' + bgColor + ';color:white;width:' + sizeVal + 'px;height:' + sizeVal + 'px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:' + fontSize + 'px;box-shadow:0 3px 12px rgba(0,0,0,0.3);border:3px solid rgba(255,255,255,0.6);font-family:system-ui,sans-serif;">' + count + '</div>'
                return L.divIcon({
                  html,
                  className: '',
                  iconSize: L.point(sizeVal, sizeVal),
                })
              },
            })
            markers.forEach(m => clusterGroup.addLayer(m))
            map.addLayer(clusterGroup)
            markersLayerRef.current = clusterGroup
          } else {
            // Fallback: add markers directly
            const group = L.layerGroup(markers)
            group.addTo(map)
            markersLayerRef.current = group
          }
        } catch {
          // Fallback if clustering fails
          const group = L.layerGroup(markers)
          group.addTo(map)
          markersLayerRef.current = group
        }
      } else {
        const group = L.layerGroup(markers)
        group.addTo(map)
        markersLayerRef.current = group
      }

      // Fit bounds
      if (locations.length > 1) {
        const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]))
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 })
      } else if (locations.length === 1) {
        map.setView([locations[0].lat, locations[0].lng], 10)
      }

      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize()
      }, 200)
    }

    initMap()

    return () => { isMounted = false }
  }, [locations, mapStyle, onSelectCity, enableClustering])

  return <div ref={mapContainerRef} className="w-full h-full min-h-[520px] relative z-10" />
}
