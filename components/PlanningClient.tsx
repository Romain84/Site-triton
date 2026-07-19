'use client'

import { useState } from 'react'

interface Coach {
  id: string
  prenom: string
  nom: string | null
  specialites: string | null
}

interface Planning {
  id: string
  jourSemaine: string
  heureDebut: string
  heureFin: string
  groupeId: string
  groupe: {
    id: string
    nom: string
  }
  coachId: string | null
  coach: Coach | null
  lieu: string | null
  couleur: string | null
  actif: boolean
}

interface Groupe {
  id: string
  nom: string
}

interface PlanningClientProps {
  plannings: Planning[]
  groupes: Groupe[]
  coaches: Coach[]
}

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function PlanningClient({ plannings, groupes, coaches }: PlanningClientProps) {
  const [selectedGroupe, setSelectedGroupe] = useState<string>('all')
  const [selectedJour, setSelectedJour] = useState<string>('all')

  const filteredPlannings = plannings.filter((planning) => {
    const groupeMatch = selectedGroupe === 'all' || planning.groupeId === selectedGroupe
    const jourMatch = selectedJour === 'all' || planning.jourSemaine.toLowerCase() === selectedJour.toLowerCase()
    return groupeMatch && jourMatch
  })

  const planningsByJour = JOURS.reduce((acc, jour) => {
    acc[jour] = filteredPlannings.filter(
      (p) => p.jourSemaine.toLowerCase() === jour.toLowerCase()
    )
    return acc
  }, {} as Record<string, typeof filteredPlannings>)

  return (
    <div>
      {/* Filtres */}
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Filtres</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Groupe / Niveau</label>
            <select
              value={selectedGroupe}
              onChange={(e) => setSelectedGroupe(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Tous les groupes</option>
              {groupes.map((groupe) => (
                <option key={groupe.id} value={groupe.id}>
                  {groupe.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Jour de la semaine</label>
            <select
              value={selectedJour}
              onChange={(e) => setSelectedJour(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Tous les jours</option>
              {JOURS.map((jour) => (
                <option key={jour} value={jour}>
                  {jour}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(selectedGroupe !== 'all' || selectedJour !== 'all') && (
          <button
            onClick={() => {
              setSelectedGroupe('all')
              setSelectedJour('all')
            }}
            className="mt-4 text-primary hover:text-primary-dark font-medium text-sm"
          >
            ✕ Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Coachs section */}
      {coaches.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Nos Coachs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coaches.map((coach) => (
              <div key={coach.id} className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {coach.prenom[0]}
                </div>
                <div>
                  <p className="font-bold">{coach.prenom}</p>
                  {coach.specialites && (
                    <p className="text-sm text-gray-600">{coach.specialites}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planning by day */}
      <div className="space-y-8">
        {JOURS.map((jour) => {
          const coursJour = planningsByJour[jour] || []
          if (coursJour.length === 0) return null

          return (
            <div key={jour}>
              <h2 className="text-3xl font-bold mb-4 text-primary">{jour}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coursJour.map((cours) => (
                  <div
                    key={cours.id}
                    className="card p-5"
                    style={cours.couleur ? { borderLeft: `4px solid ${cours.couleur}` } : {}}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg">{cours.groupe.nom}</h3>
                      <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                        {cours.heureDebut} - {cours.heureFin}
                      </span>
                    </div>

                    {cours.lieu && (
                      <p className="text-sm text-gray-600 mb-2">
                        📍 {cours.lieu}
                      </p>
                    )}

                    {cours.coach && (
                      <p className="text-sm text-gray-700">
                        👤 Coach : {cours.coach.prenom}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {filteredPlannings.length === 0 && (
        <div className="text-center py-20 card">
          <p className="text-gray-600 text-lg">
            Aucun cours trouvé avec les filtres sélectionnés.
          </p>
        </div>
      )}
    </div>
  )
}
