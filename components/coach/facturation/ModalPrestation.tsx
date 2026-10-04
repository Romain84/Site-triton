'use client'

import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'

interface ModalPrestationProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (description: string, heures: number, date?: string) => Promise<boolean | void>
  isSubmitting: boolean
}

export default function ModalPrestation({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: ModalPrestationProps) {
  const [description, setDescription] = useState('')
  const [heures, setHeures] = useState('1')
  const [date, setDate] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !heures) return
    const h = parseFloat(heures)
    if (isNaN(h) || h <= 0) return

    await onSubmit(description.trim(), h, date || undefined)
    setDescription('')
    setHeures('1')
    setDate('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-slate-950">
              Ajouter une prestation manuelle
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Description *</label>
            <input
              type="text"
              required
              placeholder="Ex: Stage vacances, réunion technique, formation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-600 focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Nombre d&apos;heures *</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                required
                value={heures}
                onChange={(e) => setHeures(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-600 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Date (optionnelle)</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-cyan-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !description.trim() || !heures}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Ajouter</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
