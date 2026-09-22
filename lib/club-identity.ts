/**
 * Coordonnées officielles, identifiants légaux et informations bancaires (RIB/IBAN)
 * du TRITON CLUB CAVAILLONNAIS.
 */
export const CLUB_IDENTITY = {
  // Dénominations
  nomOfficiel: 'TRITON CLUB CAVAILLONNAIS',
  nomUsage: 'Triton Club Cavaillon',
  formeJuridique: 'Association sportive déclarée régie par la loi du 1er juillet 1901',
  dateCreation: '1966-03-29',

  // Identifiants officiels
  siren: '448666065',
  sirenFormatte: '448 666 065',
  siret: '44866606500017',
  siretFormatte: '448 666 065 00017',
  rna: 'W841000669',
  codeApe: '93.12Z',
  activite: 'Activités de clubs de sports (Natation sportive et de loisir)',
  affiliation: 'Fédération Française de Natation (FFN)',

  // Adresses
  siegeSocial: 'Piscine de la Clède, Route de Pertuis, 84300 Cavaillon',
  bassin: 'Piscine Alphonse Roudière, Avenue Jean Moulin, Quartier La Clède, 84300 Cavaillon',
  ville: 'Cavaillon',
  codePostal: '84300',

  // Contacts
  email: 'tritoncavaillon@gmail.com',
  siteWeb: 'https://tritoncavaillon.fr',

  // Coordonnées bancaires officielles (Crédit Mutuel)
  banque: {
    nom: 'Crédit Mutuel',
    agence: 'CCM AGRICULTURE DE CAVAILLON',
    adresseAgence: '92 Cours Bournissac, BP 219, 84306 Cavaillon Cedex',
    codeBanque: '10278',
    codeGuichet: '06514',
    numeroCompte: '00021040701',
    cleRib: '02',
    iban: 'FR7610278065140002104070102',
    ibanFormatte: 'FR76 1027 8065 1400 0210 4070 102',
    bic: 'CMCIFR2A',
    titulaire: 'TRITON CLUB CAVAILLON',
    domiciliation: 'CCM AGRICULTURE DE CAVAILLON',
  },
} as const
