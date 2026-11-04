import {
  Database,
  Download,
  Info,
  Languages,
  Palette,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  AudioLines,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { dateStamp, downloadBlob } from '../../app/download';
import { Button } from '../../components/Button';
import { Card, CardHeader } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SegmentedControl, Switch } from '../../components/Controls';
import { TextField } from '../../components/Field';
import { PageHeader } from '../../components/Layout';
import { useToast } from '../../components/ToastProvider';
import { useI18n } from '../../i18n/I18nContext';
import { LOCALE_NAMES, LOCALES } from '../../i18n/locales';
import { BackupError, HZ_LIMITS, type HzRange, type ThemePreference } from '../../persistence';
import { useRepositories } from '../../state/DataContext';
import { useJournalEntries, useRecordingsUsage } from '../../state/queries';
import { useSettings } from '../../state/SettingsContext';

/** Two Hz inputs that commit when both are valid and the field loses focus. */
function RangeEditor({ value, onCommit }: { value: HzRange; onCommit: (range: HzRange) => void }) {
  const { t } = useI18n();
  const [low, setLow] = useState(String(value.low));
  const [high, setHigh] = useState(String(value.high));
  const lowHz = Number(low);
  const highHz = Number(high);
  const valid =
    Number.isFinite(lowHz) && Number.isFinite(highHz) && lowHz >= HZ_LIMITS.min && highHz <= HZ_LIMITS.max && highHz > lowHz;

  const commit = () => {
    if (valid && (lowHz !== value.low || highHz !== value.high)) onCommit({ low: Math.round(lowHz), high: Math.round(highHz) });
  };

  return (
    <div>
      <div className="grid max-w-sm grid-cols-2 gap-3">
        {[
          { label: t('settings.low'), state: low, set: setLow },
          { label: t('settings.high'), state: high, set: setHigh },
        ].map((field) => (
          <TextField
            key={field.label}
            label={`${field.label} (Hz)`}
            type="number"
            inputMode="numeric"
            min={HZ_LIMITS.min}
            max={HZ_LIMITS.max}
            value={field.state}
            onChange={(event) => field.set(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
            }}
          />
        ))}
      </div>
      {!valid && (
        <p role="alert" className="mt-2 text-xs font-medium text-record">
          {t('settings.rangeInvalid')}
        </p>
      )}
    </div>
  );
}

function useStorageInfo() {
  const [info, setInfo] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const storage = navigator.storage;
    if (!storage?.estimate) return;
    let active = true;
    Promise.all([storage.estimate(), storage.persisted?.() ?? Promise.resolve(false)]).then(
      ([estimate, persisted]) => {
        if (active) setInfo({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0, persisted });
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [refresh]);
  return { info, refresh: () => setRefresh((value) => value + 1) };
}

export function SettingsPage() {
  const { t, format } = useI18n();
  const { settings, defaults, update } = useSettings();
  const repos = useRepositories();
  const toast = useToast();
  const navigate = useNavigate();
  const usage = useRecordingsUsage();
  const entries = useJournalEntries();
  const storage = useStorageInfo();
  const fileInput = useRef<HTMLInputElement>(null);
  const [includeRecordings, setIncludeRecordings] = useState(true);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [persistMessage, setPersistMessage] = useState<string | null>(null);
  const [confirmFemininity, setConfirmFemininity] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);

  const themeOptions = (['system', 'light', 'dark'] as const).map((value) => ({
    value,
    label: t(`settings.theme.${value}`),
  }));

  const exportBackup = async () => {
    const backup = await repos.exportBackup({ includeRecordings }, defaults);
    downloadBlob(
      new Blob([JSON.stringify(backup)], { type: 'application/json' }),
      `voicebloom-backup-${dateStamp(Date.now())}.json`,
    );
    toast(t('settings.exported'));
  };

  const importBackup = async (file: File) => {
    try {
      const result = await repos.importBackup(await file.text(), defaults);
      const skipped = result.skipped > 0 ? ` ${t('settings.importSkipped', { count: result.skipped })}` : '';
      setImportMessage(t('settings.imported') + skipped);
      storage.refresh();
    } catch (error) {
      setImportMessage(t(error instanceof BackupError ? `settings.importErrors.${error.reason}` : 'settings.importErrors.generic'));
    }
  };

  const requestPersistence = async () => {
    const granted = (await navigator.storage?.persist?.()) ?? false;
    setPersistMessage(granted ? t('settings.persisted') : t('settings.persistDenied'));
    storage.refresh();
  };

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div className="space-y-5">
        <Card>
          <CardHeader icon={Languages} title={t('settings.language')} />
          <SegmentedControl
            label={t('settings.language')}
            value={settings.locale}
            options={LOCALES.map((locale) => ({ value: locale, label: LOCALE_NAMES[locale] }))}
            onChange={(locale) => void update({ locale })}
          />
        </Card>

        <Card>
          <CardHeader icon={Palette} title={t('settings.appearance')} />
          <SegmentedControl<ThemePreference>
            label={t('settings.appearance')}
            value={settings.theme}
            options={themeOptions}
            onChange={(theme) => void update({ theme })}
          />
        </Card>

        <Card className="space-y-6">
          <CardHeader icon={AudioLines} title={t('settings.pitchDisplay')} />
          <div>
            <p className="font-medium text-ink">{t('settings.chartRange')}</p>
            <p className="mb-3 text-sm text-ink-muted">{t('settings.chartRangeHint')}</p>
            <RangeEditor
              key={`${settings.chartRange.low}-${settings.chartRange.high}`}
              value={settings.chartRange}
              onCommit={(chartRange) => void update({ chartRange })}
            />
          </div>
          <Switch
            checked={settings.showNoteNames}
            onChange={(showNoteNames) => void update({ showNoteNames })}
            label={t('settings.showNotes')}
            description={t('settings.showNotesHint')}
          />
          <div className="space-y-3 border-t border-line pt-5">
            <Switch
              checked={settings.practiceBand !== null}
              onChange={(on) => void update({ practiceBand: on ? { low: 150, high: 220 } : null })}
              label={t('settings.practiceBandOn')}
              description={t('settings.practiceBandHint')}
            />
            {settings.practiceBand && (
              <RangeEditor
                key={`${settings.practiceBand.low}-${settings.practiceBand.high}`}
                value={settings.practiceBand}
                onCommit={(practiceBand) => void update({ practiceBand })}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader icon={Sparkles} title={t('settings.femininityTitle')} />
          <Switch
            checked={settings.showFemininityEstimate}
            onChange={(on) => {
              if (on) setConfirmFemininity(true);
              else void update({ showFemininityEstimate: false });
            }}
            label={t('settings.femininityToggle')}
            description={t('settings.femininityHint')}
          />
        </Card>

        <Card className="space-y-5">
          <CardHeader icon={ShieldCheck} title={t('settings.privacy')} description={t('settings.privacyBody')} />
          <p className="text-sm text-ink">
            {t('recordings.count', { count: usage?.count ?? 0 })}
            {usage && usage.bytes > 0 && ` (${format.bytes(usage.bytes)})`} · {t('journal.count', { count: entries?.length ?? 0 })}
          </p>
          {storage.info && storage.info.quota > 0 && (
            <p className="text-sm text-ink-muted">
              {t('settings.storageUsed', { used: format.bytes(storage.info.usage), quota: format.bytes(storage.info.quota) })}
            </p>
          )}

          <div className="space-y-2 border-t border-line pt-5">
            <p className="font-medium text-ink">{t('settings.persist')}</p>
            <p className="text-sm text-ink-muted">{t('settings.persistHint')}</p>
            {storage.info?.persisted ? (
              <p className="text-sm font-medium text-calm">{t('settings.persisted')}</p>
            ) : (
              <Button variant="secondary" size="sm" icon={Database} onClick={() => void requestPersistence()}>
                {t('settings.persist')}
              </Button>
            )}
            {persistMessage && !storage.info?.persisted && <p className="text-sm text-ink-muted">{persistMessage}</p>}
          </div>

          <div className="space-y-3 border-t border-line pt-5">
            <p className="font-medium text-ink">{t('settings.exportTitle')}</p>
            <p className="text-sm text-ink-muted">{t('settings.exportBody')}</p>
            <Switch checked={includeRecordings} onChange={setIncludeRecordings} label={t('settings.includeRecordings')} />
            <Button variant="secondary" size="sm" icon={Download} onClick={() => void exportBackup()}>
              {t('settings.exportButton')}
            </Button>
          </div>

          <div className="space-y-3 border-t border-line pt-5">
            <p className="font-medium text-ink">{t('settings.importTitle')}</p>
            <p className="text-sm text-ink-muted">{t('settings.importBody')}</p>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void importBackup(file);
              }}
            />
            <Button variant="secondary" size="sm" icon={Upload} onClick={() => fileInput.current?.click()}>
              {t('settings.importButton')}
            </Button>
            {importMessage && (
              <p role="status" className="text-sm text-ink-muted">
                {importMessage}
              </p>
            )}
          </div>

          <div className="space-y-3 border-t border-line pt-5">
            <p className="font-medium text-ink">{t('settings.eraseTitle')}</p>
            <p className="text-sm text-ink-muted">{t('settings.eraseBody')}</p>
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmErase(true)}>
              {t('settings.eraseTitle')}
            </Button>
          </div>
        </Card>

        <Card className="space-y-3">
          <CardHeader icon={Info} title={t('settings.about')} />
          <p className="text-sm text-ink">{t('settings.aboutBody')}</p>
          <p className="text-sm text-ink-muted">{t('settings.slpNote')}</p>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => void update({ onboardingCompleted: false })}>
              {t('settings.replayWelcome')}
            </Button>
            <span className="text-xs text-ink-subtle">{t('settings.version', { version: __APP_VERSION__ })}</span>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmFemininity}
        title={t('settings.femininityDialogTitle')}
        confirmLabel={t('settings.femininityConfirm')}
        cancelLabel={t('settings.femininityDecline')}
        onCancel={() => setConfirmFemininity(false)}
        onConfirm={() => {
          setConfirmFemininity(false);
          void update({ showFemininityEstimate: true });
        }}
      >
        <p>{t('settings.femininityDialogMethod')}</p>
        <p>{t('settings.femininityDialogLimits')}</p>
        <p>{t('settings.femininityDialogWellbeing')}</p>
        <p>{t('settings.femininityDialogPrivacy')}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmErase}
        title={t('settings.eraseConfirmTitle')}
        confirmLabel={t('settings.eraseTitle')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setConfirmErase(false)}
        onConfirm={async () => {
          setConfirmErase(false);
          await repos.eraseEverything();
          toast(t('settings.erased'));
          void navigate('/');
        }}
      >
        <p>{t('settings.eraseConfirmBody')}</p>
      </ConfirmDialog>
    </>
  );
}
