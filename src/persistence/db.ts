import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type { AppSettings, JournalEntry, LessonProgress, RecordingMeta, StoredAudio } from './types';

export const DB_NAME = 'voicebloom';
export const DB_VERSION = 1;
export const SETTINGS_KEY = 'app';

export interface VoiceBloomSchema extends DBSchema {
  /** Recording metadata and analysis — small, so lists stay fast. */
  recordings: {
    key: string;
    value: RecordingMeta;
    indexes: { 'by-created': number };
  };
  /** Audio bytes, stored apart from metadata so listing never loads audio. */
  recordingAudio: {
    key: string;
    value: StoredAudio;
  };
  progress: {
    key: string;
    value: LessonProgress;
  };
  journal: {
    key: string;
    value: JournalEntry;
    indexes: { 'by-created': number; 'by-recording': string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

export type VoiceBloomDB = IDBPDatabase<VoiceBloomSchema>;

export const ALL_STORES = ['recordings', 'recordingAudio', 'progress', 'journal', 'settings'] as const;

export function openVoiceBloomDB(name: string = DB_NAME): Promise<VoiceBloomDB> {
  return openDB<VoiceBloomSchema>(name, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Each block migrates from one version to the next; add new blocks for new versions.
      if (oldVersion < 1) {
        const recordings = db.createObjectStore('recordings', { keyPath: 'id' });
        recordings.createIndex('by-created', 'createdAt');
        db.createObjectStore('recordingAudio', { keyPath: 'id' });
        db.createObjectStore('progress', { keyPath: 'lessonId' });
        const journal = db.createObjectStore('journal', { keyPath: 'id' });
        journal.createIndex('by-created', 'createdAt');
        // Entries without a recording have recordingId = null, which IndexedDB leaves out of the index.
        journal.createIndex('by-recording', 'recordingId');
        db.createObjectStore('settings');
      }
    },
    blocking(_currentVersion, _blockedVersion, event) {
      // A newer version of the app opened in another tab: step aside so it can upgrade.
      (event.target as IDBDatabase | null)?.close();
    },
  });
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
