'use client'

import { memo } from 'react'
import Image from 'next/image'
import type { Produit } from '../types'

interface ProduitRowProps {
  produit: Produit
  onEdit: (produit: Produit) => void
  onDelete: (id: string) => void
  onShowVariantes: (produit: Produit) => void
}

function ProduitRowComponent({ produit, onEdit, onDelete, onShowVariantes }: ProduitRowProps) {
  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="p-4">
        {produit.image ? (
          <Image
            src={produit.image}
            alt={produit.nom}
            width={64}
            height={64}
            className="w-16 h-16 object-cover rounded"
            unoptimized={produit.image.includes('blob.vercel-storage.com') || produit.image.startsWith('/uploads/')}
          />
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
            Pas d&apos;image
          </div>
        )}
      </td>
      <td className="p-4">
        <div className="font-medium flex items-center gap-1.5 flex-wrap">
          <span>{produit.nom}</span>
          {produit.personnalisable && (
            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded" title={`Prix flocage : ${produit.prixFlocage || 0} €`}>
              ✨ Personnalisation (+{(produit.prixFlocage || 0).toFixed(2)}€)
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">{produit.slug}</div>
      </td>
      <td className="p-4 text-gray-600">
        {produit.categorie?.nom || '-'}
      </td>
      <td className="p-4 font-mono text-xs font-semibold text-slate-550 text-right">
        {produit.prixAchat ? `${produit.prixAchat.toFixed(2)} € HT` : '0.00 € HT'}
      </td>
      <td className="p-4 text-right">
        {produit.enPromo && produit.prixPromo ? (
          <div>
            <div className="line-through text-gray-400 text-xs font-mono">
              {produit.prix.toFixed(2)} €
            </div>
            <div className="text-red-600 font-bold font-mono text-sm">
              {produit.prixPromo.toFixed(2)} € TTC
            </div>
          </div>
        ) : (
          <div className="font-bold text-slate-900 font-mono text-sm">{produit.prix.toFixed(2)} € TTC</div>
        )}
        <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
          TVA: {produit.tauxTVA || 20}%
        </div>
      </td>
      <td className="p-4 text-right">
        {(() => {
          const prixEffectiveTTC = produit.enPromo && produit.prixPromo ? produit.prixPromo : produit.prix;
          const tvaRate = produit.tauxTVA !== undefined ? produit.tauxTVA : 20;
          const prixEffectiveHT = prixEffectiveTTC / (1 + tvaRate / 100);
          const beneficeHT = prixEffectiveHT - (produit.prixAchat || 0);
          const marginHT = prixEffectiveHT > 0 ? (beneficeHT / prixEffectiveHT) * 100 : 0;
          return (
            <div className="flex flex-col items-end">
              <span className={`font-black font-mono text-sm ${beneficeHT >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {beneficeHT >= 0 ? '+' : ''}{beneficeHT.toFixed(2)} € HT
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 mt-0.5 rounded-full ${beneficeHT >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                Marge: {marginHT.toFixed(1)}%
              </span>
            </div>
          );
        })()}
      </td>
      <td className="p-4">
        {!produit.gererStock || produit.stockIllimite ? (
          <span className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-600 font-bold uppercase tracking-wider">
            Illimité
          </span>
        ) : (
          <div className="flex flex-col gap-1">
            {produit.variantes && produit.variantes.length > 0 ? (
              (() => {
                const totalStock = produit.variantes.reduce((sum, v) => sum + (v.actif ? v.stock : 0), 0);
                const lowStockVariants = produit.variantes.filter(v => v.actif && v.stock <= 5);
                return (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      {produit.variantes.length} var.
                    </span>
                    <span className={`text-sm font-bold font-mono ${totalStock === 0 ? 'text-red-650' : 'text-slate-800'}`}>
                      Total : {totalStock}
                    </span>
                    {lowStockVariants.length > 0 && (
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 w-fit" title="Certaines variantes ont un stock bas (<= 5)">
                        ⚠️ Stock bas ({lowStockVariants.length})
                      </span>
                    )}
                  </div>
                );
              })()
            ) : (
              <span
                className={`px-2 py-1 rounded text-xs font-bold font-mono border ${
                  produit.stock === 0
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : produit.stock <= 5
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}
              >
                {produit.stock === 0 ? 'RUPTURE' : `${produit.stock} DISPO.`}
              </span>
            )}
          </div>
        )}
      </td>
      <td className="p-4">
        <div className="flex flex-col gap-1">
          <span
            className={`px-2 py-1 rounded text-xs text-center ${
              produit.actif
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {produit.actif ? 'Actif' : 'Inactif'}
          </span>
          {produit.enVedette && (
            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 text-center">
              Vedette
            </span>
          )}
        </div>
      </td>
      <td className="p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onShowVariantes(produit)}
            className="text-green-600 hover:text-green-800 text-sm"
          >
            💰 Variantes
          </button>
          <button
            onClick={() => onEdit(produit)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Modifier
          </button>
          <button
            onClick={() => onDelete(produit.id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Supprimer
          </button>
        </div>
      </td>
    </tr>
  )
}

export const ProduitRow = memo(ProduitRowComponent)
