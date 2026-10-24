import React from 'react';
import { AlertCircle, FileText, Image as ImageIcon, ShoppingCart } from 'lucide-react';
import { Medicine } from '../types';

interface MedicineCardProps {
  medicine: Medicine;
  index: number;
  onAskDetails: (medicine: Medicine) => void;
  onBuyLinks: (index: number) => void;
  onImageLinks: (index: number) => void;
}

export const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  index,
  onAskDetails,
  onBuyLinks,
  onImageLinks,
}) => {
  const isLowConfidence = medicine.confidence === 'low' || Boolean(medicine.uncertain_text);

  return (
    <div
      className={`rounded-xl border p-4 transition-all shadow-sm ${
        isLowConfidence
          ? 'border-red-300 dark:border-red-900/70 bg-red-50/60 dark:bg-red-950/30'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <span>{medicine.name || 'Unnamed Medicine'}</span>
            {medicine.strength && (
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {medicine.strength}
              </span>
            )}
          </h4>
          {medicine.form && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{medicine.form}</p>
          )}
        </div>

        {/* Confidence pill */}
        <span
          className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wide ${
            medicine.confidence === 'high'
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
              : medicine.confidence === 'medium'
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
              : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800'
          }`}
        >
          {medicine.confidence} conf
        </span>
      </div>

      {/* Uncertainty red highlight */}
      {isLowConfidence && (
        <div className="mt-2 p-2 rounded-lg bg-red-100/90 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs flex items-start gap-1.5">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span>
            {medicine.uncertain_text ? (
              <>
                Unclear: <strong className="font-semibold font-mono">"{medicine.uncertain_text}"</strong>. Confirm with doctor or pharmacist.
              </>
            ) : (
              'Low OCR confidence on this line. Confirm with doctor or pharmacist before relying on it.'
            )}
          </span>
        </div>
      )}

      {/* Details grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
        <div>
          <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase">Dose / Frequency</span>
          <span className="font-medium">
            {medicine.dosage || '1 dose'} &bull; {medicine.frequency || 'As directed'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase">Duration</span>
          <span className="font-medium">{medicine.duration || 'Not specified'}</span>
        </div>
        {medicine.instructions && (
          <div className="col-span-2">
            <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase">Instructions</span>
            <span className="font-normal text-slate-600 dark:text-slate-300">{medicine.instructions}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => onAskDetails(medicine)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[38px]"
        >
          <FileText className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          <span>Details</span>
        </button>

        <button
          type="button"
          onClick={() => onBuyLinks(index)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-medium text-xs transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 min-h-[38px]"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Buy</span>
        </button>

        <button
          type="button"
          onClick={() => onImageLinks(index)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-medium text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[38px]"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Images</span>
        </button>
      </div>
    </div>
  );
};
