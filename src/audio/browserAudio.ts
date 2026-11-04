/**
 * Browser-only audio helpers: decoding recordings for analysis and playing
 * them back with the Web Audio API.
 */
import { analyzeSamples, ANALYSIS_SAMPLE_RATE, type RecordingAnalysis } from './analysis';
import type { AnalysisRequest } from './analysis.worker';
import { isMicrophoneActive } from './microphone';

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
  webkitOfflineAudioContext?: typeof OfflineAudioContext;
};

/** Averages all channels into one. */
export function downmix(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0).slice();
  const mono = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) mono[i] = mono[i]! + data[i]! / buffer.numberOfChannels;
  }
  return mono;
}

/** Decodes a recording to mono samples, resampled by the browser for analysis. */
export async function decodeForAnalysis(data: ArrayBuffer): Promise<{ samples: Float32Array; sampleRate: number }> {
  const OfflineContext = window.OfflineAudioContext ?? (window as WebkitWindow).webkitOfflineAudioContext;
  if (!OfflineContext) throw new Error('Web Audio is not supported');
  let context: OfflineAudioContext;
  try {
    context = new OfflineContext(1, 1, ANALYSIS_SAMPLE_RATE);
  } catch {
    // Some engines only accept common rates; analysis works at any rate, just more slowly.
    context = new OfflineContext(1, 1, 44_100);
  }
  // decodeAudioData takes ownership of (detaches) its input, so give it a copy.
  const buffer = await context.decodeAudioData(data.slice(0));
  return { samples: downmix(buffer), sampleRate: buffer.sampleRate };
}

function analyzeInWorker(samples: Float32Array, sampleRate: number): Promise<RecordingAnalysis> {
  const onMainThread = () => analyzeSamples(samples, sampleRate);
  if (typeof Worker === 'undefined') return Promise.resolve(onMainThread());

  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve(onMainThread());
      return;
    }
    const fallBack = () => {
      worker.terminate();
      resolve(onMainThread());
    };
    worker.onmessage = (event: MessageEvent<{ result?: RecordingAnalysis; error?: string }>) => {
      if (!event.data.result) return fallBack();
      worker.terminate();
      resolve(event.data.result);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      fallBack();
    };
    // Structured clone copies the samples, so they stay usable for the fallback.
    worker.postMessage({ samples, sampleRate } satisfies AnalysisRequest);
  });
}

/** Full on-device analysis of a recording. Null if the browser cannot decode it. */
export async function analyzeRecording(data: ArrayBuffer): Promise<RecordingAnalysis | null> {
  try {
    const { samples, sampleRate } = await decodeForAnalysis(data);
    return await analyzeInWorker(samples, sampleRate);
  } catch (error) {
    console.warn('VoiceBloom could not analyse this recording.', error);
    return null;
  }
}

/**
 * On iOS, Web Audio is muted by the ring/silent switch unless the page says
 * it plays media. Safari 16.4+ exposes this as navigator.audioSession.
 */
function preferAudibleSession() {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (!session) return;
  try {
    session.type = isMicrophoneActive() ? 'play-and-record' : 'playback';
  } catch {
    // Not supported in this browser; nothing to do.
  }
}

let playbackContext: AudioContext | null = null;

/** One shared context for all players: browsers limit how many may exist at once. */
function getPlaybackContext(): AudioContext {
  if (!playbackContext || playbackContext.state === 'closed') {
    const AudioContextClass = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is not supported');
    playbackContext = new AudioContextClass();
  }
  return playbackContext;
}

/**
 * Plays a recording with sample-accurate position reporting (which media
 * elements cannot do for MediaRecorder's WebM files, as they lack a duration).
 * Only one player sounds at a time: starting one pauses the others.
 */
export class ClipPlayer {
  /** The player currently sounding, so starting another can pause it. */
  private static active: ClipPlayer | null = null;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startedAt = 0;
  private offset = 0;
  private playing = false;
  /** Called whenever playback starts, pauses or ends. */
  onStateChange: (() => void) | null = null;

  async load(data: ArrayBuffer): Promise<number> {
    // decodeAudioData takes ownership of its input, so give it a copy.
    this.buffer = await getPlaybackContext().decodeAudioData(data.slice(0));
    this.offset = 0;
    return this.buffer.duration;
  }

  get duration(): number {
    return this.buffer?.duration ?? 0;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get currentTime(): number {
    if (!this.playing || !playbackContext) return this.offset;
    return Math.min(this.duration, this.offset + (playbackContext.currentTime - this.startedAt));
  }

  async play(): Promise<void> {
    if (!this.buffer || this.playing) return;
    const context = getPlaybackContext();
    if (ClipPlayer.active && ClipPlayer.active !== this) ClipPlayer.active.pause();
    ClipPlayer.active = this;
    preferAudibleSession();
    if (context.state === 'suspended') await context.resume();
    if (this.offset >= this.duration - 0.01) this.offset = 0;

    const source = context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(context.destination);
    source.onended = () => {
      if (this.source !== source) return;
      this.source = null;
      this.playing = false;
      this.offset = this.duration;
      this.onStateChange?.();
    };
    source.start(0, this.offset);
    this.source = source;
    this.startedAt = context.currentTime;
    this.playing = true;
    this.onStateChange?.();
  }

  pause(): void {
    if (!this.playing) return;
    this.offset = this.currentTime;
    this.stopSource();
    this.playing = false;
    this.onStateChange?.();
  }

  seek(seconds: number): void {
    const resume = this.playing;
    if (resume) this.stopSource();
    this.playing = false;
    this.offset = Math.min(Math.max(0, seconds), this.duration);
    if (resume) void this.play();
    else this.onStateChange?.();
  }

  dispose(): void {
    this.stopSource();
    this.playing = false;
    this.onStateChange = null;
    this.buffer = null;
    if (ClipPlayer.active === this) ClipPlayer.active = null;
  }

  private stopSource() {
    if (!this.source) return;
    this.source.onended = null;
    try {
      this.source.stop();
    } catch {
      // Already stopped.
    }
    this.source.disconnect();
    this.source = null;
  }
}
