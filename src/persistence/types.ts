/**
 * Shapes of everything VoiceBloom stores on the device.
 */
import type { RecordingAnalysis } from '../audio/analysis';
import type { Locale } from '../i18n/locales';

export interface RecordingMeta {
  id: string;
  createdAt: number;
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
  /** Name chosen by the person; empty string when untitled. */
  title: string;
  /** Lesson and step the recording was made in, if any. */
  lessonId: string | null;
  stepId: string | null;
  /** Result of on-device analysis; null if analysis was not possible. */
  analysis: RecordingAnalysis | null;
}

export interface StoredAudio {
  id: string;
  /** Encoded audio exactly as MediaRecorder produced it (WebM/Opus, MP4/AAC, …). */
  data: ArrayBuffer;
  mimeType: string;
}

export interface LessonProgress {
  lessonId: string;
  completedStepIds: string[];
  currentStepId: string | null;
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
}

/** How the person's voice felt — always their own description, never inferred. */
export const VOICE_FEELINGS = ['strained', 'tired', 'okay', 'easy', 'wonderful'] as const;
export type VoiceFeeling = (typeof VOICE_FEELINGS)[number];

export interface JournalEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  feeling: VoiceFeeling | null;
  body: string;
  recordingId: string | null;
  lessonId: string | null;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface HzRange {
  low: number;
  high: number;
}

export interface AppSettings {
  locale: Locale;
  theme: ThemePreference;
  /** Frequency range shown on pitch charts. */
  chartRange: HzRange;
  /**
   * An optional band the person chose to show on pitch charts. VoiceBloom
   * never suggests one based on gender — it is entirely the person's own.
   */
  practiceBand: HzRange | null;
  showNoteNames: boolean;
  /**
   * Opt-in: show the femininity estimate on recordings. Off unless the person
   * turns it on; the estimate is computed on display and never stored.
   */
  showFemininityEstimate: boolean;
  onboardingCompleted: boolean;
}

/** Limits for anything the person can type as a frequency. */
export const HZ_LIMITS = { min: 40, max: 1200 } as const;
