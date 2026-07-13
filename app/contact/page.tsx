import ContactForm from '@/components/ContactForm'
import ChatPopup from '@/components/ChatPopup'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contactez le Triton Club Cavaillon',
}

export default function ContactPage() {
  return (
    <>
      <div className="min-h-screen pt-40 pb-28 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Contactez-nous</h1>
            <p className="text-gray-600 text-lg">
              Une question ? N&apos;hésitez pas à nous contacter ou utilisez notre assistant virtuel 💬
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div id="contact-form" className="card p-8">
              <h2 className="text-2xl font-bold mb-6">📧 Envoyez-nous un message</h2>
              <ContactForm />
            </div>

            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-xl font-bold mb-4 text-primary">📍 Coordonnées</h3>
                <div className="space-y-3 text-gray-700">
                  <div>
                    <p className="font-semibold">Triton Club Cavaillon</p>
                    <p>Piscine couverte Alphonse Roudière</p>
                    <p>Avenue Jean Moulin, quartier La Clède</p>
                    <p>84300 Cavaillon</p>
                  </div>
                  <div>
                    <p className="font-semibold">📧 Email</p>
                    <a href="mailto:contact@tritoncavaillon.fr" className="text-primary hover:underline">contact@tritoncavaillon.fr</a>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-xl font-bold mb-4 text-primary">🌐 Suivez-nous</h3>
                <div className="flex gap-4">
                  <a href="https://www.facebook.com/Triton.C.Cavaillon" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors" aria-label="Facebook">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                  </a>
                  <a href="https://www.instagram.com/tritoncavaillon" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors" aria-label="Instagram">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-xl font-bold mb-4 text-primary">📍 Localisation</h3>
                <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                  <iframe src="https://www.google.com/maps?q=Piscine+couverte+Alphonse+Roudiere+Cavaillon&output=embed" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Localisation Triton Club Cavaillon" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <ChatPopup />
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/95 backdrop-blur border border-gray-200 shadow-lg p-2">
          <a href="mailto:contact@tritoncavaillon.fr" className="text-center py-2 rounded-lg bg-gray-100 text-sm font-semibold text-gray-800">✉️ Email</a>
          <a href="https://www.google.com/maps/dir/?api=1&destination=Piscine+couverte+Alphonse+Roudiere+Cavaillon" target="_blank" rel="noopener noreferrer" className="text-center py-2 rounded-lg bg-primary text-sm font-semibold text-white">📍 Itinéraire</a>
        </div>
      </div>
    </>
  )
}
