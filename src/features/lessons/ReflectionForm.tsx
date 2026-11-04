import { CircleCheck, NotebookPen } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { TextArea } from '../../components/Field';
import { useI18n } from '../../i18n/I18nContext';
import type { LocalizedText } from '../../i18n/locales';
import type { VoiceFeeling } from '../../persistence';
import { useRepositories } from '../../state/DataContext';
import { FeelingPicker } from '../journal/FeelingPicker';

/** An optional journal entry, written right inside the lesson. */
export function ReflectionForm({ lessonId, prompt }: { lessonId: string; prompt: LocalizedText }) {
  const { t, l } = useI18n();
  const repos = useRepositories();
  const [feeling, setFeeling] = useState<VoiceFeeling | null>(null);
  const [body, setBody] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (savedId) await repos.journal.update(savedId, { feeling, body });
      else setSavedId((await repos.journal.create({ feeling, body, lessonId })).id);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const empty = body.trim() === '' && feeling === null;
  return (
    <Card tone="soft" className="space-y-5">
      <div>
        <p className="text-sm font-medium text-ink-muted">{t('reflection.prompt')}</p>
        <p className="mt-1 font-display text-xl text-ink [font-variation-settings:'SOFT'_100]">{l(prompt)}</p>
      </div>
      <FeelingPicker
        value={feeling}
        onChange={(value) => {
          setFeeling(value);
          setDirty(true);
        }}
      />
      <TextArea
        label={t('reflection.notesLabel')}
        placeholder={t('reflection.notesPlaceholder')}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setDirty(true);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button icon={NotebookPen} onClick={() => void save()} disabled={empty || saving || (savedId !== null && !dirty)}>
          {t('reflection.save')}
        </Button>
        {savedId && !dirty && (
          <span className="inline-flex items-center gap-1.5 text-sm text-calm" role="status">
            <CircleCheck aria-hidden className="size-4" />
            {t('reflection.saved')}
          </span>
        )}
      </div>
      <p className="text-xs text-ink-muted">{t('reflection.optionalNote')}</p>
    </Card>
  );
}
