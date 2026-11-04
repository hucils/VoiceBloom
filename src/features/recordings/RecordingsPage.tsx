import { AudioWaveform, ChevronDown, ChevronUp, Download, Mic, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { extensionForMimeType } from '../../audio/recorder';
import { dateStamp, downloadBlob, safeFileName } from '../../app/download';
import { Button, ButtonLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TextField } from '../../components/Field';
import { EmptyState, PageHeader } from '../../components/Layout';
import { useToast } from '../../components/ToastProvider';
import { useI18n } from '../../i18n/I18nContext';
import { getLesson } from '../../lessons/catalog';
import type { RecordingMeta } from '../../persistence';
import { useRepositories } from '../../state/DataContext';
import { useRecordings, useRecordingsUsage } from '../../state/queries';
import { FemininityCard, RecordingStats } from '../voice/RecordingInsights';
import { RecordingPlayer } from '../voice/RecordingPlayer';

function RecordingCard({ recording }: { recording: RecordingMeta }) {
  const { t, l, format } = useI18n();
  const repos = useRepositories();
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(recording.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lesson = getLesson(recording.lessonId);
  const loadAudio = useCallback(
    async () => (await repos.recordings.getAudio(recording.id))?.data,
    [repos, recording.id],
  );

  const download = async () => {
    const audio = await repos.recordings.getAudio(recording.id);
    if (!audio) return;
    const name = `${safeFileName(recording.title, 'voicebloom-recording')}-${dateStamp(recording.createdAt)}`;
    downloadBlob(new Blob([audio.data], { type: audio.mimeType }), `${name}.${extensionForMimeType(audio.mimeType)}`);
  };

  return (
    <Card as="article" className="!p-4 sm:!p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg text-ink">{recording.title || t('common.untitled')}</h2>
          <p className="text-sm text-ink-muted">
            {format.relativeDay(recording.createdAt)} · {format.time(recording.createdAt)} ·{' '}
            {format.duration(recording.durationMs)}
          </p>
          {lesson && <p className="mt-0.5 text-xs text-ink-subtle">{t('recordings.fromLesson', { lesson: l(lesson.title) })}</p>}
        </div>
        {recording.analysis?.summary && (
          <span className="mt-1 hidden shrink-0 text-sm font-semibold text-ink sm:inline">
            {format.hz(recording.analysis.summary.medianHz)}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          icon={expanded ? ChevronUp : ChevronDown}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="sr-only sm:not-sr-only">{expanded ? t('recordings.hideDetails') : t('recordings.showDetails')}</span>
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 animate-fade-in space-y-5 border-t border-line pt-4">
          <RecordingPlayer loadAudio={loadAudio} analysis={recording.analysis} durationMs={recording.durationMs} />
          <RecordingStats analysis={recording.analysis} />
          <FemininityCard analysis={recording.analysis} />

          {renaming ? (
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={async (event) => {
                event.preventDefault();
                await repos.recordings.rename(recording.id, title);
                setRenaming(false);
              }}
            >
              <TextField
                className="flex-1"
                label={t('recordings.renameLabel')}
                value={title}
                maxLength={120}
                autoFocus
                onChange={(event) => setTitle(event.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit">{t('common.save')}</Button>
                <Button variant="ghost" onClick={() => setRenaming(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setRenaming(true)}>
                {t('recordings.rename')}
              </Button>
              <Button variant="secondary" size="sm" icon={Download} onClick={() => void download()}>
                {t('recordings.download')}
              </Button>
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmDelete(true)}>
                {t('recordings.delete')}
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t('recordings.deleteTitle')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await repos.recordings.remove(recording.id);
          toast(t('recordings.deleted'));
        }}
      >
        <p>{t('recordings.deleteBody')}</p>
      </ConfirmDialog>
    </Card>
  );
}

export function RecordingsPage() {
  const { t, format } = useI18n();
  const repos = useRepositories();
  const toast = useToast();
  const recordings = useRecordings();
  const usage = useRecordingsUsage();
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const count = recordings?.length ?? 0;

  return (
    <>
      <PageHeader
        title={t('recordings.title')}
        intro={
          <>
            {t('recordings.count', { count })} · {t('recordings.intro')}
            {usage && usage.bytes > 0 && <> · {t('recordings.storage', { size: format.bytes(usage.bytes) })}</>}
          </>
        }
        actions={
          count > 0 ? (
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmDeleteAll(true)}>
              {t('recordings.deleteAll')}
            </Button>
          ) : undefined
        }
      />

      {recordings === undefined ? null : count === 0 ? (
        <EmptyState
          icon={AudioWaveform}
          action={
            <ButtonLink to="/practice" icon={Mic}>
              {t('recordings.emptyAction')}
            </ButtonLink>
          }
        >
          {t('recordings.empty')}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {recordings.map((recording) => (
            <li key={recording.id} className="animate-fade-up">
              <RecordingCard recording={recording} />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmDeleteAll}
        title={t('recordings.deleteAllTitle')}
        confirmLabel={t('recordings.deleteAll')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setConfirmDeleteAll(false)}
        onConfirm={async () => {
          setConfirmDeleteAll(false);
          await repos.recordings.removeAll();
          toast(t('recordings.allDeleted'));
        }}
      >
        <p>{t('recordings.deleteAllBody', { count })}</p>
      </ConfirmDialog>
    </>
  );
}
