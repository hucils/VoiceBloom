import { ArrowLeft, ArrowRight, Heart, ShieldCheck, Sparkles, Sprout, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { SegmentedControl } from '../../components/Controls';
import { Logo } from '../../components/Logo';
import { useI18n } from '../../i18n/I18nContext';
import { LOCALE_NAMES, LOCALES } from '../../i18n/locales';
import { useSettings } from '../../state/SettingsContext';

const STEPS = [
  { title: 'onboarding.welcomeTitle', body: 'onboarding.welcomeBody', icon: Sprout },
  { title: 'onboarding.privacyTitle', body: 'onboarding.privacyBody', icon: ShieldCheck },
  { title: 'onboarding.careTitle', body: 'onboarding.careBody', icon: Heart },
  { title: 'onboarding.measuresTitle', body: 'onboarding.measuresBody', icon: Sparkles },
] as const satisfies ReadonlyArray<{ title: string; body: string; icon: LucideIcon }>;

/** First-run welcome: language, privacy, care and how measurements are meant. */
export function Onboarding() {
  const { t } = useI18n();
  const { settings, update } = useSettings();
  const [index, setIndex] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const step = STEPS[index]!;
  const Icon = step.icon;
  const last = index === STEPS.length - 1;

  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [index]);

  const goTo = (next: number) => {
    moved.current = true;
    setIndex(next);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Logo className="size-11" />
          <span className="font-display text-2xl text-ink [font-variation-settings:'SOFT'_100]">VoiceBloom</span>
        </div>
        <Card key={index} className="animate-fade-up space-y-5 !p-6 sm:!p-8">
          <div className="flex items-center justify-between">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
              <Icon aria-hidden className="size-6" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">
              {t('onboarding.stepLabel', { current: index + 1, total: STEPS.length })}
            </span>
          </div>
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl text-ink outline-none">
            {t(step.title)}
          </h1>
          <p className="leading-relaxed text-ink-muted">{t(step.body)}</p>
          {index === 0 && (
            <SegmentedControl
              label={t('onboarding.languageLabel')}
              value={settings.locale}
              options={LOCALES.map((locale) => ({ value: locale, label: LOCALE_NAMES[locale] }))}
              onChange={(locale) => void update({ locale })}
            />
          )}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => goTo(index - 1)} disabled={index === 0}>
              {t('common.back')}
            </Button>
            {last ? (
              <Button iconEnd={ArrowRight} onClick={() => void update({ onboardingCompleted: true })}>
                {t('onboarding.begin')}
              </Button>
            ) : (
              <Button iconEnd={ArrowRight} onClick={() => goTo(index + 1)}>
                {t('common.next')}
              </Button>
            )}
          </div>
          <div aria-hidden className="flex justify-center gap-1.5 pt-1">
            {STEPS.map((_, dot) => (
              <span
                key={dot}
                className={`h-1.5 rounded-full transition-all duration-300 ${dot === index ? 'w-6 bg-accent' : 'w-1.5 bg-line-strong'}`}
              />
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
