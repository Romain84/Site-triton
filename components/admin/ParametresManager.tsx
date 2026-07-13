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
  emailClub: string | null
  logoUrl: string | null
  statutsUrl: string | null
  reglementPiscineUrl: string | null
  reglementClubUrl: string | null
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

  // Form state
  const [tauxHoraire, setTauxHoraire] = useState('35')
  const [forfaitCompetition, setForfaitCompetition] = useState('150')
  const [nbCompetitionsAnnee, setNbCompetitionsAnnee] = useState('20')
  const [nbDemiJourneesParCompetition, setNbDemiJourneesParCompetition] = useState('2')
  const [forfaitRegionalActif, setForfaitRegionalActif] = useState(false)
  const [montantForfaitRegional, setMontantForfaitRegional] = useState('50')
  const [reductionEnfantBureau, setReductionEnfantBureau] = useState('50')
  const [boutiqueOuverte, setBoutiqueOuverte] = useState(true)
  const [emailClub, setEmailClub] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [statutsUrl, setStatutsUrl] = useState('')
  const [reglementPiscineUrl, setReglementPiscineUrl] = useState('')
  const [reglementClubUrl, setReglementClubUrl] = useState('')
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
        setEmailClub(s.emailClub || '')
        setLogoUrl(s.logoUrl || '')
        setStatutsUrl(s.statutsUrl || '')
        setReglementPiscineUrl(s.reglementPiscineUrl || '')
        setReglementClubUrl(s.reglementClubUrl || '')
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
        // Don't set password for security
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

    // Client side validation
    if (file.size > 2 * 1024 * 1024) { // 2MB
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
      // Reset input value
      e.target.value = ''
    }
  }

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    // Validation de taille
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
          emailClub,
          logoUrl: logoUrl || null,
          statutsUrl: statutsUrl || null,
          reglementPiscineUrl: reglementPiscineUrl || null,
          reglementClubUrl: reglementClubUrl || null,
          signaturePresidentUrl: signaturePresidentUrl || null,
          nomSignataireRecu: nomSignataireRecu || 'Le Président',
          titreSignataireRecu: titreSignataireRecu || 'Président',
          signatureTresoriereUrl: signatureTresoriereUrl || null,
          nomTresoriereRecu: nomTresoriereRecu || 'La Trésorière',
          titreTresoriereRecu: titreTresoriereRecu || 'Trésorière',
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassword: smtpPassword || undefined, // Only send if provided
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
      setSmtpPassword('') // Clear password field after save
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
      emailClub !== (settings.emailClub || '') ||
      logoUrl !== (settings.logoUrl || '') ||
      statutsUrl !== (settings.statutsUrl || '') ||
      reglementPiscineUrl !== (settings.reglementPiscineUrl || '') ||
      reglementClubUrl !== (settings.reglementClubUrl || '') ||
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
        throw new Error('Erreur de sauvegarde')
      }

      const data = await response.json()
      setSettings(data.settings)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setError('Erreur lors de la sauvegarde automatique')
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
    return <p className="text-gray-600">Chargement...</p>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Paramètres de l&apos;application</h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Logo du club */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4">Logo du club</h3>
          <div className="flex flex-col md:flex-row gap-8 items-start">
             {/* Preview */}
             <div className="flex-shrink-0">
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 relative">
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt="Logo"
                      fill
                      className="object-contain"
                      unoptimized={logoUrl.includes('blob.vercel-storage.com')}
                    />
                  ) : (
                    <span className="text-gray-400 text-sm">Aucun logo</span>
                  )}
                </div>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="mt-2 text-red-600 text-sm hover:underline w-full text-center"
                  >
                    Supprimer le logo
                  </button>
                )}
             </div>

             {/* Upload controls */}
             <div className="flex-1">
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Télécharger un nouveau logo
               </label>
               <input
                 type="file"
                 accept="image/png, image/jpeg, image/webp, image/svg+xml"
                 onChange={handleLogoUpload}
                 disabled={uploadingLogo}
                 className="block w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-full file:border-0
                   file:text-sm file:font-semibold
                   file:bg-primary file:text-white
                   hover:file:bg-primary-dark
                   disabled:opacity-50 cursor-pointer"
               />
               <p className="mt-2 text-sm text-gray-500">
                 Formats acceptés : JPG, PNG, WEBP, SVG. Taille max : 2MB.
               </p>
               {uploadingLogo && <p className="text-blue-600 text-sm mt-2">Upload en cours...</p>}

               <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-blue-700 text-sm">
                  <strong>💡 Info:</strong> Le logo apparaîtra automatiquement dans l&apos;en-tête du site une fois enregistré.
                </p>
              </div>
             </div>
           </div>
        </div>

        {/* Signature & Signataire Reçus Fiscaux */}
        <div className="card p-6 space-y-8">
          <h3 className="text-xl font-bold border-b border-gray-100 pb-2">Reçus Fiscaux - Paramétrage des signatures</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Président signature column */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 border-l-4 border-primary pl-2 text-base">Signature du Président</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nomSignataireRecu" className="block text-xs font-medium text-gray-700 mb-1">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    id="nomSignataireRecu"
                    value={nomSignataireRecu}
                    onChange={(e) => setNomSignataireRecu(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-805 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="titreSignataireRecu" className="block text-xs font-medium text-gray-700 mb-1">
                    Fonction / Titre
                  </label>
                  <input
                    type="text"
                    id="titreSignataireRecu"
                    value={titreSignataireRecu}
                    onChange={(e) => setTitreSignataireRecu(e.target.value)}
                    placeholder="Ex: Président"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-805 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start pt-2">
                <div className="flex-shrink-0">
                  <div className="w-40 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 relative">
                    {signaturePresidentUrl ? (
                      <Image
                        src={signaturePresidentUrl}
                        alt="Signature Président"
                        fill
                        className="object-contain p-1"
                        unoptimized={signaturePresidentUrl.includes('blob.vercel-storage.com')}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">Aucune signature</span>
                    )}
                  </div>
                  {signaturePresidentUrl && (
                    <button
                      type="button"
                      onClick={() => setSignaturePresidentUrl('')}
                      className="mt-1.5 text-red-600 text-xs hover:underline w-full text-center block"
                    >
                      Supprimer
                    </button>
                  )}
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Image signature fac-similé (Président)
                  </label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleSignatureUpload}
                    disabled={uploadingSignature}
                    className="block w-full text-xs text-gray-500
                      file:mr-3 file:py-1.5 file:px-3
                      file:rounded-full file:border-0
                      file:text-xs file:font-semibold
                      file:bg-primary file:text-white
                      hover:file:bg-primary-dark
                      disabled:opacity-50 cursor-pointer"
                  />
                  {uploadingSignature && <p className="text-blue-600 text-xs mt-1 animate-pulse">Upload...</p>}
                </div>
              </div>
            </div>

            {/* Trésorière signature column */}
            <div className="space-y-4 lg:border-l lg:border-gray-100 lg:pl-8">
              <h4 className="font-bold text-slate-800 border-l-4 border-teal-500 pl-2 text-base">Signature de la Trésorière</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nomTresoriereRecu" className="block text-xs font-medium text-gray-700 mb-1">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    id="nomTresoriereRecu"
                    value={nomTresoriereRecu}
                    onChange={(e) => setNomTresoriereRecu(e.target.value)}
                    placeholder="Ex: Sophie Martin"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-850 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="titreTresoriereRecu" className="block text-xs font-medium text-gray-700 mb-1">
                    Fonction / Titre
                  </label>
                  <input
                    type="text"
                    id="titreTresoriereRecu"
                    value={titreTresoriereRecu}
                    onChange={(e) => setTitreTresoriereRecu(e.target.value)}
                    placeholder="Ex: Trésorière"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200/85 rounded-lg focus:border-slate-800 focus:bg-white outline-none font-normal text-slate-850 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start pt-2">
                <div className="flex-shrink-0">
                  <div className="w-40 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 relative">
                    {signatureTresoriereUrl ? (
                      <Image
                        src={signatureTresoriereUrl}
                        alt="Signature Trésorière"
                        fill
                        className="object-contain p-1"
                        unoptimized={signatureTresoriereUrl.includes('blob.vercel-storage.com')}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">Aucune signature</span>
                    )}
                  </div>
                  {signatureTresoriereUrl && (
                    <button
                      type="button"
                      onClick={() => setSignatureTresoriereUrl('')}
                      className="mt-1.5 text-red-600 text-xs hover:underline w-full text-center block"
                    >
                      Supprimer
                    </button>
                  )}
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Image signature fac-similé (Trésorière)
                  </label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleSignatureTresoriereUpload}
                    disabled={uploadingSignatureTresoriere}
                    className="block w-full text-xs text-gray-500
                      file:mr-3 file:py-1.5 file:px-3
                      file:rounded-full file:border-0
                      file:text-xs file:font-semibold
                      file:bg-teal-600 file:text-white
                      hover:file:bg-teal-700
                      disabled:opacity-50 cursor-pointer"
                  />
                  {uploadingSignatureTresoriere && <p className="text-teal-600 text-xs mt-1 animate-pulse">Upload...</p>}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Statuts du club */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4">Statuts du club</h3>
          <div className="flex flex-col md:flex-row gap-8 items-start">
             {/* Preview */}
             <div className="flex-shrink-0">
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 relative">
                  {statutsUrl ? (
                    <div className="flex flex-col items-center p-2 text-center">
                      <svg className="w-12 h-12 text-red-500 mb-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[10px] text-gray-600 truncate max-w-full font-mono">
                        {statutsUrl.substring(statutsUrl.lastIndexOf('/') + 1)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Aucun statut</span>
                  )}
                </div>
                {statutsUrl && (
                  <button
                    type="button"
                    onClick={() => setStatutsUrl('')}
                    className="mt-2 text-red-600 text-sm hover:underline w-full text-center"
                  >
                    Supprimer les statuts
                  </button>
                )}
             </div>

             {/* Upload controls */}
             <div className="flex-1">
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Télécharger un nouveau document de statuts (PDF)
               </label>
               <input
                 type="file"
                 accept="application/pdf"
                 onChange={handleStatutsUpload}
                 disabled={uploadingStatuts}
                 className="block w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-full file:border-0
                   file:text-sm file:font-semibold
                   file:bg-primary file:text-white
                   hover:file:bg-primary-dark
                   disabled:opacity-50 cursor-pointer"
               />
               <p className="mt-2 text-sm text-gray-500">
                 Format accepté : PDF uniquement. Taille max : 5MB.
               </p>
               {uploadingStatuts && <p className="text-blue-600 text-sm mt-2">Upload en cours...</p>}

               <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-blue-700 text-sm">
                  <strong>💡 Info:</strong> Le document sera mis à disposition dans la section &quot;Statuts Officiels&quot; de la page &quot;Le Club&quot;.
                </p>
              </div>
             </div>
          </div>
        </div>

        {/* Règlement intérieur de la piscine */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4">Règlement intérieur de la piscine</h3>
          <div className="flex flex-col md:flex-row gap-8 items-start">
             {/* Preview */}
             <div className="flex-shrink-0">
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 relative">
                  {reglementPiscineUrl ? (
                    <div className="flex flex-col items-center p-2 text-center">
                      <svg className="w-12 h-12 text-red-500 mb-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[10px] text-gray-600 truncate max-w-full font-mono">
                        {reglementPiscineUrl.substring(reglementPiscineUrl.lastIndexOf('/') + 1)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Aucun règlement</span>
                  )}
                </div>
                {reglementPiscineUrl && (
                  <button
                    type="button"
                    onClick={() => setReglementPiscineUrl('')}
                    className="mt-2 text-red-600 text-sm hover:underline w-full text-center"
                  >
                    Supprimer le règlement
                  </button>
                )}
             </div>

             {/* Upload controls */}
             <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Télécharger un nouveau règlement de la piscine (PDF)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleReglementPiscineUpload}
                  disabled={uploadingReglementPiscine}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-white
                    hover:file:bg-primary-dark
                    disabled:opacity-50 cursor-pointer"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Format accepté : PDF uniquement. Taille max : 5MB.
                </p>
                {uploadingReglementPiscine && <p className="text-blue-600 text-sm mt-2">Upload en cours...</p>}

                <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-blue-700 text-sm">
                    <strong>💡 Info:</strong> Le document sera mis à disposition dans la section &quot;Documents Officiels&quot; de la page &quot;Le Club&quot;.
                  </p>
                </div>
             </div>
          </div>
        </div>

        {/* Règlement intérieur du club */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4">Règlement intérieur du club</h3>
          <div className="flex flex-col md:flex-row gap-8 items-start">
             {/* Preview */}
             <div className="flex-shrink-0">
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 relative">
                  {reglementClubUrl ? (
                    <div className="flex flex-col items-center p-2 text-center">
                      <svg className="w-12 h-12 text-red-500 mb-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[10px] text-gray-600 truncate max-w-full font-mono">
                        {reglementClubUrl.substring(reglementClubUrl.lastIndexOf('/') + 1)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Aucun règlement</span>
                  )}
                </div>
                {reglementClubUrl && (
                  <button
                    type="button"
                    onClick={() => setReglementClubUrl('')}
                    className="mt-2 text-red-600 text-sm hover:underline w-full text-center"
                  >
                    Supprimer le règlement
                  </button>
                )}
             </div>

             {/* Upload controls */}
             <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Télécharger un nouveau règlement du club (PDF)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleReglementClubUpload}
                  disabled={uploadingReglementClub}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-white
                    hover:file:bg-primary-dark
                    disabled:opacity-50 cursor-pointer"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Format accepté : PDF uniquement. Taille max : 5MB.
                </p>
                {uploadingReglementClub && <p className="text-blue-600 text-sm mt-2">Upload en cours...</p>}

                <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-blue-700 text-sm">
                    <strong>💡 Info:</strong> Le document sera mis à disposition dans la section &quot;Documents Officiels&quot; de la page &quot;Le Club&quot;.
                  </p>
                </div>
             </div>
          </div>
        </div>

        {/* Paramètres du site */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4">Paramètres du site</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lien d&apos;inscription (page vers laquelle les boutons &quot;S&apos;inscrire&quot; renvoient)
              </label>
              <input
                type="text"
                value={inscriptionUrl}
                onChange={(e) => setInscriptionUrl(e.target.value)}
                placeholder="/actualites/inscriptions-2025-2026"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                Ce lien change chaque année. Exemple : /actualites/inscriptions-2025-2026
              </p>
            </div>

            <hr className="border-slate-100 my-4" />

            <div>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={interSaisonActif}
                  onChange={(e) => setInterSaisonActif(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                Activer le mode inter-saison (grise les pages Tarifs et Horaires et affiche un filigrane)
              </label>
              <p className="mt-1 text-xs text-gray-500 pl-6">
                Lorsque cette case est cochée, les pages d&apos;inscription (Tarifs) et de planning (Horaires) seront légèrement grisées pour indiquer aux utilisateurs qu&apos;il s&apos;agit des informations de la saison précédente en attente de mise à jour.
              </p>
            </div>

            {interSaisonActif && (
              <div className="pl-6 space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texte du filigrane à afficher
                </label>
                <input
                  type="text"
                  value={texteFiligrane}
                  onChange={(e) => setTexteFiligrane(e.target.value)}
                  placeholder="Ex: Saison 2025 - 2026"
                  className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-slate-700 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Ce texte apparaîtra en filigrane diagonal en arrière-plan des pages grisées.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dates de rentrée et de tests */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            📅 Dates de rentrée & Tests de rentrée
          </h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Début des cours (Normal)
                </label>
                <input
                  type="text"
                  value={debutCoursNormal}
                  onChange={(e) => setDebutCoursNormal(e.target.value)}
                  placeholder="Ex: Lundi 21 Septembre 2026"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-slate-700 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Début des cours (BNSSA)
                </label>
                <input
                  type="text"
                  value={debutCoursBnssa}
                  onChange={(e) => setDebutCoursBnssa(e.target.value)}
                  placeholder="Ex: Jeudi 1er Octobre 2026"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-slate-700 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dates des tests de rentrée (nageurs convoqués)
              </label>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newTestDate}
                  onChange={(e) => setNewTestDate(e.target.value)}
                  placeholder="Ex: Mercredi 16 Septembre 2026"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-slate-700 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newTestDate.trim() && !datesTests.includes(newTestDate.trim())) {
                      setDatesTests([...datesTests, newTestDate.trim()])
                      setNewTestDate('')
                    }
                  }}
                  className="px-4 py-2 bg-primary text-slate-950 font-bold rounded-lg hover:bg-primary-dark transition-all text-sm cursor-pointer"
                >
                  Ajouter une date
                </button>
              </div>

              {datesTests.length === 0 ? (
                <p className="text-xs text-gray-500 italic">Aucune date de test configurée.</p>
              ) : (
                <div className="space-y-2 max-w-md">
                  {datesTests.map((date, index) => (
                    <div key={index} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
                      <span className="text-slate-800 font-medium">{date}</span>
                      <button
                        type="button"
                        onClick={() => setDatesTests(datesTests.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-800 font-bold text-xs cursor-pointer"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assistant Virtuel (Chatbot) */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            🤖 Assistant Virtuel (Chatbot)
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modèle d&apos;Intelligence Artificielle
            </label>
            <select
              value={chatbotModel}
              onChange={(e) => setChatbotModel(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-slate-700 text-sm"
            >
              <option value="mistral-7b">Mistral 7B (Économique / Basique)</option>
              <option value="mistral-small">Mistral Small (Recommandé - Équilibré & Rapide)</option>
              <option value="ministral-8b">Ministral 8B (Très rapide & Intelligent)</option>
              <option value="mistral-large">Mistral Large (Ultra intelligent / Maximum de précision)</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Le modèle d&apos;IA définit l&apos;intelligence du chatbot. <strong>Mistral Small</strong> est recommandé pour un excellent rapport qualité/prix. 
              <strong>Mistral Large</strong> offre le niveau de réponse le plus précis mais consomme plus de jetons API.
            </p>
          </div>
        </div>

        {/* Configuration Financière */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            💰 Configuration Financière de la Saison
            <HelpTooltip title="Solde initial de trésorerie">
              Indiquez la somme de départ disponible dans la caisse ou le compte du club au début de la saison.
            </HelpTooltip>
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              Solde de départ de la saison (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={soldeDepartSaison}
              onChange={(e) => setSoldeDepartSaison(e.target.value)}
              required
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0.00"
            />
            <p className="text-sm text-gray-500 mt-1">
              Cette somme sert de base de départ pour tous les calculs cumulés et l&apos;évolution de la trésorerie globale.
            </p>
          </div>
        </div>

        {/* Tarification */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            Tarification
            <HelpTooltip title="Tarification des coaches">
              Ces paramètres définissent la rémunération des coaches. Le taux horaire s&apos;applique aux entraînements, le forfait compétition aux accompagnements en compétition.
            </HelpTooltip>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Taux horaire (€/h)
                <CalculationTooltip
                  title="Calcul des heures"
                  formula="Heures travaillées × Taux horaire"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="35.00"
              />
              <p className="text-sm text-gray-500 mt-1">
                Taux horaire utilisé pour le calcul des factures des coaches
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Forfait compétition (€/demi-journée)
                <CalculationTooltip
                  title="Calcul compétitions"
                  formula="Nb demi-journées × Forfait"
                  explanation="Une journée complète = 2 demi-journées. Ce forfait remplace le taux horaire pour les compétitions."
                  example="2 demi-journées × 150€ = 300€"
                />
              </label>
              <input
                type="number"
                step="0.01"
                value={forfaitCompetition}
                onChange={(e) => setForfaitCompetition(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="150.00"
              />
              <p className="text-sm text-gray-500 mt-1">
                Montant forfaitaire pour chaque demi-journée de compétition
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Demi-journées par compétition
                <CalculationTooltip
                  title="Calcul coût compétitions"
                  formula="Nb compétitions × Nb demi-journées × Forfait"
                  explanation="Utilisé dans l'outil Coût Groupes pour estimer le coût des compétitions sur la saison."
                  example="20 compétitions × 2 demi-journées × 150€"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Valeur par défaut pour une compétition (1 ou 2 demi-journées)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Nombre de compétitions par saison (défaut)
                <CalculationTooltip
                  title="Valeur par défaut"
                  formula="Nb compétitions groupe ou défaut global"
                  explanation="Cette valeur est utilisée dans Coût Groupes quand un groupe n'a pas de nombre de compétitions spécifique."
                  example="Si un groupe n'a pas de valeur, on utilise 20 compétitions"
                />
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={nbCompetitionsAnnee}
                onChange={(e) => setNbCompetitionsAnnee(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="20"
              />
              <p className="text-sm text-gray-500 mt-1">
                Nombre de compétitions appliqué par défaut sur l&apos;année
              </p>
            </div>
          </div>
        </div>

        {/* Forfait Régional */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            Forfait Régional (déplacements)
            <HelpTooltip title="Forfait Régional">
              Indemnité pour les compétitions nécessitant un déplacement hors département avec hébergement. S&apos;ajoute au forfait compétition classique.
            </HelpTooltip>
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Le forfait régional permet de rémunérer les coaches pour les compétitions hors département nécessitant un hébergement.
          </p>

          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Checkbox pour montant libre */}
            <div className="flex-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forfaitRegionalActif}
                  onChange={(e) => setForfaitRegionalActif(e.target.checked)}
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Montant libre</span>
                  <p className="text-sm text-gray-500">
                    Le coach peut saisir le montant de son choix
                  </p>
                </div>
              </label>
            </div>

            {/* Montant fixe (affiché seulement si montant non libre) */}
            {!forfaitRegionalActif && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant fixe par forfait régional (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={montantForfaitRegional}
                  onChange={(e) => setMontantForfaitRegional(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="50.00"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Montant imposé pour chaque forfait régional déclaré
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
            {forfaitRegionalActif ? (
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <div>
                  <p className="font-medium text-gray-800">Mode libre activé</p>
                  <p className="text-sm text-gray-600">
                    Les coaches peuvent ajouter un forfait régional et saisir librement le montant de leur choix dans leur facturation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="text-blue-600 text-xl">🔒</span>
                <div>
                  <p className="font-medium text-gray-800">Mode fixe activé</p>
                  <p className="text-sm text-gray-600">
                    Les coaches peuvent ajouter un forfait régional, mais le montant sera fixé à <strong>{montantForfaitRegional}€</strong> (non modifiable).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Réductions Bureau */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            👔 Réductions Membres du Bureau
            <HelpTooltip title="Réductions Bureau">
              Les membres du bureau et leurs enfants bénéficient de réductions sur les tarifs. Ces réductions sont prises en compte dans le calcul de la rentabilité des groupes.
            </HelpTooltip>
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Les membres du bureau bénéficient de la gratuité (100%). Vous pouvez définir ici le pourcentage de réduction pour leurs enfants.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              Réduction enfants du bureau (%)
              <CalculationTooltip
                title="Calcul tarif enfant bureau"
                formula="Tarif × (1 - Réduction%)"
                explanation="Le tarif réduit est appliqué aux enfants des membres du bureau dans le calcul des revenus."
                example="200€ × (1 - 50%) = 100€"
              />
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={reductionEnfantBureau}
              onChange={(e) => setReductionEnfantBureau(e.target.value)}
              className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="50"
            />
            <p className="text-sm text-gray-500 mt-1">
              Par défaut : 50% (soit demi-tarif pour les enfants des membres du bureau)
            </p>
          </div>

          <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex items-start gap-3">
              <span className="text-blue-600 text-xl">ℹ️</span>
              <div>
                <p className="font-medium text-gray-800">Récapitulatif</p>
                <ul className="text-sm text-gray-600 mt-1 list-disc ml-4">
                  <li><strong>Membres du bureau :</strong> Gratuit (100% de réduction)</li>
                  <li><strong>Enfants du bureau :</strong> {reductionEnfantBureau}% de réduction</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Boutique */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4">Boutique</h3>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={boutiqueOuverte}
                onChange={(e) => setBoutiqueOuverte(e.target.checked)}
                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Boutique ouverte</span>
                <p className="text-sm text-gray-500">
                  Lorsque la boutique est fermée, les articles restent visibles mais les visiteurs ne peuvent plus passer de commandes
                </p>
              </div>
            </label>
            {!boutiqueOuverte && (
              <div className="mt-4 bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                <p className="text-orange-700 text-sm">
                  <strong>⚠️ Attention:</strong> La boutique est actuellement fermée. Les visiteurs ne pourront pas commander.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Email du club */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4">Email du club</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse email du club
            </label>
            <input
              type="email"
              value={emailClub}
              onChange={(e) => setEmailClub(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="contact@triton-club.fr"
            />
            <p className="text-sm text-gray-500 mt-1">
              Les factures des coaches seront envoyées à cette adresse
            </p>
          </div>
        </div>

        {/* Configuration SMTP */}
        <div className="card p-6">
          <h3 className="text-xl font-bold mb-4">Configuration SMTP</h3>
          <p className="text-sm text-gray-600 mb-4">
            Paramètres du serveur SMTP pour l&apos;envoi des emails (factures, notifications, etc.)
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serveur SMTP (Host)
                </label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Port SMTP
                </label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="587"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Port standard: 587 (TLS) ou 465 (SSL)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Utilisateur SMTP
              </label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="moncompte@gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe SMTP
              </label>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={settings?.smtpPasswordConfigured ? '••••••••' : 'Mot de passe'}
              />
              <p className="text-xs text-gray-500 mt-1">
                {settings?.smtpPasswordConfigured
                  ? 'Laissez vide pour conserver le mot de passe actuel'
                  : 'Requis pour l\'envoi d\'emails'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Pour Gmail, utilisez un <strong>mot de passe d&apos;application</strong> (16 caractères), pas le mot de passe principal du compte.
              </p>
            </div>
          </div>

          {/* Test SMTP */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-md font-semibold mb-3">Tester la configuration SMTP</h4>
            <p className="text-sm text-gray-600 mb-4">
              Vérifiez que les paramètres SMTP sont corrects avant d&apos;enregistrer.
              Cette fonctionnalité est essentielle pour le bon fonctionnement de la réinitialisation de mot de passe.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => testSmtpConnection(false)}
                disabled={testingSmtp || !smtpHost || !smtpUser}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {testingSmtp ? 'Test en cours...' : 'Tester la connexion'}
              </button>
              <button
                type="button"
                onClick={() => testSmtpConnection(true)}
                disabled={testingSmtp || !smtpHost || !smtpUser}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {testingSmtp ? 'Envoi en cours...' : 'Envoyer un email de test'}
              </button>
            </div>
            {smtpTestedFingerprint && !smtpNeedsRetest && (
              <p className="text-green-700 text-sm mt-2">
                ✅ Configuration SMTP testée avec succès pour les valeurs actuelles.
              </p>
            )}
            {smtpNeedsRetest && (
              <p className="text-amber-700 text-sm mt-2">
                ⚠️ Les champs SMTP ont changé depuis le dernier test. Pensez à retester la connexion.
              </p>
            )}
            {smtpValidationWarning && (
              <p className="text-amber-700 text-sm mt-2">
                ⚠️ {smtpValidationWarning}
              </p>
            )}
            {(!smtpHost || !smtpUser) && (
              <p className="text-orange-600 text-sm mt-2">
                Remplissez les champs serveur et utilisateur SMTP pour tester.
              </p>
            )}
          </div>

          <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-blue-700 text-sm">
              <strong>💡 Conseil Gmail:</strong> Host <code>smtp.gmail.com</code>, port <code>587</code> (TLS) ou <code>465</code> (SSL), utilisateur = adresse Gmail complète.
            </p>
          </div>
        </div>

        {/* Enregistrement automatique & Manuel */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <div className="text-sm font-semibold flex items-center gap-2 h-6">
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
                  Sauvegarde en cours...
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
                  <AlertTriangle className="w-4 h-4 text-rose-500" /> Erreur de sauvegarde automatique
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
                  <Cloud className="w-4 h-4 text-slate-350" /> Les modifications sont enregistrées automatiquement
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={saving || saveStatus === 'saving'}
            className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium cursor-pointer flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
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
