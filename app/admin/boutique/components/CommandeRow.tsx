'use client'

import { memo } from 'react'
import type { Commande } from '../types'

interface CommandeRowProps {
  commande: Commande
  onUpdateStatut: (id: string, statut: string) => void
  onShowDetails: (commande: Commande) => void
  onExportPDF?: (commande: Commande) => void
}

function CommandeRowComponent({ commande, onUpdateStatut, onShowDetails, onExportPDF }: CommandeRowProps) {
  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="p-4">
        <div className="font-medium">#{commande.numeroCommande}</div>
      </td>
      <td className="p-4">
        <div className="font-medium">
          {commande.prenom} {commande.nom}
        </div>
        <div className="text-sm text-gray-500">{commande.email}</div>
        <div className="text-sm text-blue-600 font-medium mt-1">
          🏊 {commande.prenomNageur} {commande.nomNageur}
        </div>
      </td>
      <td className="p-4 text-gray-600">
        {new Date(commande.createdAt).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </td>
      <td className="p-4">
        <div className="text-sm">
          {commande.lignes.map((ligne) => (
            <div key={ligne.id} className="mb-1">
              <span className="font-medium">{ligne.quantite}x</span>{' '}
              {ligne.produit.nom}
              {ligne.taille && (
                <span className="text-gray-500"> (Taille: {ligne.taille})</span>
              )}
              {ligne.couleur && (
                <span className="text-gray-500"> (Couleur: {ligne.couleur})</span>
              )}
              {ligne.textePersonnalise && (
                <span className="text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded text-[11px] block mt-0.5 w-fit">
                  ✍️ Personnalisation: {ligne.textePersonnalise}
                </span>
              )}
            </div>
          ))}
        </div>
      </td>
      <td className="p-4">
        <div className="font-medium">{commande.total.toFixed(2)} €</div>
      </td>
      <td className="p-4">
        <span
          className={`px-2 py-1 rounded text-xs ${
            commande.statutPaiement === 'paye'
              ? 'bg-green-100 text-green-800'
              : commande.statutPaiement === 'en_attente'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {commande.statutPaiement === 'paye'
            ? 'Payé'
            : commande.statutPaiement === 'en_attente'
            ? 'En attente'
            : 'Échoué'}
        </span>
      </td>
      <td className="p-4">
        <select
          value={commande.statut}
          onChange={(e) => onUpdateStatut(commande.id, e.target.value)}
          className={`px-2 py-1 rounded text-xs border ${
            commande.statut === 'livree'
              ? 'bg-green-50 border-green-200 text-green-800'
              : commande.statut === 'expediee'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : commande.statut === 'en_preparation'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-gray-50 border-gray-200 text-gray-800'
          }`}
        >
          <option value="en_attente">En attente</option>
          <option value="en_preparation">En préparation</option>
          <option value="expediee">Expédiée</option>
          <option value="livree">Livrée</option>
          <option value="annulee">Annulée</option>
        </select>
      </td>
      <td className="p-4">
        <div className="flex gap-2">
          <button
            onClick={() => onShowDetails(commande)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Détails
          </button>
          {onExportPDF && (
            <button
              onClick={() => onExportPDF(commande)}
              className="text-green-600 hover:text-green-800 text-sm"
              title="Télécharger PDF"
            >
              PDF
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export const CommandeRow = memo(CommandeRowComponent)
