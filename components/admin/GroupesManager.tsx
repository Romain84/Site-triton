'use client'

import { useEffect, useState, Fragment } from 'react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { getErrorMessage } from '@/lib/utils'
import { HelpTooltip, CalculationTooltip } from '@/components/ui/Tooltip'

interface Groupe {
  id: string
  nom: string
  description: string | null
  ageMin: number | null
  ageMax: number | null
  total: number
  inscrits: number
  inscrits1Cours: number
  tarif: number | null
  tarif1Cours: number | null
  libelleOption1: string | null
  libelleOption2: string | null
  caution: number | null
  prixLicence: number | null
  niveau: string | null
  actif: boolean
  annule: boolean
  dateDebut: string | null
  dateFin: string | null
  tempsFacture: number | null
  isCompetition: boolean
  nbCompetitions: number | null
  nbCompetitionsCaution: number | null
  couleur: string | null
  membresBureau: number
  enfantsBureau: number
}

export default function GroupesManager() {
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingGroupe, setEditingGroupe] = useState<Groupe | null>(null)
  const { confirm } = useConfirmDialog()

  // Form state
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [total, setTotal] = useState('')
  const [inscrits, setInscrits] = useState('')
  const [inscrits1Cours, setInscrits1Cours] = useState('')
  const [tarif, setTarif] = useState('')
  const [tarif1Cours, setTarif1Cours] = useState('')
  const [libelleOption1, setLibelleOption1] = useState('')
  const [libelleOption2, setLibelleOption2] = useState('')
  const [caution, setCaution] = useState('')
  const [prixLicence, setPrixLicence] = useState('')
  const [niveau, setNiveau] = useState('')
  const [actif, setActif] = useState(true)
  const [annule, setAnnule] = useState(false)
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [tempsFacture, setTempsFacture] = useState('')
  const [isCompetition, setIsCompetition] = useState(false)
  const [nbCompetitions, setNbCompetitions] = useState('')
  const [nbCompetitionsCaution, setNbCompetitionsCaution] = useState('')
  const [membresBureau, setMembresBureau] = useState('')
  const [enfantsBureau, setEnfantsBureau] = useState('')
  const [couleur, setCouleur] = useState('')

  useEffect(() => {
    fetchGroupes()
  }, [])

  const fetchGroupes = async () => {
    try {
      const response = await fetch('/api/admin/groupes')
      if (response.ok) {
        const data = await response.json()
        setGroupes(data.groupes)
      }
    } catch {
      setError('Erreur lors du chargement des groupes')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setNom('')
    setDescription('')
    setAgeMin('')
    setAgeMax('')
    setTotal('')
    setInscrits('')
    setInscrits1Cours('')
    setTarif('')
    setTarif1Cours('')
    setLibelleOption1('')
    setLibelleOption2('')
    setCaution('')
    setPrixLicence('')
    setNiveau('')
    setActif(true)
    setAnnule(false)
    setDateDebut('')
    setDateFin('')
    setTempsFacture('')
    setIsCompetition(false)
    setNbCompetitions('')
    setNbCompetitionsCaution('')
    setMembresBureau('')
    setEnfantsBureau('')
    setCouleur('')
    setEditingGroupe(null)
    setShowForm(false)
  }

  const handleEdit = (groupe: Groupe) => {
    setEditingGroupe(groupe)
    setNom(groupe.nom)
    setDescription(groupe.description || '')
    setAgeMin(groupe.ageMin?.toString() || '')
    setAgeMax(groupe.ageMax?.toString() || '')
    setTotal(groupe.total?.toString() || '')
    setInscrits(groupe.inscrits?.toString() || '')
    setInscrits1Cours(groupe.inscrits1Cours?.toString() || '')
    setTarif(groupe.tarif?.toString() || '')
    setTarif1Cours(groupe.tarif1Cours?.toString() || '')
    setLibelleOption1(groupe.libelleOption1 || '')
    setLibelleOption2(groupe.libelleOption2 || '')
    setCaution(groupe.caution?.toString() || '')
    setPrixLicence(groupe.prixLicence?.toString() || '')
    setNiveau(groupe.niveau || '')
    setActif(groupe.actif)
    setAnnule(groupe.annule || false)
    setDateDebut(groupe.dateDebut ? groupe.dateDebut.split('T')[0] : '')
    setDateFin(groupe.dateFin ? groupe.dateFin.split('T')[0] : '')
    setTempsFacture(groupe.tempsFacture?.toString() || '')
    setIsCompetition(groupe.isCompetition || false)
    setNbCompetitions(groupe.nbCompetitions?.toString() || '')
    setNbCompetitionsCaution(groupe.nbCompetitionsCaution?.toString() || '')
    setMembresBureau(groupe.membresBureau?.toString() || '0')
    setEnfantsBureau(groupe.enfantsBureau?.toString() || '0')
    setCouleur(groupe.couleur || '')
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const totalInscritsVal = parseInt(inscrits || '0', 10)
    const inscrits1CoursVal = parseInt(inscrits1Cours || '0', 10)

    if (inscrits1CoursVal > totalInscritsVal) {
      const msg = "Le nombre d'inscrits à 1 cours ne peut pas dépasser le nombre total d'inscrits."
      toast.error(msg)
      setError(msg)
      return
    }

    try {
      const url = editingGroupe
        ? `/api/admin/groupes/${editingGroupe.id}`
        : '/api/admin/groupes'

      const response = await fetch(url, {
        method: editingGroupe ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom,
          description: description || null,
          ageMin: ageMin || null,
          ageMax: ageMax || null,
          total: total || null,
          inscrits: inscrits || null,
          inscrits1Cours: inscrits1Cours || null,
          tarif: tarif || null,
          tarif1Cours: tarif1Cours || null,
          libelleOption1: libelleOption1 || null,
          libelleOption2: libelleOption2 || null,
          caution: caution || null,
          prixLicence: prixLicence || null,
          niveau: niveau || null,
          actif,
          annule,
          couleur: couleur || null,
          dateDebut: dateDebut || null,
          dateFin: dateFin || null,
          tempsFacture: tempsFacture || null,
          isCompetition,
          nbCompetitions: nbCompetitions || null,
          nbCompetitionsCaution: nbCompetitionsCaution || null,
          membresBureau: parseInt(membresBureau || '0', 10),
          enfantsBureau: parseInt(enfantsBureau || '0', 10),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.details?.fieldErrors) {
          const detailMessages = Object.values(data.details.fieldErrors)
            .flat()
            .join(', ')
          throw new Error(`Données invalides : ${detailMessages}`)
        }
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      await fetchGroupes()
      resetForm()
      toast.success(editingGroupe ? 'Groupe modifié' : 'Groupe créé')
    } catch (err) {
      const message = getErrorMessage(err)
      toast.error(message)
      setError(message)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer le groupe',
      message: 'Voulez-vous vraiment supprimer ce groupe ?',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/groupes/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      await fetchGroupes()
      toast.success('Groupe supprimé')
    } catch (err) {
      const message = getErrorMessage(err)
      toast.error(message)
      setError(message)
    }
  }

  // Calcul du coût total (tarif + licence)
  const calculerCoutTotal = (groupe: Groupe) => {
    const tarif = groupe.tarif || 0
    const licence = groupe.prixLicence || 0
    return tarif + licence
  }

  const renderForm = () => (
    <div>
      <h3 className="text-xl font-bold mb-4">
        {editingGroupe ? 'Modifier le groupe' : 'Nouveau groupe'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section Informations générales */}
        <div className="border-b pb-4">
          <h4 className="text-lg font-semibold mb-4 text-gray-700">Informations générales</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du groupe *
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ex: Avenirs 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau
              </label>
              <select
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">-- Sélectionner --</option>
                <option value="debutant">Débutant</option>
                <option value="intermediaire">Intermédiaire</option>
                <option value="confirme">Confirmé</option>
                <option value="competition">Compétition</option>
                <option value="loisir">Loisir</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleur du groupe (planning)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={couleur || '#00bcd4'}
                  onChange={(e) => setCouleur(e.target.value)}
                  className="w-10 h-10 border border-gray-300 rounded-lg p-0.5 cursor-pointer shrink-0"
                  title="Choisir une couleur personnalisée"
                />
                <select
                  value={couleur}
                  onChange={(e) => setCouleur(e.target.value)}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                >
                  <option value="">-- Par défaut (automatique) --</option>
                  <option value="#00bcd4">Cyan</option>
                  <option value="#2196f3">Bleu</option>
                  <option value="#4caf50">Vert</option>
                  <option value="#ff9800">Orange</option>
                  <option value="#f44336">Rouge</option>
                  <option value="#9c27b0">Violet</option>
                  <option value="#e91e63">Rose</option>
                  {couleur && !['', '#00bcd4', '#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#e91e63'].includes(couleur.toLowerCase()) && (
                    <option value={couleur}>Personnalisé ({couleur})</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Description du groupe..."
            />
          </div>
        </div>

        {/* Section Capacité et Ages */}
        <div className="border-b pb-4">
          <h4 className="text-lg font-semibold mb-4 text-gray-700">Capacité et âges</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacité (places) *
              </label>
              <input
                type="number"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inscrits (total)
              </label>
              <input
                type="number"
                value={inscrits}
                onChange={(e) => setInscrits(e.target.value)}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nombre total de nageurs
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inscrits à 1 cours
              </label>
              <input
                type="number"
                value={inscrits1Cours}
                onChange={(e) => setInscrits1Cours(e.target.value)}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                dont inscrits 1 cours/sem.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Âge minimum
              </label>
              <input
                type="number"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Âge maximum
              </label>
              <input
                type="number"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="12"
              />
            </div>
          </div>
        </div>

        {/* Section Saison */}
        <div className="border-b pb-4">
          <h4 className="text-lg font-semibold mb-4 text-gray-700">Période de la saison</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Section Tarification */}
        <div className="border-b pb-4">
          <h4 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
            Tarification
            <HelpTooltip title="Tarification du groupe">
              <p><strong>Tarif annuel :</strong> Prix de l&apos;adhésion (licence incluse)</p>
              <p className="mt-1"><strong>Licence FFN :</strong> Montant reversé à la Fédération (informatif)</p>
              <p className="mt-1"><strong>Caution :</strong> Remboursable si quota de compétitions atteint</p>
            </HelpTooltip>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarif annuel / 2 cours (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={tarif}
                onChange={(e) => setTarif(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="270"
              />
              <p className="text-xs text-gray-500 mt-1">
                Laisser vide si pas de tarif (ex: PPG, le coach est payé mais gratuit pour les membres).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarif 1 cours/sem (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={tarif1Cours}
                onChange={(e) => setTarif1Cours(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="120"
              />
              <p className="text-xs text-gray-500 mt-1">
                Laisser vide si tarif unique
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Licence FFN (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={prixLicence}
                onChange={(e) => setPrixLicence(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="45"
              />
              <p className="text-xs text-gray-500 mt-1">
                Inclus dans le coût total
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Caution (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={caution}
                onChange={(e) => setCaution(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Montant de la caution demandée
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nb compétitions (caution)
              </label>
              <input
                type="number"
                value={nbCompetitionsCaution}
                onChange={(e) => setNbCompetitionsCaution(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="ex: 5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nb min. de compétitions requis pour remboursement caution (affiché sur le site)
              </p>
            </div>
          </div>

          {tarif1Cours && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Libellé Option 1 (ex: "1 cours/semaine" ou "Aquagym")
                </label>
                <input
                  type="text"
                  value={libelleOption1}
                  onChange={(e) => setLibelleOption1(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  placeholder="1 cours/semaine"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Libellé Option 2 (ex: "2 cours/semaine" ou "Les 2")
                </label>
                <input
                  type="text"
                  value={libelleOption2}
                  onChange={(e) => setLibelleOption2(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  placeholder="2 cours/semaine"
                />
              </div>
            </div>
          )}

          {/* Affichage du coût total */}
          {(tarif || tarif1Cours || prixLicence) && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg space-y-1">
              {tarif1Cours && (
                <p className="text-sm text-blue-800">
                  <strong>Coût total ({libelleOption1 || '1 cours/sem'}) :</strong> {(parseFloat(tarif1Cours || '0') + parseFloat(prixLicence || '0')).toFixed(2)}€
                  {prixLicence && (
                    <span className="text-blue-600 ml-2">
                      (Tarif {tarif1Cours}€ + Licence {prixLicence}€)
                    </span>
                  )}
                </p>
              )}
              {tarif && (
                <p className="text-sm text-blue-800">
                  <strong>Coût total {tarif1Cours ? `(${libelleOption2 || '2 cours/sem'})` : ''} :</strong> {(parseFloat(tarif || '0') + parseFloat(prixLicence || '0')).toFixed(2)}€
                  {prixLicence && (
                    <span className="text-blue-600 ml-2">
                      (Tarif {tarif}€ + Licence {prixLicence}€)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section Facturation Coach */}
        <div className="border-b pb-4">
          <h4 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
            Facturation coach
            <HelpTooltip title="Temps facturé">
              Permet de facturer un temps différent de la durée réelle du cours. Utile pour les cours courts qui nécessitent un temps de préparation.
            </HelpTooltip>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temps à facturer (minutes)
              </label>
              <input
                type="number"
                value={tempsFacture}
                onChange={(e) => setTempsFacture(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="60"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ex: Cours de 45min facturé 60min. Laisser vide = durée réelle.
              </p>
            </div>
          </div>
        </div>

        {/* Section Compétition */}
        <div className="border-b pb-4">
          <h4 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
            Groupe compétition
            <HelpTooltip title="Groupe compétition">
              <p>Cochez si ce groupe participe aux compétitions FFN.</p>
              <p className="mt-1">Le nombre de compétitions est utilisé pour le calcul du coût (forfait coach × nb compét.) et le remboursement des cautions.</p>
            </HelpTooltip>
          </h4>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="isCompetition"
              checked={isCompetition}
              onChange={(e) => setIsCompetition(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="isCompetition" className="ml-2 text-sm text-gray-700">
              Ce groupe participe aux compétitions
            </label>
          </div>

          {isCompetition && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-blue-50/70 border border-blue-100 rounded-lg">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Nombre de compétitions / saison (budget & quota)
                </label>
                <input
                  type="number"
                  value={nbCompetitions}
                  onChange={(e) => setNbCompetitions(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  placeholder="10"
                />
                <p className="text-xs text-slate-600 mt-1">
                  Utilisé pour le calcul du budget et du quota annuel du groupe.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section Membres du Bureau (admin only) */}
        <div className="border-b pb-4">
          <h4 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
            👔 Membres du bureau (admin uniquement)
            <CalculationTooltip
              title="Impact sur les revenus"
              formula="Revenu = (Inscrits - Bureau - Enfants) × Tarif + Enfants × Tarif réduit"
              explanation="Les membres du bureau sont gratuits (0€). Les enfants du bureau bénéficient d'une réduction (% défini dans Paramètres)."
              example="(20 - 2 - 3) × 200€ + 3 × 100€ = 3 300€"
            />
          </h4>
          <p className="text-sm text-gray-500 mb-4">Ces informations sont utilisées pour le calcul des revenus et ne sont pas visibles publiquement.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Membres du bureau
              </label>
              <input
                type="number"
                min="0"
                value={membresBureau}
                onChange={(e) => setMembresBureau(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Gratuit (100% de réduction)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enfants du bureau
              </label>
              <input
                type="number"
                min="0"
                value={enfantsBureau}
                onChange={(e) => setEnfantsBureau(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Réduction (% défini dans paramètres)
              </p>
            </div>
          </div>
        </div>

        {/* Statut */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="actif"
              checked={actif}
              onChange={(e) => setActif(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="actif" className="ml-2 text-sm text-gray-700">
              Groupe actif (visible sur le site)
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="annule"
              checked={annule}
              onChange={(e) => setAnnule(e.target.checked)}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="annule" className="ml-2 text-sm text-red-700 font-medium">
              ⚠️ Créneau temporairement suspendu (en attente d&apos;un coach). Réouverture possible à tout moment !
            </label>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {editingGroupe ? 'Mettre à jour' : 'Créer'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )

  if (loading) {
    return <p className="text-gray-600">Chargement...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Gestion des Groupes/Jauges</h2>
        <button
          onClick={() => {
            setEditingGroupe(null)
            setShowForm(!showForm)
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          {showForm && !editingGroupe ? 'Annuler' : '+ Nouveau groupe'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      {showForm && !editingGroupe && (
        <div className="card p-6 mb-6">
          {renderForm()}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Groupe</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Niveau</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  <span className="flex items-center justify-center gap-1">
                    Jauge
                    <HelpTooltip title="Jauge d'inscription">
                      <p>Nombre d&apos;inscrits / Capacité max</p>
                      <p className="mt-1 text-green-400">Vert = places disponibles</p>
                      <p className="text-amber-400">Orange = presque complet (80%+)</p>
                      <p className="text-red-400">Rouge = complet</p>
                    </HelpTooltip>
                  </span>
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">
                  <span className="flex items-center justify-end gap-1">
                    Coût total
                    <CalculationTooltip
                      title="Coût total adhérent"
                      formula="Tarif annuel + Licence FFN"
                      explanation="Prix total payé par l'adhérent. La caution est en plus mais remboursable."
                      example="200€ + 45€ = 245€"
                    />
                  </span>
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Saison</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Compét.</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Statut</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupes.map((groupe) => (
                <Fragment key={groupe.id}>
                  <tr className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{groupe.nom}</div>
                      {groupe.ageMin && groupe.ageMax && (
                        <div className="text-xs text-gray-500">{groupe.ageMin}-{groupe.ageMax} ans</div>
                      )}
                      {groupe.tempsFacture && (
                        <div className="text-xs text-blue-600">⏱️ {groupe.tempsFacture}min facturées</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {groupe.niveau ? (
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          groupe.niveau === 'competition' ? 'bg-blue-100 text-blue-800' :
                          groupe.niveau === 'loisir' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {groupe.niveau === 'competition' ? 'Compétition' :
                           groupe.niveau === 'loisir' ? 'Loisir' :
                           groupe.niveau === 'debutant' ? 'Débutant' :
                           groupe.niveau === 'intermediaire' ? 'Intermédiaire' :
                           groupe.niveau === 'confirme' ? 'Confirmé' : groupe.niveau}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`font-semibold ${
                          groupe.inscrits >= groupe.total ? 'text-red-600' :
                          groupe.inscrits >= groupe.total * 0.8 ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {groupe.inscrits}/{groupe.total}
                        </span>
                        {groupe.inscrits1Cours > 0 && (
                          <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                            dont {groupe.inscrits1Cours} à {groupe.libelleOption1 || '1 cours'}
                            <span className="block text-blue-600 font-semibold">({(groupe.inscrits - groupe.inscrits1Cours * 0.5).toFixed(1)} éq.)</span>
                          </div>
                        )}
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1">
                          <div
                            className={`h-full rounded-full ${
                              groupe.inscrits >= groupe.total ? 'bg-red-500' :
                              groupe.inscrits >= groupe.total * 0.8 ? 'bg-amber-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(((groupe.inscrits - (groupe.inscrits1Cours || 0) * 0.5) / groupe.total) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {groupe.tarif1Cours ? (
                        <div className="space-y-0.5 text-xs text-slate-650 font-medium">
                          <div>{groupe.libelleOption1 || '1 cours'}: <span className="text-slate-950 font-bold">{(groupe.tarif1Cours + (groupe.prixLicence || 0)).toFixed(0)}€</span></div>
                          <div>{groupe.libelleOption2 || '2 cours'}: <span className="text-slate-950 font-bold">{calculerCoutTotal(groupe).toFixed(0)}€</span></div>
                        </div>
                      ) : (
                        <div className="font-medium">{calculerCoutTotal(groupe).toFixed(0)}€</div>
                      )}
                      {!groupe.tarif1Cours && groupe.tarif && groupe.prixLicence && (
                        <div className="text-xs text-gray-500">
                          {groupe.tarif}€ + {groupe.prixLicence}€
                        </div>
                      )}
                      {groupe.tarif1Cours && groupe.prixLicence && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          Licence FFN ({groupe.prixLicence}€) incluse
                        </div>
                      )}
                      {groupe.caution && (
                        <div className="text-xs text-amber-600">
                          + {groupe.caution}€ caution
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-xs">
                      {groupe.dateDebut && groupe.dateFin ? (
                        <div>
                          <div>{new Date(groupe.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</div>
                          <div className="text-gray-400">→</div>
                          <div>{new Date(groupe.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {groupe.isCompetition ? (
                        <div>
                          <span className="text-blue-600">🏆</span>
                          {groupe.nbCompetitions && (
                            <div className="text-xs text-gray-500">{groupe.nbCompetitions} compét.</div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs ${
                            groupe.actif
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {groupe.actif ? 'Actif' : 'Inactif'}
                        </span>
                        {groupe.annule && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                            Pas de cours
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(groupe)}
                          className="text-primary hover:text-primary-dark text-sm font-medium"
                        >
                          Modifier
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => handleDelete(groupe.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingGroupe?.id === groupe.id && (
                    <tr className="bg-gray-50 border-t border-b border-gray-200">
                      <td colSpan={8} className="p-6">
                        <div className="card p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                          {renderForm()}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {groupes.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          <p>Aucun groupe créé. Cliquez sur &quot;Nouveau groupe&quot; pour commencer.</p>
        </div>
      )}
    </div>
  )
}
