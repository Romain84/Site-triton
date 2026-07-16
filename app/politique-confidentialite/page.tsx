import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité',
  description: 'Politique de confidentialité et protection des données personnelles du Triton Club Cavaillon',
}

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="min-h-screen pt-40 pb-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-5xl font-bold mb-8">Politique de Confidentialité</h1>

        <div className="card p-8 space-y-8">
          {/* Introduction */}
          <section>
            <div className="text-gray-700 space-y-3">
              <p>
                Le Triton Club Cavaillon accorde une grande importance à la protection de vos données personnelles. Cette politique de confidentialité vous informe sur la manière dont nous collectons, utilisons et protégeons vos données conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.
              </p>
            </div>
          </section>

          {/* Responsable du traitement */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">1. Responsable du traitement des données</h2>
            <div className="text-gray-700 space-y-2">
              <p><strong>Responsable :</strong> Triton Club Cavaillon</p>
              <p><strong>Adresse :</strong> Piscine Municipale, Avenue Pierre de Coubertin, 84300 Cavaillon</p>
              <p><strong>Email :</strong> <a href="mailto:tritoncavaillon@gmail.com" className="text-primary hover:underline">tritoncavaillon@gmail.com</a></p>
            </div>
          </section>

          {/* Données collectées */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">2. Données personnelles collectées</h2>
            <div className="text-gray-700 space-y-4">
              <p>Nous collectons les données personnelles suivantes :</p>

              <div>
                <h3 className="font-bold mb-2">2.1 Lors de l&apos;inscription</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Nom et prénom</li>
                  <li>Date de naissance</li>
                  <li>Adresse postale</li>
                  <li>Adresse email</li>
                  <li>Numéro de téléphone</li>
                  <li>Informations médicales nécessaires à la pratique de la natation</li>
                  <li>Certificat médical</li>
                  <li>Photographie (avec autorisation pour droit à l&apos;image)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2">2.2 Lors de l&apos;utilisation du site</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Données de connexion (adresse IP, navigateur, système d&apos;exploitation)</li>
                  <li>Données de navigation (pages visitées, durée de visite)</li>
                  <li>Cookies techniques</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2">2.3 Lors de l&apos;utilisation du formulaire de contact</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Nom et prénom</li>
                  <li>Adresse email</li>
                  <li>Numéro de téléphone (optionnel)</li>
                  <li>Contenu du message</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Finalité */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">3. Finalité du traitement</h2>
            <div className="text-gray-700 space-y-3">
              <p>Vos données personnelles sont collectées et traitées pour les finalités suivantes :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Gestion des inscriptions et des adhésions au club</li>
                <li>Gestion des cours de natation et du planning</li>
                <li>Communication des informations relatives à la vie du club (actualités, événements, compétitions)</li>
                <li>Gestion des licences FFN (Fédération Française de Natation)</li>
                <li>Envoi de newsletters (avec votre consentement)</li>
                <li>Réponse à vos demandes via le formulaire de contact</li>
                <li>Gestion administrative et comptable</li>
                <li>Respect des obligations légales</li>
              </ul>
            </div>
          </section>

          {/* Base légale */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">4. Base légale du traitement</h2>
            <div className="text-gray-700 space-y-3">
              <p>Le traitement de vos données personnelles repose sur :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>L&apos;exécution d&apos;un contrat :</strong> gestion de votre adhésion et inscription</li>
                <li><strong>Votre consentement :</strong> envoi de newsletters, droit à l&apos;image</li>
                <li><strong>L&apos;intérêt légitime :</strong> gestion de la vie associative</li>
                <li><strong>Une obligation légale :</strong> transmission des données à la FFN, obligations comptables</li>
              </ul>
            </div>
          </section>

          {/* Destinataires */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">5. Destinataires des données</h2>
            <div className="text-gray-700 space-y-3">
              <p>Vos données personnelles sont destinées :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Aux membres du bureau du Triton Club Cavaillon</li>
                <li>Aux entraîneurs et coachs du club</li>
                <li>À la Fédération Française de Natation (FFN) dans le cadre de la gestion des licences</li>
                <li>Aux prestataires techniques (hébergement du site web, plateforme MonClub)</li>
                <li>Aux organismes bancaires pour les paiements</li>
              </ul>
              <p className="mt-3">
                Vos données ne sont jamais vendues ni louées à des tiers à des fins commerciales.
              </p>
            </div>
          </section>

          {/* Durée de conservation */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">6. Durée de conservation</h2>
            <div className="text-gray-700 space-y-3">
              <p>Vos données personnelles sont conservées pendant les durées suivantes :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Données d&apos;adhésion :</strong> durée de l&apos;adhésion + 3 ans</li>
                <li><strong>Données comptables :</strong> 10 ans (obligation légale)</li>
                <li><strong>Données de contact (formulaire) :</strong> 1 an après le dernier échange</li>
                <li><strong>Newsletters :</strong> jusqu&apos;à désinscription</li>
                <li><strong>Données de connexion :</strong> 12 mois</li>
              </ul>
            </div>
          </section>

          {/* Vos droits */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">7. Vos droits</h2>
            <div className="text-gray-700 space-y-3">
              <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Droit d&apos;accès :</strong> vous pouvez demander à accéder à vos données personnelles</li>
                <li><strong>Droit de rectification :</strong> vous pouvez demander la correction de données inexactes</li>
                <li><strong>Droit à l&apos;effacement :</strong> vous pouvez demander la suppression de vos données</li>
                <li><strong>Droit à la limitation :</strong> vous pouvez demander la limitation du traitement</li>
                <li><strong>Droit à la portabilité :</strong> vous pouvez récupérer vos données dans un format structuré</li>
                <li><strong>Droit d&apos;opposition :</strong> vous pouvez vous opposer au traitement de vos données</li>
                <li><strong>Droit de retirer votre consentement :</strong> à tout moment pour les newsletters et le droit à l&apos;image</li>
              </ul>

              <p className="mt-4">
                <strong>Pour exercer vos droits, contactez-nous :</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Par email : <a href="mailto:tritoncavaillon@gmail.com" className="text-primary hover:underline">tritoncavaillon@gmail.com</a></li>
                <li>Par courrier : Triton Club Cavaillon, Piscine Municipale, Avenue Pierre de Coubertin, 84300 Cavaillon</li>
              </ul>

              <p className="mt-4">
                Vous disposez également du droit d&apos;introduire une réclamation auprès de la CNIL (Commission Nationale de l&apos;Informatique et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr</a>
              </p>
            </div>
          </section>

          {/* Sécurité */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">8. Sécurité des données</h2>
            <div className="text-gray-700 space-y-3">
              <p>
                Nous mettons en œuvre toutes les mesures techniques et organisationnelles appropriées pour protéger vos données personnelles contre la destruction accidentelle ou illicite, la perte accidentelle, l&apos;altération, la diffusion ou l&apos;accès non autorisé.
              </p>
              <p>
                Ces mesures incluent notamment :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Chiffrement des connexions (HTTPS)</li>
                <li>Authentification sécurisée</li>
                <li>Sauvegardes régulières</li>
                <li>Accès restreint aux données personnelles</li>
                <li>Formation du personnel aux bonnes pratiques RGPD</li>
              </ul>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">9. Cookies</h2>
            <div className="text-gray-700 space-y-3">
              <p>
                Notre site utilise uniquement des cookies techniques strictement nécessaires au fonctionnement du site (cookies de session pour l&apos;authentification).
              </p>
              <p>
                Vous pouvez à tout moment désactiver les cookies dans les paramètres de votre navigateur. Cela pourrait toutefois affecter certaines fonctionnalités du site.
              </p>
            </div>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">10. Modifications de la politique</h2>
            <div className="text-gray-700 space-y-3">
              <p>
                Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. Toute modification sera publiée sur cette page avec une nouvelle date de mise à jour.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-primary">11. Contact</h2>
            <div className="text-gray-700 space-y-3">
              <p>
                Pour toute question concernant cette politique de confidentialité ou le traitement de vos données personnelles, vous pouvez nous contacter :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Email : <a href="mailto:tritoncavaillon@gmail.com" className="text-primary hover:underline">tritoncavaillon@gmail.com</a></li>
                <li>Adresse : Piscine Municipale, Avenue Pierre de Coubertin, 84300 Cavaillon</li>
              </ul>
            </div>
          </section>

          {/* Date */}
          <section className="border-t pt-6">
            <p className="text-sm text-gray-600">
              <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
