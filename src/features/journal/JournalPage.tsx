import { NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TextArea } from '../../components/Field';
import { Chip, EmptyState, PageHeader } from '../../components/Layout';
import { useToast } from '../../components/ToastProvider';
import { useI18n } from '../../i18n/I18nContext';
import { getLesson } from '../../lessons/catalog';
import type { JournalEntry, RecordingMeta, VoiceFeeling } from '../../persistence';
import { useRepositories } from '../../state/DataContext';
import { useJournalEntries, useRecordings } from '../../state/queries';
import { FeelingPicker } from './FeelingPicker';

const PROMPTS = ['easy', 'moment', 'next', 'throat', 'proud'] as const;

/** One prompt per day, so it stays put while the person writes. */
function promptOfTheDay() {
  const day = Math.floor(Date.now() / 86_400_000);
  return PROMPTS[day % PROMPTS.length]!;
}

interface EditorProps {
  entry?: JournalEntry;
  recordings: readonly RecordingMeta[];
  onDone: () => void;
}

function JournalEditor({ entry, recordings, onDone }: EditorProps) {
  const { t, format } = useI18n();
  const repos = useRepositories();
  const toast = useToast();
  const selectId = useId();
  const [feeling, setFeeling] = useState<VoiceFeeling | null>(entry?.feeling ?? null);
  const [body, setBody] = useState(entry?.body ?? '');
  const [recordingId, setRecordingId] = useState(entry?.recordingId ?? '');
  const [saving, setSaving] = useState(false);
  const empty = body.trim() === '' && feeling === null;

  const save = async () => {
    setSaving(true);
    try {
      const draft = { feeling, body, recordingId: recordingId || null };
      if (entry) await repos.journal.update(entry.id, draft);
      else await repos.journal.create(draft);
      toast(t('journal.saved'));
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="animate-fade-up space-y-5">
      <h2 className="text-xl text-ink">{entry ? t('journal.editTitle') : t('journal.newTitle')}</h2>
      {!entry && (
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">{t('journal.todayPrompt')}:</span>{' '}
          {t(`journal.prompts.${promptOfTheDay()}`)}
        </p>
      )}
      <FeelingPicker value={feeling} onChange={setFeeling} />
      <TextArea
        label={t('reflection.notesLabel')}
        placeholder={t('reflection.notesPlaceholder')}
        value={body}
        rows={5}
        onChange={(event) => setBody(event.target.value)}
      />
      {recordings.length > 0 && (
        <div>
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink">
            {t('journal.linkRecording')}
          </label>
          <select
            id={selectId}
            value={recordingId}
            onChange={(event) => setRecordingId(event.target.value)}
            className="w-full rounded-2xl border border-line-strong bg-surface px-4 py-2.5 text-ink focus:border-accent focus:outline-none"
          >
            <option value="">{t('journal.noRecording')}</option>
            {recordings.map((recording) => (
              <option key={recording.id} value={recording.id}>
                {(recording.title || t('common.untitled')) + ' · ' + format.dateTime(recording.createdAt)}
              </option>
            ))}
          </select>
        </div>
      )}
      {empty && <p className="text-xs text-ink-muted">{t('journal.emptyBody')}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void save()} disabled={empty || saving}>
          {t('common.save')}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          {t('common.cancel')}
        </Button>
      </div>
    </Card>
  );
}

function EntryCard({ entry, recordings, onEdit }: { entry: JournalEntry; recordings: readonly RecordingMeta[]; onEdit: () => void }) {
  const { t, l, format } = useI18n();
  const repos = useRepositories();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lesson = getLesson(entry.lessonId);
  const recording = recordings.find((candidate) => candidate.id === entry.recordingId);

  return (
    <Card as="article" className="!p-5">
      <div className="flex flex-wrap items-center gap-2">
        <time dateTime={new Date(entry.createdAt).toISOString()} className="text-sm font-medium text-ink">
          {format.dateTime(entry.createdAt)}
        </time>
        {entry.updatedAt - entry.createdAt > 60_000 && <span className="text-xs text-ink-subtle">({t('journal.edited')})</span>}
        {entry.feeling && <Chip>{t(`feelings.${entry.feeling}`)}</Chip>}
      </div>
      {entry.body && <p className="mt-3 whitespace-pre-wrap text-ink">{entry.body}</p>}
      {(lesson || recording) && (
        <div className="mt-3 space-y-1 text-xs text-ink-muted">
          {lesson && (
            <p>
              <Link to={`/lessons/${lesson.id}`} className="hover:text-ink hover:underline">
                {t('journal.fromLesson', { lesson: l(lesson.title) })}
              </Link>
            </p>
          )}
          {recording && (
            <p>
              {t('journal.linkRecording')}:{' '}
              <Link to="/recordings" className="font-medium text-accent-ink hover:underline">
                {recording.title || t('common.untitled')}
              </Link>
            </p>
          )}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="ghost" size="sm" icon={Pencil} onClick={onEdit}>
          {t('common.edit')}
        </Button>
        <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setConfirmDelete(true)}>
          {t('common.delete')}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={t('journal.deleteTitle')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await repos.journal.remove(entry.id);
          toast(t('journal.deleted'));
        }}
      >
        <p>{t('journal.deleteBody')}</p>
      </ConfirmDialog>
    </Card>
  );
}

export function JournalPage() {
  const { t } = useI18n();
  const entries = useJournalEntries();
  const recordings = useRecordings() ?? [];
  const [editing, setEditing] = useState<'new' | string | null>(null);

  return (
    <>
      <PageHeader
        title={t('journal.title')}
        intro={t('journal.intro')}
        actions={
          editing !== 'new' ? (
            <Button icon={Plus} onClick={() => setEditing('new')}>
              {t('journal.newEntry')}
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-4">
        {editing === 'new' && <JournalEditor recordings={recordings} onDone={() => setEditing(null)} />}
        {entries === undefined ? null : entries.length === 0 && editing !== 'new' ? (
          <EmptyState
            icon={NotebookPen}
            action={
              <Button icon={Plus} onClick={() => setEditing('new')}>
                {t('journal.newEntry')}
              </Button>
            }
          >
            {t('journal.empty')}
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li key={entry.id} className="animate-fade-up">
                {editing === entry.id ? (
                  <JournalEditor entry={entry} recordings={recordings} onDone={() => setEditing(null)} />
                ) : (
                  <EntryCard entry={entry} recordings={recordings} onEdit={() => setEditing(entry.id)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
