import React, { useState } from 'react';
import { ExternalLink, Image as ImageIcon, ShoppingCart, AlertCircle, ShieldAlert } from 'lucide-react';
import { Card } from '../types';

interface CardViewProps {
  card: Card;
}

export const CardView: React.FC<CardViewProps> = ({ card }) => {
  const [confirmed, setConfirmed] = useState(false);

  // Security check: only allow https:// links
  const safeLinks = (card.links || []).filter((l) => l.url.startsWith('https://'));

  if (card.type === 'purchase') {
    return (
      <div className="my-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/40 p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-semibold mb-2">
          <ShoppingCart className="h-4 w-4" />
          <span>Pharmacy Search &bull; {card.medicine} {card.strength || ''}</span>
        </div>

        {/* Prescription status warnings */}
        {!card.in_prescription && (
          <div className="mb-2.5 flex items-start gap-1.5 p-2 rounded-lg bg-red-100/80 dark:bg-red-950/60 border border-red-300 dark:border-red-900 text-red-800 dark:text-red-300 text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <span>Not found in your prescription. Only buy what your doctor prescribed.</span>
          </div>
        )}

        {card.uncertain && (
          <div className="mb-2.5 flex items-start gap-1.5 p-2 rounded-lg bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs">
            <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>Not sure about this name, confirm spelling first with doctor or pharmacist.</span>
          </div>
        )}

        {/* Medicine attributes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 border-y border-sky-100 dark:border-sky-900/40 text-xs">
          {card.form && (
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Form</span>
              <span className="font-medium">{card.form}</span>
            </div>
          )}
          {card.dosage && (
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Dose</span>
              <span className="font-medium">{card.dosage}</span>
            </div>
          )}
          {card.frequency && (
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Frequency</span>
              <span className="font-medium">{card.frequency}</span>
            </div>
          )}
          {card.duration && (
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Duration</span>
              <span className="font-medium">{card.duration}</span>
            </div>
          )}
        </div>

        {/* Mandatory Confirmation Checkbox */}
        <div className="mt-3 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-snug">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 flex-shrink-0 cursor-pointer"
            />
            <span className="text-slate-700 dark:text-slate-300 select-none">
              I checked that the name, strength and form on the pharmacy page will match my prescription, and I have a valid prescription where required.
            </span>
          </label>
        </div>

        {/* Store links */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          {safeLinks.map((link, idx) => (
            confirmed ? (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[36px]"
              >
                <span>{link.store}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <button
                key={idx}
                type="button"
                disabled
                title="Tick the confirmation box above to enable links"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-medium text-xs cursor-not-allowed opacity-60 min-h-[36px]"
              >
                <span>{link.store}</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          These open each store's search page. Price and stock are shown by the store.
        </p>
      </div>
    );
  }

  // Type === 'images'
  return (
    <div className="my-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 shadow-sm">
      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold mb-2">
        <ImageIcon className="h-4 w-4" />
        <span>Reference Packaging &bull; {card.medicine} {card.strength || ''}</span>
      </div>

      <div className="flex flex-wrap gap-2 my-2">
        {safeLinks.map((link, idx) => (
          <a
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[36px]"
          >
            <span>{link.store}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-indigo-800 dark:text-indigo-300/80 leading-relaxed bg-indigo-100/50 dark:bg-indigo-900/30 p-2 rounded-md">
        Tablet and strip designs differ between manufacturers. The only safe check is the name, strength and expiry printed on your strip or box.
      </p>
    </div>
  );
};
