import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// Helper to deserialize Date objects
function deserialize(data: any): any {
  return JSON.parse(JSON.stringify(data), (key, value) => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value)
    }
    return value
  })
}

const settingsData = [
  {
    "id": "cmozpewb0004jh438dxq8x852",
    "tauxHoraire": 30,
    "forfaitCompetition": 50,
    "nbCompetitionsAnnee": 15,
    "nbDemiJourneesParCompetition": 2,
    "forfaitRegionalActif": false,
    "montantForfaitRegional": 50,
    "boutiqueOuverte": true,
    "emailClub": "contact@triton-club-cavaillon.fr",
    "emailNotification": null,
    "logoUrl": "https://o668kgm0nljs2w9j.public.blob.vercel-storage.com/logo-1779742611839-logo.png",
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpUser": "admin@triton-club.fr",
    "smtpPassword": "enc:v1:8uGzopDJJpecWCbf:3Wbm9abwYKHRsmJ0GNOlbg==:uMppE359VQU=",
    "inscriptionUrl": "https://tritoncavaillon.monclub.app/login",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.788Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T05:30:24.153Z"
    },
    "reductionEnfantBureau": 50,
    "nomClub": "",
    "soldeDepartSaison": 25000
  }
]
const usersData = [
  {
    "id": "cmozpewai004dh438twh8g1y3",
    "email": "admin@triton-club.fr",
    "password": "$2b$10$X..yCSpTAEKcAdJprVBRFOtMjFuX.gwWM38TOAuCgioJvm0JT8N9W",
    "nom": "Admin",
    "prenom": "Triton",
    "role": "admin",
    "actif": true,
    "lastLogin": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.770Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.770Z"
    }
  }
]
const coachesData = [
  {
    "id": "cmozpevuc0000h438cziq54ve",
    "prenom": "Inna",
    "nom": "QUINSON",
    "email": "inna.quinson@triton-club.fr",
    "password": "$2b$10$ZD1KPTmxrQxLJ8vECKGRh.dEiXEWJZJGSlWOHwjivJpPYQHNnGqRq",
    "telephone": "0612345601",
    "photo": null,
    "bio": null,
    "specialites": "Natation",
    "siret": "12345678901201",
    "adresse": "Cavaillon",
    "actif": true,
    "lastLogin": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.188Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.188Z"
    }
  },
  {
    "id": "cmozpevwf0002h438ojbc6tud",
    "prenom": "Gaël",
    "nom": "BERNARD",
    "email": "gael.bernard@triton-club.fr",
    "password": "$2b$10$ZD1KPTmxrQxLJ8vECKGRh.dEiXEWJZJGSlWOHwjivJpPYQHNnGqRq",
    "telephone": "0612345603",
    "photo": null,
    "bio": null,
    "specialites": "Natation",
    "siret": "12345678901203",
    "adresse": "Cavaillon",
    "actif": true,
    "lastLogin": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.263Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.263Z"
    }
  },
  {
    "id": "cmozpevwi0003h4381mjbr5nl",
    "prenom": "Fabien",
    "nom": "CHASTAN",
    "email": "fabien.chastan@triton-club.fr",
    "password": "$2b$10$ZD1KPTmxrQxLJ8vECKGRh.dEiXEWJZJGSlWOHwjivJpPYQHNnGqRq",
    "telephone": "0612345604",
    "photo": null,
    "bio": null,
    "specialites": "Natation",
    "siret": "12345678901204",
    "adresse": "Cavaillon",
    "actif": true,
    "lastLogin": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.266Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.266Z"
    }
  },
  {
    "id": "cmozpevwk0004h438169gayyv",
    "prenom": "Hanne",
    "nom": "ROSENOW",
    "email": "hanne.rosenow@triton-club.fr",
    "password": "$2b$10$ZD1KPTmxrQxLJ8vECKGRh.dEiXEWJZJGSlWOHwjivJpPYQHNnGqRq",
    "telephone": "0612345605",
    "photo": null,
    "bio": null,
    "specialites": "Natation",
    "siret": "12345678901205",
    "adresse": "Cavaillon",
    "actif": true,
    "lastLogin": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.268Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.268Z"
    }
  },
  {
    "id": "cmozpevwm0005h4383m9s7qpk",
    "prenom": "William",
    "nom": "THEODET",
    "email": "william.theodet@triton-club.fr",
    "password": "$2b$10$ZD1KPTmxrQxLJ8vECKGRh.dEiXEWJZJGSlWOHwjivJpPYQHNnGqRq",
    "telephone": "0612345606",
    "photo": null,
    "bio": null,
    "specialites": "Natation",
    "siret": "12345678901206",
    "adresse": "Cavaillon",
    "actif": true,
    "lastLogin": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.270Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.270Z"
    }
  },
  {
    "id": "cmozpevwo0006h43828bjnee6",
    "prenom": "Isabelle",
    "nom": "GREGOIRE",
    "email": "isabelle.gregoire@triton-club.fr",
    "password": "$2b$10$ZD1KPTmxrQxLJ8vECKGRh.dEiXEWJZJGSlWOHwjivJpPYQHNnGqRq",
    "telephone": "0612345607",
    "photo": null,
    "bio": null,
    "specialites": "Natation",
    "siret": "12345678901207",
    "adresse": "Cavaillon",
    "actif": true,
    "lastLogin": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.272Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.272Z"
    }
  },
  {
    "id": "cmozpevwr0007h438h7qpwdom",
    "prenom": "Baptiste",
    "nom": "BUTTIGIEG",
    "email": "baptiste.buttigieg@triton-club.fr",
    "password": "$2b$10$ZD1KPTmxrQxLJ8vECKGRh.dEiXEWJZJGSlWOHwjivJpPYQHNnGqRq",
    "telephone": "0612345608",
    "photo": null,
    "bio": null,
    "specialites": "Natation",
    "siret": "12345678901208",
    "adresse": "Cavaillon",
    "actif": true,
    "lastLogin": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.275Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.275Z"
    }
  },
  {
    "id": "cmozpevwt0008h438x4j066zt",
    "prenom": "Adrien",
    "nom": "VALT",
    "email": "adrien.valt@triton-club.fr",
    "password": "$2b$10$ZD1KPTmxrQxLJ8vECKGRh.dEiXEWJZJGSlWOHwjivJpPYQHNnGqRq",
    "telephone": "0612345609",
    "photo": null,
    "bio": null,
    "specialites": "Natation",
    "siret": "12345678901209",
    "adresse": "Cavaillon",
    "actif": true,
    "lastLogin": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.277Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.277Z"
    }
  },
  {
    "id": "cmozpevwd0001h438mmoz1b0z",
    "prenom": "Cindy",
    "nom": "JOANNES",
    "email": "cindy.joannes@triton-club.fr",
    "password": "$2b$10$ZD1KPTmxrQxLJ8vECKGRh.dEiXEWJZJGSlWOHwjivJpPYQHNnGqRq",
    "telephone": "0612345602",
    "photo": null,
    "bio": null,
    "specialites": "Natation",
    "siret": "12345678901202",
    "adresse": "Cavaillon",
    "actif": true,
    "lastLogin": {
      "__type": "Date",
      "value": "2026-05-27T09:02:22.713Z"
    },
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.261Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T09:02:22.725Z"
    }
  },
  {
    "id": "cmozpevww0009h4383lkiimgn",
    "prenom": "Julie",
    "nom": "PETRELLA",
    "email": "julie.petrella@triton-club.fr",
    "password": "$2b$10$ZD1KPTmxrQxLJ8vECKGRh.dEiXEWJZJGSlWOHwjivJpPYQHNnGqRq",
    "telephone": "0612345610",
    "photo": null,
    "bio": null,
    "specialites": "Natation",
    "siret": "12345678901210",
    "adresse": "Cavaillon",
    "actif": true,
    "lastLogin": {
      "__type": "Date",
      "value": "2026-05-27T19:32:06.956Z"
    },
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.280Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T19:32:06.957Z"
    }
  }
]
const groupsData = [
  {
    "id": "cmozpevxc000ch4380ai2c7hy",
    "nom": "Avenirs 1",
    "description": "Groupe Avenirs 1 - Catégorie avenirs",
    "total": 15,
    "inscrits": 14,
    "ageMin": null,
    "ageMax": null,
    "niveau": "avenirs",
    "tarif": 320,
    "caution": null,
    "prixLicence": 45,
    "actif": true,
    "ordre": 3,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.296Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.296Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevxe000dh438qim243tz",
    "nom": "Avenirs 2",
    "description": "Groupe Avenirs 2 - Catégorie avenirs",
    "total": 15,
    "inscrits": 14,
    "ageMin": null,
    "ageMax": null,
    "niveau": "avenirs",
    "tarif": 320,
    "caution": null,
    "prixLicence": 45,
    "actif": true,
    "ordre": 4,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.299Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.299Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevxh000eh438qkon6iuq",
    "nom": "Avenirs 3",
    "description": "Groupe Avenirs 3 - Catégorie avenirs",
    "total": 15,
    "inscrits": 13,
    "ageMin": null,
    "ageMax": null,
    "niveau": "avenirs",
    "tarif": 320,
    "caution": null,
    "prixLicence": 45,
    "actif": true,
    "ordre": 5,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.301Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.301Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevxk000fh438se0bdgeo",
    "nom": "Benjamins 1",
    "description": "Groupe Benjamins 1 - Catégorie competition",
    "total": 9,
    "inscrits": 4,
    "ageMin": null,
    "ageMax": null,
    "niveau": "competition",
    "tarif": 380,
    "caution": 50,
    "prixLicence": 65,
    "actif": true,
    "ordre": 6,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.304Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.304Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevxo000gh4388smhzf2l",
    "nom": "Benjamins 2",
    "description": "Groupe Benjamins 2 - Catégorie competition",
    "total": 9,
    "inscrits": 9,
    "ageMin": null,
    "ageMax": null,
    "niveau": "competition",
    "tarif": 380,
    "caution": 50,
    "prixLicence": 65,
    "actif": true,
    "ordre": 7,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.308Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.308Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevxr000hh438hawolnkp",
    "nom": "Juniors Compétition",
    "description": "Groupe Juniors Compétition - Catégorie competition",
    "total": 18,
    "inscrits": 18,
    "ageMin": null,
    "ageMax": null,
    "niveau": "competition",
    "tarif": 420,
    "caution": 50,
    "prixLicence": 70,
    "actif": true,
    "ordre": 8,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.311Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.311Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevxt000ih438wzw9nhu0",
    "nom": "Adultes Compétition",
    "description": "Groupe Adultes Compétition - Catégorie competition",
    "total": 11,
    "inscrits": 11,
    "ageMin": null,
    "ageMax": null,
    "niveau": "competition",
    "tarif": 450,
    "caution": 100,
    "prixLicence": 75,
    "actif": true,
    "ordre": 9,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.313Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.313Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevxw000jh438grr4eurc",
    "nom": "Jeunes Loisirs",
    "description": "Groupe Jeunes Loisirs - Catégorie loisir",
    "total": 20,
    "inscrits": 20,
    "ageMin": null,
    "ageMax": null,
    "niveau": "loisir",
    "tarif": 300,
    "caution": null,
    "prixLicence": 40,
    "actif": true,
    "ordre": 10,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.316Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.316Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevxy000kh438ks7uenx5",
    "nom": "Juniors Loisirs",
    "description": "Groupe Juniors Loisirs - Catégorie loisir",
    "total": 20,
    "inscrits": 21,
    "ageMin": null,
    "ageMax": null,
    "niveau": "loisir",
    "tarif": 300,
    "caution": null,
    "prixLicence": 40,
    "actif": true,
    "ordre": 11,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.318Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.318Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevy1000lh438eqgy8g6t",
    "nom": "Adultes Loisirs 1",
    "description": "Groupe Adultes Loisirs 1 - Catégorie loisir",
    "total": 18,
    "inscrits": 18,
    "ageMin": null,
    "ageMax": null,
    "niveau": "loisir",
    "tarif": 350,
    "caution": null,
    "prixLicence": 45,
    "actif": true,
    "ordre": 12,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.321Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.321Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevy3000mh438s2hg67yv",
    "nom": "Adultes Loisirs 2",
    "description": "Groupe Adultes Loisirs 2 - Catégorie loisir",
    "total": 18,
    "inscrits": 17,
    "ageMin": null,
    "ageMax": null,
    "niveau": "loisir",
    "tarif": 350,
    "caution": null,
    "prixLicence": 45,
    "actif": true,
    "ordre": 13,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.323Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.323Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevy7000nh4387hn0t9sf",
    "nom": "Natation Artistique",
    "description": "Groupe Natation Artistique - Catégorie artistique",
    "total": 14,
    "inscrits": 16,
    "ageMin": null,
    "ageMax": null,
    "niveau": "artistique",
    "tarif": 400,
    "caution": null,
    "prixLicence": 60,
    "actif": true,
    "ordre": 14,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.327Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.327Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevyb000oh438r5c3inxc",
    "nom": "AquaGym",
    "description": "Groupe AquaGym - Catégorie aquagym",
    "total": 25,
    "inscrits": 22,
    "ageMin": null,
    "ageMax": null,
    "niveau": "aquagym",
    "tarif": 250,
    "caution": null,
    "prixLicence": null,
    "actif": true,
    "ordre": 15,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.331Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.331Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevye000ph438lw003emg",
    "nom": "BNSSA",
    "description": "Groupe BNSSA - Catégorie bnssa",
    "total": 10,
    "inscrits": 6,
    "ageMin": null,
    "ageMax": null,
    "niveau": "bnssa",
    "tarif": 600,
    "caution": null,
    "prixLicence": null,
    "actif": true,
    "ordre": 16,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": null,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.334Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.334Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevx1000ah438fbaw0qy7",
    "nom": "Ecole de natation française (ENF 1)",
    "description": "Groupe ENF 1 - Catégorie enf",
    "total": 22,
    "inscrits": 20,
    "ageMin": null,
    "ageMax": null,
    "niveau": "debutant",
    "tarif": 270,
    "caution": null,
    "prixLicence": 22,
    "actif": true,
    "ordre": 1,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": 60,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.285Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-23T07:57:40.441Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  },
  {
    "id": "cmozpevx6000bh438092yooxm",
    "nom": "Ecole de natation française (ENF 2)",
    "description": "Groupe ENF 2 - Catégorie enf",
    "total": 22,
    "inscrits": 20,
    "ageMin": null,
    "ageMax": null,
    "niveau": "debutant",
    "tarif": 270,
    "caution": null,
    "prixLicence": 22,
    "actif": true,
    "ordre": 2,
    "dateDebut": null,
    "dateFin": null,
    "tempsFacture": 60,
    "isCompetition": false,
    "nbCompetitions": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.290Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-23T07:58:23.217Z"
    },
    "enfantsBureau": 0,
    "membresBureau": 0
  }
]
const planningsData = [
  {
    "id": "cmozpevzp000qh43819z0sukb",
    "jourSemaine": "Mercredi",
    "heureDebut": "09:15",
    "heureFin": "10:00",
    "groupeId": "cmozpevx1000ah438fbaw0qy7",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#EF5350",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.381Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.381Z"
    }
  },
  {
    "id": "cmozpew04000th43854krl1cf",
    "jourSemaine": "Vendredi",
    "heureDebut": "17:15",
    "heureFin": "18:00",
    "groupeId": "cmozpevx1000ah438fbaw0qy7",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#EF5350",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.396Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.396Z"
    }
  },
  {
    "id": "cmozpew0a000wh438t2d87amj",
    "jourSemaine": "Mercredi",
    "heureDebut": "10:00",
    "heureFin": "10:45",
    "groupeId": "cmozpevx6000bh438092yooxm",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#F44336",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.402Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.402Z"
    }
  },
  {
    "id": "cmozpew0g000zh4386txu0i7m",
    "jourSemaine": "Vendredi",
    "heureDebut": "18:15",
    "heureFin": "19:00",
    "groupeId": "cmozpevx6000bh438092yooxm",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#F44336",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.408Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.408Z"
    }
  },
  {
    "id": "cmozpew0m0012h438sfzy14zx",
    "jourSemaine": "Mercredi",
    "heureDebut": "13:30",
    "heureFin": "14:30",
    "groupeId": "cmozpevxc000ch4380ai2c7hy",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FFEB3B",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.414Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.414Z"
    }
  },
  {
    "id": "cmozpew0t0014h438zcrmyrnj",
    "jourSemaine": "Vendredi",
    "heureDebut": "17:15",
    "heureFin": "18:00",
    "groupeId": "cmozpevxc000ch4380ai2c7hy",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FFEB3B",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.421Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.421Z"
    }
  },
  {
    "id": "cmozpew0y0016h438ob7uso2m",
    "jourSemaine": "Mercredi",
    "heureDebut": "14:30",
    "heureFin": "15:30",
    "groupeId": "cmozpevxe000dh438qim243tz",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FDD835",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.426Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.426Z"
    }
  },
  {
    "id": "cmozpew120018h438eq0ve9hg",
    "jourSemaine": "Vendredi",
    "heureDebut": "17:15",
    "heureFin": "18:00",
    "groupeId": "cmozpevxe000dh438qim243tz",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FDD835",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.430Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.430Z"
    }
  },
  {
    "id": "cmozpew17001ah438v3s0k1lr",
    "jourSemaine": "Mercredi",
    "heureDebut": "14:30",
    "heureFin": "15:30",
    "groupeId": "cmozpevxh000eh438qkon6iuq",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FBC02D",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.435Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.435Z"
    }
  },
  {
    "id": "cmozpew1d001ch438jwyljr9s",
    "jourSemaine": "Vendredi",
    "heureDebut": "18:00",
    "heureFin": "19:00",
    "groupeId": "cmozpevxh000eh438qkon6iuq",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FBC02D",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.441Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.441Z"
    }
  },
  {
    "id": "cmozpew1i001eh438uksmhnkq",
    "jourSemaine": "Mardi",
    "heureDebut": "19:30",
    "heureFin": "21:00",
    "groupeId": "cmozpevxk000fh438se0bdgeo",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FF9800",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.446Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.446Z"
    }
  },
  {
    "id": "cmozpew1m001gh438xv8vme0e",
    "jourSemaine": "Mercredi",
    "heureDebut": "14:30",
    "heureFin": "15:30",
    "groupeId": "cmozpevxk000fh438se0bdgeo",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FF9800",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.450Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.450Z"
    }
  },
  {
    "id": "cmozpew1q001ih4383zg5fszh",
    "jourSemaine": "Vendredi",
    "heureDebut": "18:00",
    "heureFin": "19:00",
    "groupeId": "cmozpevxk000fh438se0bdgeo",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FF9800",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.454Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.454Z"
    }
  },
  {
    "id": "cmozpew1v001kh43896cjzvh1",
    "jourSemaine": "Mardi",
    "heureDebut": "19:30",
    "heureFin": "21:00",
    "groupeId": "cmozpevxo000gh4388smhzf2l",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FB8C00",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.459Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.459Z"
    }
  },
  {
    "id": "cmozpew1z001mh438n5s1pywy",
    "jourSemaine": "Mercredi",
    "heureDebut": "14:00",
    "heureFin": "15:30",
    "groupeId": "cmozpevxo000gh4388smhzf2l",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FB8C00",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.463Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.463Z"
    }
  },
  {
    "id": "cmozpew24001oh4388b1mhbx3",
    "jourSemaine": "Vendredi",
    "heureDebut": "18:15",
    "heureFin": "19:30",
    "groupeId": "cmozpevxo000gh4388smhzf2l",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FB8C00",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.468Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.468Z"
    }
  },
  {
    "id": "cmozpew28001qh438fjqgdprx",
    "jourSemaine": "Lundi",
    "heureDebut": "19:30",
    "heureFin": "21:00",
    "groupeId": "cmozpevxr000hh438hawolnkp",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#2196F3",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.472Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.472Z"
    }
  },
  {
    "id": "cmozpew2c001sh438bbydva7x",
    "jourSemaine": "Mardi",
    "heureDebut": "19:30",
    "heureFin": "21:00",
    "groupeId": "cmozpevxr000hh438hawolnkp",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#2196F3",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.476Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.476Z"
    }
  },
  {
    "id": "cmozpew2g001uh4382ava9tkg",
    "jourSemaine": "Mercredi",
    "heureDebut": "14:00",
    "heureFin": "15:30",
    "groupeId": "cmozpevxr000hh438hawolnkp",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#2196F3",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.480Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.480Z"
    }
  },
  {
    "id": "cmozpew2m001wh4384iqkgtix",
    "jourSemaine": "Mercredi",
    "heureDebut": "19:30",
    "heureFin": "21:00",
    "groupeId": "cmozpevxr000hh438hawolnkp",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#2196F3",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.486Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.486Z"
    }
  },
  {
    "id": "cmozpew2q001yh438mopt5d5r",
    "jourSemaine": "Jeudi",
    "heureDebut": "19:30",
    "heureFin": "20:30",
    "groupeId": "cmozpevxr000hh438hawolnkp",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#2196F3",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.490Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.490Z"
    }
  },
  {
    "id": "cmozpew2u0020h438ktktfl6o",
    "jourSemaine": "Vendredi",
    "heureDebut": "18:15",
    "heureFin": "19:30",
    "groupeId": "cmozpevxr000hh438hawolnkp",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#2196F3",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.494Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.494Z"
    }
  },
  {
    "id": "cmozpew2y0022h438dit37p40",
    "jourSemaine": "Lundi",
    "heureDebut": "19:30",
    "heureFin": "21:00",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#1976D2",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.498Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.498Z"
    }
  },
  {
    "id": "cmozpew320024h438n5amh7mt",
    "jourSemaine": "Mardi",
    "heureDebut": "19:30",
    "heureFin": "21:00",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#1976D2",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.502Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.502Z"
    }
  },
  {
    "id": "cmozpew370026h438qv61bs6q",
    "jourSemaine": "Mercredi",
    "heureDebut": "19:30",
    "heureFin": "21:00",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#1976D2",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.507Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.507Z"
    }
  },
  {
    "id": "cmozpew3b0028h438yl65mkay",
    "jourSemaine": "Jeudi",
    "heureDebut": "20:30",
    "heureFin": "21:30",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#1976D2",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.511Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.511Z"
    }
  },
  {
    "id": "cmozpew3g002ah438n6ddlxn6",
    "jourSemaine": "Samedi",
    "heureDebut": "11:00",
    "heureFin": "12:30",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#1976D2",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.516Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.516Z"
    }
  },
  {
    "id": "cmozpew3k002ch438hqh1zpmz",
    "jourSemaine": "Mercredi",
    "heureDebut": "13:30",
    "heureFin": "14:30",
    "groupeId": "cmozpevxw000jh438grr4eurc",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#66BB6A",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.520Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.520Z"
    }
  },
  {
    "id": "cmozpew3o002eh438cecp24qt",
    "jourSemaine": "Vendredi",
    "heureDebut": "17:15",
    "heureFin": "18:15",
    "groupeId": "cmozpevxw000jh438grr4eurc",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#66BB6A",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.524Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.524Z"
    }
  },
  {
    "id": "cmozpew3s002gh438pcrbpdxy",
    "jourSemaine": "Mardi",
    "heureDebut": "19:30",
    "heureFin": "20:30",
    "groupeId": "cmozpevxy000kh438ks7uenx5",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#4CAF50",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.528Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.528Z"
    }
  },
  {
    "id": "cmozpew3w002ih438jibabadn",
    "jourSemaine": "Mercredi",
    "heureDebut": "13:30",
    "heureFin": "14:30",
    "groupeId": "cmozpevxy000kh438ks7uenx5",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#4CAF50",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.533Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.533Z"
    }
  },
  {
    "id": "cmozpew40002kh438w2rksuk6",
    "jourSemaine": "Jeudi",
    "heureDebut": "19:30",
    "heureFin": "20:30",
    "groupeId": "cmozpevxy000kh438ks7uenx5",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#4CAF50",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.536Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.536Z"
    }
  },
  {
    "id": "cmozpew44002mh438k53djpud",
    "jourSemaine": "Lundi",
    "heureDebut": "19:30",
    "heureFin": "21:00",
    "groupeId": "cmozpevy1000lh438eqgy8g6t",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#388E3C",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.540Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.540Z"
    }
  },
  {
    "id": "cmozpew4a002oh438ujbt318f",
    "jourSemaine": "Mercredi",
    "heureDebut": "19:30",
    "heureFin": "21:00",
    "groupeId": "cmozpevy1000lh438eqgy8g6t",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#388E3C",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.546Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.546Z"
    }
  },
  {
    "id": "cmozpew4k002qh438rzs8f3c9",
    "jourSemaine": "Samedi",
    "heureDebut": "11:00",
    "heureFin": "12:30",
    "groupeId": "cmozpevy1000lh438eqgy8g6t",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#388E3C",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.556Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.556Z"
    }
  },
  {
    "id": "cmozpew4o002sh438zqbpqs1n",
    "jourSemaine": "Mardi",
    "heureDebut": "19:30",
    "heureFin": "21:00",
    "groupeId": "cmozpevy3000mh438s2hg67yv",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#2E7D32",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.560Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.560Z"
    }
  },
  {
    "id": "cmozpew4s002uh438pqxegymk",
    "jourSemaine": "Jeudi",
    "heureDebut": "20:30",
    "heureFin": "21:30",
    "groupeId": "cmozpevy3000mh438s2hg67yv",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#2E7D32",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.564Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.564Z"
    }
  },
  {
    "id": "cmozpew4x002wh438kk4fap6p",
    "jourSemaine": "Samedi",
    "heureDebut": "11:00",
    "heureFin": "12:30",
    "groupeId": "cmozpevy3000mh438s2hg67yv",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#2E7D32",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.569Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.569Z"
    }
  },
  {
    "id": "cmozpew51002yh438nf077hkm",
    "jourSemaine": "Mercredi",
    "heureDebut": "13:30",
    "heureFin": "14:30",
    "groupeId": "cmozpevy7000nh4387hn0t9sf",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#EC407A",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.573Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.573Z"
    }
  },
  {
    "id": "cmozpew550030h438jmjqc2mr",
    "jourSemaine": "Vendredi",
    "heureDebut": "18:30",
    "heureFin": "20:00",
    "groupeId": "cmozpevy7000nh4387hn0t9sf",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#EC407A",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.577Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.577Z"
    }
  },
  {
    "id": "cmozpew580032h438z3xba6me",
    "jourSemaine": "Jeudi",
    "heureDebut": "19:30",
    "heureFin": "20:15",
    "groupeId": "cmozpevyb000oh438r5c3inxc",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#FFA726",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.580Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.580Z"
    }
  },
  {
    "id": "cmozpew5c0034h438nuk6vt61",
    "jourSemaine": "Jeudi",
    "heureDebut": "19:30",
    "heureFin": "21:30",
    "groupeId": "cmozpevye000ph438lw003emg",
    "lieu": "Piscine de Cavaillon",
    "couleur": "#00BCD4",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.584Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.584Z"
    }
  }
]
const coachPlanningsData = [
  {
    "id": "cmozpevzu000rh438ycptiemf",
    "coachId": "cmozpevuc0000h438cziq54ve",
    "planningId": "cmozpevzp000qh43819z0sukb",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.381Z"
    }
  },
  {
    "id": "cmozpevzu000sh438faqgnocn",
    "coachId": "cmozpevwo0006h43828bjnee6",
    "planningId": "cmozpevzp000qh43819z0sukb",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.381Z"
    }
  },
  {
    "id": "cmozpew05000uh438xf1hnpq4",
    "coachId": "cmozpevuc0000h438cziq54ve",
    "planningId": "cmozpew04000th43854krl1cf",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.396Z"
    }
  },
  {
    "id": "cmozpew05000vh438pzdok43m",
    "coachId": "cmozpevwo0006h43828bjnee6",
    "planningId": "cmozpew04000th43854krl1cf",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.396Z"
    }
  },
  {
    "id": "cmozpew0b000xh43827ek4h7a",
    "coachId": "cmozpevuc0000h438cziq54ve",
    "planningId": "cmozpew0a000wh438t2d87amj",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.402Z"
    }
  },
  {
    "id": "cmozpew0b000yh438sfu8dch1",
    "coachId": "cmozpevwo0006h43828bjnee6",
    "planningId": "cmozpew0a000wh438t2d87amj",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.402Z"
    }
  },
  {
    "id": "cmozpew0h0010h438l29wkoh2",
    "coachId": "cmozpevuc0000h438cziq54ve",
    "planningId": "cmozpew0g000zh4386txu0i7m",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.408Z"
    }
  },
  {
    "id": "cmozpew0h0011h4388nntws92",
    "coachId": "cmozpevwo0006h43828bjnee6",
    "planningId": "cmozpew0g000zh4386txu0i7m",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.408Z"
    }
  },
  {
    "id": "cmozpew0o0013h438n5wdh8pw",
    "coachId": "cmozpevwm0005h4383m9s7qpk",
    "planningId": "cmozpew0m0012h438sfzy14zx",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.414Z"
    }
  },
  {
    "id": "cmozpew0u0015h438v3ciso9y",
    "coachId": "cmozpevwm0005h4383m9s7qpk",
    "planningId": "cmozpew0t0014h438zcrmyrnj",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.421Z"
    }
  },
  {
    "id": "cmozpew0z0017h438p801x4dd",
    "coachId": "cmozpevwm0005h4383m9s7qpk",
    "planningId": "cmozpew0y0016h438ob7uso2m",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.426Z"
    }
  },
  {
    "id": "cmozpew130019h438qij1usp4",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew120018h438eq0ve9hg",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.430Z"
    }
  },
  {
    "id": "cmozpew18001bh43850szcem2",
    "coachId": "cmozpevwm0005h4383m9s7qpk",
    "planningId": "cmozpew17001ah438v3s0k1lr",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.435Z"
    }
  },
  {
    "id": "cmozpew1e001dh438oen17hp0",
    "coachId": "cmozpevwm0005h4383m9s7qpk",
    "planningId": "cmozpew1d001ch438jwyljr9s",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.441Z"
    }
  },
  {
    "id": "cmozpew1i001fh438pk0w5gfw",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew1i001eh438uksmhnkq",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.446Z"
    }
  },
  {
    "id": "cmozpew1n001hh438fnca8snj",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew1m001gh438xv8vme0e",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.450Z"
    }
  },
  {
    "id": "cmozpew1r001jh43882k9eqhq",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew1q001ih4383zg5fszh",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.454Z"
    }
  },
  {
    "id": "cmozpew1w001lh438wkpk3v5z",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew1v001kh43896cjzvh1",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.459Z"
    }
  },
  {
    "id": "cmozpew20001nh438yf4umq7q",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew1z001mh438n5s1pywy",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.463Z"
    }
  },
  {
    "id": "cmozpew25001ph438h0ce0jvi",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew24001oh4388b1mhbx3",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.468Z"
    }
  },
  {
    "id": "cmozpew29001rh4383bhfyqog",
    "coachId": "cmozpevwk0004h438169gayyv",
    "planningId": "cmozpew28001qh438fjqgdprx",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.472Z"
    }
  },
  {
    "id": "cmozpew2d001th438jzqar971",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew2c001sh438bbydva7x",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.476Z"
    }
  },
  {
    "id": "cmozpew2h001vh438m6nujsof",
    "coachId": "cmozpevwk0004h438169gayyv",
    "planningId": "cmozpew2g001uh4382ava9tkg",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.480Z"
    }
  },
  {
    "id": "cmozpew2n001xh438ej7ohckt",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew2m001wh4384iqkgtix",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.486Z"
    }
  },
  {
    "id": "cmozpew2r001zh438hrrh2pzo",
    "coachId": "cmozpevwi0003h4381mjbr5nl",
    "planningId": "cmozpew2q001yh438mopt5d5r",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.490Z"
    }
  },
  {
    "id": "cmozpew2v0021h438d7mt8gqo",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew2u0020h438ktktfl6o",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.494Z"
    }
  },
  {
    "id": "cmozpew2z0023h438ee11t98d",
    "coachId": "cmozpevwk0004h438169gayyv",
    "planningId": "cmozpew2y0022h438dit37p40",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.498Z"
    }
  },
  {
    "id": "cmozpew330025h438t8uty9p3",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew320024h438n5amh7mt",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.502Z"
    }
  },
  {
    "id": "cmozpew380027h438ulnb7kti",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew370026h438qv61bs6q",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.507Z"
    }
  },
  {
    "id": "cmozpew3c0029h438k7wjq5uc",
    "coachId": "cmozpevwi0003h4381mjbr5nl",
    "planningId": "cmozpew3b0028h438yl65mkay",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.511Z"
    }
  },
  {
    "id": "cmozpew3h002bh438w93bfl2y",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew3g002ah438n6ddlxn6",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.516Z"
    }
  },
  {
    "id": "cmozpew3l002dh4389fxle6fh",
    "coachId": "cmozpevwr0007h438h7qpwdom",
    "planningId": "cmozpew3k002ch438hqh1zpmz",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.520Z"
    }
  },
  {
    "id": "cmozpew3p002fh438xbfbvrlh",
    "coachId": "cmozpevwr0007h438h7qpwdom",
    "planningId": "cmozpew3o002eh438cecp24qt",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.524Z"
    }
  },
  {
    "id": "cmozpew3t002hh4384i05p4fj",
    "coachId": "cmozpevwr0007h438h7qpwdom",
    "planningId": "cmozpew3s002gh438pcrbpdxy",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.528Z"
    }
  },
  {
    "id": "cmozpew3x002jh438kns1pf7d",
    "coachId": "cmozpevwr0007h438h7qpwdom",
    "planningId": "cmozpew3w002ih438jibabadn",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.533Z"
    }
  },
  {
    "id": "cmozpew41002lh438cbg7th0p",
    "coachId": "cmozpevwr0007h438h7qpwdom",
    "planningId": "cmozpew40002kh438w2rksuk6",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.536Z"
    }
  },
  {
    "id": "cmozpew45002nh438eci133jx",
    "coachId": "cmozpevwk0004h438169gayyv",
    "planningId": "cmozpew44002mh438k53djpud",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.540Z"
    }
  },
  {
    "id": "cmozpew4h002ph4388803w02d",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew4a002oh438ujbt318f",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.546Z"
    }
  },
  {
    "id": "cmozpew4l002rh438z6q0ncj7",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew4k002qh438rzs8f3c9",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.556Z"
    }
  },
  {
    "id": "cmozpew4p002th438c0dmofoc",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew4o002sh438zqbpqs1n",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.560Z"
    }
  },
  {
    "id": "cmozpew4t002vh43882wtmtk7",
    "coachId": "cmozpevwi0003h4381mjbr5nl",
    "planningId": "cmozpew4s002uh438pqxegymk",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.564Z"
    }
  },
  {
    "id": "cmozpew4y002xh438r2sivlvr",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "planningId": "cmozpew4x002wh438kk4fap6p",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.569Z"
    }
  },
  {
    "id": "cmozpew52002zh438xc79ac9a",
    "coachId": "cmozpevuc0000h438cziq54ve",
    "planningId": "cmozpew51002yh438nf077hkm",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.573Z"
    }
  },
  {
    "id": "cmozpew550031h438nxzcvvbb",
    "coachId": "cmozpevuc0000h438cziq54ve",
    "planningId": "cmozpew550030h438jmjqc2mr",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.577Z"
    }
  },
  {
    "id": "cmozpew590033h438a2ky9gv3",
    "coachId": "cmozpevuc0000h438cziq54ve",
    "planningId": "cmozpew580032h438z3xba6me",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.580Z"
    }
  },
  {
    "id": "cmozpew5d0035h438lddp1pxv",
    "coachId": "cmozpevwf0002h438ojbc6tud",
    "planningId": "cmozpew5c0034h438nuk6vt61",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.584Z"
    }
  }
]
const calendarEventsData = [
  {
    "id": "cmps1dupd00002k38x35vpgqa",
    "title": "Championnats régionaux des Maîtres",
    "date": {
      "__type": "Date",
      "value": "2026-01-18T07:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Maîtres (Adultes Compétition)",
    "lieu": "Saint-Tropez",
    "type": "competition",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.377Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.377Z"
    }
  },
  {
    "id": "cmps1dupz00012k38dg2yi6ow",
    "title": "Championnat départemental U11 et",
    "date": {
      "__type": "Date",
      "value": "2026-01-25T07:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U11 et - (Avenirs 1, Avenirs 2, Avenirs 3)",
    "lieu": "Pertuis",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#15803d",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.399Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.399Z"
    }
  },
  {
    "id": "cmps1duq500022k38v25fy653",
    "title": "Championnats de France de relais Maîtres",
    "date": {
      "__type": "Date",
      "value": "2026-01-31T07:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-02-01T17:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Maîtres (Adultes Compétition)",
    "lieu": "Gap",
    "type": "competition",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.406Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.406Z"
    }
  },
  {
    "id": "cmps1duqd00032k38adzpxynd",
    "title": "Championnat départemental U14 et +, Maîtres",
    "date": {
      "__type": "Date",
      "value": "2026-02-07T07:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-02-08T17:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U14 et +, Maîtres (Adultes Compétition, Juniors Compétition, Benjamins 1, Benjamins 2, Juniors Loisirs)",
    "lieu": "Avignon - Stuart Mill",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.413Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.413Z"
    }
  },
  {
    "id": "cmps1duqh00042k38ixd3lqxw",
    "title": "Championnat départemental U12 et U13",
    "date": {
      "__type": "Date",
      "value": "2026-02-14T07:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-02-15T17:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U12 et U13 (Benjamins 1, Benjamins 2)",
    "lieu": "Sorgues",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.417Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.417Z"
    }
  },
  {
    "id": "cmps1duqn00052k38q34j5msu",
    "title": "Championnats de France Maîtres N2 Hiver",
    "date": {
      "__type": "Date",
      "value": "2026-02-14T07:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-02-15T17:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Maîtres (Adultes Compétition)",
    "lieu": "Libourne",
    "type": "competition",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.423Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.423Z"
    }
  },
  {
    "id": "cmps1duqs00062k385k43gaoe",
    "title": "Interclubs régionaux Maîtres",
    "date": {
      "__type": "Date",
      "value": "2026-02-22T07:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Maîtres (Adultes Compétition)",
    "lieu": "Nice",
    "type": "competition",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.428Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.428Z"
    }
  },
  {
    "id": "cmps1duqw00072k38qs71jmrl",
    "title": "Championnats de France Maîtres N1 Hiver",
    "date": {
      "__type": "Date",
      "value": "2026-03-05T07:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-03-08T17:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Maîtres (Adultes Compétition)",
    "lieu": "Bourg-en-Bresse",
    "type": "competition",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.432Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.432Z"
    }
  },
  {
    "id": "cmps1dur000082k38cr7xhwjw",
    "title": "Championnat départemental U12 et +",
    "date": {
      "__type": "Date",
      "value": "2026-03-07T07:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-03-08T17:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U12 et + (Benjamins 1, Benjamins 2, Juniors Compétition, Adultes Compétition, Juniors Loisirs)",
    "lieu": "Pertuis",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.437Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.437Z"
    }
  },
  {
    "id": "cmps1dur500092k388imnk8c5",
    "title": "Web Confrontation",
    "date": {
      "__type": "Date",
      "value": "2026-03-13T07:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-03-15T17:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U14 et + (Juniors Compétition, Benjamins 1, Benjamins 2, Adultes Compétition, Juniors Loisirs)",
    "lieu": "Saint Raphaël",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.441Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.441Z"
    }
  },
  {
    "id": "cmps1durb000a2k38fqe1di6t",
    "title": "Championnat départemental U11 et",
    "date": {
      "__type": "Date",
      "value": "2026-03-22T07:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U11 et - (Avenirs 1, Avenirs 2, Avenirs 3)",
    "lieu": "Sorgues",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#15803d",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.447Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.447Z"
    }
  },
  {
    "id": "cmps1durf000b2k3805x06cl2",
    "title": "Meeting d'animation U14 et +",
    "date": {
      "__type": "Date",
      "value": "2026-04-04T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-04-05T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U14 et + (Juniors Compétition, Benjamins 1, Benjamins 2, Adultes Compétition, Juniors Loisirs)",
    "lieu": "Nice",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.451Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.451Z"
    }
  },
  {
    "id": "cmps1durl000c2k382ux44inr",
    "title": "Championnat départemental U14 et +, Maîtres",
    "date": {
      "__type": "Date",
      "value": "2026-04-11T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-04-12T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U14 et +, Maîtres (Adultes Compétition, Juniors Compétition, Benjamins 1, Benjamins 2, Juniors Loisirs)",
    "lieu": "Avignon - Stuart Mill",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.457Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.457Z"
    }
  },
  {
    "id": "cmps1durq000d2k38bo9vjx53",
    "title": "Interclubs nationaux des Maîtres",
    "date": {
      "__type": "Date",
      "value": "2026-04-11T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-04-12T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Maîtres (Adultes Compétition)",
    "lieu": "Châteauroux",
    "type": "competition",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.462Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.462Z"
    }
  },
  {
    "id": "cmps1durx000e2k38nvu1scn4",
    "title": "Championnats de France U14 et U15 U14 et U15",
    "date": {
      "__type": "Date",
      "value": "2026-04-15T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-04-19T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Toutes",
    "lieu": "Inconnu",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#15803d",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.469Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.469Z"
    }
  },
  {
    "id": "cmps1dus3000f2k38rkcltvme",
    "title": "Championnat départemental U11 et",
    "date": {
      "__type": "Date",
      "value": "2026-05-03T06:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U11 et - (Avenirs 1, Avenirs 2, Avenirs 3)",
    "lieu": "Vedène",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#15803d",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.475Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.475Z"
    }
  },
  {
    "id": "cmps1dus8000g2k38t3o9jsnz",
    "title": "Meeting régional U14 et +",
    "date": {
      "__type": "Date",
      "value": "2026-05-09T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-05-10T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U14 et + (Juniors Compétition, Benjamins 1, Benjamins 2, Adultes Compétition, Juniors Loisirs)",
    "lieu": "Saint Raphaël",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.480Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.480Z"
    }
  },
  {
    "id": "cmps1dusc000h2k38u68po6s7",
    "title": "Coupe Interdépartementale U10 et U11",
    "date": {
      "__type": "Date",
      "value": "2026-05-14T06:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U10 et U11 (Avenirs 1, Avenirs 2, Avenirs 3)",
    "lieu": "Gap",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#15803d",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.484Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.484Z"
    }
  },
  {
    "id": "cmps1dusg000i2k38iyflkt9y",
    "title": "Championnat départemental U12 et + U12 et +",
    "date": {
      "__type": "Date",
      "value": "2026-05-16T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-05-17T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Toutes",
    "lieu": "Inconnu",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#15803d",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.488Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.488Z"
    }
  },
  {
    "id": "cmps1dusl000j2k38hk76q9de",
    "title": "Championnats de France Maîtres N2 Eté + meeting pour les qualifiés N1",
    "date": {
      "__type": "Date",
      "value": "2026-05-16T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-05-17T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Maîtres (Adultes Compétition)",
    "lieu": "Nîmes",
    "type": "competition",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.493Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.493Z"
    }
  },
  {
    "id": "cmps1dusr000k2k38qzk2hcot",
    "title": "Eliminatoires Coupe de France des départements",
    "date": {
      "__type": "Date",
      "value": "2026-05-24T06:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U12 et U13 (Benjamins 1, Benjamins 2)",
    "lieu": "Avignon",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.499Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.499Z"
    }
  },
  {
    "id": "cmps1dusw000l2k38t4axzrdm",
    "title": "Championnats de France U18",
    "date": {
      "__type": "Date",
      "value": "2026-05-25T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-05-30T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U18 (Juniors Compétition)",
    "lieu": "Châlon-sur-Saône",
    "type": "competition",
    "groupeId": "cmozpevxr000hh438hawolnkp",
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.504Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.504Z"
    }
  },
  {
    "id": "cmps1dut1000m2k385bro6a4c",
    "title": "Championnat départemental U11 et",
    "date": {
      "__type": "Date",
      "value": "2026-05-31T06:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U11 et - (Avenirs 1, Avenirs 2, Avenirs 3)",
    "lieu": "Orange",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#15803d",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.509Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.509Z"
    }
  },
  {
    "id": "cmps1dut6000n2k381fp3jaip",
    "title": "Championnats régionaux des Maîtres",
    "date": {
      "__type": "Date",
      "value": "2026-05-31T06:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : ? Maîtres (Adultes Compétition)",
    "lieu": "Toulon",
    "type": "competition",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.514Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.514Z"
    }
  },
  {
    "id": "cmps1duta000o2k38zk0s6het",
    "title": "Vaucluse OPEN",
    "date": {
      "__type": "Date",
      "value": "2026-06-06T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-06-07T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U12 et +, Maîtres (Adultes Compétition, Benjamins 1, Benjamins 2, Juniors Compétition, Juniors Loisirs)",
    "lieu": "Carpentras",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.518Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.518Z"
    }
  },
  {
    "id": "cmps1dutf000p2k38nwymrz0x",
    "title": "Finale départementale U11 et",
    "date": {
      "__type": "Date",
      "value": "2026-06-13T06:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U11 et - (Avenirs 1, Avenirs 2, Avenirs 3)",
    "lieu": "Sorgues",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#15803d",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.524Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.524Z"
    }
  },
  {
    "id": "cmps1dutk000q2k38d3gvk3p3",
    "title": "Interclubs départementaux U12/U13 et U14/U15",
    "date": {
      "__type": "Date",
      "value": "2026-06-14T06:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U12 à U15 (Benjamins 1, Benjamins 2, Juniors Compétition)",
    "lieu": "Venelles",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.528Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.528Z"
    }
  },
  {
    "id": "cmps1duto000r2k38it92qh5v",
    "title": "Trophée U10 et U11 U10 et U11",
    "date": {
      "__type": "Date",
      "value": "2026-06-20T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-06-21T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Toutes",
    "lieu": "Inconnu",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#15803d",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.532Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.532Z"
    }
  },
  {
    "id": "cmps1dutt000s2k38uju8xtm1",
    "title": "Championnats de France Maîtres N1 Eté",
    "date": {
      "__type": "Date",
      "value": "2026-06-25T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-06-28T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Maîtres (Adultes Compétition)",
    "lieu": "Tarbes",
    "type": "competition",
    "groupeId": "cmozpevxt000ih438wzw9nhu0",
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.537Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.537Z"
    }
  },
  {
    "id": "cmps1dutz000t2k38kk7wnefg",
    "title": "Web Confrontation",
    "date": {
      "__type": "Date",
      "value": "2026-06-27T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-06-28T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U12 et U13 (Benjamins 1, Benjamins 2)",
    "lieu": "Aix en Provence",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.543Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.543Z"
    }
  },
  {
    "id": "cmps1duu4000u2k38phz7ppkw",
    "title": "Championnats de France Elites",
    "date": {
      "__type": "Date",
      "value": "2026-06-27T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-07-02T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Elites (Juniors Compétition)",
    "lieu": "Saint Etienne",
    "type": "competition",
    "groupeId": "cmozpevxr000hh438hawolnkp",
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.548Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.548Z"
    }
  },
  {
    "id": "cmps1duu8000v2k380v6dwizf",
    "title": "Web Confrontation",
    "date": {
      "__type": "Date",
      "value": "2026-07-03T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-07-05T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : U14 et + (Juniors Compétition, Benjamins 1, Benjamins 2, Adultes Compétition, Juniors Loisirs)",
    "lieu": "Martigues",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.552Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.552Z"
    }
  },
  {
    "id": "cmps1duud000w2k38paq1fcb5",
    "title": "Open d'été",
    "date": {
      "__type": "Date",
      "value": "2026-07-17T06:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-07-22T16:00:00.000Z"
    },
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Toutes",
    "lieu": "Cannet-en-Roussillon",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#15803d",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.558Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.558Z"
    }
  },
  {
    "id": "cmps1duuj000x2k38djv8yii9",
    "title": "AG Comité",
    "date": {
      "__type": "Date",
      "value": "2026-09-10T06:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Toutes",
    "lieu": "Vedène",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#15803d",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.563Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.563Z"
    }
  },
  {
    "id": "cmps1duun000y2k388z6n2ani",
    "title": "Pré Saison",
    "date": {
      "__type": "Date",
      "value": "2026-09-11T06:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : ? U12 et + (Benjamins 1, Benjamins 2, Juniors Compétition, Adultes Compétition, Juniors Loisirs)",
    "lieu": "Cavaillon",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#1d4ed8",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.568Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.568Z"
    }
  },
  {
    "id": "cmps1duut000z2k38jun9wvze",
    "title": "AG Ligue",
    "date": {
      "__type": "Date",
      "value": "2026-10-28T07:00:00.000Z"
    },
    "dateFin": null,
    "heureDebut": "08:00",
    "heureFin": "18:00",
    "description": "Compétition CD84 - Catégories : Toutes",
    "lieu": "Sorgues",
    "type": "competition",
    "groupeId": null,
    "coachId": null,
    "couleur": "#15803d",
    "pdfReglement": "/cdnatation84-reglement-sportif-programmes-competitions-2026-v06.pdf",
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.573Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-30T07:35:47.573Z"
    }
  }
]
const actualitesData = [
  {
    "id": "cmozpew85004ah438p6nrq688",
    "titre": "Inscriptions 2025-2026 ouvertes !",
    "slug": "inscriptions-2025-2026",
    "contenu": "🏊‍♂️ Les inscriptions pour la saison 2025-2026 sont officiellement ouvertes !\n\nNous sommes ravis de vous accueillir pour une nouvelle saison riche en apprentissages, en compétitions et en moments de partage.\n\n## Les nouveautés de cette saison\n\n- **Nouveaux créneaux horaires** pour mieux s'adapter à vos emplois du temps\n- **Formation BNSSA** pour les nageurs confirmés souhaitant devenir surveillants de baignade\n- **Stages de perfectionnement** pendant les vacances scolaires\n- **Natation artistique** avec notre coach spécialisée\n\n## Comment s'inscrire ?\n\n1. Rendez-vous sur notre page d'inscription en ligne\n2. Remplissez le formulaire avec vos informations\n3. Fournissez un certificat médical de moins de 3 mois\n4. Choisissez votre groupe en fonction de votre niveau\n\n## Tarifs attractifs\n\nDes tarifs familiaux et des facilités de paiement sont disponibles. N'hésitez pas à nous contacter pour plus d'informations.\n\nÀ très bientôt dans l'eau ! 💙",
    "excerpt": "Rejoignez-nous pour la saison 2025-2026 ! Nouveaux créneaux, formation BNSSA et stages de perfectionnement.",
    "image": "/images/hero-background.JPG",
    "auteur": "L'équipe du Triton Club",
    "publie": true,
    "datePubli": {
      "__type": "Date",
      "value": "2025-08-15T00:00:00.000Z"
    },
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.685Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.685Z"
    }
  },
  {
    "id": "cmozpew88004bh438hbblmovz",
    "titre": "Brillants résultats au Championnat Régional",
    "slug": "resultats-championnat-regional-2025",
    "contenu": "🏆 Nos nageurs se sont illustrés lors du Championnat Régional qui s'est déroulé ce week-end à Marseille !\n\n## Podiums et performances remarquables\n\nNous sommes fiers de nos athlètes qui ont su donner le meilleur d'eux-mêmes et décrocher de magnifiques résultats :\n\n### Catégorie Benjamins\n- **3 médailles d'or** en nage libre et papillon\n- **2 médailles d'argent** en dos et brasse\n- Plusieurs records personnels battus\n\n### Catégorie Juniors\n- Qualification de 4 nageurs pour les Championnats de France\n- **1 médaille d'or** au 100m nage libre\n- **2 médailles de bronze** aux relais\n\n### Catégorie Adultes\n- Excellentes performances dans toutes les nages\n- Progression constante de nos nageurs loisir\n\n## Remerciements\n\nUn grand bravo à tous les participants, aux coachs Inna QUINSON, Cindy JOANNES et Gaël BERNARD pour leur accompagnement, et aux parents pour leur soutien indéfectible !\n\nLa prochaine échéance : les Championnats de France en décembre. Allez les Tritons ! 💪",
    "excerpt": "🏆 Nos nageurs brillent au Championnat Régional avec de nombreuses médailles et qualifications pour les France !",
    "image": "/images/hero-background.JPG",
    "auteur": "Gaël BERNARD",
    "publie": true,
    "datePubli": {
      "__type": "Date",
      "value": "2025-11-18T00:00:00.000Z"
    },
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.688Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.688Z"
    }
  },
  {
    "id": "cmozpew8b004ch438vgq71q8d",
    "titre": "Planning des vacances de la Toussaint",
    "slug": "planning-vacances-toussaint-2025",
    "contenu": "🍂 Information importante : modification des horaires pendant les vacances de la Toussaint.\n\n## Dates des vacances\n\n**Du 19 octobre au 3 novembre 2025**\n\n## Entraînements maintenus\n\nLes groupes suivants continuent leurs entraînements normalement :\n\n- **Juniors Compétition** : tous les créneaux maintenus\n- **Adultes Compétition** : planning habituel\n- **BNSSA** : jeudi 31 octobre maintenu\n\n## Entraînements annulés\n\nLes groupes suivants sont en pause pendant les vacances :\n\n- ENF 1 et 2\n- Avenirs 1, 2 et 3\n- Benjamins 1 et 2\n- Loisirs 1, 2 et 3\n- Natation Artistique\n- AquaGym\n\n## Stage de la Toussaint\n\nUn **stage de perfectionnement** est organisé du 21 au 25 octobre pour les groupes ENF, Avenirs et Benjamins.\n\n**Horaires** : 9h00 - 11h00\n**Tarif** : 80€ la semaine\n**Inscriptions** : jusqu'au 15 octobre\n\n## Reprise des cours\n\nLa reprise des entraînements pour tous les groupes est prévue le **lundi 4 novembre 2025**.\n\nPour toute question, contactez-nous à contact@tritoncavaillon.fr\n\nBonnes vacances à tous ! 🏊‍♂️",
    "excerpt": "🍂 Planning modifié pendant les vacances de la Toussaint. Stage de perfectionnement du 21 au 25 octobre.",
    "image": "/images/hero-background.JPG",
    "auteur": "Baptiste BUTTIGIEG",
    "publie": true,
    "datePubli": {
      "__type": "Date",
      "value": "2025-10-05T00:00:00.000Z"
    },
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.691Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.691Z"
    }
  },
  {
    "id": "cmpr0r9yf00009c38brembbw2",
    "titre": "Inscription saison 2026 - 2027",
    "slug": "inscription-saison-2026-2027",
    "contenu": "Les inscriptions pour la saison sportive 2026 - 2027 sont officiellement ouvertes ! Que vous soyez nageur débutant (ENF), avenirs, compétiteur ou passionné de natation artistique et d'aquagym, rejoignez le Triton Club Cavaillon pour vivre une saison inoubliable.\n\nRetrouvez toutes les formalités d'adhésion, les tarifs par groupe, les documents médicaux nécessaires et les plannings d'entraînements.\n\n[👉 Accéder à la page d'inscription et de tarification](/inscription)",
    "excerpt": "Les inscriptions pour la saison 2026 - 2027 sont ouvertes. Retrouvez toutes les informations de la nouvelle saison.",
    "image": "/wp-content/uploads/2021/01/cropped-logo-2020-290x130-1.png",
    "auteur": "Club",
    "publie": true,
    "datePubli": {
      "__type": "Date",
      "value": "2026-05-29T14:30:27.866Z"
    },
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-29T14:30:27.879Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-29T14:30:27.879Z"
    }
  },
  {
    "id": "cmpr18l8j0000x438cfah46tc",
    "titre": "Inscriptions saison 2026 - 2027 ouvertes !",
    "slug": "inscriptions-saison-2026-2027",
    "contenu": "🏊‍♂️ Les inscriptions pour la saison 2026-2027 sont officiellement ouvertes !\n\nNous sommes ravis de vous accueillir pour une nouvelle saison riche en apprentissages, en compétitions et en moments de partage au Triton Club Cavaillon.\n\n**Attention - Changement de plateforme :** Pour cette nouvelle saison, le club change de plateforme d'inscription. Toutes les démarches s'effectuent désormais en ligne sur la plateforme **MonClub** (et non plus Swim-Community).\n\n## Comment s'inscrire ?\n\n1. Consultez notre [page dédiée aux inscriptions](/inscription) pour prendre connaissance de toutes les modalités, tarifs, dates des tests de niveau et pièces à fournir.\n2. Accédez à la plateforme d'inscription : [S'inscrire sur MonClub](https://monclub.fr).\n3. Remplissez le formulaire en ligne, répondez au Questionnaire de Santé obligatoire, et téléversez votre certificat médical si nécessaire.\n4. Effectuez votre paiement sécurisé directement en ligne par Carte Bancaire (paiement possible en 1 ou 3 fois sans frais).\n\n## Groupes et horaires\n\nRetrouvez la répartition détaillée des groupes par année de naissance et le planning d'entraînement sur la page d'inscription.\n\n*Rappel important : pour tous les nouveaux adhérents (sections ENF, Avenirs, Artistique et Compétitions), un test de niveau obligatoire est requis pour l'affectation finale aux groupes. Les tests auront lieu le mercredi 16 septembre et le vendredi 18 septembre 2026 à la Piscine couverte Alphonse Roudière (Avenue Jean Moulin, quartier La Clède, 84300 Cavaillon).*\n\n## Les points forts de notre offre\n\n- **École de Natation (ENF & Avenirs)** pour l'apprentissage et le perfectionnement.\n- **Section Natation Artistique** avec des entraînements spécialisés.\n- **Formation au BNSSA** pour devenir sauveteur qualifié (places limitées).\n- **Remises Famille Nombreuse** (30 € à partir du deuxième membre inscrit).\n- **Dispositif Pass'Sport** de l'État accepté (avoir de 70 €).\n- **Remboursement de 20 €** pour l'engagement des parents et nageurs en tant qu'Officiel Chronométreur.\n\n[Consulter les tarifs, plannings et s'inscrire en ligne sur MonClub](/inscription) 💙",
    "excerpt": "🏊‍♂️ Les inscriptions pour la saison 2026-2027 sont ouvertes sur la nouvelle plateforme MonClub ! Tarifs, plannings, tests de niveau et inscription en ligne.",
    "image": "/images/hero-background.JPG",
    "auteur": "L'équipe du Triton Club",
    "publie": true,
    "datePubli": {
      "__type": "Date",
      "value": "2026-05-29T14:53:32.814Z"
    },
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-29T14:43:55.652Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-29T14:53:33.046Z"
    }
  }
]
const eventsData: any[] = []
const rotatingEventsData: any[] = []
const replacementsData: any[] = []
const inscriptionsData: any[] = []
const facturesData: any[] = []
const seancesData: any[] = []
const reservationsData: any[] = []
const albumsData: any[] = []
const mediasData: any[] = []
const facturesCoachData = [
  {
    "id": "cmpntedx3000h7438j6v88v5i",
    "numero": "FACT-CJ27-1B0Z-05-2026",
    "coachId": "cmozpevwd0001h438mmoz1b0z",
    "mois": 5,
    "annee": 2026,
    "montantTotal": 40,
    "tauxHoraire": 30,
    "statut": "payee",
    "pdfPath": null,
    "dateGeneration": null,
    "dateEnvoi": null,
    "datePaiement": {
      "__type": "Date",
      "value": "2026-05-27T09:10:26.766Z"
    },
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:41:10.647Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T09:10:26.838Z"
    }
  },
  {
    "id": "cmpntedvq000f7438jf7no2bc",
    "numero": "FACT-JP27-IMGN-05-2026",
    "coachId": "cmozpevww0009h4383lkiimgn",
    "mois": 5,
    "annee": 2026,
    "montantTotal": 1360,
    "tauxHoraire": 30,
    "statut": "payee",
    "pdfPath": "/uploads/factures/facture-cmpntedvq000f7438jf7no2bc.pdf",
    "dateGeneration": null,
    "dateEnvoi": null,
    "datePaiement": {
      "__type": "Date",
      "value": "2026-05-27T09:10:34.677Z"
    },
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:41:10.598Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T19:31:56.336Z"
    }
  }
]
const lignesFactureCoachData = [
  {
    "id": "cmpntedw9000g7438h2lh8994",
    "factureId": "cmpntedvq000f7438jf7no2bc",
    "type": "remplacement",
    "date": {
      "__type": "Date",
      "value": "2026-05-22T00:00:00.000Z"
    },
    "description": "Remplacement de Cindy JOANNES - Ecole de natation française (ENF 2) - 22/05/2026 (2h)",
    "heures": 2,
    "demiJournees": null,
    "montantFixe": null,
    "lieu": null,
    "groupe": "Ecole de natation française (ENF 2)",
    "coachRemplaceId": "cmozpevwd0001h438mmoz1b0z",
    "montant": 60,
    "ordre": 0,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:41:10.617Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:41:10.617Z"
    }
  },
  {
    "id": "cmpntedxb000i74386bgb4ue2",
    "factureId": "cmpntedx3000h7438j6v88v5i",
    "type": "absence",
    "date": {
      "__type": "Date",
      "value": "2026-05-22T00:00:00.000Z"
    },
    "description": "Remplacé(e) par Julie PETRELLA - Ecole de natation française (ENF 2) - 22/05/2026 (2h)",
    "heures": -2,
    "demiJournees": null,
    "montantFixe": null,
    "lieu": null,
    "groupe": "Ecole de natation française (ENF 2)",
    "coachRemplaceId": null,
    "montant": -60,
    "ordre": 0,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:41:10.655Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:41:10.655Z"
    }
  },
  {
    "id": "cmpnteysh000j743883oigzyo",
    "factureId": "cmpntedvq000f7438jf7no2bc",
    "type": "competition",
    "date": {
      "__type": "Date",
      "value": "2026-05-30T00:00:00.000Z"
    },
    "description": "Compétition nice - Juniors - 30/05/2026 (2 demi-journées)",
    "heures": 2,
    "demiJournees": 2,
    "montantFixe": null,
    "lieu": "nice",
    "groupe": null,
    "coachRemplaceId": null,
    "montant": 100,
    "ordre": 0,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:41:37.698Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:41:37.698Z"
    }
  },
  {
    "id": "cmpnu10ub00001w383wlsbpbr",
    "factureId": "cmpntedx3000h7438j6v88v5i",
    "type": "competition",
    "date": {
      "__type": "Date",
      "value": "2026-05-03T00:00:00.000Z"
    },
    "description": "Compétition Championnat départemental U11 et - (Vedène) - Avenirs, Adultes - 03/05/2026 (2 demi-journées)",
    "heures": 2,
    "demiJournees": 2,
    "montantFixe": null,
    "lieu": "Championnat départemental U11 et - (Vedène)",
    "groupe": null,
    "coachRemplaceId": null,
    "montant": 100,
    "ordre": 0,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:58:46.787Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:58:46.787Z"
    }
  }
]
const vacancesData = [
  {
    "id": "cmozpewao004eh438znhfpqpv",
    "nom": "Vacances de la Toussaint 2025",
    "description": "Vacances de la Toussaint - Zone B",
    "dateDebut": {
      "__type": "Date",
      "value": "2025-10-19T00:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2025-11-02T00:00:00.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#F4511E",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.776Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.776Z"
    }
  },
  {
    "id": "cmozpewaw004ih438ptkxzsf7",
    "nom": "Vacances d'été 2026",
    "description": "Vacances d'été - Zone B",
    "dateDebut": {
      "__type": "Date",
      "value": "2026-07-04T00:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-08-31T00:00:00.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#FB8C00",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.784Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.784Z"
    }
  },
  {
    "id": "cmpln4zfx00010s384vhy62za",
    "nom": "Vacances de la Toussaint",
    "description": "Zone B – Aix-Marseille (saison 2026-2027)",
    "dateDebut": {
      "__type": "Date",
      "value": "2026-10-17T22:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-11-02T22:59:59.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#ea580c",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-25T20:10:21.933Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-25T20:10:21.933Z"
    }
  },
  {
    "id": "cmpnt2d8p00037438gaqpqjhe",
    "nom": "Pont de l'Ascension",
    "description": "Zone B – Aix-Marseille (saison 2026-2027)",
    "dateDebut": {
      "__type": "Date",
      "value": "2027-05-06T22:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2027-05-07T21:59:59.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#dc2626",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:31:49.897Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:31:49.897Z"
    }
  },
  {
    "id": "cmpnt2d8w00047438svxliymn",
    "nom": "Début des Vacances d'Été",
    "description": "Zone B – Aix-Marseille (saison 2026-2027)",
    "dateDebut": {
      "__type": "Date",
      "value": "2027-07-03T22:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2027-07-03T21:59:59.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#dc2626",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:31:49.904Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:31:49.904Z"
    }
  },
  {
    "id": "cmpnt51yk00057438ulx1qcvg",
    "nom": "Vacances de Noël",
    "description": "Zone B – Aix-Marseille (saison 2026-2027)",
    "dateDebut": {
      "__type": "Date",
      "value": "2026-12-19T23:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2027-01-04T22:59:59.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#dc2626",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:33:55.244Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:33:55.244Z"
    }
  },
  {
    "id": "cmpnt51ze00067438yy2261z3",
    "nom": "Vacances d'Hiver",
    "description": "Zone B – Aix-Marseille (saison 2026-2027)",
    "dateDebut": {
      "__type": "Date",
      "value": "2027-02-20T23:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2027-03-08T22:59:59.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#7c3aed",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:33:55.274Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:33:55.274Z"
    }
  },
  {
    "id": "cmpnt520f00077438z09gqc3r",
    "nom": "Vacances de Printemps",
    "description": "Zone B – Aix-Marseille (saison 2026-2027)",
    "dateDebut": {
      "__type": "Date",
      "value": "2027-04-17T22:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2027-05-03T21:59:59.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#16a34a",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:33:55.311Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:33:55.311Z"
    }
  },
  {
    "id": "cmpnt5wf000087438v7hf7cav",
    "nom": "Vacances de la Toussaint",
    "description": "Zone B – Aix-Marseille (saison 2025-2026)",
    "dateDebut": {
      "__type": "Date",
      "value": "2025-10-18T22:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2025-11-03T22:59:59.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#ea580c",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:34:34.716Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:34:34.716Z"
    }
  },
  {
    "id": "cmpnt5wgz000a7438nsinhmwn",
    "nom": "Vacances d'Hiver",
    "description": "Zone B – Aix-Marseille (saison 2025-2026)",
    "dateDebut": {
      "__type": "Date",
      "value": "2026-02-14T23:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-03-02T22:59:59.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#7c3aed",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:34:34.787Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:34:34.787Z"
    }
  },
  {
    "id": "cmpnt5wh6000b743846ofetzr",
    "nom": "Vacances de Printemps",
    "description": "Zone B – Aix-Marseille (saison 2025-2026)",
    "dateDebut": {
      "__type": "Date",
      "value": "2026-04-11T22:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-04-27T21:59:59.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#16a34a",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:34:34.794Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:34:34.794Z"
    }
  },
  {
    "id": "cmpnt5wha000c7438u4ygz6ta",
    "nom": "Pont de l'Ascension",
    "description": "Zone B – Aix-Marseille (saison 2025-2026)",
    "dateDebut": {
      "__type": "Date",
      "value": "2026-05-13T22:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-05-18T21:59:59.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#dc2626",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:34:34.798Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:34:34.798Z"
    }
  },
  {
    "id": "cmpnt5whi000d7438euuy8buh",
    "nom": "Vacances d'Été",
    "description": "Zone B – Aix-Marseille (saison 2025-2026)",
    "dateDebut": {
      "__type": "Date",
      "value": "2026-07-04T22:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-09-01T21:59:59.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#dc2626",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:34:34.806Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:34:34.806Z"
    }
  },
  {
    "id": "cmpnt8rzl000e7438ajum68p5",
    "nom": "Vacances de Noël",
    "description": "Zone B – Aix-Marseille (saison 2025-2026)",
    "dateDebut": {
      "__type": "Date",
      "value": "2025-12-20T23:00:00.000Z"
    },
    "dateFin": {
      "__type": "Date",
      "value": "2026-01-05T22:59:59.000Z"
    },
    "type": "vacances",
    "impacteFacturation": true,
    "actif": true,
    "couleur": "#dc2626",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-27T08:36:48.945Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-27T08:36:48.945Z"
    }
  }
]
const categoriesProduitData = [
  {
    "id": "cmozpew7h0044h438trzrue21",
    "nom": "Équipement de natation",
    "slug": "equipement-natation",
    "description": "Tout l'équipement nécessaire pour la pratique de la natation",
    "image": null,
    "ordre": 1,
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.661Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.661Z"
    }
  },
  {
    "id": "cmozpew7k0045h438hp3xxqn7",
    "nom": "Textile & Maillots",
    "slug": "textile-maillots",
    "description": "Maillots de bain, combinaisons et textile technique",
    "image": null,
    "ordre": 2,
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.664Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.664Z"
    }
  },
  {
    "id": "cmozpew7m0046h438dsunv8py",
    "nom": "Accessoires",
    "slug": "accessoires",
    "description": "Bonnets, lunettes, serviettes et autres accessoires",
    "image": null,
    "ordre": 3,
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.666Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.666Z"
    }
  },
  {
    "id": "cmozpew7o0047h438aaha1e2b",
    "nom": "Boutique du club",
    "slug": "boutique-club",
    "description": "Articles aux couleurs du Triton Club Cavaillon",
    "image": null,
    "ordre": 4,
    "actif": true,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.668Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.668Z"
    }
  }
]
const produitsData = [
  {
    "id": "cmozpew7z0049h438cblbzc4b",
    "nom": "Casquette Triton Club",
    "slug": "casquette-triton-club",
    "description": "Casquette réglable avec logo brodé, protection solaire.",
    "descriptionCourte": "Casquette du club",
    "prix": 15,
    "prixAchat": 0,
    "tauxTVA": 20,
    "prixPromo": null,
    "enPromo": false,
    "stock": 35,
    "gererStock": true,
    "stockIllimite": false,
    "image": null,
    "images": null,
    "categorieId": "cmozpew7o0047h438aaha1e2b",
    "tailles": null,
    "couleurs": "[\"Bleu\", \"Blanc\"]",
    "poids": null,
    "metaTitle": null,
    "metaDescription": null,
    "actif": true,
    "enVedette": false,
    "ordre": 0,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.679Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.679Z"
    }
  },
  {
    "id": "cmozpew7s0048h438bxotnqph",
    "nom": "Plaquettes de natation FINIS",
    "slug": "plaquettes-natation-finis",
    "description": "Plaquettes ergonomiques pour améliorer la technique de nage et renforcer le haut du corps.",
    "descriptionCourte": "Plaquettes pour renforcement musculaire",
    "prix": 18.9,
    "prixAchat": 0,
    "tauxTVA": 20,
    "prixPromo": null,
    "enPromo": false,
    "stock": 25,
    "gererStock": true,
    "stockIllimite": false,
    "image": "/images/produits/plaquettes-finis.jpg",
    "images": "[\"/images/produits/plaquettes-finis-1.jpg\",\"/images/produits/plaquettes-finis-2.jpg\"]",
    "categorieId": "cmozpew7h0044h438trzrue21",
    "tailles": "[\"S\", \"M\", \"L\"]",
    "couleurs": null,
    "poids": null,
    "metaTitle": null,
    "metaDescription": null,
    "actif": true,
    "enVedette": false,
    "ordre": 0,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-10T11:43:07.672Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-28T19:16:49.831Z"
    }
  }
]
const variantesProduitData: any[] = []
const commandesData = [
  {
    "id": "cmppvjom000008w38il7h6mr2",
    "numeroCommande": "CMD-1779995809242-OPVB4FIM8",
    "email": "romain.gaffiero@gmail.com",
    "prenom": "Romain",
    "nom": "Gaffiero",
    "telephone": null,
    "prenomNageur": "c",
    "nomNageur": "d",
    "adresse": null,
    "adresseComp": null,
    "codePostal": null,
    "ville": null,
    "pays": "France",
    "sousTotal": 18.9,
    "fraisLivraison": 0,
    "reduction": 0,
    "total": 18.9,
    "modePaiement": "stripe",
    "stripePaymentId": null,
    "stripeSessionId": null,
    "statutPaiement": "echoue",
    "statut": "nouvelle",
    "methodeLivraison": null,
    "numeroSuivi": null,
    "dateExpedition": null,
    "dateLivraison": null,
    "noteClient": null,
    "noteInterne": null,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-28T19:16:49.368Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-28T19:16:49.837Z"
    }
  }
]
const lignesCommandeData = [
  {
    "id": "cmppvjomo00018w38llx9gllv",
    "commandeId": "cmppvjom000008w38il7h6mr2",
    "produitId": "cmozpew7s0048h438bxotnqph",
    "varianteId": null,
    "nomProduit": "Plaquettes de natation FINIS",
    "taille": "L",
    "couleur": null,
    "image": "/images/produits/plaquettes-finis.jpg",
    "prixUnitaire": 18.9,
    "quantite": 1,
    "total": 18.9,
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-28T19:16:49.368Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-28T19:16:49.368Z"
    }
  }
]
const resetTokensData: any[] = []
const chatbotKnowledgeData = require('../chatbot_knowledge.json')
const seancesAnnuleesData = [
  {
    "id": "cmpln6t2x00070s38dwvssdt3",
    "date": {
      "__type": "Date",
      "value": "2026-05-21T00:00:00.000Z"
    },
    "motif": null,
    "planningId": null,
    "groupeId": null,
    "coachId": "cmozpevwr0007h438h7qpwdom",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-25T20:11:47.001Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-25T20:11:47.001Z"
    }
  }
]
const auditLogsData = [
  {
    "id": "cmpln6t5700080s38hjqoc3jw",
    "action": "seance_annulee.create",
    "actorId": "cmozpewai004dh438twh8g1y3",
    "actorRole": "admin",
    "targetType": "seance_annulee",
    "targetId": "cmpln6t2x00070s38dwvssdt3",
    "details": "{\"date\":\"2026-05-21T00:00:00.000Z\",\"motif\":null,\"planningId\":null,\"groupeId\":null,\"coachId\":\"cmozpevwr0007h438h7qpwdom\"}",
    "timestamp": {
      "__type": "Date",
      "value": "2026-05-25T20:11:47.084Z"
    }
  },
  {
    "id": "cmpnug7nw0000zk38lsexnjor",
    "action": "facture.workflow.update",
    "actorId": "cmozpewai004dh438twh8g1y3",
    "actorRole": "admin",
    "targetType": "FactureCoach",
    "targetId": "cmpntedx3000h7438j6v88v5i",
    "details": "{\"statut\":\"payee\"}",
    "timestamp": {
      "__type": "Date",
      "value": "2026-05-27T09:10:35.468Z"
    }
  },
  {
    "id": "cmpnug7w10001zk38qdflvxcj",
    "action": "facture.workflow.update",
    "actorId": "cmozpewai004dh438twh8g1y3",
    "actorRole": "admin",
    "targetType": "FactureCoach",
    "targetId": "cmpntedvq000f7438jf7no2bc",
    "details": "{\"statut\":\"payee\"}",
    "timestamp": {
      "__type": "Date",
      "value": "2026-05-27T09:10:35.761Z"
    }
  },
  {
    "id": "cmpognae900008038a75m9itq",
    "action": "facture.workflow.update",
    "actorId": "cmozpewai004dh438twh8g1y3",
    "actorRole": "admin",
    "targetType": "FactureCoach",
    "targetId": "cmpntedvq000f7438jf7no2bc",
    "details": "{\"statut\":\"payee\"}",
    "timestamp": {
      "__type": "Date",
      "value": "2026-05-27T19:31:57.153Z"
    }
  }
]
const chatbotSuggestionsData = [
  {
    "id": "cmplmy0yw00000s38f1lbkr7k",
    "question": "Quels sont les tarifs du club ?",
    "reponse": "Voici les tarifs des différents groupes proposés par le **Triton Club Cavaillon** pour la saison en cours :\n\n- **École de natation française (ENF 1 & ENF 2)** : **270 €** (débutants)\n- **Avenirs (1, 2 ou 3)** : **320 €**\n- **Benjamins 1** : **380 €** *(places disponibles)*\n- **Juniors Loisirs** : **300 €** *(complet)*\n- **Adultes Loisirs 1** : **350 €** *(complet)*\n- **Adultes Loisirs 2** : **350 €** *(1 place disponible)*\n- **Natation Artistique** : **400 €** *(complet)*\n- **AquaGym** : **250 €** *(3 places disponibles)*\n- **BNSSA** : **600 €** *(4 places disponibles)*\n\n*Note : Certains groupes sont complets (ex. Juniors Compétition, Adultes Compétition).*\nPour plus d’infos ou une inscription, contactez-nous via **contact@tritoncavaillon.fr** ! 😊",
    "source": "vote",
    "statut": "ignore",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-25T20:04:57.320Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-29T12:43:53.392Z"
    }
  },
  {
    "id": "cmplm7yf70000no38ub1q4u9l",
    "question": "Comment s'inscrire ?",
    "reponse": "Vous pouvez vous inscrire au **Triton Club Cavaillon** de deux manières :\n\n1. **En ligne** : Via notre formulaire de contact disponible sur le site du club.\n2. **Sur place** : Directement à la piscine municipale (Avenue Pierre de Coubertin, 84300 Cavaillon) pendant les heures d’ouverture du secrétariat.\n\n**Documents à fournir obligatoirement** :\n- Un **certificat médical** de non-contre-indication à la natation (daté de moins d’1 an pour les moins de 16 ans, sans limite pour les adultes).\n- Une **photo d’identité**.\n- Un **formulaire d’inscription complété**.\n\nN’hésitez pas à nous contacter pour toute question :\n✉ **Email** : contact@tritoncavaillon.fr\n\nBonne inscription ! 🏊‍♂️",
    "source": "vote",
    "statut": "ignore",
    "createdAt": {
      "__type": "Date",
      "value": "2026-05-25T19:44:40.963Z"
    },
    "updatedAt": {
      "__type": "Date",
      "value": "2026-05-29T12:43:53.389Z"
    }
  }
]
const emailsData: any[] = []
const transactionsData: any[] = []

async function main() {
  console.log('🌱 Nettoyage de la base de données de destination...')
  
  await prisma.transactionComptable.deleteMany()
  await prisma.emailQueue.deleteMany()
  await prisma.chatbotSuggestion.deleteMany()
  await prisma.adminAuditLog.deleteMany()
  await prisma.seanceAnnulee.deleteMany()
  await prisma.chatbotKnowledge.deleteMany()
  await prisma.passwordResetToken.deleteMany()
  await prisma.ligneCommande.deleteMany()
  await prisma.commande.deleteMany()
  await prisma.varianteProduit.deleteMany()
  await prisma.produit.deleteMany()
  await prisma.categorieProduit.deleteMany()
  await prisma.periodeVacances.deleteMany()
  await prisma.ligneFactureCoach.deleteMany()
  await prisma.factureCoach.deleteMany()
  await prisma.galerieMedia.deleteMany()
  await prisma.galerieAlbum.deleteMany()
  await prisma.reservationSeance.deleteMany()
  await prisma.seanceExceptionnelle.deleteMany()
  await prisma.facture.deleteMany()
  await prisma.inscription.deleteMany()
  await prisma.remplacement.deleteMany()
  await prisma.evenementTournant.deleteMany()
  await prisma.evenement.deleteMany()
  await prisma.actualite.deleteMany()
  await prisma.evenementCalendrier.deleteMany()
  await prisma.coachPlanning.deleteMany()
  await prisma.planning.deleteMany()
  await prisma.groupe.deleteMany()
  await prisma.coach.deleteMany()
  await prisma.user.deleteMany()
  await prisma.settings.deleteMany()

  console.log('✅ Base de données nettoyée.')

  console.log('🌱 Insertion des données...');

  if (settingsData.length > 0) await prisma.settings.createMany({ data: deserialize(settingsData) })
  if (usersData.length > 0) await prisma.user.createMany({ data: deserialize(usersData) })
  if (coachesData.length > 0) await prisma.coach.createMany({ data: deserialize(coachesData) })
  if (groupsData.length > 0) await prisma.groupe.createMany({ data: deserialize(groupsData) })
  if (planningsData.length > 0) await prisma.planning.createMany({ data: deserialize(planningsData) })
  if (coachPlanningsData.length > 0) await prisma.coachPlanning.createMany({ data: deserialize(coachPlanningsData) })
  if (calendarEventsData.length > 0) await prisma.evenementCalendrier.createMany({ data: deserialize(calendarEventsData) })
  if (actualitesData.length > 0) await prisma.actualite.createMany({ data: deserialize(actualitesData) })
  if (eventsData.length > 0) await prisma.evenement.createMany({ data: deserialize(eventsData) })
  if (rotatingEventsData.length > 0) await prisma.evenementTournant.createMany({ data: deserialize(rotatingEventsData) })
  if (replacementsData.length > 0) await prisma.remplacement.createMany({ data: deserialize(replacementsData) })
  if (inscriptionsData.length > 0) await prisma.inscription.createMany({ data: deserialize(inscriptionsData) })
  if (facturesData.length > 0) await prisma.facture.createMany({ data: deserialize(facturesData) })
  if (seancesData.length > 0) await prisma.seanceExceptionnelle.createMany({ data: deserialize(seancesData) })
  if (reservationsData.length > 0) await prisma.reservationSeance.createMany({ data: deserialize(reservationsData) })
  if (albumsData.length > 0) await prisma.galerieAlbum.createMany({ data: deserialize(albumsData) })
  if (mediasData.length > 0) await prisma.galerieMedia.createMany({ data: deserialize(mediasData) })
  if (facturesCoachData.length > 0) await prisma.factureCoach.createMany({ data: deserialize(facturesCoachData) })
  if (lignesFactureCoachData.length > 0) await prisma.ligneFactureCoach.createMany({ data: deserialize(lignesFactureCoachData) })
  if (vacancesData.length > 0) await prisma.periodeVacances.createMany({ data: deserialize(vacancesData) })
  if (categoriesProduitData.length > 0) await prisma.categorieProduit.createMany({ data: deserialize(categoriesProduitData) })
  if (produitsData.length > 0) await prisma.produit.createMany({ data: deserialize(produitsData) })
  if (variantesProduitData.length > 0) await prisma.varianteProduit.createMany({ data: deserialize(variantesProduitData) })
  if (commandesData.length > 0) await prisma.commande.createMany({ data: deserialize(commandesData) })
  if (lignesCommandeData.length > 0) await prisma.ligneCommande.createMany({ data: deserialize(lignesCommandeData) })
  if (resetTokensData.length > 0) await prisma.passwordResetToken.createMany({ data: deserialize(resetTokensData) })
  if (chatbotKnowledgeData.length > 0) await prisma.chatbotKnowledge.createMany({ data: deserialize(chatbotKnowledgeData) })
  if (seancesAnnuleesData.length > 0) await prisma.seanceAnnulee.createMany({ data: deserialize(seancesAnnuleesData) })
  if (auditLogsData.length > 0) await prisma.adminAuditLog.createMany({ data: deserialize(auditLogsData) })
  if (chatbotSuggestionsData.length > 0) await prisma.chatbotSuggestion.createMany({ data: deserialize(chatbotSuggestionsData) })
  if (emailsData.length > 0) await prisma.emailQueue.createMany({ data: deserialize(emailsData) })
  if (transactionsData.length > 0) await prisma.transactionComptable.createMany({ data: deserialize(transactionsData) })

  console.log('✅ Base de données seedée avec succès !')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
