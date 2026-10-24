import { ScheduleRow } from '../types';

interface SlotTime {
  hour: number;
  minute: number;
  label: string;
}

const DEFAULT_SLOTS: Record<string, SlotTime> = {
  morning: { hour: 8, minute: 0, label: 'Morning' },
  afternoon: { hour: 14, minute: 0, label: 'Afternoon' },
  evening: { hour: 18, minute: 0, label: 'Evening' },
  night: { hour: 21, minute: 0, label: 'Night' },
};

function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('T')[0];
}

export function generateIcsReminders(schedule: ScheduleRow[]): string {
  const now = new Date();
  const dtstamp = formatIcsDateTime(now);
  const events: string[] = [];

  schedule.forEach((row, rowIdx) => {
    // Skip as_needed (SOS) or unparsed rows
    if (row.as_needed || !row.parsed) return;

    const slots = row.slots;
    if (!slots) return;

    // Determine end date / duration
    let untilDate: Date;
    if (row.end_date) {
      untilDate = new Date(row.end_date);
      untilDate.setHours(23, 59, 59, 999);
    } else {
      const days = row.duration_days || 5;
      untilDate = new Date(now);
      untilDate.setDate(untilDate.getDate() + days);
      untilDate.setHours(23, 59, 59, 999);
    }

    const untilStr = formatIcsDate(untilDate) + 'T235959Z';

    // For each slot that has a quantity
    const slotKeys: Array<keyof typeof DEFAULT_SLOTS> = ['morning', 'afternoon', 'evening', 'night'];
    slotKeys.forEach((slotKey) => {
      const qty = slots[slotKey];
      if (!qty || qty === '0') return;

      const slotConfig = DEFAULT_SLOTS[slotKey];
      const start = new Date(now);
      start.setHours(slotConfig.hour, slotConfig.minute, 0, 0);

      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 15); // 15-minute event

      const uid = `medipilot-${Date.now()}-${rowIdx}-${slotKey}@healthcare-copilot.app`;
      const title = `Take ${row.name} ${row.strength || ''} (${qty} ${row.unit || row.form || 'dose'})`.trim();
      const foodNote = row.food ? `Relation to food: ${row.food}. ` : '';
      const description = `${title}. ${foodNote}Scheduled for ${slotConfig.label}. Please confirm with your doctor.`;

      events.push(
        [
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART:${formatIcsDateTime(start)}`,
          `DTEND:${formatIcsDateTime(end)}`,
          `RRULE:FREQ=DAILY;UNTIL=${untilStr}`,
          `SUMMARY:${title}`,
          `DESCRIPTION:${description}`,
          'BEGIN:VALARM',
          'TRIGGER:-PT5M',
          'ACTION:DISPLAY',
          `DESCRIPTION:${title}`,
          'END:VALARM',
          'END:VEVENT',
        ].join('\r\n')
      );
    });
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Healthcare Copilot//Medicine Reminder Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadCalendarFile(schedule: ScheduleRow[]): void {
  const icsContent = generateIcsReminders(schedule);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `medicine_reminders_${new Date().toISOString().split('T')[0]}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
