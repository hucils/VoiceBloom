import { RefreshCw, WifiOff } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Button } from '../components/Button';
import { useI18n } from '../i18n/I18nContext';

/** Offline-ready notice and "new version" prompt from the service worker. */
export function UpdatePrompt() {
  const { t } = useI18n();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md animate-fade-up rounded-3xl border border-line bg-surface p-4 shadow-lifted lg:right-8 lg:bottom-8 lg:left-auto lg:mx-0"
    >
      <p className="flex items-start gap-2.5 text-sm text-ink">
        {needRefresh ? (
          <RefreshCw aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        ) : (
          <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0 text-calm" />
        )}
        {needRefresh ? t('pwa.updateAvailable') : t('pwa.offlineReady')}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setNeedRefresh(false);
            setOfflineReady(false);
          }}
        >
          {needRefresh ? t('pwa.dismiss') : t('common.close')}
        </Button>
        {needRefresh && (
          <Button size="sm" onClick={() => void updateServiceWorker(true)}>
            {t('pwa.update')}
          </Button>
        )}
      </div>
    </div>
  );
}
