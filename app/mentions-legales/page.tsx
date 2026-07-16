import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales du site Triton Club Cavaillon',
}

export default function MentionsLegalesPage() {
  const annee = new Date().getFullYear()

  return (
    <main className="min-h-screen pt-40 pb-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-4xl">
        <article className="card p-8 md:p-10 space-y-6">
          <header>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Mentions légales</h1>
            <p className="text-gray-600">Dernière mise à jour : {annee}</p>
          </header>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">Éditeur du site</h2>
            <p className="text-gray-700">Triton Club Cavaillon</p>
            <p className="text-gray-700">Siège social : Piscine Alphonse Roudière, Bd Jean Moulin, Quartier La Clède, 84300 Cavaillon</p>
            <p className="text-gray-700">RNA : W841000669 · SIREN : 448 666 065 · SIRET : 448 666 065 00017</p>
            <p className="text-gray-700">Email : tritoncavaillon@gmail.com</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">Hébergement</h2>
            <p className="text-gray-700">Le site est hébergé par un prestataire d&apos;hébergement web.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">Propriété intellectuelle</h2>
            <p className="text-gray-700">
              L&apos;ensemble des contenus (textes, images, logos) présents sur ce site est protégé par le droit d&apos;auteur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">Limitation de responsabilité</h2>
            <p className="text-gray-700">
              Le club met tout en œuvre pour assurer l&apos;exactitude des informations publiées, sans pouvoir garantir l&apos;absence totale d&apos;erreur.
            </p>
          </section>
        </article>
      </div>
    </main>
  )
}
