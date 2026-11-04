/** Locale-aware formatting for numbers, measurements, dates and durations. */
import type { Locale } from './locales';

const NBSP = ' ';

const NOTE_NAMES: Readonly<Record<Locale, readonly string[]>> = {
  en: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'],
  // Romanian uses fixed-do solfège names.
  ro: ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'],
};

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Formatters {
  /** "182 Hz" */
  hz(value: number): string;
  /** "8.3" / "8,3" — one decimal at most. */
  decimal(value: number): string;
  integer(value: number): string;
  /** Note name in scientific pitch notation, localised: "F♯3" / "Fa♯3". */
  note(pitchClass: number, octave: number): string;
  /** "0:42", "12:05" */
  duration(milliseconds: number): string;
  date(timestamp: number): string;
  dateTime(timestamp: number): string;
  time(timestamp: number): string;
  /** "today", "yesterday", "3 days ago", or a date for anything older than a week. */
  relativeDay(timestamp: number, now?: number): string;
  /** "1.2 MB" */
  bytes(value: number): string;
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function createFormatters(locale: Locale): Formatters {
  const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;
  const byteFormats = units.map(
    (unit) => new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: 1 }),
  );

  return {
    hz: (value) => `${integer.format(value)}${NBSP}Hz`,
    decimal: (value) => decimal.format(value),
    integer: (value) => integer.format(value),
    note: (pitchClass, octave) => `${NOTE_NAMES[locale][pitchClass] ?? '?'}${octave}`,
    duration: (milliseconds) => {
      const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    date: (timestamp) => date.format(timestamp),
    dateTime: (timestamp) => dateTime.format(timestamp),
    time: (timestamp) => time.format(timestamp),
    relativeDay: (timestamp, now = Date.now()) => {
      const days = Math.round((startOfDay(timestamp) - startOfDay(now)) / DAY_MS);
      return days >= -6 && days <= 0 ? relative.format(days, 'day') : date.format(timestamp);
    },
    bytes: (value) => {
      let amount = Math.max(0, value);
      let index = 0;
      while (amount >= 1024 && index < units.length - 1) {
        amount /= 1024;
        index++;
      }
      return byteFormats[index]!.format(amount);
    },
  };
}
