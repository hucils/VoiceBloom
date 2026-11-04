/**
 * Resonance measurement: formants F1–F3 from LPC, summarised as the average
 * formant spacing (ΔF).
 *
 * For a uniform tube closed at the glottis and open at the lips, resonances
 * fall at Fᵢ = (2i − 1)·ΔF / 2, where ΔF = c / 2L depends only on the tube
 * length L. Fitting measured formants to that pattern gives a single
 * "brightness" number: a shorter, brighter-sounding vocal tract has a larger
 * ΔF. It is an acoustic measurement, not a judgement about anyone's voice.
 *
 * LPC formant tracking is approximate. It is least reliable for high voices
 * (sparse harmonics), noisy rooms and hummed or whispered sounds, so the
 * summary uses the median over many frames of speech.
 */
import { autocorrelation, levinsonDurbin, polynomialRoots } from './lpc';
import { decimateByTwo } from './resample';
import { median } from './stats';

export interface ResonanceSummary {
  /** Median formant spacing in Hz. Higher sounds brighter. */
  formantSpacingHz: number;
  f1Hz: number;
  f2Hz: number;
  f3Hz: number;
  /** Number of frames that produced a usable estimate. */
  frames: number;
}

export interface FormantCandidate {
  frequency: number;
  bandwidth: number;
}

const PRE_EMPHASIS = 0.95;
const MAX_BANDWIDTH_HZ = 500;
const FRAME_SECONDS = 0.025;
const MAX_FRAMES = 400;
const MIN_FRAMES = 15;

/** All plausible resonances in one frame, lowest first. */
export function formantCandidates(frame: Float32Array, sampleRate: number, order: number): FormantCandidate[] {
  const length = frame.length;
  const shaped = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    const emphasised = frame[i]! - (i > 0 ? PRE_EMPHASIS * frame[i - 1]! : 0);
    const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (length - 1));
    shaped[i] = emphasised * hamming;
  }

  const coefficients = levinsonDurbin(autocorrelation(shaped, order), order);
  if (!coefficients) return [];

  const nyquist = sampleRate / 2;
  return polynomialRoots(coefficients)
    .filter((root) => root.im > 0)
    .map((root) => ({
      frequency: (Math.atan2(root.im, root.re) * sampleRate) / (2 * Math.PI),
      bandwidth: (-Math.log(Math.hypot(root.re, root.im)) * sampleRate) / Math.PI,
    }))
    .filter(
      (candidate) =>
        candidate.frequency > 150 &&
        candidate.frequency < nyquist - 100 &&
        candidate.bandwidth > 0 &&
        candidate.bandwidth < MAX_BANDWIDTH_HZ,
    )
    .sort((a, b) => a.frequency - b.frequency);
}

/**
 * Chooses F1–F3 from the candidates, skipping a pole that has locked onto the
 * fundamental (common with higher voices) and rejecting implausible patterns.
 */
export function pickFormants(
  candidates: readonly FormantCandidate[],
  fundamentalHz: number | null,
): [number, number, number] | null {
  const usable = candidates
    .map((candidate) => candidate.frequency)
    .filter((frequency) => frequency >= 200)
    .filter(
      (frequency) =>
        fundamentalHz === null || Math.abs(frequency - fundamentalHz) > 0.2 * fundamentalHz,
    );
  const [f1, f2, f3] = usable;
  if (f1 === undefined || f2 === undefined || f3 === undefined) return null;
  const plausible =
    f1 <= 1200 && f2 >= 550 && f2 <= 3200 && f3 >= 1500 && f3 <= 4200 && f2 - f1 >= 150 && f3 - f2 >= 150;
  return plausible ? [f1, f2, f3] : null;
}

/** Least-squares fit of F1–F3 to the uniform-tube pattern Fᵢ = (2i − 1)·ΔF / 2. */
export function formantSpacing(f1: number, f2: number, f3: number): number {
  return (0.5 * f1 + 1.5 * f2 + 2.5 * f3) / 8.75;
}

/**
 * Measures resonance over the voiced frames of a recording.
 * `pitch`, `firstFrameSec` and `hopSeconds` come from the pitch analysis and
 * select which moments to look at.
 */
export function analyzeResonance(
  samples: Float32Array,
  sampleRate: number,
  pitch: ReadonlyArray<number | null>,
  firstFrameSec: number,
  hopSeconds: number,
): ResonanceSummary | null {
  // Formants of interest lie below ~4 kHz; work at 8–16 kHz so LPC models just that band.
  let signal = samples;
  let rate = sampleRate;
  while (rate / 2 >= 8000) {
    signal = decimateByTwo(signal);
    rate /= 2;
  }
  const order = Math.round(rate / 1000) + 2;
  const frameLength = Math.round(FRAME_SECONDS * rate);

  const voiced: number[] = [];
  pitch.forEach((value, index) => {
    if (value !== null) voiced.push(index);
  });
  if (voiced.length < MIN_FRAMES) return null;
  const stride = Math.max(1, voiced.length / MAX_FRAMES);

  const f1s: number[] = [];
  const f2s: number[] = [];
  const f3s: number[] = [];
  const spacings: number[] = [];
  for (let position = 0; position < voiced.length; position += stride) {
    const index = voiced[Math.floor(position)]!;
    const centre = Math.round((firstFrameSec + index * hopSeconds) * rate);
    const start = centre - Math.floor(frameLength / 2);
    if (start < 0 || start + frameLength > signal.length) continue;
    const formants = pickFormants(
      formantCandidates(signal.subarray(start, start + frameLength), rate, order),
      pitch[index] ?? null,
    );
    if (!formants) continue;
    const [f1, f2, f3] = formants;
    f1s.push(f1);
    f2s.push(f2);
    f3s.push(f3);
    spacings.push(formantSpacing(f1, f2, f3));
  }

  if (spacings.length < MIN_FRAMES) return null;
  return {
    formantSpacingHz: Math.round(median(spacings)),
    f1Hz: Math.round(median(f1s)),
    f2Hz: Math.round(median(f2s)),
    f3Hz: Math.round(median(f3s)),
    frames: spacings.length,
  };
}
