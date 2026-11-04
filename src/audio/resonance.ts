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

type FormantTriple = readonly [FormantCandidate, FormantCandidate, FormantCandidate];

/**
 * Chooses F1–F3 (with their bandwidths) from the candidates, skipping a pole
 * that has locked onto the fundamental (common with higher voices) and
 * rejecting implausible patterns.
 */
export function pickFormantCandidates(
  candidates: readonly FormantCandidate[],
  fundamentalHz: number | null,
): FormantTriple | null {
  const usable = candidates
    .filter((candidate) => candidate.frequency >= 200)
    .filter(
      (candidate) =>
        fundamentalHz === null || Math.abs(candidate.frequency - fundamentalHz) > 0.2 * fundamentalHz,
    );
  const [first, second, third] = usable;
  if (first === undefined || second === undefined || third === undefined) return null;
  const [f1, f2, f3] = [first.frequency, second.frequency, third.frequency];
  const plausible =
    f1 <= 1200 && f2 >= 550 && f2 <= 3200 && f3 >= 1500 && f3 <= 4200 && f2 - f1 >= 150 && f3 - f2 >= 150;
  return plausible ? [first, second, third] : null;
}

/** Like {@link pickFormantCandidates}, but returns just the frequencies of F1–F3. */
export function pickFormants(
  candidates: readonly FormantCandidate[],
  fundamentalHz: number | null,
): [number, number, number] | null {
  const picked = pickFormantCandidates(candidates, fundamentalHz);
  return picked && [picked[0].frequency, picked[1].frequency, picked[2].frequency];
}

/** Least-squares fit of F1–F3 to the uniform-tube pattern Fᵢ = (2i − 1)·ΔF / 2. */
export function formantSpacing(f1: number, f2: number, f3: number): number {
  return (0.5 * f1 + 1.5 * f2 + 2.5 * f3) / 8.75;
}

export interface FormantFrame {
  /** Index of the pitch frame this measurement belongs to. */
  index: number;
  /** F1, F2 and F3 with their bandwidths, lowest first. */
  formants: FormantTriple;
}

/**
 * Formants measured over the voiced frames of a recording, together with the
 * band-limited signal they were measured on, so that other measurements (see
 * voiceQuality.ts) can look at exactly the same moments.
 */
export interface FormantTrack {
  /** The recording, downsampled to 8–16 kHz. */
  signal: Float32Array;
  sampleRate: number;
  /** At most a few hundred frames, spread evenly over the voiced ones. */
  frames: FormantFrame[];
}

/**
 * Measures formants over the voiced frames of a recording.
 * `pitch`, `firstFrameSec` and `hopSeconds` come from the pitch analysis and
 * select which moments to look at.
 */
export function trackFormants(
  samples: Float32Array,
  sampleRate: number,
  pitch: ReadonlyArray<number | null>,
  firstFrameSec: number,
  hopSeconds: number,
): FormantTrack {
  // Formants of interest lie below ~4 kHz; work at 8–16 kHz so LPC models just that band.
  let signal = samples;
  let rate = sampleRate;
  while (rate / 2 >= 8000) {
    signal = decimateByTwo(signal);
    rate /= 2;
  }
  const track: FormantTrack = { signal, sampleRate: rate, frames: [] };
  const order = Math.round(rate / 1000) + 2;
  const frameLength = Math.round(FRAME_SECONDS * rate);

  const voiced: number[] = [];
  pitch.forEach((value, index) => {
    if (value !== null) voiced.push(index);
  });
  if (voiced.length < MIN_FRAMES) return track;
  const stride = Math.max(1, voiced.length / MAX_FRAMES);

  for (let position = 0; position < voiced.length; position += stride) {
    const index = voiced[Math.floor(position)]!;
    const centre = Math.round((firstFrameSec + index * hopSeconds) * rate);
    const start = centre - Math.floor(frameLength / 2);
    if (start < 0 || start + frameLength > signal.length) continue;
    const formants = pickFormantCandidates(
      formantCandidates(signal.subarray(start, start + frameLength), rate, order),
      pitch[index] ?? null,
    );
    if (formants) track.frames.push({ index, formants });
  }
  return track;
}

/** Summarises a formant track as resonance: median formants and formant spacing. */
export function summarizeResonance(track: FormantTrack): ResonanceSummary | null {
  if (track.frames.length < MIN_FRAMES) return null;
  const f1s: number[] = [];
  const f2s: number[] = [];
  const f3s: number[] = [];
  const spacings: number[] = [];
  for (const { formants } of track.frames) {
    const [f1, f2, f3] = [formants[0].frequency, formants[1].frequency, formants[2].frequency];
    f1s.push(f1);
    f2s.push(f2);
    f3s.push(f3);
    spacings.push(formantSpacing(f1, f2, f3));
  }
  return {
    formantSpacingHz: Math.round(median(spacings)),
    f1Hz: Math.round(median(f1s)),
    f2Hz: Math.round(median(f2s)),
    f3Hz: Math.round(median(f3s)),
    frames: spacings.length,
  };
}
