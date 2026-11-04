/**
 * Deterministic synthetic signals for testing the audio pipeline.
 */

export function sine(frequency: number, sampleRate: number, durationSec: number, amplitude = 0.5) {
  const length = Math.round(sampleRate * durationSec);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return samples;
}

/**
 * A voice-like tone: a fundamental plus decaying harmonics, which is where
 * naive autocorrelation pitch trackers make octave errors.
 */
export function harmonicTone(
  frequency: number,
  sampleRate: number,
  durationSec: number,
  harmonicAmplitudes: readonly number[] = [1, 0.7, 0.5, 0.35, 0.25, 0.15],
  amplitude = 0.5,
) {
  const length = Math.round(sampleRate * durationSec);
  const samples = new Float32Array(length);
  const total = harmonicAmplitudes.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < length; i++) {
    let value = 0;
    harmonicAmplitudes.forEach((weight, index) => {
      value += weight * Math.sin((2 * Math.PI * frequency * (index + 1) * i) / sampleRate);
    });
    samples[i] = (amplitude * value) / total;
  }
  return samples;
}

/** Exponential (constant semitones-per-second) glide with continuous phase. */
export function glide(
  fromHz: number,
  toHz: number,
  sampleRate: number,
  durationSec: number,
  amplitude = 0.5,
) {
  const length = Math.round(sampleRate * durationSec);
  const samples = new Float32Array(length);
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const progress = i / length;
    const frequency = fromHz * (toHz / fromHz) ** progress;
    phase += (2 * Math.PI * frequency) / sampleRate;
    // Two harmonics so the glide resembles a hummed siren rather than a pure tone.
    samples[i] = amplitude * (0.7 * Math.sin(phase) + 0.3 * Math.sin(2 * phase));
  }
  return samples;
}

/**
 * Passes `signal` through second-order resonators at the given formant
 * frequencies (a Klatt-style cascade, each with unity gain at 0 Hz), in place,
 * then scales the result so its peak is `amplitude`.
 */
function shapeWithFormants(
  signal: Float64Array,
  formants: readonly number[],
  bandwidths: readonly number[],
  sampleRate: number,
  amplitude: number,
) {
  const period = 1 / sampleRate;
  formants.forEach((frequency, index) => {
    const bandwidth = bandwidths[index] ?? 70 + 40 * index;
    const c = -Math.exp(-2 * Math.PI * bandwidth * period);
    const b = 2 * Math.exp(-Math.PI * bandwidth * period) * Math.cos(2 * Math.PI * frequency * period);
    const a = 1 - b - c;
    let previous = 0;
    let beforePrevious = 0;
    for (let i = 0; i < signal.length; i++) {
      const value = a * signal[i]! + b * previous + c * beforePrevious;
      beforePrevious = previous;
      previous = value;
      signal[i] = value;
    }
  });
  let peak = 0;
  for (const value of signal) peak = Math.max(peak, Math.abs(value));
  return Float32Array.from(signal, (value) => (peak > 0 ? (value / peak) * amplitude : 0));
}

/**
 * A synthetic vowel: an impulse train at `f0` passed through second-order
 * resonators at the given formant frequencies (a Klatt-style cascade). The
 * formants are therefore known exactly, which is what LPC should recover.
 * An impulse train has equally strong harmonics, so the source's H1–H2 is 0 dB.
 */
export function vowel(
  f0: number,
  formants: readonly number[],
  sampleRate: number,
  durationSec: number,
  amplitude = 0.5,
  /** [start, end) seconds with no excitation; the resonators keep ringing, like a real voice. */
  pauses: ReadonlyArray<readonly [number, number]> = [],
  /** Formant bandwidths in Hz; narrower ones ring longer (as in a reverberant room). */
  bandwidths: readonly number[] = [],
) {
  const length = Math.round(sampleRate * durationSec);
  const signal = new Float64Array(length);
  let phase = 0;
  for (let i = 0; i < length; i++) {
    phase += f0 / sampleRate;
    if (phase >= 1) {
      phase -= 1;
      const time = i / sampleRate;
      if (!pauses.some(([start, end]) => time >= start && time < end)) signal[i] = 1;
    }
  }
  return shapeWithFormants(signal, formants, bandwidths, sampleRate, amplitude);
}

/**
 * A synthetic vowel with a chosen source spectrum: harmonics of `f0` (up to
 * 4 kHz) at the levels `harmonicDb(n)` gives for harmonic n = 1, 2, …, passed
 * through formant resonators. The source's H1–H2 is therefore known exactly,
 * which is what the vocal weight measurement should recover once the formants'
 * boost is removed.
 */
export function shapedVowel(
  f0: number,
  formants: readonly number[],
  sampleRate: number,
  durationSec: number,
  harmonicDb: (harmonic: number) => number,
  amplitude = 0.5,
) {
  const length = Math.round(sampleRate * durationSec);
  const signal = new Float64Array(length);
  const top = Math.min(4000, sampleRate / 2 - 100);
  for (let harmonic = 1; harmonic * f0 < top; harmonic++) {
    const level = 10 ** (harmonicDb(harmonic) / 20);
    const step = (2 * Math.PI * harmonic * f0) / sampleRate;
    for (let i = 0; i < length; i++) signal[i] = signal[i]! + level * Math.sin(step * i);
  }
  return shapeWithFormants(signal, formants, [], sampleRate, amplitude);
}

export function silence(sampleRate: number, durationSec: number) {
  return new Float32Array(Math.round(sampleRate * durationSec));
}

/** mulberry32: tiny seeded PRNG so noise tests are reproducible. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function whiteNoise(length: number, amplitude = 0.3, seed = 42) {
  const random = seededRandom(seed);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) samples[i] = amplitude * (random() * 2 - 1);
  return samples;
}

export function concat(...parts: Float32Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export function add(a: Float32Array, b: Float32Array) {
  const result = new Float32Array(Math.max(a.length, b.length));
  for (let i = 0; i < result.length; i++) result[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return result;
}
