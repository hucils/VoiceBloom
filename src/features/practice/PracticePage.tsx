import { Lightbulb } from 'lucide-react';

import { Card } from '../../components/Card';
import { PageHeader } from '../../components/Layout';
import { useI18n } from '../../i18n/I18nContext';
import { PRACTICE_IDEAS } from '../../lessons/practiceIdeas';
import { VoiceStudio } from '../voice/VoiceStudio';

export function PracticePage() {
  const { t, l } = useI18n();
  return (
    <>
      <PageHeader title={t('home.practiceTitle')} intro={t('home.practiceBody')} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <VoiceStudio showPitch showLevel showSteadiness recording={{ maxSeconds: 120 }} />
        <Card as="div" tone="soft" className="!p-5">
          <h2 className="flex items-center gap-2 text-lg text-ink">
            <Lightbulb aria-hidden className="size-5 text-accent" />
            {t('practice.ideasTitle')}
          </h2>
          <ul className="mt-3 space-y-3">
            {PRACTICE_IDEAS.map((idea) => (
              <li key={idea.title.en}>
                <p className="font-medium text-ink">{l(idea.title)}</p>
                <p className="text-sm text-ink-muted">{l(idea.body)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
