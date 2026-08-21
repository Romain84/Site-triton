'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getErrorMessage } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────
interface InscriptionBlock {
  id: string
  type: string
  titre: string | null
  contenu: Record<string, unknown>
  ordre: number
  actif: boolean
}

type BlockType = 'hero' | 'banner' | 'cta' | 'pricing' | 'groups-table' | 'richtext' | 'tests' | 'bnssa' | 'rules' | 'access' | 'financial-aid' | 'contact'

interface BlockTypeInfo {
  type: BlockType
  label: string
  emoji: string
  description: string
  defaultTitre: string | null
  defaultContenu: Record<string, unknown>
}

const BLOCK_TYPES: BlockTypeInfo[] = [
  {
    type: 'hero',
    label: 'En-tête Saison',
    emoji: '🏷️',
    description: 'Titre principal avec label saison',
    defaultTitre: 'Inscriptions & Réadhésions',
    defaultContenu: { saison: 'Saison 2026 - 2027', description: '' },
  },
  {
    type: 'banner',
    label: 'Bannière Info',
    emoji: '📢',
    description: 'Bannière d\'alerte colorée',
    defaultTitre: 'Nouvelle information',
    defaultContenu: { couleur: 'sky', texte: '' },
  },
  {
    type: 'cta',
    label: 'Bouton d\'Action',
    emoji: '👉',
    description: 'Carte avec bouton cliquable',
    defaultTitre: 'Accès rapide',
    defaultContenu: { label: 'Accès Direct', description: '', boutonTexte: 'Inscription en ligne', urlSource: 'settings' },
  },
  {
    type: 'pricing',
    label: 'Tarifs (auto)',
    emoji: '💰',
    description: 'Grille tarifaire depuis la base de données',
    defaultTitre: 'Tarifs - Adhésion Annuelle',
    defaultContenu: { badges: [], noteCaution: '', precisionsPaiement: [] },
  },
  {
    type: 'groups-table',
    label: 'Tableau Groupes',
    emoji: '🏊',
    description: 'Répartition par année de naissance',
    defaultTitre: 'Répartition des Groupes & Plannings',
    defaultContenu: { introTexte: '', lignes: [] },
  },
  {
    type: 'richtext',
    label: 'Texte Libre',
    emoji: '📝',
    description: 'Bloc de texte personnalisable',
    defaultTitre: 'Nouveau bloc',
    defaultContenu: { texte: '' },
  },
  {
    type: 'tests',
    label: 'Dates de Tests',
    emoji: '⏱️',
    description: 'Dates des tests nouveaux adhérents',
    defaultTitre: 'Tests pour Nouveaux Adhérents',
    defaultContenu: { intro: '', lieu: '', datesSource: 'settings' },
  },
  {
    type: 'bnssa',
    label: 'Section SSA (ex-BNSSA)',
    emoji: '🛟',
    description: 'Formation & Diplôme SSA / Secourisme PSE1-2',
    defaultTitre: 'Formation SSA – Surveillant Sauveteur Aquatique',
    defaultContenu: {
      label: 'Le BNSSA évolue vers le SSA',
      changement: 'À compter du 1er octobre 2026, le dispositif de formation évolue : le BNSSA est remplacé par le SSA pour les nouveaux candidats.',
      introClub: 'Le Triton Club Cavaillon propose une formation complète permettant de préparer les candidats au nouveau diplôme SSA (Surveillant Sauveteur Aquatique).',
      conditionsAcces: {
        texte: 'La formation est ouverte aux personnes souhaitant se former au métier de surveillant sauveteur aquatique.',
        points: [
          'avoir 17 ans révolus au moment de l\'examen (mars/avril) ;',
          'être apte à la pratique de la natation et du sauvetage aquatique ;',
          'réussir le test natatoire préalable ;',
          'être en mesure de suivre l\'ensemble des formations prévues.'
        ],
        effectif: 'La session sera ouverte à partir de 6 candidats minimum.'
      },
      formationComplete: {
        intro: 'Le tarif de la formation SSA comprend l\'ensemble du parcours de formation, notamment :',
        formationSsa: 'Formation théorique et pratique au sauvetage et à la surveillance aquatique.',
        secourisme: {
          titre: 'PSE1 + PSE2',
          texte: 'Les formations Premiers Secours en Équipe de niveau 1 et de niveau 2 sont comprises dans le tarif de la formation SSA. Elles sont réalisées avec notre partenaire Croix-Blanche. Vous n\'avez donc pas à vous inscrire séparément au PSE1 et au PSE2.'
        }
      },
      tarifComplet: 750,
      formuleReduction: {
        texte: 'Une formule permettant de bénéficier d\'un remboursement de 250 € est proposée aux candidats qui s\'engagent à effectuer 4 journées de surveillance avec la Croix-Blanche pendant la saison.',
        note: 'Cette possibilité est soumise à l\'acceptation de l\'engagement et aux modalités définies avec la Croix-Blanche.'
      },
      testNatatoire: {
        intro: 'Avant le début de la formation, un test natatoire devra être validé par un MNS.',
        explication: 'Ce test permet de vérifier que le candidat possède les capacités aquatiques nécessaires pour suivre la formation.',
        modalites: 'Les modalités du test seront communiquées aux candidats inscrits ultérieurement.'
      },
      debutFormation: {
        date: 'Jeudi 1er octobre 2026',
        horaires: 'Les dates et horaires précis des séances seront communiqués aux candidats après constitution du groupe.',
        effectif: 'Effectif minimum : 6 candidats.'
      },
      dejaTitulaireBnssa: {
        texte: 'Si vous êtes déjà titulaire du BNSSA, vous n\'avez pas à suivre l\'intégralité de la formation initiale SSA. Des dispositions spécifiques peuvent s\'appliquer selon votre situation et la validité de vos qualifications de secourisme.'
      },
      avertissement: 'Les modalités définitives de la formation SSA pourront être ajustées en fonction de la publication des textes réglementaires et de la circulaire d\'application.'
    },
  },
  {
    type: 'rules',
    label: 'Modalités & Santé',
    emoji: '📋',
    description: 'Règles et formulaires de santé',
    defaultTitre: 'Modalités & Santé',
    defaultContenu: { items: [], questionnaireSante: {}, honorabilite: {} },
  },
  {
    type: 'access',
    label: 'Distribution Accès',
    emoji: '🔑',
    description: 'Info cartes d\'accès',
    defaultTitre: 'Distribution des Accès',
    defaultContenu: { texte: '' },
  },
  {
    type: 'financial-aid',
    label: 'Aides Financières',
    emoji: '💸',
    description: 'Pass\'Sport et remboursements',
    defaultTitre: 'Aides financières & Remboursements',
    defaultContenu: { sections: [] },
  },
  {
    type: 'contact',
    label: 'Pied de Page',
    emoji: '📞',
    description: 'Lien de contact',
    defaultTitre: null,
    defaultContenu: { texte: '' },
  },
]

// ─── Helpers ────────────────────────────────────────────
function getBlockTypeInfo(type: string): BlockTypeInfo | undefined {
  return BLOCK_TYPES.find(bt => bt.type === type)
}

function getBlockLabel(block: InscriptionBlock): string {
  const info = getBlockTypeInfo(block.type)
  return block.titre || info?.label || block.type
}

function getBlockEmoji(block: InscriptionBlock): string {
  const info = getBlockTypeInfo(block.type)
  return (block.contenu as Record<string, unknown>).emoji as string || info?.emoji || '📦'
}

// ─── Main Component ─────────────────────────────────────
export default function InscriptionPageBuilder() {
  const [blocks, setBlocks] = useState<InscriptionBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [afficherBoutonTest, setAfficherBoutonTest] = useState(true)
  const [togglingBoutonTest, setTogglingBoutonTest] = useState(false)

  const addMenuRef = useRef<HTMLDivElement>(null)

  // ─── Data Fetching ──────────────────────────────────
  const fetchBlocks = useCallback(async () => {
    try {
      setLoading(true)
      const [resBlocks, resSettings] = await Promise.all([
        fetch('/api/admin/inscription-page'),
        fetch('/api/admin/parametres'),
      ])
      const dataBlocks = await resBlocks.json()
      const dataSettings = await resSettings.json()

      if (dataBlocks.success) {
        setBlocks(dataBlocks.blocks)
      } else {
        setError('Erreur lors du chargement des blocs')
      }
      if (resSettings.ok && dataSettings.settings) {
        setAfficherBoutonTest(dataSettings.settings.afficherBoutonTest ?? true)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const handleToggleBoutonTest = async () => {
    const newValue = !afficherBoutonTest
    setTogglingBoutonTest(true)
    try {
      const res = await fetch('/api/admin/parametres', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ afficherBoutonTest: newValue }),
      })
      if (res.ok) {
        setAfficherBoutonTest(newValue)
        setSuccess(newValue ? 'Bouton de test activé sur la page Inscription' : 'Bouton de test masqué sur la page Inscription')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Erreur lors de la mise à jour')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setTogglingBoutonTest(false)
    }
  }

  useEffect(() => {
    fetchBlocks()
  }, [fetchBlocks])

  // Close add menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-clear success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(t)
    }
  }, [success])

  // ─── CRUD Operations ───────────────────────────────
  const addBlock = async (typeInfo: BlockTypeInfo) => {
    try {
      const res = await fetch('/api/admin/inscription-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: typeInfo.type,
          titre: typeInfo.defaultTitre,
          contenu: typeInfo.defaultContenu,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setBlocks(prev => [...prev, data.block])
        setSelectedBlockId(data.block.id)
        setSuccess('Bloc ajouté')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
    setShowAddMenu(false)
  }

  const updateBlock = async (id: string, updates: Partial<InscriptionBlock>) => {
    try {
      setSaving(true)
      const res = await fetch(`/api/admin/inscription-page/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (data.success) {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...data.block } : b))
        setSuccess('Bloc sauvegardé')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const deleteBlock = async (id: string) => {
    if (!confirm('Supprimer ce bloc ?')) return
    try {
      const res = await fetch(`/api/admin/inscription-page/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setBlocks(prev => prev.filter(b => b.id !== id))
        if (selectedBlockId === id) setSelectedBlockId(null)
        setSuccess('Bloc supprimé')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const toggleBlock = async (id: string) => {
    const block = blocks.find(b => b.id === id)
    if (!block) return
    await updateBlock(id, { actif: !block.actif })
  }

  const saveOrder = async (newBlocks: InscriptionBlock[]) => {
    try {
      const res = await fetch('/api/admin/inscription-page/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: newBlocks.map((b, i) => ({ id: b.id, ordre: i })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('Ordre sauvegardé')
        setHasChanges(false)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  // ─── Drag & Drop ───────────────────────────────────
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newBlocks = [...blocks]
      const [removed] = newBlocks.splice(draggedIndex, 1)
      newBlocks.splice(dragOverIndex, 0, removed)
      // Update ordre
      const reordered = newBlocks.map((b, i) => ({ ...b, ordre: i }))
      setBlocks(reordered)
      setHasChanges(true)
      saveOrder(reordered)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // ─── Selected Block ────────────────────────────────
  const selectedBlock = blocks.find(b => b.id === selectedBlockId)

  // ─── Render ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="mt-3 text-slate-500 font-medium text-xs">Chargement de l&apos;éditeur...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Header Bar ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-wider">
            📐 Éditeur de Page Inscription
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Glissez les blocs pour réordonner • Cliquez pour modifier
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Block Button */}
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="px-4 py-2.5 bg-primary text-slate-950 font-bold text-xs rounded-lg hover:bg-primary-dark transition-all flex items-center gap-2 shadow-sm"
            >
              <span className="text-base">+</span> Ajouter un bloc
            </button>

            {/* Add Block Dropdown */}
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
                <div className="p-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Types de blocs disponibles</span>
                </div>
                <div className="max-h-96 overflow-y-auto p-2">
                  {BLOCK_TYPES.map(bt => (
                    <button
                      key={bt.type}
                      onClick={() => addBlock(bt)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-primary/5 transition-colors group"
                    >
                      <span className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg group-hover:bg-primary/10 transition-colors shrink-0">
                        {bt.emoji}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-slate-900 block">{bt.label}</span>
                        <span className="text-[11px] text-slate-500 block truncate">{bt.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview Button */}
          <a
            href="/inscription"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <span>👁</span> Prévisualiser
          </a>
        </div>
      </div>

      {/* ─── BANDEAU DE CONTRÔLE RAPIDE DU BOUTON TEST ─── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${afficherBoutonTest ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            {afficherBoutonTest ? '🏊' : '🙈'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Bouton direct « Réserver un test de niveau » sur la page Inscription
              </span>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${afficherBoutonTest ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                {afficherBoutonTest ? 'Visible' : 'Masqué'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Affiche le bouton de réservation vers /tests-de-nage dans l&apos;étape 1 du guide d&apos;inscription.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleBoutonTest}
          disabled={togglingBoutonTest}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs shrink-0 ${
            afficherBoutonTest
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {togglingBoutonTest ? 'Mise à jour...' : afficherBoutonTest ? 'Masquer le bouton' : 'Afficher le bouton'}
        </button>
      </div>

      {/* ─── Feedback Messages ────────────────────── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>❌ {error}</span>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 font-bold">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in-up">
          <span>✅</span> {success}
        </div>
      )}

      {/* ─── Main Content ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Block List (Left 2/3) ──────────────── */}
        <div className="lg:col-span-2 space-y-2">
          {blocks.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <span className="text-4xl block mb-3">📄</span>
              <p className="text-slate-500 font-semibold text-sm">Aucun bloc configuré</p>
              <p className="text-slate-400 text-xs mt-1">Cliquez sur &quot;Ajouter un bloc&quot; pour commencer</p>
            </div>
          ) : (
            blocks.map((block, index) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedBlockId(block.id)}
                className={`
                  group relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer
                  ${selectedBlockId === block.id
                    ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }
                  ${!block.actif ? 'opacity-50' : ''}
                  ${draggedIndex === index ? 'opacity-30 scale-95' : ''}
                  ${dragOverIndex === index && draggedIndex !== index ? 'border-primary/50 border-dashed' : ''}
                `}
              >
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 select-none">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
                    <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
                    <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
                  </svg>
                </div>

                {/* Block Emoji */}
                <span className="text-xl w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg shrink-0">
                  {getBlockEmoji(block)}
                </span>

                {/* Block Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 truncate">{getBlockLabel(block)}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      {getBlockTypeInfo(block.type)?.label || block.type}
                    </span>
                  </div>
                  {block.type === 'pricing' && (
                    <span className="text-[10px] text-primary font-semibold">⚡ Auto-alimenté depuis la base de données</span>
                  )}
                </div>

                {/* Block Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Toggle Active */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleBlock(block.id) }}
                    title={block.actif ? 'Masquer' : 'Afficher'}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all text-sm ${
                      block.actif
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {block.actif ? '👁' : '🚫'}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteBlock(block.id) }}
                    title="Supprimer"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all text-sm opacity-0 group-hover:opacity-100"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}

          {hasChanges && (
            <div className="text-center pt-2">
              <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                💾 Ordre sauvegardé automatiquement
              </span>
            </div>
          )}
        </div>

        {/* ── Edit Panel (Right 1/3) ─────────────── */}
        <div className="lg:col-span-1">
          {selectedBlock ? (
            <BlockEditPanel
              block={selectedBlock}
              onUpdate={updateBlock}
              saving={saving}
              onClose={() => setSelectedBlockId(null)}
            />
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center sticky top-4">
              <span className="text-3xl block mb-3">✏️</span>
              <p className="text-slate-500 font-semibold text-sm">Sélectionnez un bloc</p>
              <p className="text-slate-400 text-xs mt-1">Cliquez sur un bloc à gauche pour le modifier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Block Edit Panel ──────────────────────────────────
interface BlockEditPanelProps {
  block: InscriptionBlock
  onUpdate: (id: string, updates: Partial<InscriptionBlock>) => Promise<void>
  saving: boolean
  onClose: () => void
}

function BlockEditPanel({ block, onUpdate, saving, onClose }: BlockEditPanelProps) {
  const [localTitre, setLocalTitre] = useState(block.titre || '')
  const [localContenu, setLocalContenu] = useState<Record<string, unknown>>(block.contenu as Record<string, unknown>)
  const [dirty, setDirty] = useState(false)

  // Reset when block changes
  useEffect(() => {
    setLocalTitre(block.titre || '')
    setLocalContenu(block.contenu as Record<string, unknown>)
    setDirty(false)
  }, [block.id, block.titre, block.contenu])

  const handleSave = async () => {
    await onUpdate(block.id, {
      titre: localTitre || null,
      contenu: localContenu,
    })
    setDirty(false)
  }

  const updateContenuField = (key: string, value: unknown) => {
    setLocalContenu(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const typeInfo = getBlockTypeInfo(block.type)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg sticky top-4 overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{typeInfo?.emoji}</span>
          <div className="min-w-0">
            <span className="font-bold text-sm text-slate-900 block truncate">Édition du bloc</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{typeInfo?.label}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600 text-xs font-bold"
        >
          ✕
        </button>
      </div>

      {/* Panel Body */}
      <div className="p-4 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
        {/* Title Field (all block types) */}
        {block.type !== 'contact' && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Titre du bloc</label>
            <input
              type="text"
              value={localTitre}
              onChange={(e) => { setLocalTitre(e.target.value); setDirty(true) }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              placeholder="Titre affiché..."
            />
          </div>
        )}

        {/* Type-specific fields */}
        {renderTypeFields(block.type, localContenu, updateContenuField)}
      </div>

      {/* Panel Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/30">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            dirty
              ? 'bg-primary text-slate-950 hover:bg-primary-dark shadow-sm'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent"></span>
              Sauvegarde...
            </>
          ) : (
            <>💾 {dirty ? 'Sauvegarder les modifications' : 'Aucune modification'}</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Type-Specific Field Renderers ──────────────────────
function renderTypeFields(
  type: string,
  contenu: Record<string, unknown>,
  onChange: (key: string, value: unknown) => void
) {
  switch (type) {
    case 'hero':
      return <HeroFields contenu={contenu} onChange={onChange} />
    case 'banner':
      return <BannerFields contenu={contenu} onChange={onChange} />
    case 'cta':
      return <CtaFields contenu={contenu} onChange={onChange} />
    case 'pricing':
      return <PricingFields contenu={contenu} onChange={onChange} />
    case 'groups-table':
      return <GroupsTableFields contenu={contenu} onChange={onChange} />
    case 'richtext':
      return <RichtextFields contenu={contenu} onChange={onChange} />
    case 'tests':
      return <TestsFields contenu={contenu} onChange={onChange} />
    case 'bnssa':
      return <BnssaFields contenu={contenu} onChange={onChange} />
    case 'rules':
      return <RulesFields contenu={contenu} onChange={onChange} />
    case 'access':
      return <AccessFields contenu={contenu} onChange={onChange} />
    case 'financial-aid':
      return <FinancialAidFields contenu={contenu} onChange={onChange} />
    case 'contact':
      return <ContactFields contenu={contenu} onChange={onChange} />
    default:
      return <p className="text-xs text-slate-500 italic">Type de bloc non reconnu</p>
  }
}

// ─── Field Components ──────────────────────────────────

interface FieldProps {
  contenu: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">{children}</label>
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
        placeholder={placeholder}
      />
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all resize-y"
        placeholder={placeholder}
      />
    </div>
  )
}

// ─── Hero Fields ────────────────────────────────────────
function HeroFields({ contenu, onChange }: FieldProps) {
  return (
    <>
      <TextInput label="Label saison" value={(contenu.saison as string) || ''} onChange={v => onChange('saison', v)} placeholder="Saison 2026 - 2027" />
      <TextArea label="Texte d'introduction" value={(contenu.description as string) || ''} onChange={v => onChange('description', v)} placeholder="Texte sous le titre..." rows={3} />
    </>
  )
}

// ─── Banner Fields ──────────────────────────────────────
function BannerFields({ contenu, onChange }: FieldProps) {
  const couleurs = [
    { value: 'sky', label: 'Bleu', preview: 'bg-sky-100' },
    { value: 'amber', label: 'Orange', preview: 'bg-amber-100' },
    { value: 'rose', label: 'Rouge', preview: 'bg-rose-100' },
    { value: 'emerald', label: 'Vert', preview: 'bg-emerald-100' },
  ]

  return (
    <>
      <TextInput label="Emoji" value={(contenu.emoji as string) || ''} onChange={v => onChange('emoji', v)} placeholder="📢" />
      <div className="space-y-1.5">
        <FieldLabel>Couleur de la bannière</FieldLabel>
        <div className="flex gap-2">
          {couleurs.map(c => (
            <button
              key={c.value}
              onClick={() => onChange('couleur', c.value)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold text-center transition-all border-2 ${
                contenu.couleur === c.value ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'
              } ${c.preview}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <TextArea label="Contenu (HTML autorisé)" value={(contenu.texte as string) || ''} onChange={v => onChange('texte', v)} rows={5} placeholder="Texte de la bannière..." />
    </>
  )
}

// ─── CTA Fields ─────────────────────────────────────────
function CtaFields({ contenu, onChange }: FieldProps) {
  return (
    <>
      <TextInput label="Label supérieur" value={(contenu.label as string) || ''} onChange={v => onChange('label', v)} placeholder="Accès Direct" />
      <TextArea label="Description" value={(contenu.description as string) || ''} onChange={v => onChange('description', v)} rows={3} />
      <TextInput label="Texte du bouton" value={(contenu.boutonTexte as string) || ''} onChange={v => onChange('boutonTexte', v)} placeholder="👉 Inscription sur MonClub" />
      <div className="space-y-1.5">
        <FieldLabel>Source de l&apos;URL</FieldLabel>
        <select
          value={(contenu.urlSource as string) || 'settings'}
          onChange={e => onChange('urlSource', e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
        >
          <option value="settings">Depuis Paramètres (inscriptionUrl)</option>
          <option value="custom">URL personnalisée</option>
        </select>
      </div>
      {contenu.urlSource === 'custom' && (
        <TextInput label="URL personnalisée" value={(contenu.customUrl as string) || ''} onChange={v => onChange('customUrl', v)} placeholder="https://..." />
      )}
    </>
  )
}

// ─── Pricing Fields ─────────────────────────────────────
function PricingFields({ contenu, onChange }: FieldProps) {
  const badges = (contenu.badges as string[]) || []
  const precisions = (contenu.precisionsPaiement as Array<{ texte: string; type: string }>) || []

  return (
    <>
      <TextInput label="Emoji" value={(contenu.emoji as string) || ''} onChange={v => onChange('emoji', v)} placeholder="💰" />

      <div className="bg-primary/5 border border-primary/10 p-3 rounded-lg">
        <p className="text-[10px] font-bold text-primary uppercase">⚡ Tarifs automatiques</p>
        <p className="text-xs text-slate-600 mt-1">Les prix se chargent automatiquement depuis les Groupes en base de données. Modifiez-les dans l&apos;onglet Groupes.</p>
      </div>

      {/* Badges */}
      <div className="space-y-1.5">
        <FieldLabel>Badges paiement</FieldLabel>
        {badges.map((badge, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={badge}
              onChange={(e) => {
                const newBadges = [...badges]
                newBadges[i] = e.target.value
                onChange('badges', newBadges)
              }}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            />
            <button
              onClick={() => onChange('badges', badges.filter((_, idx) => idx !== i))}
              className="text-rose-400 hover:text-rose-600 text-xs px-2"
            >✕</button>
          </div>
        ))}
        <button
          onClick={() => onChange('badges', [...badges, ''])}
          className="text-xs text-primary font-bold hover:underline"
        >+ Ajouter un badge</button>
      </div>

      {/* Note Caution */}
      <TextArea label="Note caution" value={(contenu.noteCaution as string) || ''} onChange={v => onChange('noteCaution', v)} rows={3} />

      {/* Precisions Paiement */}
      <div className="space-y-1.5">
        <FieldLabel>Précisions de paiement</FieldLabel>
        {precisions.map((p, i) => (
          <div key={i} className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <select
                value={p.type}
                onChange={(e) => {
                  const newP = [...precisions]
                  newP[i] = { ...newP[i], type: e.target.value }
                  onChange('precisionsPaiement', newP)
                }}
                className="px-2 py-1.5 border border-slate-200 rounded text-xs font-medium"
              >
                <option value="info">ℹ️ Info</option>
                <option value="warning">⚠️ Alerte</option>
              </select>
              <button
                onClick={() => onChange('precisionsPaiement', precisions.filter((_, idx) => idx !== i))}
                className="text-rose-400 hover:text-rose-600 text-xs ml-auto"
              >✕</button>
            </div>
            <textarea
              value={p.texte}
              onChange={(e) => {
                const newP = [...precisions]
                newP[i] = { ...newP[i], texte: e.target.value }
                onChange('precisionsPaiement', newP)
              }}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-primary/30 outline-none resize-y"
            />
          </div>
        ))}
        <button
          onClick={() => onChange('precisionsPaiement', [...precisions, { texte: '', type: 'info' }])}
          className="text-xs text-primary font-bold hover:underline"
        >+ Ajouter une précision</button>
      </div>
    </>
  )
}

// ─── Groups Table Fields ────────────────────────────────
function GroupsTableFields({ contenu, onChange }: FieldProps) {
  const lignes = (contenu.lignes as Array<{ section: string; annees: string }>) || []

  return (
    <>
      <TextInput label="Emoji" value={(contenu.emoji as string) || ''} onChange={v => onChange('emoji', v)} placeholder="🏊" />
      <TextArea label="Texte d'introduction (HTML)" value={(contenu.introTexte as string) || ''} onChange={v => onChange('introTexte', v)} rows={3} />

      <div className="space-y-1.5">
        <FieldLabel>Lignes du tableau</FieldLabel>
        {lignes.map((ligne, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="text"
              value={ligne.section}
              onChange={(e) => {
                const newLignes = [...lignes]
                newLignes[i] = { ...newLignes[i], section: e.target.value }
                onChange('lignes', newLignes)
              }}
              placeholder="Section / Groupe"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/30 outline-none"
            />
            <input
              type="text"
              value={ligne.annees}
              onChange={(e) => {
                const newLignes = [...lignes]
                newLignes[i] = { ...newLignes[i], annees: e.target.value }
                onChange('lignes', newLignes)
              }}
              placeholder="Années"
              className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/30 outline-none"
            />
            <button
              onClick={() => onChange('lignes', lignes.filter((_, idx) => idx !== i))}
              className="text-rose-400 hover:text-rose-600 text-xs px-1"
            >✕</button>
          </div>
        ))}
        <button
          onClick={() => onChange('lignes', [...lignes, { section: '', annees: '' }])}
          className="text-xs text-primary font-bold hover:underline"
        >+ Ajouter une ligne</button>
      </div>
    </>
  )
}

// ─── Richtext Fields ────────────────────────────────────
function RichtextFields({ contenu, onChange }: FieldProps) {
  return (
    <TextArea label="Contenu (HTML autorisé)" value={(contenu.texte as string) || ''} onChange={v => onChange('texte', v)} rows={8} placeholder="Saisissez du texte libre ici..." />
  )
}

// ─── Tests Fields ───────────────────────────────────────
function TestsFields({ contenu, onChange }: FieldProps) {
  return (
    <>
      <TextInput label="Emoji" value={(contenu.emoji as string) || ''} onChange={v => onChange('emoji', v)} placeholder="⏱️" />
      <TextArea label="Texte d'introduction (HTML)" value={(contenu.intro as string) || ''} onChange={v => onChange('intro', v)} rows={3} />
      <TextInput label="Lieu" value={(contenu.lieu as string) || ''} onChange={v => onChange('lieu', v)} placeholder="Piscine couverte Alphonse Roudière" />
      <div className="bg-sky-50 p-3 rounded-lg border border-sky-100">
        <p className="text-[10px] font-bold text-sky-700 uppercase">📅 Dates depuis Paramètres</p>
        <p className="text-xs text-sky-600 mt-1">Les dates des tests sont chargées depuis les paramètres du club (onglet Paramètres → Dates des tests).</p>
      </div>
    </>
  )
}

// ─── BNSSA / SSA Fields ─────────────────────────────────
function BnssaFields({ contenu, onChange }: FieldProps) {
  const conditionsAcces = (contenu.conditionsAcces as { texte?: string; points?: string[]; effectif?: string }) || {}
  const points = conditionsAcces.points || [
    'avoir 17 ans révolus au moment de l\'examen (mars/avril) ;',
    'être apte à la pratique de la natation et du sauvetage aquatique ;',
    'réussir le test natatoire préalable ;',
    'être en mesure de suivre l\'ensemble des formations prévues.'
  ]

  const formationComplete = (contenu.formationComplete as { intro?: string; formationSsa?: string; secourisme?: { titre?: string; texte?: string } }) || {}
  const secourisme = formationComplete.secourisme || {}

  const formuleReduction = (contenu.formuleReduction as { texte?: string; note?: string }) || {}
  const testNatatoire = (contenu.testNatatoire as { intro?: string; explication?: string; modalites?: string }) || {}
  const debutFormation = (contenu.debutFormation as { date?: string; horaires?: string; effectif?: string }) || {}
  const dejaTitulaireBnssa = (contenu.dejaTitulaireBnssa as { texte?: string; action?: string }) || {}

  return (
    <>
      {/* 1. Header & Contexte */}
      <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">1. En-tête & Contexte</span>
        <TextInput label="Sous-titre / Badge" value={(contenu.label as string) || ''} onChange={v => onChange('label', v)} placeholder="Le BNSSA évolue vers le SSA" />
        <TextArea label="Texte réforme du 1er octobre 2026" value={(contenu.changement as string) || ''} onChange={v => onChange('changement', v)} rows={2} placeholder="À compter du 1er octobre 2026..." />
        <TextArea label="Présentation de l'offre du club" value={(contenu.introClub as string) || ''} onChange={v => onChange('introClub', v)} rows={2} placeholder="Le Triton Club Cavaillon propose..." />
      </div>

      {/* 2. Conditions d'accès */}
      <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">2. Conditions d&apos;accès</span>
        <TextInput label="Introduction conditions" value={conditionsAcces.texte || ''} onChange={v => onChange('conditionsAcces', { ...conditionsAcces, texte: v })} placeholder="La formation est ouverte..." />
        
        <div className="space-y-1.5">
          <FieldLabel>Critères d&apos;admission</FieldLabel>
          {points.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={p}
                onChange={(e) => {
                  const newP = [...points]
                  newP[i] = e.target.value
                  onChange('conditionsAcces', { ...conditionsAcces, points: newP })
                }}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/30 outline-none"
              />
              <button
                onClick={() => {
                  const newP = points.filter((_, idx) => idx !== i)
                  onChange('conditionsAcces', { ...conditionsAcces, points: newP })
                }}
                className="text-rose-400 hover:text-rose-600 text-xs px-1"
              >✕</button>
            </div>
          ))}
          <button
            onClick={() => {
              const newP = [...points, '']
              onChange('conditionsAcces', { ...conditionsAcces, points: newP })
            }}
            className="text-xs text-primary font-bold hover:underline"
          >+ Ajouter un critère</button>
        </div>

        <TextInput label="Effectif minimum" value={conditionsAcces.effectif || ''} onChange={v => onChange('conditionsAcces', { ...conditionsAcces, effectif: v })} placeholder="La session sera ouverte à partir de 6 candidats minimum." />
      </div>

      {/* 3. Formation SSA & Secourisme */}
      <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">3. Formation complète (SSA + PSE)</span>
        <TextArea label="Contenu théorique & pratique SSA" value={formationComplete.formationSsa || ''} onChange={v => onChange('formationComplete', { ...formationComplete, formationSsa: v })} rows={2} placeholder="Formation théorique et pratique..." />
        <TextInput label="Titre secourisme" value={secourisme.titre || ''} onChange={v => onChange('formationComplete', { ...formationComplete, secourisme: { ...secourisme, titre: v } })} placeholder="PSE1 + PSE2" />
        <TextArea label="Détails secourisme partenaire Croix-Blanche" value={secourisme.texte || ''} onChange={v => onChange('formationComplete', { ...formationComplete, secourisme: { ...secourisme, texte: v } })} rows={3} placeholder="Les formations PSE1 et PSE2 sont comprises..." />
      </div>

      {/* 4. Tarifs & Réduction */}
      <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">4. Tarifs & Remboursement surveillance</span>
        <TextInput label="Tarif complet (€)" value={String(contenu.tarifComplet ?? '750')} onChange={v => onChange('tarifComplet', v)} placeholder="750" />
        <TextArea label="Explication réduction surveillance (250 €)" value={formuleReduction.texte || ''} onChange={v => onChange('formuleReduction', { ...formuleReduction, texte: v })} rows={3} placeholder="Une formule permettant de bénéficier..." />
        <TextInput label="Note engagement Croix-Blanche" value={formuleReduction.note || ''} onChange={v => onChange('formuleReduction', { ...formuleReduction, note: v })} placeholder="Cette possibilité est soumise à l'acceptation..." />
      </div>

      {/* 5. Test Natatoire & Début */}
      <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">5. Test natatoire & Lancement</span>
        <TextInput label="Validation test MNS" value={testNatatoire.intro || ''} onChange={v => onChange('testNatatoire', { ...testNatatoire, intro: v })} placeholder="Avant le début de la formation, un test..." />
        <TextInput label="Date de début de formation" value={debutFormation.date || ''} onChange={v => onChange('debutFormation', { ...debutFormation, date: v })} placeholder="Jeudi 1er octobre 2026" />
        <TextInput label="Horaires et constitution" value={debutFormation.horaires || ''} onChange={v => onChange('debutFormation', { ...debutFormation, horaires: v })} placeholder="Les dates et horaires précis des séances..." />
      </div>

      {/* 6. Titulaire BNSSA & Avertissement */}
      <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">6. Déjà titulaire BNSSA & Réglementation</span>
        <TextArea label="Consignes pour les titulaires du BNSSA" value={dejaTitulaireBnssa.texte || ''} onChange={v => onChange('dejaTitulaireBnssa', { ...dejaTitulaireBnssa, texte: v })} rows={3} placeholder="Si vous êtes déjà titulaire du BNSSA..." />
        <TextArea label="Avertissement officiel réglementaire" value={(contenu.avertissement as string) || ''} onChange={v => onChange('avertissement', v)} rows={2} placeholder="Les modalités définitives de la formation..." />
      </div>
    </>
  )
}

// ─── Rules Fields ───────────────────────────────────────
function RulesFields({ contenu, onChange }: FieldProps) {
  const items = (contenu.items as Array<{ titre: string; texte: string; lienReglement?: string }>) || []
  const questionnaireSante = (contenu.questionnaireSante as Record<string, string>) || {}
  const honorabilite = (contenu.honorabilite as Record<string, string>) || {}

  return (
    <>
      <TextInput label="Emoji" value={(contenu.emoji as string) || ''} onChange={v => onChange('emoji', v)} placeholder="📝" />

      {/* Items */}
      <div className="space-y-2">
        <FieldLabel>Règles / Modalités</FieldLabel>
        {items.map((item, i) => (
          <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={item.titre}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[i] = { ...newItems[i], titre: e.target.value }
                  onChange('items', newItems)
                }}
                placeholder="Titre de la règle"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary/30 outline-none"
              />
              <button onClick={() => onChange('items', items.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-600 text-xs">✕</button>
            </div>
            <textarea
              value={item.texte}
              onChange={(e) => {
                const newItems = [...items]
                newItems[i] = { ...newItems[i], texte: e.target.value }
                onChange('items', newItems)
              }}
              rows={2}
              placeholder="Contenu (HTML)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/30 outline-none resize-y"
            />
          </div>
        ))}
        <button onClick={() => onChange('items', [...items, { titre: '', texte: '' }])} className="text-xs text-primary font-bold hover:underline">+ Ajouter une règle</button>
      </div>

      {/* Questionnaire Santé */}
      <div className="space-y-1.5 border-t border-slate-200 pt-3">
        <FieldLabel>Questionnaire de santé</FieldLabel>
        <TextInput label="Titre" value={questionnaireSante.titre || ''} onChange={v => onChange('questionnaireSante', { ...questionnaireSante, titre: v })} />
        <TextArea label="Texte principal" value={questionnaireSante.texte || ''} onChange={v => onChange('questionnaireSante', { ...questionnaireSante, texte: v })} rows={2} />
        <TextArea label="Détail" value={questionnaireSante.detail || ''} onChange={v => onChange('questionnaireSante', { ...questionnaireSante, detail: v })} rows={3} />
      </div>

      {/* Honorabilité */}
      <div className="space-y-1.5 border-t border-slate-200 pt-3">
        <FieldLabel>Formulaire d&apos;honorabilité</FieldLabel>
        <TextInput label="Titre" value={honorabilite.titre || ''} onChange={v => onChange('honorabilite', { ...honorabilite, titre: v })} />
        <TextArea label="Texte" value={honorabilite.texte || ''} onChange={v => onChange('honorabilite', { ...honorabilite, texte: v })} rows={2} />
      </div>
    </>
  )
}

// ─── Access Fields ──────────────────────────────────────
function AccessFields({ contenu, onChange }: FieldProps) {
  return (
    <>
      <TextInput label="Emoji" value={(contenu.emoji as string) || ''} onChange={v => onChange('emoji', v)} placeholder="🔑" />
      <TextArea label="Texte (HTML autorisé)" value={(contenu.texte as string) || ''} onChange={v => onChange('texte', v)} rows={4} />
    </>
  )
}

// ─── Financial Aid Fields ───────────────────────────────
function FinancialAidFields({ contenu, onChange }: FieldProps) {
  const sections = (contenu.sections as Array<{ titre: string; emoji: string; paragraphes: string[] }>) || []

  return (
    <>
      <TextInput label="Emoji" value={(contenu.emoji as string) || ''} onChange={v => onChange('emoji', v)} placeholder="💸" />

      <div className="space-y-3">
        <FieldLabel>Sections d&apos;aide financière</FieldLabel>
        {sections.map((section, si) => (
          <div key={si} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={section.emoji}
                onChange={(e) => {
                  const newS = [...sections]
                  newS[si] = { ...newS[si], emoji: e.target.value }
                  onChange('sections', newS)
                }}
                className="w-12 px-2 py-2 border border-slate-200 rounded-lg text-center text-sm"
                placeholder="🎟️"
              />
              <input
                type="text"
                value={section.titre}
                onChange={(e) => {
                  const newS = [...sections]
                  newS[si] = { ...newS[si], titre: e.target.value }
                  onChange('sections', newS)
                }}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary/30 outline-none"
                placeholder="Titre de la section"
              />
              <button onClick={() => onChange('sections', sections.filter((_, idx) => idx !== si))} className="text-rose-400 hover:text-rose-600 text-xs">✕</button>
            </div>

            <div className="space-y-1.5">
              {section.paragraphes.map((p, pi) => (
                <div key={pi} className="flex gap-2">
                  <textarea
                    value={p}
                    onChange={(e) => {
                      const newS = [...sections]
                      const newP = [...newS[si].paragraphes]
                      newP[pi] = e.target.value
                      newS[si] = { ...newS[si], paragraphes: newP }
                      onChange('sections', newS)
                    }}
                    rows={2}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/30 outline-none resize-y"
                    placeholder="Paragraphe..."
                  />
                  <button
                    onClick={() => {
                      const newS = [...sections]
                      newS[si] = { ...newS[si], paragraphes: newS[si].paragraphes.filter((_, idx) => idx !== pi) }
                      onChange('sections', newS)
                    }}
                    className="text-rose-400 hover:text-rose-600 text-xs self-start mt-2"
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newS = [...sections]
                  newS[si] = { ...newS[si], paragraphes: [...newS[si].paragraphes, ''] }
                  onChange('sections', newS)
                }}
                className="text-[10px] text-primary font-bold hover:underline"
              >+ Ajouter un paragraphe</button>
            </div>
          </div>
        ))}
        <button
          onClick={() => onChange('sections', [...sections, { titre: '', emoji: '', paragraphes: [''] }])}
          className="text-xs text-primary font-bold hover:underline"
        >+ Ajouter une section</button>
      </div>
    </>
  )
}

// ─── Contact Fields ─────────────────────────────────────
function ContactFields({ contenu, onChange }: FieldProps) {
  return (
    <TextArea label="Texte du pied de page" value={(contenu.texte as string) || ''} onChange={v => onChange('texte', v)} rows={3} placeholder="En cas de blocage..." />
  )
}
