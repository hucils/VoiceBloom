import type { ChangeNotifier } from './changes';
import { SETTINGS_KEY, type VoiceBloomDB } from './db';
import type { AppSettings } from './types';
import { sanitizeSettings } from './validation';

export const DEFAULT_SETTINGS: AppSettings = {
  locale: 'en',
  theme: 'system',
  chartRange: { low: 60, high: 500 },
  practiceBand: null,
  showNoteNames: true,
  showFemininityEstimate: false,
  onboardingCompleted: false,
};

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;

export function createSettingsRepository(db: VoiceBloomDB, notifier: ChangeNotifier) {
  return {
    /** Stored settings, with any missing or invalid field replaced by `defaults`. */
    async load(defaults: AppSettings = DEFAULT_SETTINGS): Promise<AppSettings> {
      return sanitizeSettings(await db.get('settings', SETTINGS_KEY), defaults);
    },

    /** Applies a partial change atomically, so concurrent updates never overwrite each other. */
    async update(patch: Partial<AppSettings>, defaults: AppSettings = DEFAULT_SETTINGS): Promise<AppSettings> {
      const tx = db.transaction('settings', 'readwrite');
      const current = sanitizeSettings(await tx.store.get(SETTINGS_KEY), defaults);
      const next = sanitizeSettings({ ...current, ...patch }, defaults);
      await tx.store.put(next, SETTINGS_KEY);
      await tx.done;
      notifier.notify('settings');
      return next;
    },

    async save(settings: AppSettings): Promise<AppSettings> {
      const clean = sanitizeSettings(settings, DEFAULT_SETTINGS);
      await db.put('settings', clean, SETTINGS_KEY);
      notifier.notify('settings');
      return clean;
    },
  };
}
