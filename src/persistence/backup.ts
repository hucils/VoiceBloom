/**
 * Export and import of everything VoiceBloom stores, as a single JSON file the
 * person downloads and keeps themselves. Nothing here touches the network.
 */
import type { ChangeNotifier } from './changes';
import { ALL_STORES, SETTINGS_KEY, type VoiceBloomDB } from './db';
import type { AppSettings, JournalEntry, LessonProgress, RecordingMeta, StoredAudio } from './types';
import {
  sanitizeJournalEntry,
  sanitizeProgress,
  sanitizeRecordingMeta,
  sanitizeSettings,
} from './validation';

export const BACKUP_FORMAT = 'voicebloom-backup';
export const BACKUP_VERSION = 1;

export interface BackupRecording {
  meta: RecordingMeta;
  audio: { mimeType: string; base64: string };
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  settings: AppSettings;
  progress: LessonProgress[];
  journal: JournalEntry[];
  /** Empty when the backup was made without recordings. */
  recordings: BackupRecording[];
}

export type BackupErrorReason = 'invalid-json' | 'not-a-backup' | 'unsupported-version';

export class BackupError extends Error {
  readonly reason: BackupErrorReason;
  constructor(reason: BackupErrorReason) {
    super(`Cannot import backup: ${reason}`);
    this.name = 'BackupError';
    this.reason = reason;
  }
}

export interface RestoreResult {
  recordings: number;
  journal: number;
  progress: number;
  /** Items that were malformed and left out. */
  skipped: number;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function createBackup(
  db: VoiceBloomDB,
  options: { includeRecordings: boolean },
  defaults: AppSettings,
  now: Date = new Date(),
): Promise<BackupFile> {
  const tx = db.transaction(ALL_STORES, 'readonly');
  const [settings, progress, journal, recordings, audio] = await Promise.all([
    tx.objectStore('settings').get(SETTINGS_KEY),
    tx.objectStore('progress').getAll(),
    tx.objectStore('journal').getAll(),
    options.includeRecordings ? tx.objectStore('recordings').getAll() : Promise.resolve([]),
    options.includeRecordings ? tx.objectStore('recordingAudio').getAll() : Promise.resolve([]),
  ]);
  await tx.done;

  const audioById = new Map(audio.map((item) => [item.id, item]));
  const backupRecordings: BackupRecording[] = [];
  for (const meta of recordings) {
    const stored = audioById.get(meta.id);
    if (stored) {
      backupRecordings.push({
        meta,
        audio: { mimeType: stored.mimeType, base64: arrayBufferToBase64(stored.data) },
      });
    }
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings: sanitizeSettings(settings, defaults),
    progress,
    journal,
    recordings: backupRecordings,
  };
}

interface ParsedBackup {
  settings: AppSettings;
  progress: LessonProgress[];
  journal: JournalEntry[];
  recordings: Array<{ meta: RecordingMeta; audio: StoredAudio }>;
  skipped: number;
}

/** Validates a backup file's text without touching the database. */
export function parseBackup(text: string, defaults: AppSettings): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('invalid-json');
  }
  if (typeof data !== 'object' || data === null || (data as { format?: unknown }).format !== BACKUP_FORMAT) {
    throw new BackupError('not-a-backup');
  }
  const file = data as Record<string, unknown>;
  if (file.version !== BACKUP_VERSION) throw new BackupError('unsupported-version');

  let skipped = 0;
  const collect = <T>(value: unknown, sanitize: (item: unknown) => T | null): T[] => {
    if (!Array.isArray(value)) return [];
    const clean: T[] = [];
    for (const item of value) {
      const result = sanitize(item);
      if (result) clean.push(result);
      else skipped++;
    }
    return clean;
  };

  const recordings = collect(file.recordings, (item) => {
    if (typeof item !== 'object' || item === null) return null;
    const { meta: rawMeta, audio: rawAudio } = item as { meta?: unknown; audio?: unknown };
    const meta = sanitizeRecordingMeta(rawMeta);
    const audio = rawAudio as { mimeType?: unknown; base64?: unknown } | undefined;
    if (!meta || typeof audio?.base64 !== 'string' || typeof audio.mimeType !== 'string') return null;
    try {
      const bytes = base64ToArrayBuffer(audio.base64);
      return { meta: { ...meta, sizeBytes: bytes.byteLength }, audio: { id: meta.id, data: bytes, mimeType: audio.mimeType } };
    } catch {
      return null;
    }
  });

  return {
    settings: { ...sanitizeSettings(file.settings, defaults), onboardingCompleted: true },
    progress: collect(file.progress, sanitizeProgress),
    journal: collect(file.journal, sanitizeJournalEntry),
    recordings,
    skipped,
  };
}

/**
 * Merges a backup into the database in one transaction: items with the same
 * id are replaced, everything else is kept. Nothing is written if anything fails.
 */
export async function restoreBackup(
  db: VoiceBloomDB,
  notifier: ChangeNotifier,
  text: string,
  defaults: AppSettings,
): Promise<RestoreResult> {
  const parsed = parseBackup(text, defaults);

  const tx = db.transaction(ALL_STORES, 'readwrite');
  const existingRecordingIds = new Set(await tx.objectStore('recordings').getAllKeys());
  for (const { meta } of parsed.recordings) existingRecordingIds.add(meta.id);

  const writes: Promise<unknown>[] = [tx.objectStore('settings').put(parsed.settings, SETTINGS_KEY)];
  for (const progress of parsed.progress) writes.push(tx.objectStore('progress').put(progress));
  for (const entry of parsed.journal) {
    // Keep journal links only to recordings that exist after the import.
    const recordingId = entry.recordingId && existingRecordingIds.has(entry.recordingId) ? entry.recordingId : null;
    writes.push(tx.objectStore('journal').put({ ...entry, recordingId }));
  }
  for (const { meta, audio } of parsed.recordings) {
    writes.push(tx.objectStore('recordings').put(meta), tx.objectStore('recordingAudio').put(audio));
  }
  await Promise.all([...writes, tx.done]);

  notifier.notify('settings', 'progress', 'journal', 'recordings');
  return {
    recordings: parsed.recordings.length,
    journal: parsed.journal.length,
    progress: parsed.progress.length,
    skipped: parsed.skipped,
  };
}
