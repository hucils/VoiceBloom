/**
 * Conversions between frequency (Hz), the semitone scale and note names.
 * Pure functions — no browser APIs.
 */

const A4_HZ = 440;
const A4_MIDI = 69;

/** Continuous MIDI note number (A4 = 69). */
export function hzToMidi(hz: number): number {
  return A4_MIDI + 12 * Math.log2(hz / A4_HZ);
}

export function midiToHz(midi: number): number {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12);
}

/** Signed distance from `fromHz` to `toHz` in semitones. */
export function semitonesBetween(fromHz: number, toHz: number): number {
  return 12 * Math.log2(toHz / fromHz);
}

/** Signed distance from `fromHz` to `toHz` in cents (1/100 semitone). */
export function centsBetween(fromHz: number, toHz: number): number {
  return 1200 * Math.log2(toHz / fromHz);
}

export interface NotePosition {
  /** 0 = C, 1 = C♯ … 11 = B */
  pitchClass: number;
  /** Scientific pitch notation octave (middle C = C4). */
  octave: number;
  /** Deviation from the nearest equal-tempered note, in the range [-50, 50). */
  cents: number;
  /** Nearest MIDI note number. */
  midi: number;
}

export function hzToNote(hz: number): NotePosition | null {
  if (!Number.isFinite(hz) || hz <= 0) return null;
  const exact = hzToMidi(hz);
  const midi = Math.round(exact);
  const pitchClass = ((midi % 12) + 12) % 12;
  return {
    pitchClass,
    octave: Math.floor(midi / 12) - 1,
    cents: Math.round((exact - midi) * 100),
    midi,
  };
}
