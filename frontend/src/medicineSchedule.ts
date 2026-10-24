import type { Medicine } from './types';

export function dailySlots(medicine: Medicine): string[] {
  const raw = (medicine.schedule_raw || '').trim().toLowerCase();
  if (/weekly|monthly|alternate|\b(prn|sos|as needed)\b/.test(raw)) return [];
  if (medicine.schedule_parsed?.length) return medicine.schedule_parsed.filter(slot => ['morning', 'afternoon', 'night'].includes(slot));
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*[-–/]\s*(\d+(?:\.\d+)?)\s*[-–/]\s*(\d+(?:\.\d+)?)(?:\s|$)/);
  if (match) return ['morning', 'afternoon', 'night'].filter((_, index) => Number(match[index + 1]) > 0);
  if (/\b(bd|bid|twice)\b/.test(raw)) return ['morning', 'night'];
  if (/\b(tid|tds|thrice)\b/.test(raw)) return ['morning', 'afternoon', 'night'];
  if (/\b(bedtime|night|hs)\b/.test(raw)) return ['night'];
  if (/\b(afternoon|lunch|noon)\b/.test(raw)) return ['afternoon'];
  if (/\b(morning|breakfast)\b/.test(raw)) return ['morning'];
  return []; // Frequency alone does not establish a time of day.
}
