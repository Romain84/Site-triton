'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getErrorMessage } from '@/lib/utils'
import { HelpTooltip, CalculationTooltip } from '@/components/ui/Tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertTriangle, Cloud, Loader2, Save } from 'lucide-react'

interface Settings {
  id: string
  tauxHoraire: number
  forfaitCompetition: number
  nbCompetitionsAnnee: number
  nbDemiJourneesParCompetition: number
  forfaitRegionalActif: boolean
  montantForfaitRegional: number
  reductionEnfantBureau: number
  boutiqueOuverte: boolean
  facturationElectronique?: boolean
  emailClub: string | null
  logoUrl: string | null
  statutsUrl: string | null
  reglementPiscineUrl: string | null
  reglementClubUrl: string | null
  formulaireLicenceFfnUrl?: string | null
  afficherBoutonTest?: boolean
  signaturePresidentUrl: string | null
  nomSignataireRecu: string | null
  titreSignataireRecu: string | null
  signatureTresoriereUrl: string | null
  nomTresoriereRecu: string | null
  titreTresoriereRecu: string | null
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPasswordConfigured?: boolean
  inscriptionUrl: string | null
  soldeDepartSaison: number
  chatbotModel: string
  debutCoursNormal: string | null
  debutCoursBnssa: string | null
  datesTests: string[] | null
  interSaisonActif: boolean
  texteFiligrane: string
  codeAccesTestsNage?: string | null
}

export default function ParametresManager() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [activeTab, setActiveTab] = useState<'general' | 'finances' | 'documents' | 'system'>('general')

  // Form state
  const [tauxHoraire, setTauxHoraire] = useState('35')
  const [forfaitCompetition, setForfaitCompetition] = useState('150')
  const [nbCompetitionsAnnee, setNbCompetitionsAnnee] = useState('20')
  const [nbDemiJourneesParCompetition, setNbDemiJourneesParCompetition] = useState('2')
  const [forfaitRegionalActif, setForfaitRegionalActif] = useState(false)
  const [montantForfaitRegional, setMontantForfaitRegional] = useState('50')
  const [reductionEnfantBureau, setReductionEnfantBureau] = useState('50')
  const [boutiqueOuverte, setBoutiqueOuverte] = useState(true)
  const [facturationElectronique, setFacturationElectronique] = useState(false)
  const [emailClub, setEmailClub] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [statutsUrl, setStatutsUrl] = useState('')
  const [reglementPiscineUrl, setReglementPiscineUrl] = useState('')
  const [reglementClubUrl, setReglementClubUrl] = useState('')
  const [formulaireLicenceFfnUrl, setFormulaireLicenceFfnUrl] = useState('')
  const [afficherBoutonTest, setAfficherBoutonTest] = useState(true)
  const [codeAccesTestsNage, setCodeAccesTestsNage] = useState('')
  const [signaturePresidentUrl, setSignaturePresidentUrl] = useState('')
  const [nomSignataireRecu, setNomSignataireRecu] = useState('Le Président')
  const [titreSignataireRecu, setTitreSignataireRecu] = useState('Président')
  const [signatureTresoriereUrl, setSignatureTresoriereUrl] = useState('')
  const [nomTresoriereRecu, setNomTresoriereRecu] = useState('La Trésorière')
  const [titreTresoriereRecu, setTitreTresoriereRecu] = useState('Trésorière')
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [uploadingSignatureTresoriere, setUploadingSignatureTresoriere] = useState(false)
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpTestedFingerprint, setSmtpTestedFingerprint] = useState('')
  const [inscriptionUrl, setInscriptionUrl] = useState('/actualites/inscriptions-2025-2026')
  const [soldeDepartSaison, setSoldeDepartSaison] = useState('0')
  const [chatbotModel, setChatbotModel] = useState('mistral-small')
  const [debutCoursNormal, setDebutCoursNormal] = useState('Lundi 21 Septembre 2026')
  const [debutCoursBnssa, setDebutCoursBnssa] = useState('Jeudi 1er Octobre 2026')
  const [datesTests, setDatesTests] = useState<string[]>(['Mercredi 16 Septembre 2026', 'Vendredi 18 Septembre 2026'])
  const [newTestDate, setNewTestDate] = useState('')
  const [interSaisonActif, setInterSaisonActif] = useState(false)
  const [texteFiligrane, setTexteFiligrane] = useState('Saison 2025 - 2026')

  // Upload state
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingStatuts, setUploadingStatuts] = useState(false)
  const [uploadingReglementPiscine, setUploadingReglementPiscine] = useState(false)
  const [uploadingReglementClub, setUploadingReglementClub] = useState(false)
  const [uploadingFormulaireLicenceFfn, setUploadingFormulaireLicenceFfn] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/parametres')
      if (response.ok) {
        const data = await response.json()
        const s = data.settings
        setSettings(s)
        setTauxHoraire(s.tauxHoraire?.toString() || '35')
        setForfaitCompetition(s.forfaitCompetition?.toString() || '150')
        setNbCompetitionsAnnee(s.nbCompetitionsAnnee?.toString() || '20')
        setNbDemiJourneesParCompetition(s.nbDemiJourneesParCompetition?.toString() || '2')
        setForfaitRegionalActif(s.forfaitRegionalActif ?? false)
        setMontantForfaitRegional(s.montantForfaitRegional?.toString() || '50')
        setReductionEnfantBureau(s.reductionEnfantBureau?.toString() || '50')
        setBoutiqueOuverte(s.boutiqueOuverte ?? true)
        setFacturationElectronique(s.facturationElectronique ?? false)
        setEmailClub(s.emailClub || '')
        setLogoUrl(s.logoUrl || '')
        setStatutsUrl(s.statutsUrl || '')
        setReglementPiscineUrl(s.reglementPiscineUrl || '')
        setReglementClubUrl(s.reglementClubUrl || '')
        setFormulaireLicenceFfnUrl(s.formulaireLicenceFfnUrl || '')
        setAfficherBoutonTest(s.afficherBoutonTest ?? true)
        setCodeAccesTestsNage(s.codeAccesTestsNage || '')
        setSignaturePresidentUrl(s.signaturePresidentUrl || '')
        setNomSignataireRecu(s.nomSignataireRecu || 'Le Président')
        setTitreSignataireRecu(s.titreSignataireRecu || 'Président')
        setSignatureTresoriereUrl(s.signatureTresoriereUrl || '')
        setNomTresoriereRecu(s.nomTresoriereRecu || 'La Trésorière')
        setTitreTresoriereRecu(s.titreTresoriereRecu || 'Trésorière')
        setSmtpHost(s.smtpHost || '')
        setSmtpPort(s.smtpPort?.toString() || '587')
        setSmtpUser(s.smtpUser || '')
        setInscriptionUrl(s.inscriptionUrl || '/actualites/inscriptions-2025-2026')
        setSoldeDepartSaison(s.soldeDepartSaison?.toString() || '0')
        setChatbotModel(s.chatbotModel || 'mistral-small')
        setDebutCoursNormal(s.debutCoursNormal || 'Lundi 21 Septembre 2026')
        setDebutCoursBnssa(s.debutCoursBnssa || 'Jeudi 1er Octobre 2026')
        setDatesTests(s.datesTests || [])
        setInterSaisonActif(s.interSaisonActif ?? false)
        setTexteFiligrane(s.texteFiligrane || 'Saison 2025 - 2026')
        setIsInitialized(true)
      }
    } catch (err) {
      setError('Erreur lors du chargement des paramètres')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    if (file.size > 2 * 1024 * 1024) {
      setError('Fichier trop volumineux (Max 2MB)')
      return
    }

    setUploadingLogo(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/admin/upload-logo?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      const blob = await res.json()
      setLogoUrl(blob.url)
      setSuccess('Logo uploadé avec succès ! N\'oubliez pas d\'enregistrer les paramètres.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    if (file.size > 2 * 1024 * 1024) {
      setError('Fichier trop volumineux (Max 2MB)')
      return
    }

    setUploadingSignature(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/admin/upload-logo?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      const blob = await res.json()
      setSignaturePresidentUrl(blob.url)
      setSuccess('Signature chargée avec succès ! N\'oubliez pas d\'enregistrer les paramètres.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploadingSignature(false)
      e.target.value = ''
    }
  }

  const handleSignatureTresoriereUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    if (file.size > 2 * 1024 * 1024) {
      setError('Fichier trop volumineux (Max 2MB)')
      return
    }

    setUploadingSignatureTresoriere(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/admin/upload-logo?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      const blob = await res.json()
      setSignatureTresoriereUrl(blob.url)
      setSuccess('Signature de la trésorière chargée avec succès ! N\'oubliez pas d\'enregistrer.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploadingSignatureTresoriere(false)
      e.target.value = ''
    }
  }

  const handleStatutsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    if (file.type !== 'application/pdf') {
      setError('Seulement les fichiers PDF sont autorisés')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop volumineux (Max 5MB)')
      return
    }

    setUploadingStatuts(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/admin/upload-pdf`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      const result = await res.json()
      setStatutsUrl(result.path)
      setSuccess('Statuts uploadés avec succès ! N\'oubliez pas d\'enregistrer les paramètres.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploadingStatuts(false)
      e.target.value = ''
    }
  }

  const handleReglementPiscineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    if (file.type !== 'application/pdf') {
      setError('Seulement les fichiers PDF sont autorisés')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop volumineux (Max 5MB)')
      return
    }

    setUploadingReglementPiscine(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/admin/upload-pdf`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      const result = await res.json()
      setReglementPiscineUrl(result.path)
      setSuccess('Règlement de la piscine uploadé avec succès ! N\'oubliez pas d\'enregistrer.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploadingReglementPiscine(false)
      e.target.value = ''
    }
  }

  const handleReglementClubUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    if (file.type !== 'application/pdf') {
      setError('Seulement les fichiers PDF sont autorisés')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop volumineux (Max 5MB)')
      return
    }

    setUploadingReglementClub(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/admin/upload-pdf`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      const result = await res.json()
      setReglementClubUrl(result.path)
      setSuccess('Règlement du club uploadé avec succès ! N\'oubliez pas d\'enregistrer.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploadingReglementClub(false)
      e.target.value = ''
    }
  }

  const handleFormulaireLicenceFfnUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    if (file.type !== 'application/pdf') {
      setError('Seulement les fichiers PDF sont autorisés')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop volumineux (Max 5MB)')
      return
    }

    setUploadingFormulaireLicenceFfn(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/admin/upload-pdf`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      const result = await res.json()
      setFormulaireLicenceFfnUrl(result.path)
      setSuccess('Formulaire de licence FFN uploadé avec succès ! N\'oubliez pas d\'enregistrer.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploadingFormulaireLicenceFfn(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/parametres', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tauxHoraire,
          forfaitCompetition,
          nbCompetitionsAnnee,
          nbDemiJourneesParCompetition,
          forfaitRegionalActif,
          montantForfaitRegional,
          reductionEnfantBureau,
          boutiqueOuverte,
          facturationElectronique,
          emailClub,
          logoUrl: logoUrl || null,
          statutsUrl: statutsUrl || null,
          reglementPiscineUrl: reglementPiscineUrl || null,
          reglementClubUrl: reglementClubUrl || null,
          formulaireLicenceFfnUrl: formulaireLicenceFfnUrl || null,
          afficherBoutonTest,
          codeAccesTestsNage: codeAccesTestsNage.trim() || null,
          signaturePresidentUrl: signaturePresidentUrl || null,
          nomSignataireRecu: nomSignataireRecu || 'Le Président',
          titreSignataireRecu: titreSignataireRecu || 'Président',
          signatureTresoriereUrl: signatureTresoriereUrl || null,
          nomTresoriereRecu: nomTresoriereRecu || 'La Trésorière',
          titreTresoriereRecu: titreTresoriereRecu || 'Trésorière',
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassword: smtpPassword || undefined,
          inscriptionUrl: inscriptionUrl || null,
          soldeDepartSaison,
          chatbotModel,
          debutCoursNormal,
          debutCoursBnssa,
          datesTests,
          interSaisonActif,
          texteFiligrane,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      const data = await response.json()
      setSettings(data.settings)
      setSuccess('Paramètres enregistrés avec succès')
      setSmtpPassword('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const isChanged = () => {
    if (!settings) return false
    return (
      tauxHoraire !== (settings.tauxHoraire?.toString() || '35') ||
      forfaitCompetition !== (settings.forfaitCompetition?.toString() || '150') ||
      nbCompetitionsAnnee !== (settings.nbCompetitionsAnnee?.toString() || '20') ||
      nbDemiJourneesParCompetition !== (settings.nbDemiJourneesParCompetition?.toString() || '2') ||
      forfaitRegionalActif !== (settings.forfaitRegionalActif ?? false) ||
      montantForfaitRegional !== (settings.montantForfaitRegional?.toString() || '50') ||
      reductionEnfantBureau !== (settings.reductionEnfantBureau?.toString() || '50') ||
      boutiqueOuverte !== (settings.boutiqueOuverte ?? true) ||
      facturationElectronique !== (settings.facturationElectronique ?? false) ||
      emailClub !== (settings.emailClub || '') ||
      logoUrl !== (settings.logoUrl || '') ||
      statutsUrl !== (settings.statutsUrl || '') ||
      reglementPiscineUrl !== (settings.reglementPiscineUrl || '') ||
      reglementClubUrl !== (settings.reglementClubUrl || '') ||
      formulaireLicenceFfnUrl !== (settings.formulaireLicenceFfnUrl || '') ||
      afficherBoutonTest !== (settings.afficherBoutonTest ?? true) ||
      signaturePresidentUrl !== (settings.signaturePresidentUrl || '') ||
      nomSignataireRecu !== (settings.nomSignataireRecu || 'Le Président') ||
      titreSignataireRecu !== (settings.titreSignataireRecu || 'Président') ||
      signatureTresoriereUrl !== (settings.signatureTresoriereUrl || '') ||
      nomTresoriereRecu !== (settings.nomTresoriereRecu || 'La Trésorière') ||
      titreTresoriereRecu !== (settings.titreTresoriereRecu || 'Trésorière') ||
      smtpHost !== (settings.smtpHost || '') ||
      smtpPort !== (settings.smtpPort?.toString() || '587') ||
      smtpUser !== (settings.smtpUser || '') ||
      (smtpPassword !== '') ||
      inscriptionUrl !== (settings.inscriptionUrl || '/actualites/inscriptions-2025-2026') ||
      soldeDepartSaison !== (settings.soldeDepartSaison?.toString() || '0') ||
      chatbotModel !== (settings.chatbotModel || 'mistral-small') ||
      debutCoursNormal !== (settings.debutCoursNormal || 'Lundi 21 Septembre 2026') ||
      debutCoursBnssa !== (settings.debutCoursBnssa || 'Jeudi 1er Octobre 2026') ||
      JSON.stringify(datesTests) !== JSON.stringify(settings.datesTests || []) ||
      interSaisonActif !== (settings.interSaisonActif ?? false) ||
      texteFiligrane !== (settings.texteFiligrane || 'Saison 2025 - 2026')
    )
  }

  const autoSaveSettings = async () => {
    setSaveStatus('saving')
    setError('')
    try {
      const response = await fetch('/api/admin/parametres', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tauxHoraire,
          forfaitCompetition,
          nbCompetitionsAnnee,
          nbDemiJourneesParCompetition,
          forfaitRegionalActif,
          montantForfaitRegional,
          reductionEnfantBureau,
          boutiqueOuverte,
          emailClub,
          logoUrl: logoUrl || null,
          statutsUrl: statutsUrl || null,
          reglementPiscineUrl: reglementPiscineUrl || null,
          reglementClubUrl: reglementClubUrl || null,
          formulaireLicenceFfnUrl: formulaireLicenceFfnUrl || null,
          afficherBoutonTest,
          signaturePresidentUrl: signaturePresidentUrl || null,
          nomSignataireRecu: nomSignataireRecu || 'Le Président',
          titreSignataireRecu: titreSignataireRecu || 'Président',
          signatureTresoriereUrl: signatureTresoriereUrl || null,
          nomTresoriereRecu: nomTresoriereRecu || 'La Trésorière',
          titreTresoriereRecu: titreTresoriereRecu || 'Trésorière',
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassword: smtpPassword || undefined,
          inscriptionUrl: inscriptionUrl || null,
          soldeDepartSaison,
          chatbotModel,
          debutCoursNormal,
          debutCoursBnssa,
          datesTests,
          interSaisonActif,
          texteFiligrane,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const msg = errorData.error || errorData.message || 'Erreur lors de la sauvegarde automatique'
        throw new Error(msg)
      }

      const data = await response.json()
      setSettings(data.settings)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err: any) {
      setSaveStatus('error')
      setError(err?.message || 'Erreur lors de la sauvegarde automatique')
    }
  }

  const handleDeclencheDebutSaison = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir déclarer le début de la nouvelle saison ?\n\nCela va :\n1. Désactiver le mode inter-saison\n2. Incrémenter automatiquement d'un an toutes vos dates configurées (rentrée, tests)\n3. Faire avancer l'année de la saison (filigrane)")) {
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/admin/parametres/debut-saison', {
        method: 'POST',
      })

      const data = await response.json()
      if (response.ok) {
        setSuccess("Début de saison déclaré avec succès !")
        const s = data.settings
        setInterSaisonActif(s.interSaisonActif)
        setTexteFiligrane(s.texteFiligrane)
        setDebutCoursNormal(s.debutCoursNormal)
        setDebutCoursBnssa(s.debutCoursBnssa)
        setDatesTests(s.datesTests || [])
        
        if (settings) {
          setSettings({
            ...settings,
            interSaisonActif: s.interSaisonActif,
            texteFiligrane: s.texteFiligrane,
            debutCoursNormal: s.debutCoursNormal,
            debutCoursBnssa: s.debutCoursBnssa,
            datesTests: s.datesTests
          })
        }
      } else {
        setError(data.error || 'Erreur lors de la déclaration du début de saison')
      }
    } catch {
      setError('Erreur réseau lors de la déclaration du début de saison')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!isInitialized || !isChanged()) return

    const delayDebounceFn = setTimeout(() => {
      autoSaveSettings()
    }, 1000)

    return () => clearTimeout(delayDebounceFn)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tauxHoraire,
    forfaitCompetition,
    nbCompetitionsAnnee,
    nbDemiJourneesParCompetition,
    forfaitRegionalActif,
    montantForfaitRegional,
    reductionEnfantBureau,
    boutiqueOuverte,
    emailClub,
    logoUrl,
    statutsUrl,
    reglementPiscineUrl,
    reglementClubUrl,
    signaturePresidentUrl,
    nomSignataireRecu,
    titreSignataireRecu,
    signatureTresoriereUrl,
    nomTresoriereRecu,
    titreTresoriereRecu,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPassword,
    inscriptionUrl,
    soldeDepartSaison,
    chatbotModel,
    debutCoursNormal,
    debutCoursBnssa,
    datesTests,
    interSaisonActif,
    texteFiligrane,
    isInitialized
  ])

  const testSmtpConnection = async (sendTest = false) => {
    const validationWarning = getSmtpValidationWarning()
    if (validationWarning) {
      setError(validationWarning)
      return
    }

    setTestingSmtp(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sendTest,
          testEmail: smtpUser || emailClub,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassword: smtpPassword || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Erreur de connexion SMTP')
      }

      setSuccess(data.message)
      setSmtpTestedFingerprint(buildSmtpFingerprint())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setTestingSmtp(false)
    }
  }

  const isGmailUser = /@gmail\.com$|@googlemail\.com$/i.test(smtpUser.trim())
  const isGmailHost = /(^|\.)gmail\.com$|(^|\.)googlemail\.com$/i.test(smtpHost.trim())
  const smtpIsGmail = isGmailUser || isGmailHost

  const buildSmtpFingerprint = () => `${smtpHost.trim().toLowerCase()}|${smtpPort.trim()}|${smtpUser.trim().toLowerCase()}|${smtpPassword ? 'new-password' : 'stored-password'}`
  const smtpNeedsRetest = smtpTestedFingerprint !== '' && smtpTestedFingerprint !== buildSmtpFingerprint()

  const getSmtpValidationWarning = () => {
    if (!smtpHost || !smtpUser) return 'Renseignez le serveur SMTP et l’utilisateur avant de tester.'

    if (smtpIsGmail) {
      if (!/smtp\.gmail\.com$/i.test(smtpHost.trim())) {
        return 'Configuration Gmail détectée: utilisez le host smtp.gmail.com.'
      }
      if (!['587', '465'].includes(smtpPort.trim())) {
        return 'Configuration Gmail détectée: utilisez le port 587 (TLS) ou 465 (SSL).'
      }
      if (!smtpPassword && !settings?.smtpPasswordConfigured) {
        return 'Configuration Gmail détectée: saisissez un mot de passe d’application Gmail (16 caractères).'
      }
    }

    return ''
  }

  const smtpValidationWarning = getSmtpValidationWarning()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-xs">Chargement des paramètres...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Paramètres Globaux</h2>
          <p className="text-sm text-gray-550 mt-0.5">Configurez le fonctionnement du club, de la trésorerie et de l&apos;intelligence artificielle.</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start gap-3 shadow-3xs">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-rose-900 text-xs font-bold">Erreur rencontrée</p>
            <p className="text-rose-700 text-xs mt-0.5 font-normal">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3 shadow-3xs animate-pulse">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 text-xs font-bold">✓</div>
          <div>
            <p className="text-emerald-900 text-xs font-bold">Action réussie</p>
            <p className="text-emerald-700 text-xs mt-0.5 font-normal">{success}</p>
          </div>
        </div>
      )}

      {/* Onglets interactifs premium */}
      <div className="flex flex-wrap gap-2 bg-slate-50 border border-slate-250/60 p-1.5 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === 'general'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🏠</span> Général & Rentrée
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('finances')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === 'finances'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>💰</span> Tarifs & Trésorerie
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === 'documents'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📁</span> Documents & Signatures
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === 'system'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>⚙️</span> Système & SMTP
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'general' && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Logo du club */}
              <div className="card p-6">
                <h3 className="text-md font-bold text-slate-900 mb-4 border-b pb-2 flex items-center gap-2">Logo du Club</h3>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                   <div className="flex-shrink-0">
                      <div className="w-28 h-28 border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden bg-slate-50 relative shadow-2xs">
                        {logoUrl ? (
                          <Image
                            src={logoUrl}
                            alt="Logo"
                            fill
                            className="object-contain p-2"
                            unoptimized={logoUrl.includes('blob.vercel-storage.com')}
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">Aucun logo</span>
                        )}
                      </div>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="mt-2 text-red-600 text-xs font-semibold hover:underline w-full text-center"
                        >
                          Supprimer le logo
                        </button>
                      )}
                   </div>

                   <div className="flex-1 space-y-3">
                     <label className="block text-xs font-bold text-gray-700">
                       Télécharger un nouveau logo
                     </label>
                     <input
                       type="file"
                       accept="image/png, image/jpeg, image/webp, image/svg+xml"
                       onChange={handleLogoUpload}
                       disabled={uploadingLogo}
                       className="block w-full text-xs text-gray-500
                         file:mr-4 file:py-1.5 file:px-4
                         file:rounded-full file:border-0
                         file:text-xs file:font-semibold
                         file:bg-slate-100 file:text-slate-800
                         hover:file:bg-slate-200
                         disabled:opacity-50 cursor-pointer"
                     />
                     <p className="text-[10px] text-gray-500">
                       Formats acceptés : JPG, PNG, WEBP, SVG. Taille max : 2Mo. Le logo apparaîtra automatiquement dans l&apos;en-tête du site.
                     </p>
                     {uploadingLogo && <p className="text-blue-600 text-xs font-bold mt-1">Upload en cours...</p>}
                   </div>
                 </div>
              </div>

              {/* Généralités & Inscription */}
              <div className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-md font-bold text-slate-900 border-b pb-2">Informations Générales</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Adresse email officielle du club
                    </label>
                    <input
                      type="email"
                      value={emailClub}
                      onChange={(e) => setEmailClub(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                      placeholder="email@club.com"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Les factures générées par les coaches et les demandes de contact sont envoyées à cette adresse.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lien d&apos;inscription
                    </label>
                    <input
                      type="text"
                      value={inscriptionUrl}
                      onChange={(e) => setInscriptionUrl(e.target.value)}
                      placeholder="/actualites/inscriptions"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Page vers laquelle les boutons &quot;S&apos;inscrire&quot; redirigent les visiteurs.</p>
                  </div>
                </div>

                <div className="space-y-4 md:border-l md:border-slate-100 md:pl-6">
                  <h3 className="text-md font-bold text-slate-900 border-b pb-2">Mode Inter-Saison</h3>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-gray-700 mb-2">
                      <input
                        type="checkbox"
                        checked={interSaisonActif}
                        onChange={(e) => setInterSaisonActif(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      />
                      Activer le mode inter-saison
                    </label>
                    <p className="text-[10px] text-gray-500">
                      Grise légèrement les pages Tarifs (Horaires et Inscriptions) pour indiquer qu&apos;il s&apos;agit des anciennes données en cours de mise à jour.
                    </p>
                  </div>
                  {interSaisonActif && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Texte du filigrane
                      </label>
                      <input
                        type="text"
                        value={texteFiligrane}
                        onChange={(e) => setTexteFiligrane(e.target.value)}
                        placeholder="Ex: Saison 2025 - 2026"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Dates Rentrée & Tests */}
              <div className="card p-6 space-y-6">
                <h3 className="text-md font-bold text-slate-900 border-b pb-2 flex items-center gap-2">Dates de Rentrée & Tests</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Début des cours (Groupes classiques)
                    </label>
                    <input
                      type="text"
                      value={debutCoursNormal}
                      onChange={(e) => setDebutCoursNormal(e.target.value)}
                      placeholder="Ex: Lundi 21 Septembre 2026"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-805"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Début des cours (Groupe BNSSA)
                    </label>
                    <input
                      type="text"
                      value={debutCoursBnssa}
                      onChange={(e) => setDebutCoursBnssa(e.target.value)}
                      placeholder="Ex: Jeudi 1er Octobre 2026"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-805"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Dates des tests de rentrée programmés
                  </label>
                  
                  <div className="flex gap-2 max-w-lg mb-3">
                    <input
                      type="text"
                      value={newTestDate}
                      onChange={(e) => setNewTestDate(e.target.value)}
                      placeholder="Ex: Mercredi 16 Septembre 2026"
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newTestDate.trim() && !datesTests.includes(newTestDate.trim())) {
                          setDatesTests([...datesTests, newTestDate.trim()])
                          setNewTestDate('')
                        }
                      }}
                      className="px-4 py-1.5 bg-primary text-slate-950 font-bold rounded-lg hover:bg-primary-dark transition-all text-xs cursor-pointer shadow-3xs"
                    >
                      Ajouter
                    </button>
                  </div>

                  {datesTests.length === 0 ? (
                    <p className="text-[11px] text-gray-500 italic">Aucune date configurée.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-w-full">
                      {datesTests.map((date, index) => (
                        <div key={index} className="flex items-center gap-2 bg-slate-100/80 border border-slate-200/60 rounded-xl px-3 py-1 text-xs">
                          <span className="text-slate-800 font-medium">{date}</span>
                          <button
                            type="button"
                            onClick={() => setDatesTests(datesTests.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700 font-bold text-[10px] cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                    <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-2xl p-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">🏊</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-950">
                              Réservations publiques des tests de niveau (/tests-de-nage)
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${afficherBoutonTest ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {afficherBoutonTest ? 'Inscriptions Ouvertes' : 'Inscriptions Fermées'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            {afficherBoutonTest
                              ? 'Les créneaux sont ouverts aux réservations publiques (bouton affiché sur la page Inscription et accès libre).'
                              : 'Les réservations sont totalement verrouillées : le bouton est masqué et la page /tests-de-nage affiche un message indiquant la fermeture.'}
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={afficherBoutonTest}
                          onChange={(e) => setAfficherBoutonTest(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* Protection par Mot de passe / Code d'accès */}
                    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🔑</span>
                          <label className="text-xs font-bold text-slate-900 block">
                            Mot de passe ou Code secret d&apos;accès aux tests (optionnel)
                          </label>
                        </div>
                        {codeAccesTestsNage.trim() && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                            Code Actif
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={codeAccesTestsNage}
                        onChange={(e) => setCodeAccesTestsNage(e.target.value)}
                        placeholder="Laisser vide pour un accès libre sans mot de passe"
                        className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Si vous renseignez un code, toute personne se rendant sur <code>/tests-de-nage</code> devra obligatoirement le saisir pour déverrouiller l&apos;accès aux créneaux et réserver.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transition Saison Card */}
              <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-3xs">
                <div className="flex-1">
                  <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-1.5">
                    🚀 Transition vers la Nouvelle Saison
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                    Cette action désactive le mode inter-saison, incrémente automatiquement d&apos;un an toutes vos dates de cours, de tests et met à jour l&apos;année du filigrane général.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDeclencheDebutSaison}
                  disabled={saving}
                  className="whitespace-nowrap px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  Déclarer le début de saison
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'finances' && (
            <motion.div
              key="finances"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Trésorerie & Boutique */}
              <div className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-md font-bold text-slate-900 mb-4 border-b pb-2 flex items-center gap-1.5">
                    Trésorerie
                    <HelpTooltip title="Solde initial">
                      Le solde initial de trésorerie disponible au début de la saison comptable.
                    </HelpTooltip>
                  </h3>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Solde de départ de la saison (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={soldeDepartSaison}
                    onChange={(e) => setSoldeDepartSaison(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:border-l md:border-slate-100 md:pl-6">
                  <h3 className="text-md font-bold text-slate-900 mb-4 border-b pb-2">Boutique Club</h3>
                  <label className="flex items-center gap-3 cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      checked={boutiqueOuverte}
                      onChange={(e) => setBoutiqueOuverte(e.target.checked)}
                      className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-700">Ouvrir la boutique aux commandes</span>
                      <p className="text-[10px] text-gray-500">
                        Si décoché, les articles sont visibles mais les membres ne peuvent pas commander.
                      </p>
                    </div>
                  </label>
                  {!boutiqueOuverte && (
                    <div className="mt-3 bg-amber-50 border border-amber-100 p-2.5 rounded-lg text-amber-700 text-[10px] font-semibold">
                      ⚠️ La boutique est fermée aux ventes.
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <h3 className="text-md font-bold text-slate-900 mb-3">Facturation Électronique (ABBY)</h3>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={facturationElectronique}
                        onChange={(e) => setFacturationElectronique(e.target.checked)}
                        className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-700">Activer la facturation électronique (Export ABBY)</span>
                        <p className="text-[10px] text-gray-500">
                          Si décoché, les clés API ABBY et le bouton d&apos;exportation vers ABBY dans l&apos;espace coach seront grisés.
                        </p>
                      </div>
                    </label>
                    {!facturationElectronique && (
                      <div className="mt-2.5 bg-slate-100 border border-slate-200 p-2.5 rounded-lg text-slate-600 text-[10px] font-semibold">
                        🔒 Facturation électronique désactivée par l&apos;administration.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rémunération des Entraîneurs */}
              <div className="card p-6 space-y-6">
                <h3 className="text-md font-bold text-slate-900 border-b pb-2 flex items-center gap-1.5">Rémunération des Coaches</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      Taux horaire (€/h)
                      <CalculationTooltip
                        title="Rémunération horaire"
                        formula="Heures entraînements × Taux horaire"
                        explanation="Appliqué à chaque heure d'entraînement (planning fixe, tournant, remplacements)."
                        example="10h × 35€ = 350€"
                      />
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tauxHoraire}
                      onChange={(e) => setTauxHoraire(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      Forfait compétition (€/demi-journée)
                      <CalculationTooltip
                        title="Forfait compétition"
                        formula="Nb demi-journées × Forfait"
                        explanation="Rémunère les demi-journées d'accompagnement en compétitions."
                        example="2 demi-journées × 150€ = 300€"
                      />
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={forfaitCompetition}
                      onChange={(e) => setForfaitCompetition(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      Demi-journées par compétition
                      <CalculationTooltip
                        title="Compétition par défaut"
                        formula="Par défaut : 2 demi-journées"
                        explanation="Valeur par défaut appliquée pour l'estimation de coût d'une compétition."
                        example="1 compétition = 2 demi-journées de forfait"
                      />
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="2"
                      step="1"
                      value={nbDemiJourneesParCompetition}
                      onChange={(e) => setNbDemiJourneesParCompetition(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      Compétitions par saison (défaut)
                      <CalculationTooltip
                        title="Nombre par saison"
                        formula="Estimations par défaut"
                        explanation="Nombre de compétitions estimées par défaut sur l'année pour les groupes n'ayant pas de valeur spécifique."
                        example="Appliqué dans l'analyse financière globale."
                      />
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={nbCompetitionsAnnee}
                      onChange={(e) => setNbCompetitionsAnnee(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-805"
                    />
                  </div>
                </div>
              </div>

              {/* Forfait Régional & Réductions Bureau */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Forfait Régional */}
                <div className="card p-6 space-y-4">
                  <h3 className="text-md font-bold text-slate-900 border-b pb-2 flex items-center gap-1.5">
                    Déplacements Régionaux (Bonus)
                    <HelpTooltip title="Forfait Régional">
                      Indemnisation s'ajoutant aux frais de déplacement pour les compétitions hors département avec hébergement.
                    </HelpTooltip>
                  </h3>
                  
                  <div className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forfaitRegionalActif}
                      onChange={(e) => setForfaitRegionalActif(e.target.checked)}
                      className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-700">Autoriser la saisie d&apos;un montant libre</span>
                      <p className="text-[10px] text-gray-500">Le coach déclare le montant de son choix.</p>
                    </div>
                  </div>

                  {!forfaitRegionalActif && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Montant fixe imposé (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={montantForfaitRegional}
                        onChange={(e) => setMontantForfaitRegional(e.target.value)}
                        className="w-full md:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                        placeholder="50.00"
                      />
                    </div>
                  )}

                  <div className="bg-slate-50 p-3 border border-slate-200/60 rounded-xl text-slate-650 text-xs">
                    {forfaitRegionalActif ? (
                      <p>✅ <strong>Mode libre actif</strong> : Les coaches règlent eux-mêmes le montant du forfait.</p>
                    ) : (
                      <p>🔒 <strong>Mode fixe actif</strong> : Rémunération bloquée à <strong>{montantForfaitRegional}€</strong> par forfait régional.</p>
                    )}
                  </div>
                </div>

                {/* Réductions bureau */}
                <div className="card p-6 space-y-4">
                  <h3 className="text-md font-bold text-slate-900 border-b pb-2 flex items-center gap-1.5">
                    Réductions Membres du Bureau
                    <HelpTooltip title="Réductions Bureau">
                      Remises accordées aux administrateurs bénévoles du club et à leurs enfants.
                    </HelpTooltip>
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      Réduction enfants de dirigeants (%)
                      <CalculationTooltip
                        title="Réduction enfants"
                        formula="Tarif × (1 - Pourcentage%)"
                        explanation="Applique le pourcentage de remise calculé sur les enfants de membres du bureau."
                        example="Ex : 200€ × (1 - 50%) = 100€"
                      />
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={reductionEnfantBureau}
                      onChange={(e) => setReductionEnfantBureau(e.target.value)}
                      className="w-full md:w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-850"
                      placeholder="50"
                    />
                  </div>
                  <div className="bg-slate-50 p-3 border border-slate-200/60 rounded-xl text-xs space-y-1">
                    <p>• <strong>Dirigeants (bureau) :</strong> Gratuité totale (100% de réduction).</p>
                    <p>• <strong>Enfants de dirigeants :</strong> {reductionEnfantBureau}% de réduction.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'documents' && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Signatures Reçus Fiscaux */}
              <div className="card p-6 space-y-6">
                <h3 className="text-md font-bold text-slate-900 border-b pb-2 flex items-center gap-1.5">Signatures Fac-similés (Reçus fiscaux)</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* President */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 border-l-2 border-primary pl-2 uppercase tracking-wide">Signature Président</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Nom complet</label>
                        <input
                          type="text"
                          value={nomSignataireRecu}
                          onChange={(e) => setNomSignataireRecu(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-805"
                          placeholder="Jean Dupont"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Titre du signataire</label>
                        <input
                          type="text"
                          value={titreSignataireRecu}
                          onChange={(e) => setTitreSignataireRecu(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-805"
                          placeholder="Le Président"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-start pt-2">
                      <div className="w-36 h-20 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 relative shadow-2xs">
                        {signaturePresidentUrl ? (
                          <Image
                            src={signaturePresidentUrl}
                            alt="Signature"
                            fill
                            className="object-contain p-1.5"
                            unoptimized={signaturePresidentUrl.includes('blob.vercel-storage.com')}
                          />
                        ) : (
                          <span className="text-gray-400 text-[10px]">Aucune image</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleSignatureUpload}
                          disabled={uploadingSignature}
                          className="block w-full text-[10px] text-gray-500
                            file:mr-2 file:py-1 file:px-3
                            file:rounded-full file:border-0
                            file:text-[10px] file:font-semibold
                            file:bg-slate-100 file:text-slate-800
                            hover:file:bg-slate-200"
                        />
                        {signaturePresidentUrl && (
                          <button
                            type="button"
                            onClick={() => setSignaturePresidentUrl('')}
                            className="text-red-500 hover:text-red-700 text-[10px] font-bold block"
                          >
                            Retirer la signature
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Treasurer */}
                  <div className="space-y-4 lg:border-l lg:border-slate-100 lg:pl-8">
                    <h4 className="text-xs font-bold text-slate-800 border-l-2 border-teal-500 pl-2 uppercase tracking-wide">Signature Trésorière</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Nom complet</label>
                        <input
                          type="text"
                          value={nomTresoriereRecu}
                          onChange={(e) => setNomTresoriereRecu(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-850"
                          placeholder="Sophie Martin"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Titre de la signataire</label>
                        <input
                          type="text"
                          value={titreTresoriereRecu}
                          onChange={(e) => setTitreTresoriereRecu(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-850"
                          placeholder="La Trésorière"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-start pt-2">
                      <div className="w-36 h-20 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 relative shadow-2xs">
                        {signatureTresoriereUrl ? (
                          <Image
                            src={signatureTresoriereUrl}
                            alt="Signature"
                            fill
                            className="object-contain p-1.5"
                            unoptimized={signatureTresoriereUrl.includes('blob.vercel-storage.com')}
                          />
                        ) : (
                          <span className="text-gray-400 text-[10px]">Aucune image</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleSignatureTresoriereUpload}
                          disabled={uploadingSignatureTresoriere}
                          className="block w-full text-[10px] text-gray-500
                            file:mr-2 file:py-1 file:px-3
                            file:rounded-full file:border-0
                            file:text-[10px] file:font-semibold
                            file:bg-slate-100 file:text-slate-800
                            hover:file:bg-slate-200"
                        />
                        {signatureTresoriereUrl && (
                          <button
                            type="button"
                            onClick={() => setSignatureTresoriereUrl('')}
                            className="text-red-500 hover:text-red-700 text-[10px] font-bold block"
                          >
                            Retirer la signature
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uploads PDF Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Formulaire Licence FFN */}
                <div className="card p-5 space-y-4 border-2 border-primary/20 bg-primary/5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">🏊 Formulaire FFN</h3>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-primary/20 text-primary-dark px-2 py-0.5 rounded-full">Adhésion</span>
                  </div>
                  <div className="w-24 h-24 border border-slate-200 bg-white rounded-xl flex flex-col items-center justify-center text-center p-2 mx-auto shadow-2xs">
                    {formulaireLicenceFfnUrl ? (
                      <>
                        <span className="text-primary text-3xl">📄</span>
                        <span className="text-[8px] text-gray-500 truncate max-w-full font-mono mt-1">{formulaireLicenceFfnUrl.substring(formulaireLicenceFfnUrl.lastIndexOf('/') + 1)}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 text-[10px]">Aucun PDF</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFormulaireLicenceFfnUpload}
                    disabled={uploadingFormulaireLicenceFfn}
                    className="block w-full text-[10px] text-gray-500"
                  />
                  {uploadingFormulaireLicenceFfn && <p className="text-blue-600 text-[10px] font-bold text-center">Upload en cours...</p>}
                  {formulaireLicenceFfnUrl && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[10px]">
                      <a
                        href={formulaireLicenceFfnUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-bold hover:underline"
                      >
                        Visualiser
                      </a>
                      <button type="button" onClick={() => setFormulaireLicenceFfnUrl('')} className="text-red-500 hover:text-red-700 font-bold">Retirer</button>
                    </div>
                  )}
                </div>

                {/* Statuts */}
                <div className="card p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b pb-2">📜 Statuts du Club</h3>
                  <div className="w-24 h-24 border border-slate-200 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-center p-2 mx-auto">
                    {statutsUrl ? (
                      <>
                        <span className="text-red-500 text-3xl">📄</span>
                        <span className="text-[8px] text-gray-500 truncate max-w-full font-mono mt-1">{statutsUrl.substring(statutsUrl.lastIndexOf('/') + 1)}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 text-[10px]">Aucun PDF</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleStatutsUpload}
                    disabled={uploadingStatuts}
                    className="block w-full text-[10px] text-gray-500"
                  />
                  {statutsUrl && (
                    <button type="button" onClick={() => setStatutsUrl('')} className="text-red-500 hover:text-red-700 text-[10px] font-bold w-full text-center">Retirer</button>
                  )}
                </div>

                {/* Règlement piscine */}
                <div className="card p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b pb-2">🏊‍♂️ Règlement Piscine</h3>
                  <div className="w-24 h-24 border border-slate-200 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-center p-2 mx-auto">
                    {reglementPiscineUrl ? (
                      <>
                        <span className="text-red-500 text-3xl">📄</span>
                        <span className="text-[8px] text-gray-500 truncate max-w-full font-mono mt-1">{reglementPiscineUrl.substring(reglementPiscineUrl.lastIndexOf('/') + 1)}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 text-[10px]">Aucun PDF</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleReglementPiscineUpload}
                    disabled={uploadingReglementPiscine}
                    className="block w-full text-[10px] text-gray-500"
                  />
                  {reglementPiscineUrl && (
                    <button type="button" onClick={() => setReglementPiscineUrl('')} className="text-red-500 hover:text-red-700 text-[10px] font-bold w-full text-center">Retirer</button>
                  )}
                </div>

                {/* Règlement club */}
                <div className="card p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b pb-2">📋 Règlement Intérieur</h3>
                  <div className="w-24 h-24 border border-slate-200 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-center p-2 mx-auto">
                    {reglementClubUrl ? (
                      <>
                        <span className="text-red-500 text-3xl">📄</span>
                        <span className="text-[8px] text-gray-500 truncate max-w-full font-mono mt-1">{reglementClubUrl.substring(reglementClubUrl.lastIndexOf('/') + 1)}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 text-[10px]">Aucun PDF</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleReglementClubUpload}
                    disabled={uploadingReglementClub}
                    className="block w-full text-[10px] text-gray-500"
                  />
                  {reglementClubUrl && (
                    <button type="button" onClick={() => setReglementClubUrl('')} className="text-red-500 hover:text-red-700 text-[10px] font-bold w-full text-center">Retirer</button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'system' && (
            <motion.div
              key="system"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Chatbot AI */}
              <div className="card p-6 space-y-4">
                <h3 className="text-md font-bold text-slate-900 border-b pb-2 flex items-center gap-2">🤖 Paramètres Assistant Virtuel</h3>
                <div className="max-w-md">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Modèle d&apos;Intelligence Artificielle actif</label>
                  <select
                    value={chatbotModel}
                    onChange={(e) => setChatbotModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                  >
                    <option value="mistral-7b">Mistral 7B (Économique / Basique)</option>
                    <option value="mistral-small">Mistral Small (Recommandé - Équilibré & Rapide)</option>
                    <option value="ministral-8b">Ministral 8B (Très rapide & Intelligent)</option>
                    <option value="mistral-large">Mistral Large (Précision maximale / Plus coûteux)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Le choix du modèle détermine le niveau de raisonnement du chatbot. Mistral Small offre un compromis optimal.</p>
                </div>
              </div>

              {/* SMTP configuration */}
              <div className="card p-6 space-y-6">
                <h3 className="text-md font-bold text-slate-900 border-b pb-2 flex items-center gap-1.5">Configuration Serveur SMTP</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Serveur SMTP (Host)</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Port SMTP</label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                      placeholder="587"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Identifiant / Utilisateur SMTP</label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                      placeholder="votrecompte@gmail.com"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mot de passe SMTP</label>
                    <input
                      type="password"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-xs outline-none text-slate-800"
                      placeholder={settings?.smtpPasswordConfigured ? '••••••••' : 'Saisir le mot de passe'}
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      {settings?.smtpPasswordConfigured ? 'Laissez vide pour conserver le mot de passe configuré.' : 'Requis pour l\'envoi des e-mails.'} Pour Gmail, utilisez un <strong>mot de passe d&apos;application</strong> à 16 caractères.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tester les connexions mails</h4>
                  <p className="text-[10px] text-gray-500">Testez les paramètres SMTP configurés ci-dessus avant de les sauvegarder définitivement.</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => testSmtpConnection(false)}
                      disabled={testingSmtp || !smtpHost || !smtpUser}
                      className="px-4 py-2 text-xs font-bold text-slate-700 border border-slate-250 hover:bg-slate-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      {testingSmtp ? 'Vérification...' : 'Tester la connexion'}
                    </button>
                    <button
                      type="button"
                      onClick={() => testSmtpConnection(true)}
                      disabled={testingSmtp || !smtpHost || !smtpUser}
                      className="px-4 py-2 text-xs font-bold text-slate-900 bg-primary hover:bg-primary-dark rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-3xs"
                    >
                      {testingSmtp ? 'Envoi...' : 'Envoyer un email de test'}
                    </button>
                  </div>

                  {smtpTestedFingerprint && !smtpNeedsRetest && (
                    <p className="text-emerald-700 text-[10px] font-bold mt-1">✅ Configuration SMTP validée avec succès pour ces paramètres.</p>
                  )}
                  {smtpNeedsRetest && (
                    <p className="text-amber-700 text-[10px] font-semibold mt-1">⚠️ Des champs ont changé depuis votre dernier test. Il est conseillé de retester.</p>
                  )}
                  {smtpValidationWarning && (
                    <p className="text-rose-600 text-[10px] font-semibold mt-1">⚠️ {smtpValidationWarning}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Barre de sauvegarde collante inférieure */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-250/60 pt-6">
          <div className="text-xs font-semibold flex items-center gap-2 h-6">
            <AnimatePresence mode="wait">
              {saveStatus === 'saving' && (
                <motion.span
                  key="saving"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-slate-500 flex items-center gap-1.5"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  Sauvegarde automatique en cours...
                </motion.span>
              )}
              {saveStatus === 'saved' && (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-emerald-600 flex items-center gap-1.5 font-bold"
                >
                  <Check className="w-4 h-4" /> Modifications enregistrées automatiquement
                </motion.span>
              )}
              {saveStatus === 'error' && (
                <motion.span
                  key="error"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-rose-600 flex items-center gap-1.5 font-bold"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-500" /> Échec de la sauvegarde automatique
                </motion.span>
              )}
              {saveStatus === 'idle' && (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-slate-400 font-medium flex items-center gap-1.5"
                >
                  <Cloud className="w-4 h-4 text-slate-350" /> Toute modification est sauvegardée automatiquement en arrière-plan
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={saving || saveStatus === 'saving'}
            className="px-8 py-2.5 bg-primary text-slate-950 rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50 font-bold text-xs cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95"
          >
            {saving ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Enregistrement...' : 'Enregistrer maintenant'}
          </button>
        </div>
      </form>
    </div>
  )
}
