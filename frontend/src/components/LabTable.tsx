import React from 'react';
import { Activity, AlertCircle, FileText } from 'lucide-react';
import { LabReport } from '../types';

interface LabTableProps {
  labReport: LabReport;
}

export const LabTable: React.FC<LabTableProps> = ({ labReport }) => {
  const tests = labReport.tests || [];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <span>Diagnostic Test Results ({tests.length})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Parameters evaluated with reference ranges and automatic clinical flags
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3">Test Parameter</th>
              <th className="py-3 px-3">Observed Value</th>
              <th className="py-3 px-3">Unit</th>
              <th className="py-3 px-3">Reference Range</th>
              <th className="py-3 px-3">Flag / Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {tests.map((test, idx) => {
              const isBad = test.flag && test.flag !== 'normal';
              const isLowConf = test.confidence === 'low';

              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                    isBad ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                  } ${isLowConf ? 'border-l-4 border-l-amber-500' : ''}`}
                >
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 dark:text-white">{test.name}</span>
                    {isLowConf && (
                      <span className="block text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="h-3 w-3" />
                        <span>Low confidence reading - confirm with lab</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`font-bold text-base ${isBad ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                      {test.value || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-xs">{test.unit || '—'}</td>
                  <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-xs">{test.reference_range || '—'}</td>
                  <td className="py-3 px-3">
                    {test.flag ? (
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                          test.flag === 'normal'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800'
                        }`}
                      >
                        {test.flag}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {labReport.remarks && (
        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-slate-800 dark:text-slate-200">Pathologist Remarks:</strong>{' '}
            {labReport.remarks}
          </div>
        </div>
      )}
    </div>
  );
};
