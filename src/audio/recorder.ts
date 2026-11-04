/** Recording with MediaRecorder, in whatever compressed format the browser supports. */

/** Most compact first; Safari only supports MP4/AAC. */
const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/webm',
];

export function pickRecordingMimeType(
  isSupported: (type: string) => boolean = (type) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type),
): string | undefined {
  return PREFERRED_TYPES.find((type) => isSupported(type));
}

/** File extension for a recording's MIME type, for downloads. */
export function extensionForMimeType(mimeType: string): string {
  const type = mimeType.split(';')[0]!.trim().toLowerCase();
  if (type === 'audio/mp4' || type === 'audio/aac' || type === 'audio/x-m4a') return 'm4a';
  if (type === 'audio/ogg') return 'ogg';
  if (type === 'audio/wav' || type === 'audio/wave') return 'wav';
  return 'webm';
}

export interface RecordedAudio {
  data: ArrayBuffer;
  mimeType: string;
  durationMs: number;
}

export class VoiceRecorder {
  private readonly recorder: MediaRecorder;
  private chunks: Blob[] = [];
  private startedAt = 0;

  constructor(stream: MediaStream) {
    if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder is not supported');
    const mimeType = pickRecordingMimeType();
    this.recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64_000 } : undefined);
    this.recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    });
  }

  get isRecording(): boolean {
    return this.recorder.state === 'recording';
  }

  start(): void {
    this.chunks = [];
    this.startedAt = performance.now();
    // A timeslice makes the browser hand over data regularly instead of all at the end.
    this.recorder.start(250);
  }

  stop(): Promise<RecordedAudio> {
    return new Promise((resolve, reject) => {
      if (this.recorder.state === 'inactive') {
        reject(new Error('Not recording'));
        return;
      }
      const durationMs = performance.now() - this.startedAt;
      this.recorder.addEventListener(
        'stop',
        () => {
          const mimeType = this.recorder.mimeType || this.chunks[0]?.type || 'audio/webm';
          new Blob(this.chunks, { type: mimeType })
            .arrayBuffer()
            .then((data) => resolve({ data, mimeType, durationMs }), reject);
          this.chunks = [];
        },
        { once: true },
      );
      this.recorder.stop();
    });
  }

  /** Stops and throws the audio away. */
  cancel(): void {
    this.chunks = [];
    if (this.recorder.state !== 'inactive') this.recorder.stop();
  }
}
