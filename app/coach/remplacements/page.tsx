'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CoachRemplacementsPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/coach/planning-tournant')
  }, [router])
  return null
}

