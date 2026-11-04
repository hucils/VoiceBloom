import { useMemo } from 'react';

import { Logo } from '../components/Logo';
import { createI18n } from '../i18n/I18nContext';
import { resolveLocale } from '../i18n/locales';

/**
 * Shown before settings (and so the chosen language) have loaded, or when
 * storage cannot be opened. Uses the browser's language.
 */
export function BootScreen({ error, onRetry }: { error?: boolean; onRetry?: () => void }) {
  const { t } = useMemo(() => createI18n(resolveLocale(navigator.languages)), []);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo className={error ? 'size-14' : 'size-14 animate-soft-pulse'} />
      {error ? (
        <div className="max-w-md animate-fade-up">
          <h1 className="text-2xl text-ink">{t('app.storageErrorTitle')}</h1>
          <p className="mt-3 text-ink-muted">{t('app.storageErrorBody')}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
            >
              {t('app.retry')}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-muted" role="status">
          {t('app.loading')}
        </p>
      )}
    </main>
  );
}
