import { describe, it, expect } from 'vitest'
import {
  getInscriptionConfirmationEmail,
  getCommandeConfirmationEmail,
  getPasswordResetEmail,
  encryptSmtpPassword,
  decryptSmtpPassword,
} from '@/lib/email/service'

describe('Email Templates', () => {
  describe('getInscriptionConfirmationEmail', () => {
    it('should generate correct subject', () => {
      const result = getInscriptionConfirmationEmail({
        prenomNageur: 'Lucas',
        nomNageur: 'Martin',
        prenomParent: 'Pierre',
        nomParent: 'Martin',
        groupe: 'Débutants',
        tarif: 200,
      })

      expect(result.subject).toBe("Confirmation d'inscription — Triton Club Cavaillon")
    })

    it('should include swimmer name in email', () => {
      const result = getInscriptionConfirmationEmail({
        prenomNageur: 'Lucas',
        nomNageur: 'Martin',
        prenomParent: 'Pierre',
        nomParent: 'Martin',
        groupe: 'Débutants',
        tarif: 200,
      })

      expect(result.html).toContain('Lucas Martin')
      expect(result.text).toContain('Lucas Martin')
    })

    it('should include parent name in greeting', () => {
      const result = getInscriptionConfirmationEmail({
        prenomNageur: 'Lucas',
        nomNageur: 'Martin',
        prenomParent: 'Pierre',
        nomParent: 'Martin',
        groupe: 'Débutants',
        tarif: 200,
      })

      expect(result.html).toContain('Pierre Martin')
      expect(result.text).toContain('Pierre Martin')
    })

    it('should include group name', () => {
      const result = getInscriptionConfirmationEmail({
        prenomNageur: 'Lucas',
        nomNageur: 'Martin',
        prenomParent: 'Pierre',
        nomParent: 'Martin',
        groupe: 'Compétition',
        tarif: 300,
      })

      expect(result.html).toContain('Compétition')
      expect(result.text).toContain('Compétition')
    })

    it('should include tarif when provided', () => {
      const result = getInscriptionConfirmationEmail({
        prenomNageur: 'Lucas',
        nomNageur: 'Martin',
        prenomParent: 'Pierre',
        nomParent: 'Martin',
        groupe: 'Débutants',
        tarif: 250,
      })

      expect(result.html).toContain('250')
      expect(result.text).toContain('250')
    })

    it('should handle null tarif', () => {
      const result = getInscriptionConfirmationEmail({
        prenomNageur: 'Lucas',
        nomNageur: 'Martin',
        prenomParent: 'Pierre',
        nomParent: 'Martin',
        groupe: 'Débutants',
        tarif: null,
      })

      expect(result.html).not.toContain('Tarif')
      expect(result.text).not.toContain('Tarif')
    })
  })

  describe('getCommandeConfirmationEmail', () => {
    it('should generate correct subject with order number', () => {
      const result = getCommandeConfirmationEmail({
        numeroCommande: 'CMD-2024-001',
        prenom: 'Pierre',
        nom: 'Martin',
        prenomNageur: 'Lucas',
        nomNageur: 'Martin',
        lignes: [
          { nom: 'Bonnet', quantite: 1, prix: 15 },
        ],
        total: 15,
      })

      expect(result.subject).toContain('CMD-2024-001')
    })

    it('should include order items', () => {
      const result = getCommandeConfirmationEmail({
        numeroCommande: 'CMD-2024-001',
        prenom: 'Pierre',
        nom: 'Martin',
        prenomNageur: 'Lucas',
        nomNageur: 'Martin',
        lignes: [
          { nom: 'Bonnet de bain', quantite: 2, prix: 15, taille: 'M', couleur: 'Bleu' },
          { nom: 'Lunettes', quantite: 1, prix: 25 },
        ],
        total: 55,
      })

      expect(result.html).toContain('Bonnet de bain')
      expect(result.html).toContain('Lunettes')
      expect(result.text).toContain('Bonnet de bain')
    })

    it('should show correct total', () => {
      const result = getCommandeConfirmationEmail({
        numeroCommande: 'CMD-2024-001',
        prenom: 'Pierre',
        nom: 'Martin',
        prenomNageur: 'Lucas',
        nomNageur: 'Martin',
        lignes: [
          { nom: 'Bonnet', quantite: 1, prix: 15 },
        ],
        total: 15,
      })

      expect(result.html).toContain('15.00')
    })

    it('should include Triton branding and estimated pickup date when provided', () => {
      const result = getCommandeConfirmationEmail({
        numeroCommande: 'CMD-2024-001',
        prenom: 'Pierre',
        nom: 'Martin',
        prenomNageur: 'Lucas',
        nomNageur: 'Martin',
        lignes: [
          { nom: 'Parka Club', quantite: 1, prix: 80, taille: 'L' },
        ],
        total: 80,
        dateLivraison: '15 Novembre 2026',
      })

      expect(result.html).toContain('TRITON CLUB CAVAILLON')
      expect(result.html).toContain('15 Novembre 2026')
      expect(result.html).toContain('à réceptionner au club vers')
      expect(result.html).toContain('Un autre e-mail vous sera envoyé')
      expect(result.text).toContain('15 Novembre 2026')
      expect(result.text).toContain('à réceptionner au club vers')
      expect(result.text).toContain('conditions de retrait')
    })

    it('should fallback to default delivery date when dateLivraison is omitted', () => {
      const result = getCommandeConfirmationEmail({
        numeroCommande: 'CMD-2024-001',
        prenom: 'Pierre',
        nom: 'Martin',
        prenomNageur: 'Lucas',
        nomNageur: 'Martin',
        lignes: [
          { nom: 'Bonnet', quantite: 1, prix: 15 },
        ],
        total: 15,
      })

      expect(result.html).toContain('Mi-Octobre 2026')
      expect(result.text).toContain('Mi-Octobre 2026')
    })
  })

  describe('getPasswordResetEmail', () => {
    it('should generate correct subject', () => {
      const result = getPasswordResetEmail({
        prenom: 'Jean',
        resetUrl: 'https://example.com/reset?token=abc123',
        userType: 'coach',
      })

      expect(result.subject).toBe('Réinitialisation de votre mot de passe — Triton Club Cavaillon')
    })

    it('should include first name in greeting', () => {
      const result = getPasswordResetEmail({
        prenom: 'Jean',
        resetUrl: 'https://example.com/reset?token=abc123',
        userType: 'coach',
      })

      expect(result.html).toContain('Bonjour Jean')
      expect(result.text).toContain('Bonjour Jean')
    })

    it('should include reset URL', () => {
      const resetUrl = 'https://example.com/reset?token=abc123'
      const result = getPasswordResetEmail({
        prenom: 'Jean',
        resetUrl,
        userType: 'coach',
      })

      expect(result.html).toContain(resetUrl)
      expect(result.text).toContain(resetUrl)
    })

    it('should mention coach space for coach type', () => {
      const result = getPasswordResetEmail({
        prenom: 'Jean',
        resetUrl: 'https://example.com/reset',
        userType: 'coach',
      })

      expect(result.html).toContain('espace coach')
      expect(result.text).toContain('espace coach')
    })

    it('should mention admin space for admin type', () => {
      const result = getPasswordResetEmail({
        prenom: 'Admin',
        resetUrl: 'https://example.com/reset',
        userType: 'admin',
      })

      expect(result.html).toContain('espace administration')
      expect(result.text).toContain('espace administration')
    })

    it('should mention 1 hour expiration', () => {
      const result = getPasswordResetEmail({
        prenom: 'Jean',
        resetUrl: 'https://example.com/reset',
        userType: 'coach',
      })

      expect(result.html).toContain('1 heure')
      expect(result.text).toContain('1 heure')
    })
  })
})

describe('SMTP password encryption', () => {
  it('should encrypt and decrypt SMTP password', () => {
    const rawPassword = 'MonSuperMotDePasse123!'
    const encrypted = encryptSmtpPassword(rawPassword)

    expect(encrypted).not.toBe(rawPassword)
    expect(encrypted.startsWith('enc:v1:')).toBe(true)
    expect(decryptSmtpPassword(encrypted)).toBe(rawPassword)
  })

  it('should keep legacy clear passwords compatible', () => {
    const legacyPassword = 'legacy-clear-password'
    expect(decryptSmtpPassword(legacyPassword)).toBe(legacyPassword)
  })
})
