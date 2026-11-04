/**
 * Vocal weight: how full and buzzy, or light and soft, a voice sounds.
 *
 * Measured as H1*–H2*: the level of the first harmonic (the fundamental)
 * relative to the second, in dB. Thicker vocal folds that stay closed for
 * longer in each cycle, as in a heavier voice, put more energy into the upper
 * harmonics and lower H1–H2; thinner folds that close more gently, as in a
 * lighter voice, raise it (Hanson, 1997; Hanson & Chuang, 1999; Zhang, Zhang &
 * Kreiman, 2022). On average it is about 6 dB higher for women than for men
 * (Henton & Bladon, 1985; Klatt & Klatt, 1990).
 *
 * A formant close to a harmonic boosts it, which would make the measurement
 * depend on the vowel. Following Iseli & Alwan (2004), the boost from F1 and
 * F2, measured by LPC in the same frame, is removed from both harmonics; the
 * asterisks mark this correction. LPC's own bandwidth estimates are noisy, so
 * bandwidths are modelled from each formant's frequency (Mannell, 1998). LPC
 * places a low F1 (as in "ee" and "oo") a little too high, which leaves those
 * vowels under-corrected by up to about 3 dB.
 *
 * Like any spectral measure it is approximate. Breathiness raises it as well,
 * and microphones with weak bass (many phones and laptops) lower the first
 * harmonic of low voices. The summary uses the median over many frames.
 */
import type { FormantTrack } from './resonance';
import { median } from './stats';

export interface VoiceQualitySummary {
  /** Median corrected H1*–H2* in dB. Higher sounds lighter. */
  h1h2Db: number;
  /** Number of frames that produced a usable measurement. */
  frames: number;
}

/** Analysis window, in pitch periods: long enough to separate neighbouring harmonics. */
const WINDOW_PERIODS = 4;
/** Each harmonic is looked for within ±6 % of where the pitch track puts it. */
const SEARCH_SPAN = 0.06;
const SEARCH_STEPS = 6;
/** Frames that would need a larger formant correction than this are too uncertain to use. */
const MAX_CORRECTION_DB = 12;
const MIN_FRAMES = 15;

/**
 * Power (squared magnitude) of `frame`'s spectrum at `frequency`, using the
 * Goertzel recurrence, which is exact at any frequency, not just FFT bins.
 */
export function spectralPower(frame: ArrayLike<number>, sampleRate: number, frequency: number): number {
  const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / sampleRate);
  let previous = 0;
  let beforePrevious = 0;
  for (let i = 0; i < frame.length; i++) {
    const value = frame[i]! + coefficient * previous - beforePrevious;
    beforePrevious = previous;
    previous = value;
  }
  return previous * previous + beforePrevious * beforePrevious - coefficient * previous * beforePrevious;
}

/**
 * Level in dB of the strongest component within ±6 % of `frequency`, refined
 * by parabolic interpolation, so a slightly-off pitch value still finds its
 * harmonic. Null when the strongest component lies at the edge of that span,
 * which means the harmonic is not where the pitch track says.
 */
export function harmonicLevelDb(frame: ArrayLike<number>, sampleRate: number, frequency: number): number | null {
  const levels: number[] = [];
  for (let step = -SEARCH_STEPS; step <= SEARCH_STEPS; step++) {
    const power = spectralPower(frame, sampleRate, frequency * (1 + (step / SEARCH_STEPS) * SEARCH_SPAN));
    levels.push(10 * Math.log10(Math.max(power, 1e-20)));
  }
  let best = 0;
  for (let i = 1; i < levels.length; i++) if (levels[i]! > levels[best]!) best = i;
  if (best === 0 || best === levels.length - 1) return null;
  const before = levels[best - 1]!;
  const at = levels[best]!;
  const after = levels[best + 1]!;
  const curvature = before - 2 * at + after;
  return curvature < 0 ? at - (before - after) ** 2 / (8 * curvature) : at;
}

/** Typical bandwidth of a speech formant at `formantHz`: 80 Hz plus 2.4 % (Mannell, 1998). */
export function formantBandwidth(formantHz: number): number {
  return 80 + (120 * formantHz) / 5000;
}

/**
 * How much a formant boosts a harmonic at `frequency`, in dB: the gain of a
 * two-pole resonator at `formantHz` with the given bandwidth, normalised to
 * 0 dB at 0 Hz (Iseli & Alwan, 2004).
 */
export function formantGainDb(
  frequency: number,
  formantHz: number,
  sampleRate: number,
  bandwidth = formantBandwidth(formantHz),
): number {
  const radius = Math.exp((-Math.PI * bandwidth) / sampleRate);
  const centre = (2 * Math.PI * formantHz) / sampleRate;
  const omega = (2 * Math.PI * frequency) / sampleRate;
  const atZero = 1 - 2 * radius * Math.cos(centre) + radius * radius;
  const atFrequency = Math.sqrt(
    (1 - 2 * radius * Math.cos(omega - centre) + radius * radius) *
      (1 - 2 * radius * Math.cos(omega + centre) + radius * radius),
  );
  return 20 * Math.log10(atZero / atFrequency);
}

/** A Hann-windowed copy of `length` samples from `start`, with any DC offset removed. */
function windowedFrame(signal: Float32Array, start: number, length: number): Float64Array {
  let mean = 0;
  for (let i = 0; i < length; i++) mean += signal[start + i]!;
  mean /= length;
  const frame = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (length - 1));
    frame[i] = (signal[start + i]! - mean) * hann;
  }
  return frame;
}

/**
 * Measures vocal weight (H1*–H2*) at the frames of a formant track.
 * `pitch`, `firstFrameSec` and `hopSeconds` are the pitch analysis the track
 * was made from.
 */
export function analyzeVoiceQuality(
  track: FormantTrack,
  pitch: ReadonlyArray<number | null>,
  firstFrameSec: number,
  hopSeconds: number,
): VoiceQualitySummary | null {
  const { signal, sampleRate } = track;
  const values: number[] = [];
  for (const { index, formants } of track.frames) {
    const f0 = pitch[index];
    if (!f0) continue;
    const length = Math.round((WINDOW_PERIODS * sampleRate) / f0);
    const start = Math.round((firstFrameSec + index * hopSeconds) * sampleRate) - Math.floor(length / 2);
    if (start < 0 || start + length > signal.length) continue;

    const frame = windowedFrame(signal, start, length);
    const h1 = harmonicLevelDb(frame, sampleRate, f0);
    const h2 = harmonicLevelDb(frame, sampleRate, 2 * f0);
    if (h1 === null || h2 === null) continue;

    let correction = 0;
    for (const { frequency } of [formants[0], formants[1]]) {
      correction += formantGainDb(f0, frequency, sampleRate) - formantGainDb(2 * f0, frequency, sampleRate);
    }
    if (Math.abs(correction) > MAX_CORRECTION_DB) continue;
    values.push(h1 - h2 - correction);
  }

  if (values.length < MIN_FRAMES) return null;
  return { h1h2Db: Math.round(median(values) * 10) / 10, frames: values.length };
}
