/**
 * Microphone access. Audio from the microphone is only ever processed on this
 * device; nothing here sends it anywhere.
 */

export type MicrophoneErrorKind = 'denied' | 'not-found' | 'in-use' | 'insecure' | 'unsupported' | 'unknown';

export class MicrophoneError extends Error {
  readonly kind: MicrophoneErrorKind;
  constructor(kind: MicrophoneErrorKind, cause?: unknown) {
    super(`Microphone unavailable: ${kind}`, { cause });
    this.name = 'MicrophoneError';
    this.kind = kind;
  }
}

/**
 * Browser voice processing (echo cancellation, noise suppression, automatic
 * gain) is designed for calls and distorts pitch and loudness measurements, so
 * it is turned off.
 */
export const VOICE_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1,
};

let activeStreams = 0;

/** Whether VoiceBloom currently holds an open microphone stream. */
export function isMicrophoneActive(): boolean {
  return activeStreams > 0;
}

export function classifyMicrophoneError(error: unknown): MicrophoneErrorKind {
  const name = typeof error === 'object' && error !== null ? (error as { name?: unknown }).name : undefined;
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'not-found';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'in-use';
    default:
      return 'unknown';
  }
}

export async function requestMicrophone(): Promise<MediaStream> {
  if (typeof window !== 'undefined' && window.isSecureContext === false) throw new MicrophoneError('insecure');
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new MicrophoneError('unsupported');
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: VOICE_CONSTRAINTS });
    activeStreams++;
    return stream;
  } catch (error) {
    throw new MicrophoneError(classifyMicrophoneError(error), error);
  }
}

/** Stops every track, which also turns off the browser's microphone indicator. */
export function releaseMicrophone(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  const live = stream.getTracks().filter((track) => track.readyState !== 'ended');
  live.forEach((track) => track.stop());
  if (live.length > 0) activeStreams = Math.max(0, activeStreams - 1);
}
