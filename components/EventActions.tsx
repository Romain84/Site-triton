'use client'

import { parseFicheDescription } from '@/lib/calendar/import-parser'

interface EventActionsProps {
  event: {
    title: string
    date: Date
    heureDebut?: string | null
    heureFin?: string | null
    description?: string | null
    lieu?: string | null
    pdfReglement?: string | null
  }
}

export default function EventActions({ event }: EventActionsProps) {
  const createGoogleCalendarUrl = () => {
    const startDate = new Date(event.date)

    // Format dates for Google Calendar (YYYYMMDDTHHmmss)
    let startDateTime = ''
    let endDateTime = ''

    if (event.heureDebut) {
      // Parse heureDebut (format: "HH:MM")
      const [hours, minutes] = event.heureDebut.split(':')
      startDate.setHours(parseInt(hours), parseInt(minutes))

      const endDate = new Date(startDate)
      if (event.heureFin) {
        const [endHours, endMinutes] = event.heureFin.split(':')
        endDate.setHours(parseInt(endHours), parseInt(endMinutes))
      } else {
        // Default to 1 hour duration
        endDate.setHours(endDate.getHours() + 1)
      }

      startDateTime = formatGoogleDate(startDate)
      endDateTime = formatGoogleDate(endDate)
    } else {
      // All day event
      startDateTime = formatGoogleDate(startDate).split('T')[0]
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)
      endDateTime = formatGoogleDate(endDate).split('T')[0]
    }

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${startDateTime}/${endDateTime}`,
      details: event.description || '',
      location: event.lieu || '',
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  const formatGoogleDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}${month}${day}T${hours}${minutes}${seconds}`
  }

  const handleAddToCalendar = () => {
    const url = createGoogleCalendarUrl()
    window.open(url, '_blank')
  }

  const fiche = parseFicheDescription(event.description)
  const hasPage = !!(event.pdfReglement && fiche?.pageNumber)

  const handleViewReglement = () => {
    if (event.pdfReglement && fiche?.pageNumber) {
      const url = `${event.pdfReglement}#page=${fiche.pageNumber}`
      window.open(url, '_blank')
    }
  }

  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {/* Google Calendar Button */}
      <button
        onClick={handleAddToCalendar}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
        </svg>
        Ajouter au calendrier
      </button>

      {/* PDF Règlement Button */}
      {hasPage && (
        <button
          onClick={handleViewReglement}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8v-2zm0-4h8v2H8v-2zm0-4h5v2H8V7z"/>
          </svg>
          Règlement
        </button>
      )}
    </div>
  )
}
