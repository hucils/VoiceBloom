import { useCallback, useEffect, useRef, useState } from 'react';

import type { RecordingAnalysis } from '../../audio/analysis';
import { analyzeRecording } from '../../audio/browserAudio';
import { createAudioContext, LivePitchTracker } from '../../audio/live';
import { MicrophoneError, releaseMicrophone, requestMicrophone, type MicrophoneErrorKind } from '../../audio/microphone';
import { VoiceRecorder } from '../../audio/recorder';

export type VoiceSessionStatus = 'idle' | 'starting' | 'live' | 'recording' | 'processing' | 'error';

/** A finished recording that has not been saved (and may never be). */
export interface RecordingDraft {
  id: number;
  audio: ArrayBuffer;
  mimeType: string;
  durationMs: number;
  analysis: RecordingAnalysis | null;
}

/**
 * Microphone → live analysis → optional recording, as one state machine.
 * Everything is released on unmount, and the microphone turns off when the
 * page goes to the background (unless a recording is in progress).
 */
export function useVoiceSession({ maxRecordingSeconds = 60 }: { maxRecordingSeconds?: number } = {}) {
  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [error, setError] = useState<MicrophoneErrorKind | null>(null);
  const [tracker, setTracker] = useState<LivePitchTracker | null>(null);
  const [draft, setDraft] = useState<RecordingDraft | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [pausedInBackground, setPausedInBackground] = useState(false);

  const statusRef = useRef<VoiceSessionStatus>('idle');
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<LivePitchTracker | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const draftCounter = useRef(0);

  const moveTo = useCallback((next: VoiceSessionStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const release = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.cancel();
    recorderRef.current = null;
    void trackerRef.current?.stop();
    trackerRef.current = null;
    releaseMicrophone(streamRef.current);
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (statusRef.current !== 'idle' && statusRef.current !== 'error') return;
    setError(null);
    setPausedInBackground(false);
    moveTo('starting');
    let context: AudioContext | null = null;
    try {
      // Created before any await, while the click still counts as a user gesture.
      context = createAudioContext();
      void context.resume().catch(() => undefined);
      const stream = await requestMicrophone();
      if (!mountedRef.current) {
        releaseMicrophone(stream);
        void context.close();
        return;
      }
      streamRef.current = stream;
      const live = await LivePitchTracker.start(stream, context);
      trackerRef.current = live;
      setTracker(live);
      moveTo('live');
    } catch (cause) {
      release();
      if (context && context.state !== 'closed') void context.close().catch(() => undefined);
      if (!mountedRef.current) return;
      setError(cause instanceof MicrophoneError ? cause.kind : 'unknown');
      moveTo('error');
    }
  }, [moveTo, release]);

  const stop = useCallback(() => {
    release();
    setTracker(null);
    setRecordingStartedAt(null);
    moveTo('idle');
  }, [moveTo, release]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || statusRef.current !== 'recording') return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    recorderRef.current = null;
    setRecordingStartedAt(null);
    moveTo('processing');
    try {
      const recorded = await recorder.stop();
      const analysis = await analyzeRecording(recorded.data);
      if (!mountedRef.current) return;
      setDraft({
        id: ++draftCounter.current,
        audio: recorded.data,
        mimeType: recorded.mimeType,
        durationMs: analysis ? analysis.durationSec * 1000 : recorded.durationMs,
        analysis,
      });
    } catch (cause) {
      console.error('VoiceBloom could not finish the recording.', cause);
    }
    if (mountedRef.current) moveTo(trackerRef.current ? 'live' : 'idle');
  }, [moveTo]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || statusRef.current !== 'live') return;
    trackerRef.current?.resume();
    setDraft(null);
    try {
      const recorder = new VoiceRecorder(stream);
      recorder.start();
      recorderRef.current = recorder;
      setRecordingStartedAt(performance.now());
      moveTo('recording');
      timerRef.current = window.setTimeout(() => void stopRecording(), maxRecordingSeconds * 1000);
    } catch (cause) {
      console.error('VoiceBloom could not start recording.', cause);
      setError('unsupported');
    }
  }, [maxRecordingSeconds, moveTo, stopRecording]);

  const clearDraft = useCallback(() => setDraft(null), []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && statusRef.current === 'live') {
        stop();
        setPausedInBackground(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [stop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      release();
    };
  }, [release]);

  return {
    status,
    error,
    tracker,
    draft,
    recordingStartedAt,
    pausedInBackground,
    maxRecordingSeconds,
    start,
    stop,
    startRecording,
    stopRecording,
    clearDraft,
  };
}

export type VoiceSession = ReturnType<typeof useVoiceSession>;
