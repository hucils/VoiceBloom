import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { BootScreen } from '../app/BootScreen';
import { applyTheme } from '../app/theme';
import { I18nProvider } from '../i18n/I18nContext';
import { resolveLocale } from '../i18n/locales';
import { DEFAULT_SETTINGS, type AppSettings } from '../persistence';
import { useRepositories } from './DataContext';

export interface SettingsValue {
  settings: AppSettings;
  /** Defaults for this device (e.g. the browser's language). */
  defaults: AppSettings;
  update(patch: Partial<AppSettings>): Promise<void>;
}

const SettingsContext = createContext<SettingsValue | null>(null);

/** Loads settings, applies theme and language, and only then renders the app. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const repos = useRepositories();
  const defaults = useMemo<AppSettings>(
    () => ({ ...DEFAULT_SETTINGS, locale: resolveLocale(navigator.languages) }),
    [],
  );
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      repos.settings.load(defaults).then(
        (value) => {
          if (active) setSettings(value);
        },
        (error: unknown) => console.error('VoiceBloom could not load settings.', error),
      );
    };
    load();
    const unsubscribe = repos.notifier.subscribe('settings', load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repos, defaults]);

  const theme = settings?.theme;
  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      // Optimistic: show the change at once; storage merges it atomically.
      setSettings((current) => (current ? { ...current, ...patch } : current));
      await repos.settings.update(patch, defaults);
    },
    [repos, defaults],
  );

  const value = useMemo(() => (settings ? { settings, defaults, update } : null), [settings, defaults, update]);
  if (!value) return <BootScreen />;
  return (
    <SettingsContext value={value}>
      <I18nProvider locale={value.settings.locale}>{children}</I18nProvider>
    </SettingsContext>
  );
}

export function useSettings(): SettingsValue {
  const value = use(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside <SettingsProvider>');
  return value;
}
