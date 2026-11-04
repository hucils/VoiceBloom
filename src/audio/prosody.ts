/**
 * How the pitch moves over time, beyond the distribution in PitchSummary:
 * sudden breaks, and whether a recording is speech at all rather than held
 * notes or sirens. Derived from the stored pitch track alone, so it works for
 * every recording, old or new.
 */
import { semitonesBetween } from './pitchMath';
import type { PitchTrack } from './pitchTrack';

export interface ProsodySummary {
  /**
   * Sudden jumps in pitch, such as cracks or flips between registers, per
   * minute of voiced sound. Even fast intonation glides rather than jumps.
   */
  breaksPerMinute: number;
  /** Share of voiced time spent in long unbroken stretches, as in held notes and sirens (0 … 1). */
  sustainedShare: number;
}

/**
 * A change this large between neighbouring 20 ms frames is a jump, not a
 * glide: even the fastest pitch movements in speech stay below about 100
 * semitones a second, or 2 semitones per frame (Xu & Sun, 2002).
 */
const BREAK_SEMITONES = 4;
/** Big jumps can lose a frame or two to outlier removal, so look across short gaps too… */
const MAX_GAP_FRAMES = 2;
/** …with a higher bar, since the pitch can move further in that time. */
const BREAK_ACROSS_GAP_SEMITONES = 5;
/** A break needs this much voicing on either side, so onsets and stray frames do not count. */
const STEADY_SECONDS = 0.06;
/** Pitch often drops or creaks as a phrase fades out; ignore jumps this close to the end. */
const PHRASE_END_SECONDS = 0.1;
/** Speech rarely stays voiced this long without a break; held notes and sirens do. */
const SUSTAINED_SECONDS = 1.5;

export function summarizeProsody(track: PitchTrack, hopSeconds: number): ProsodySummary | null {
  // Voiced runs, as [start, end) frame indices.
  const runs: Array<[number, number]> = [];
  let runStart = -1;
  for (let i = 0; i <= track.length; i++) {
    const voiced = i < track.length && track[i] !== null;
    if (voiced && runStart === -1) runStart = i;
    if (!voiced && runStart !== -1) {
      runs.push([runStart, i]);
      runStart = -1;
    }
  }
  const voicedFrames = runs.reduce((sum, [start, end]) => sum + end - start, 0);
  if (voicedFrames === 0) return null;

  const sustainedFrames = SUSTAINED_SECONDS / hopSeconds;
  const sustained = runs.reduce((sum, [start, end]) => sum + (end - start >= sustainedFrames ? end - start : 0), 0);

  // Join runs separated by tiny gaps into stretches, then look for jumps within each.
  const stretches: number[][] = [];
  let previousEnd = -Infinity;
  for (const [start, end] of runs) {
    const frames = Array.from({ length: end - start }, (_, offset) => start + offset);
    if (start - previousEnd <= MAX_GAP_FRAMES) stretches[stretches.length - 1]!.push(...frames);
    else stretches.push(frames);
    previousEnd = end;
  }

  const steadyFrames = Math.max(1, Math.round(STEADY_SECONDS / hopSeconds));
  const endFrames = Math.round(PHRASE_END_SECONDS / hopSeconds);
  let breaks = 0;
  for (const frames of stretches) {
    for (let k = steadyFrames; k <= frames.length - steadyFrames - endFrames; k++) {
      const before = frames[k - 1]!;
      const after = frames[k]!;
      const threshold = after - before === 1 ? BREAK_SEMITONES : BREAK_ACROSS_GAP_SEMITONES;
      if (Math.abs(semitonesBetween(track[before]!, track[after]!)) >= threshold) {
        breaks++;
        k += steadyFrames - 1; // one break per jump, even if it takes a few frames to settle
      }
    }
  }

  return {
    breaksPerMinute: breaks / ((voicedFrames * hopSeconds) / 60),
    sustainedShare: sustained / voicedFrames,
  };
}
