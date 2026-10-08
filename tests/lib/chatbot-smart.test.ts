import { describe, expect, it } from 'vitest'
import { detectUserIntents, deriveActionsAndSuggestions } from '@/lib/genkit-chat'

describe('Assistant Virtuel - Détection des Intentions', () => {
  it('détecte correctement une intention pour les enfants et tests de niveau', () => {
    const intents = detectUserIntents("Mon fils a 6 ans, quel groupe choisir ?")
    expect(intents.groupes).toBe(true)
    expect(intents.testsNage).toBe(true)
    expect(intents.planning).toBe(false)
  })

  it('détecte une intention planning et horaires', () => {
    const intents = detectUserIntents("Quels sont les horaires des cours de ce mercredi ?")
    expect(intents.planning).toBe(true)
  })

  it('détecte une intention tarifs et moyens de paiement', () => {
    const intents = detectUserIntents("Combien coûte la cotisation annuelle et peut-on payer par carte ?")
    expect(intents.tarifs).toBe(true)
  })

  it('détecte une intention séances annulées', () => {
    const intents = detectUserIntents("Est-ce que la séance de ce soir est annulée suite aux intempéries ?")
    expect(intents.annulations).toBe(true)
    expect(intents.planning).toBe(true)
  })

  it('détecte le contexte conversationnel depuis l\'historique', () => {
    const history = [
      { role: 'user', content: 'Je souhaite inscrire ma fille à l\'école de natation' },
      { role: 'assistant', content: 'L\'école de natation accueille les enfants.' }
    ]
    const intents = detectUserIntents("À quelle heure ont lieu les cours ?", history)
    expect(intents.planning).toBe(true)
    expect(intents.groupes).toBe(true)
  })
})

describe('Assistant Virtuel - Dérivation des Actions et Suggestions', () => {
  it('fournit le bouton Réserver un test de nage quand le test est mentionné', () => {
    const intents = detectUserIntents("Comment passer un test de nage ?")
    const { actions, suggestions } = deriveActionsAndSuggestions(
      "Vous devez prendre rendez-vous pour un [test de niveau](/tests-nage).",
      intents,
      "Comment passer un test de nage ?"
    )

    expect(actions.some((a) => a.url === '/tests-nage')).toBe(true)
    expect(suggestions.length).toBeGreaterThan(0)
  })

  it('fournit le bouton Inscription en ligne pour les tarifs ou inscriptions', () => {
    const intents = detectUserIntents("Comment s'inscrire sur MonClub ?")
    const { actions } = deriveActionsAndSuggestions(
      "L'adhésion se fait directement sur notre [page d'inscription](/inscription).",
      intents,
      "Comment s'inscrire sur MonClub ?"
    )

    expect(actions.some((a) => a.url === '/inscription')).toBe(true)
  })

  it('fournit le bouton Formulaire de contact en cas de repli', () => {
    const intents = detectUserIntents("Avez-vous une section water-polo ?")
    const { actions } = deriveActionsAndSuggestions(
      "Je ne dispose pas de cette information spécifique. Contactez l'équipe via le formulaire de contact.",
      intents,
      "Avez-vous une section water-polo ?"
    )

    expect(actions.some((a) => a.url === '/contact')).toBe(true)
  })
})
