import { createBackup, restoreBackup, type BackupFile, type RestoreResult } from './backup';
import { ALL_TOPICS, ChangeNotifier } from './changes';
import { ALL_STORES, type VoiceBloomDB } from './db';
import { createJournalRepository, type JournalRepository } from './journalRepository';
import { createProgressRepository, type ProgressRepository } from './progressRepository';
import { createRecordingsRepository, type RecordingsRepository } from './recordingsRepository';
import { createSettingsRepository, type SettingsRepository } from './settingsRepository';
import type { AppSettings } from './types';

export interface Repositories {
  notifier: ChangeNotifier;
  recordings: RecordingsRepository;
  progress: ProgressRepository;
  journal: JournalRepository;
  settings: SettingsRepository;
  exportBackup(options: { includeRecordings: boolean }, defaults: AppSettings): Promise<BackupFile>;
  importBackup(text: string, defaults: AppSettings): Promise<RestoreResult>;
  /** Permanently erases everything VoiceBloom has stored on this device. */
  eraseEverything(): Promise<void>;
}

export function createRepositories(db: VoiceBloomDB, notifier = new ChangeNotifier()): Repositories {
  return {
    notifier,
    recordings: createRecordingsRepository(db, notifier),
    progress: createProgressRepository(db, notifier),
    journal: createJournalRepository(db, notifier),
    settings: createSettingsRepository(db, notifier),
    exportBackup: (options, defaults) => createBackup(db, options, defaults),
    importBackup: (text, defaults) => restoreBackup(db, notifier, text, defaults),
    async eraseEverything() {
      const tx = db.transaction(ALL_STORES, 'readwrite');
      await Promise.all([...ALL_STORES.map((store) => tx.objectStore(store).clear()), tx.done]);
      notifier.notify(...ALL_TOPICS);
    },
  };
}

export { ChangeNotifier } from './changes';
export type { DataTopic } from './changes';
export { openVoiceBloomDB } from './db';
export { BackupError } from './backup';
export { DEFAULT_SETTINGS } from './settingsRepository';
export * from './types';
