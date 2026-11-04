/**
 * Offline analysis of a finished recording: pitch track, waveform peaks and a
 * descriptive summary. Pure and synchronous, so it runs the same in a Web
 * Worker, on the main thread, or in tests.
 */
import { amplitudeToDb, rms, SILENCE_DB } from './level';
import { medianSmooth, removeOutliers, removeShortRuns, summarizePitch, type PitchSummary } from './pitchTrack';
import { analyzeResonance, type ResonanceSummary } from './resonance';
import { computePeaks } from './waveform';
import { createYinDetector, DEFAULT_YIN_OPTIONS, yinFrameSize } from './yin';

export const ANALYSIS_VERSION = 1;

export interface AnalysisOptions {
  /** Time between pitch frames, in seconds. */
  hopSeconds?: number;
  minFrequency?: number;
  maxFrequency?: number;
  threshold?: number;
  /** Frames this many dB quieter than the loudest frame are treated as silence. */
  relativeSilenceDb?: number;
  /** Frames quieter than this absolute level (dBFS) are always treated as silence. */
  absoluteSilenceDb?: number;
  /** Number of waveform peaks to keep for drawing. */
  peakCount?: number;
}

export interface RecordingAnalysis {
  version: typeof ANALYSIS_VERSION;
  durationSec: number;
  /** Seconds between consecutive pitch values. */
  hopSeconds: number;
  /** Time (seconds) of the first pitch value; value `i` sits at `firstFrameSec + i * hopSeconds`. */
  firstFrameSec: number;
  /** Hz per frame (rounded to 0.1 Hz), or null where no pitch was detected. */
  pitch: Array<number | null>;
  /** Waveform peaks (0 … 1), evenly spread over the recording. */
  peaks: number[];
  summary: PitchSummary | null;
  /** Resonance (formant) measurement over the voiced frames, when there was enough speech. */
  resonance: ResonanceSummary | null;
}

const DEFAULTS = {
  hopSeconds: 0.02,
  minFrequency: DEFAULT_YIN_OPTIONS.minFrequency,
  maxFrequency: DEFAULT_YIN_OPTIONS.maxFrequency,
  threshold: DEFAULT_YIN_OPTIONS.threshold,
  relativeSilenceDb: 35,
  absoluteSilenceDb: -65,
  peakCount: 240,
} as const satisfies Required<AnalysisOptions>;

/** Sample rate the browser resamples recordings to before analysis (keeps YIN cheap). */
export const ANALYSIS_SAMPLE_RATE = 16_000;

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function analyzeSamples(
  samples: Float32Array,
  sampleRate: number,
  options: AnalysisOptions = {},
): RecordingAnalysis {
  const settings = { ...DEFAULTS, ...options };
  const hop = Math.max(1, Math.round(sampleRate * settings.hopSeconds));
  const frameSize = yinFrameSize(sampleRate, settings.minFrequency);
  const frameCount = samples.length >= frameSize ? Math.floor((samples.length - frameSize) / hop) + 1 : 0;

  // Pass 1: loudness per frame, to find an adaptive silence gate. Microphones
  // record at very different levels, so a fixed gate would miss quiet voices.
  const levels = new Float32Array(frameCount);
  let loudestDb = SILENCE_DB;
  for (let frame = 0; frame < frameCount; frame++) {
    const start = frame * hop;
    const db = amplitudeToDb(rms(samples, start, start + frameSize));
    levels[frame] = db;
    if (db > loudestDb) loudestDb = db;
  }
  const gateDb = Math.max(settings.absoluteSilenceDb, loudestDb - settings.relativeSilenceDb);

  // Pass 2: pitch for every frame above the gate.
  const detect = createYinDetector(sampleRate, {
    threshold: settings.threshold,
    minFrequency: settings.minFrequency,
    maxFrequency: settings.maxFrequency,
  });
  const raw: Array<number | null> = new Array<number | null>(frameCount);
  for (let frame = 0; frame < frameCount; frame++) {
    if (levels[frame]! < gateDb) {
      raw[frame] = null;
      continue;
    }
    const start = frame * hop;
    raw[frame] = detect(samples.subarray(start, start + frameSize))?.frequency ?? null;
  }

  const pitch = medianSmooth(removeShortRuns(removeOutliers(raw), 3), 2).map((value) =>
    value === null ? null : round(value, 1),
  );
  const hopSeconds = hop / sampleRate;
  const firstFrameSec = frameSize / 2 / sampleRate;

  return {
    version: ANALYSIS_VERSION,
    durationSec: samples.length / sampleRate,
    hopSeconds,
    firstFrameSec,
    pitch,
    peaks: computePeaks(samples, settings.peakCount).map((peak) => round(peak, 3)),
    summary: summarizePitch(pitch, hopSeconds),
    resonance: analyzeResonance(samples, sampleRate, pitch, firstFrameSec, hopSeconds),
  };
}

/** Time in seconds of pitch value `index`. */
export function pitchFrameTime(analysis: Pick<RecordingAnalysis, 'firstFrameSec' | 'hopSeconds'>, index: number) {
  return analysis.firstFrameSec + index * analysis.hopSeconds;
}
