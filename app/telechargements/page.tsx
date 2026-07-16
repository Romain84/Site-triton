import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Téléchargements',
  description: 'Documents et formulaires du Triton Club Cavaillon',
}

export default function TelechargementPage() {
  const documents = [
    {
      category: 'Documents administratifs',
      files: [
        {
          id: 1,
          nom: 'Règlement intérieur 2025-2026',
          description: 'Règles de vie et fonctionnement du club',
          url: '/documents/reglement-interieur.pdf',
          size: '245 KB',
        },
        {
          id: 2,
          nom: 'Statuts de l\'association',
          description: 'Statuts officiels du Triton Club Cavaillon',
          url: '/documents/statuts.pdf',
          size: '180 KB',
        },
        {
          id: 3,
          nom: 'Calendrier de la saison 2025-2026',
          description: 'Dates importantes, vacances et compétitions',
          url: '/documents/calendrier-saison.pdf',
          size: '320 KB',
        },
      ],
    },
    {
      category: 'Formulaires d\'inscription',
      files: [
        {
          id: 4,
          nom: 'Formulaire de licence FFN',
          description: 'À remplir pour toute nouvelle inscription',
          url: '/documents/formulaire-licence.pdf',
          size: '150 KB',
        },
        {
          id: 5,
          nom: 'Questionnaire de santé',
          description: 'Obligatoire pour tous les adhérents',
          url: '/documents/questionnaire-sante.pdf',
          size: '95 KB',
        },
        {
          id: 6,
          nom: 'Autorisation parentale',
          description: 'Pour les mineurs participant aux compétitions',
          url: '/documents/autorisation-parentale.pdf',
          size: '75 KB',
        },
        {
          id: 7,
          nom: 'Droit à l\'image',
          description: 'Autorisation pour la prise de photos/vidéos',
          url: '/documents/droit-image.pdf',
          size: '80 KB',
        },
      ],
    },
    {
      category: 'Guides et informations',
      files: [
        {
          id: 8,
          nom: 'Guide des groupes et niveaux',
          description: 'Descriptif des différents groupes de natation',
          url: '/documents/guide-groupes.pdf',
          size: '420 KB',
        },
        {
          id: 9,
          nom: 'Équipement requis',
          description: 'Liste du matériel nécessaire par groupe',
          url: '/documents/equipement.pdf',
          size: '125 KB',
        },
        {
          id: 10,
          nom: 'Guide du nageur compétiteur',
          description: 'Informations pour les nageurs en compétition',
          url: '/documents/guide-competition.pdf',
          size: '280 KB',
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen pt-40 pb-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Téléchargements</h1>
          <p className="text-gray-600 text-lg">
            Documents et formulaires officiels du club
          </p>
        </div>

        {/* Info message */}
        <div className="card p-6 mb-12 bg-primary/10 border-l-4 border-primary">
          <p className="text-slate-800">
            📄 <strong>Important :</strong> Ces documents sont fournis à titre indicatif. Les versions officielles seront disponibles sur la plateforme MonClub lors de votre inscription.
          </p>
        </div>

        {/* Documents sections */}
        <div className="space-y-12">
          {documents.map((section) => (
            <div key={section.category}>
              <h2 className="text-2xl font-bold mb-6 text-primary">{section.category}</h2>
              <div className="space-y-4">
                {section.files.map((file) => (
                  <div
                    key={file.id}
                    className="card p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {/* PDF Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-red-600"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8v-2zm0-4h8v2H8v-2zm0-4h5v2H8V7z" />
                          </svg>
                        </div>
                      </div>

                      {/* File info */}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{file.nom}</h3>
                        <p className="text-gray-600 text-sm mb-2">{file.description}</p>
                        <p className="text-xs text-gray-500">Taille : {file.size}</p>
                      </div>

                      {/* Download button */}
                      <div className="flex-shrink-0">
                        <a
                          href={file.url}
                          download
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          <span className="hidden sm:inline">Télécharger</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Help section */}
        <div className="card p-6 mt-12 bg-yellow-50 border-l-4 border-yellow-500">
          <h3 className="font-bold text-lg mb-2 text-yellow-800">💡 Besoin d&apos;aide ?</h3>
          <p className="text-yellow-700">
            Si vous rencontrez des difficultés pour télécharger ou remplir ces documents,
            n&apos;hésitez pas à nous contacter par email à{' '}
            <a href="mailto:tritoncavaillon@gmail.com" className="underline font-semibold">
              tritoncavaillon@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
