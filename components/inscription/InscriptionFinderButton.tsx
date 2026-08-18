'use client'

import { useState } from 'react'
import { Compass } from 'lucide-react'
import GroupeFinder from '@/components/GroupeFinder'

export default function InscriptionFinderButton() {
  const [showFinder, setShowFinder] = useState(false)

  return (
    <>
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <span className="text-2xl p-2 bg-white/10 rounded-xl shrink-0">🧭</span>
          <div>
            <h4 className="text-sm font-black text-white">Un doute sur le groupe à choisir pour votre inscription ?</h4>
            <p className="text-xs text-slate-300 font-light mt-0.5">Testez notre simulateur interactif pour trouver le bon groupe et ses créneaux en 3 clics.</p>
          </div>
        </div>
        <button
          onClick={() => setShowFinder(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <Compass className="w-4 h-4" />
          <span>Trouver mon groupe</span>
        </button>
      </div>

      {showFinder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl my-8">
            <GroupeFinder onClose={() => setShowFinder(false)} />
          </div>
        </div>
      )}
    </>
  )
}
