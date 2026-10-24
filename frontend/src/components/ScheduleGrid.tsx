import React from 'react';
import { Calendar, Clock, AlertTriangle, Info, Utensils } from 'lucide-react';
import { ScheduleRow } from '../types';

interface ScheduleGridProps {
  schedule: ScheduleRow[];
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({ schedule }) => {
  if (!schedule || schedule.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <span>Daily Dosing Schedule</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Software-computed schedule from doctor's frequency and directions
          </p>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3">Medicine</th>
              <th className="py-3 px-2 text-center">Morning<br /><span className="text-[10px] normal-case text-slate-400">08:00</span></th>
              <th className="py-3 px-2 text-center">Afternoon<br /><span className="text-[10px] normal-case text-slate-400">14:00</span></th>
              <th className="py-3 px-2 text-center">Evening<br /><span className="text-[10px] normal-case text-slate-400">18:00</span></th>
              <th className="py-3 px-2 text-center">Night<br /><span className="text-[10px] normal-case text-slate-400">21:00</span></th>
              <th className="py-3 px-3">Relation to Food</th>
              <th className="py-3 px-3">Duration &amp; End Date</th>
              <th className="py-3 px-3">Approx. to Buy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {schedule.map((row) => {
              return (
                <tr
                  key={row.index}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                    !row.parsed ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                  }`}
                >
                  <td className="py-3.5 px-3">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {row.name}
                    </div>
                    {row.strength && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">{row.strength}</div>
                    )}
                    {!row.parsed && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Could not understand '{row.frequency_raw}'. Confirm with your doctor.</span>
                      </div>
                    )}
                    {(row.assumed_times || row.qty_assumed) && (
                      <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        <span>
                          {row.assumed_times && `Times assumed from '${row.frequency_raw || 'OD'}'. `}
                          {row.qty_assumed && 'Quantity estimated from typical course.'}
                        </span>
                      </div>
                    )}
                  </td>

                  {row.as_needed ? (
                    <td colSpan={4} className="py-3.5 px-2 text-center">
                      <span className="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold text-xs border border-amber-300 dark:border-amber-800">
                        As needed (SOS)
                      </span>
                    </td>
                  ) : (
                    <>
                      <td className="py-3.5 px-2 text-center">
                        <SlotBadge value={row.slots?.morning} />
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <SlotBadge value={row.slots?.afternoon} />
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <SlotBadge value={row.slots?.evening} />
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <SlotBadge value={row.slots?.night} />
                      </td>
                    </>
                  )}

                  <td className="py-3.5 px-3">
                    {row.food ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <Utensils className="h-3 w-3 text-brand-500" />
                        {row.food}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-xs">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {row.duration_days ? `${row.duration_days} days` : row.duration_raw || '—'}
                    </div>
                    {row.end_date && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        <span>Ends {row.end_date}</span>
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-3">
                    {row.total_units ? (
                      <span className="font-bold text-brand-600 dark:text-brand-400 text-xs sm:text-sm">
                        ~{row.total_units} {row.unit || 'units'}
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

      {/* Mobile Card-Based Grid View */}
      <div className="lg:hidden space-y-3">
        {schedule.map((row) => (
          <div
            key={row.index}
            className={`rounded-xl border p-3.5 ${
              !row.parsed
                ? 'border-red-300 dark:border-red-900/70 bg-red-50/50 dark:bg-red-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  {row.name} {row.strength && <span className="font-normal text-slate-500">({row.strength})</span>}
                </h4>
                {row.food && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-brand-600 dark:text-brand-400">
                    <Utensils className="h-3 w-3" />
                    {row.food}
                  </span>
                )}
              </div>
              {row.total_units && (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  ~{row.total_units} {row.unit || 'units'}
                </span>
              )}
            </div>

            {!row.parsed && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1 bg-red-100/70 dark:bg-red-900/40 p-1.5 rounded">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Could not understand '{row.frequency_raw}'. Confirm with your doctor.</span>
              </div>
            )}

            {/* Slots timeline */}
            {row.as_needed ? (
              <div className="mt-3 py-1.5 text-center bg-amber-50 dark:bg-amber-950/40 rounded-lg text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                As needed (SOS)
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-4 gap-1 text-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Morning</span>
                  <SlotBadge value={row.slots?.morning} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Afternoon</span>
                  <SlotBadge value={row.slots?.afternoon} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Evening</span>
                  <SlotBadge value={row.slots?.evening} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Night</span>
                  <SlotBadge value={row.slots?.night} />
                </div>
              </div>
            )}

            {(row.assumed_times || row.qty_assumed) && (
              <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Info className="h-3 w-3 flex-shrink-0" />
                <span>
                  {row.assumed_times && `Times assumed from '${row.frequency_raw || 'OD'}'. `}
                  {row.qty_assumed && 'Approx quantity estimated.'}
                </span>
              </p>
            )}

            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span>Duration: {row.duration_days ? `${row.duration_days} days` : row.duration_raw || '—'}</span>
              {row.end_date && <span>Ends: {row.end_date}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function SlotBadge({ value }: { value?: string }) {
  if (!value || value === '0') {
    return <span className="text-slate-300 dark:text-slate-700 font-mono">—</span>;
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
      {value}
    </span>
  );
}
