/**
 * Real-time pitch tracking. `LiveAnalyzer` is pure (one frame of samples in,
 * one reading out) so it can be tested; `LivePitchTracker` connects it to the
 * microphone with the Web Audio API.
 */
import { amplitudeToDb, rms } from './level';
import { centsBetween, semitonesBetween } from './pitchMath';
import { decimateByTwo } from './resample';
import { median, standardDeviation } from './stats';
import { createYinDetector, type PitchDetector } from './yin';

export interface LiveFrame {
  /** Seconds on the audio clock. */
  time: number;
  /** Smoothed pitch in Hz, or null when no clear pitch was heard. */
  frequency: number | null;
  /** Input level in dBFS. */
  levelDb: number;
}

export interface LiveAnalyzerOptions {
  /** Frames quieter than this are not pitch-tracked. */
  silenceDb?: number;
  minFrequency?: number;
  maxFrequency?: number;
}

/** Turns raw microphone frames into smoothed pitch and level readings. */
export class LiveAnalyzer {
  private readonly detect: PitchDetector;
  private readonly decimate: boolean;
  private readonly silenceDb: number;
  private readonly recent: number[] = [];
  private unvoicedRun = 0;
  private leapRun = 0;

  constructor(sampleRate: number, options: LiveAnalyzerOptions = {}) {
    // Halving high sample rates keeps YIN about four times cheaper with no loss for voices.
    this.decimate = sampleRate >= 32_000;
    this.silenceDb = options.silenceDb ?? -60;
    this.detect = createYinDetector(this.decimate ? sampleRate / 2 : sampleRate, {
      minFrequency: options.minFrequency ?? 60,
      maxFrequency: options.maxFrequency ?? 1000,
    });
  }

  process(samples: Float32Array, time: number): LiveFrame {
    const levelDb = amplitudeToDb(rms(samples));
    let raw: number | null = null;
    if (levelDb > this.silenceDb) {
      raw = this.detect(this.decimate ? decimateByTwo(samples) : samples)?.frequency ?? null;
    }
    return { time, frequency: this.smooth(raw), levelDb };
  }

  /**
   * Median of the last three voiced readings removes single-frame octave
   * jumps. Larger leaps (more than 5 semitones from recent readings) are held
   * back until they persist, which drops the formant "spikes" that appear as a
   * phrase ends while still following a real change of register.
   */
  private smooth(frequency: number | null): number | null {
    if (frequency === null) {
      // Bridge single dropped frames, but reset after a real pause.
      if (++this.unvoicedRun > 2) this.recent.length = 0;
      return null;
    }
    this.unvoicedRun = 0;
    if (this.recent.length >= 3 && Math.abs(semitonesBetween(median(this.recent), frequency)) > 5) {
      if (++this.leapRun <= 3) return null;
      this.recent.length = 0; // the leap persisted: follow the new register
    }
    this.leapRun = 0;
    this.recent.push(frequency);
    if (this.recent.length > 5) this.recent.shift();
    return median(this.recent.slice(-3));
  }
}

/**
 * How steadily a note is being held over the last `windowSeconds`: the
 * standard deviation in cents. Null unless most of the window was voiced.
 */
export function steadinessCents(frames: readonly LiveFrame[], now: number, windowSeconds = 1.2): number | null {
  const recent = frames.filter((frame) => frame.time > now - windowSeconds);
  const voiced = recent.map((frame) => frame.frequency).filter((hz): hz is number => hz !== null);
  if (recent.length < 10 || voiced.length < recent.length * 0.7) return null;
  const centre = median(voiced);
  return standardDeviation(voiced.map((hz) => centsBetween(centre, hz)));
}

/** Fixed-size history of recent frames, oldest first. */
export class FrameHistory {
  private readonly frames: LiveFrame[] = [];
  private readonly maxAgeSeconds: number;

  constructor(maxAgeSeconds: number) {
    this.maxAgeSeconds = maxAgeSeconds;
  }

  push(frame: LiveFrame): void {
    this.frames.push(frame);
    const cutoff = frame.time - this.maxAgeSeconds;
    let drop = 0;
    while (drop < this.frames.length && this.frames[drop]!.time < cutoff) drop++;
    if (drop > 0) this.frames.splice(0, drop);
  }

  get all(): readonly LiveFrame[] {
    return this.frames;
  }

  get latest(): LiveFrame | undefined {
    return this.frames.at(-1);
  }

  clear(): void {
    this.frames.length = 0;
  }
}

type FrameListener = (frame: LiveFrame) => void;

/** Create inside a click handler (before any await) so Safari allows audio. */
export function createAudioContext(): AudioContext {
  const AudioContextClass =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio is not supported');
  return new AudioContextClass({ latencyHint: 'interactive' });
}

/** Reads the microphone on every animation frame and publishes readings. */
export class LivePitchTracker {
  readonly history = new FrameHistory(12);
  private readonly context: AudioContext;
  private readonly source: MediaStreamAudioSourceNode;
  private readonly analyserNode: AnalyserNode;
  private readonly buffer: Float32Array<ArrayBuffer>;
  private readonly analyzer: LiveAnalyzer;
  private readonly listeners = new Set<FrameListener>();
  private animationFrame = 0;
  private stopped = false;

  private constructor(context: AudioContext, stream: MediaStream) {
    this.context = context;
    this.source = context.createMediaStreamSource(stream);
    this.analyserNode = context.createAnalyser();
    // ~43 ms of audio: enough for two periods of a 60 Hz voice.
    this.analyserNode.fftSize = context.sampleRate >= 32_000 ? 2048 : 1024;
    this.source.connect(this.analyserNode);
    this.buffer = new Float32Array(this.analyserNode.fftSize);
    this.analyzer = new LiveAnalyzer(context.sampleRate);
  }

  /**
   * Starts tracking. Pass a context created synchronously in the user's click
   * handler: after awaiting the permission prompt, the gesture may have expired.
   */
  static async start(stream: MediaStream, context: AudioContext = createAudioContext()): Promise<LivePitchTracker> {
    if (context.state === 'suspended') await context.resume().catch(() => undefined);
    const tracker = new LivePitchTracker(context, stream);
    tracker.loop();
    return tracker;
  }

  get time(): number {
    return this.context.currentTime;
  }

  /** Call from a later user gesture if the browser kept audio suspended. */
  resume(): void {
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
  }

  subscribe(listener: FrameListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    cancelAnimationFrame(this.animationFrame);
    this.listeners.clear();
    this.source.disconnect();
    await this.context.close().catch(() => undefined);
  }

  private loop = () => {
    if (this.stopped) return;
    this.animationFrame = requestAnimationFrame(this.loop);
    this.analyserNode.getFloatTimeDomainData(this.buffer);
    const frame = this.analyzer.process(this.buffer, this.context.currentTime);
    this.history.push(frame);
    for (const listener of this.listeners) listener(frame);
  };
}
