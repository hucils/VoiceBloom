/**
 * Defensive parsing for anything read back from storage or from an imported
 * backup file. Each function returns a clean value, or null when the input
 * cannot be trusted.
 */
import { ANALYSIS_VERSION, type RecordingAnalysis } from '../audio/analysis';
import type { PitchSummary } from '../audio/pitchTrack';
import type { ResonanceSummary } from '../audio/resonance';
import { isLocale } from '../i18n/locales';
import {
  HZ_LIMITS,
  VOICE_FEELINGS,
  type AppSettings,
  type HzRange,
  type JournalEntry,
  type LessonProgress,
  type RecordingMeta,
  type VoiceFeeling,
} from './types';

export const TEXT_LIMITS = { title: 120, journalBody: 20_000, id: 100 } as const;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isTimestamp = (value: unknown): value is number => isFiniteNumber(value) && value >= 0;
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= TEXT_LIMITS.id && ID_PATTERN.test(value);
}

const optionalId = (value: unknown): string | null => (isValidId(value) ? value : null);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const cleanText = (value: unknown, maxLength: number) => (typeof value === 'string' ? value.slice(0, maxLength) : '');

export function sanitizeHzRange(value: unknown): HzRange | null {
  if (!isRecord(value) || !isFiniteNumber(value.low) || !isFiniteNumber(value.high)) return null;
  const low = clamp(Math.round(value.low), HZ_LIMITS.min, HZ_LIMITS.max);
  const high = clamp(Math.round(value.high), HZ_LIMITS.min, HZ_LIMITS.max);
  return high > low ? { low, high } : null;
}

export function sanitizeSettings(value: unknown, defaults: AppSettings): AppSettings {
  const input = isRecord(value) ? value : {};
  const theme = input.theme;
  return {
    locale: isLocale(input.locale) ? input.locale : defaults.locale,
    theme: theme === 'system' || theme === 'light' || theme === 'dark' ? theme : defaults.theme,
    chartRange: sanitizeHzRange(input.chartRange) ?? defaults.chartRange,
    practiceBand:
      input.practiceBand === null ? null : (sanitizeHzRange(input.practiceBand) ?? defaults.practiceBand),
    showNoteNames: typeof input.showNoteNames === 'boolean' ? input.showNoteNames : defaults.showNoteNames,
    // Only an explicit `true` turns the opt-in estimate on.
    showFemininityEstimate: input.showFemininityEstimate === true,
    onboardingCompleted:
      typeof input.onboardingCompleted === 'boolean' ? input.onboardingCompleted : defaults.onboardingCompleted,
  };
}

function sanitizeSummary(value: unknown): PitchSummary | null {
  if (!isRecord(value)) return null;
  const keys = [
    'medianHz',
    'lowHz',
    'highHz',
    'rangeSemitones',
    'variationSemitones',
    'voicedSeconds',
    'voicedRatio',
  ] as const;
  if (!keys.every((key) => isFiniteNumber(value[key]))) return null;
  return Object.fromEntries(keys.map((key) => [key, value[key]])) as unknown as PitchSummary;
}

function sanitizeResonance(value: unknown): ResonanceSummary | null {
  if (!isRecord(value)) return null;
  const keys = ['formantSpacingHz', 'f1Hz', 'f2Hz', 'f3Hz', 'frames'] as const;
  if (!keys.every((key) => isFiniteNumber(value[key]) && (value[key] as number) > 0)) return null;
  return Object.fromEntries(keys.map((key) => [key, value[key]])) as unknown as ResonanceSummary;
}

export function sanitizeAnalysis(value: unknown): RecordingAnalysis | null {
  if (!isRecord(value) || value.version !== ANALYSIS_VERSION) return null;
  const { durationSec, hopSeconds, firstFrameSec, pitch, peaks } = value;
  if (!isFiniteNumber(durationSec) || !isFiniteNumber(hopSeconds) || hopSeconds <= 0) return null;
  if (!isFiniteNumber(firstFrameSec) || !Array.isArray(pitch) || !Array.isArray(peaks)) return null;
  if (!pitch.every((hz) => hz === null || (isFiniteNumber(hz) && hz > 0))) return null;
  if (!peaks.every((peak) => isFiniteNumber(peak))) return null;
  return {
    version: ANALYSIS_VERSION,
    durationSec,
    hopSeconds,
    firstFrameSec,
    pitch: pitch as Array<number | null>,
    peaks: (peaks as number[]).map((peak) => clamp(peak, 0, 1)),
    summary: value.summary === null ? null : sanitizeSummary(value.summary),
    resonance: sanitizeResonance(value.resonance),
  };
}

export function sanitizeRecordingMeta(value: unknown): RecordingMeta | null {
  if (!isRecord(value) || !isValidId(value.id) || !isTimestamp(value.createdAt)) return null;
  if (!isTimestamp(value.durationMs) || typeof value.mimeType !== 'string') return null;
  return {
    id: value.id,
    createdAt: value.createdAt,
    durationMs: value.durationMs,
    mimeType: value.mimeType.slice(0, 100),
    sizeBytes: isTimestamp(value.sizeBytes) ? value.sizeBytes : 0,
    title: cleanText(value.title, TEXT_LIMITS.title),
    lessonId: optionalId(value.lessonId),
    stepId: optionalId(value.stepId),
    analysis: sanitizeAnalysis(value.analysis),
  };
}

export function isVoiceFeeling(value: unknown): value is VoiceFeeling {
  return typeof value === 'string' && (VOICE_FEELINGS as readonly string[]).includes(value);
}

export function sanitizeJournalEntry(value: unknown): JournalEntry | null {
  if (!isRecord(value) || !isValidId(value.id) || !isTimestamp(value.createdAt)) return null;
  return {
    id: value.id,
    createdAt: value.createdAt,
    updatedAt: isTimestamp(value.updatedAt) ? value.updatedAt : value.createdAt,
    feeling: isVoiceFeeling(value.feeling) ? value.feeling : null,
    body: cleanText(value.body, TEXT_LIMITS.journalBody),
    recordingId: optionalId(value.recordingId),
    lessonId: optionalId(value.lessonId),
  };
}

export function sanitizeProgress(value: unknown): LessonProgress | null {
  if (!isRecord(value) || !isValidId(value.lessonId) || !isTimestamp(value.startedAt)) return null;
  const steps = Array.isArray(value.completedStepIds) ? value.completedStepIds.filter(isValidId) : [];
  return {
    lessonId: value.lessonId,
    completedStepIds: [...new Set(steps)],
    currentStepId: optionalId(value.currentStepId),
    startedAt: value.startedAt,
    updatedAt: isTimestamp(value.updatedAt) ? value.updatedAt : value.startedAt,
    completedAt: isTimestamp(value.completedAt) ? value.completedAt : null,
  };
}
