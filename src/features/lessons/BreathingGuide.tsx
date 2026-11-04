import { Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useI18n } from '../../i18n/I18nContext';
import type { BreathingExercise } from '../../lessons/types';

type Phase = 'inhale' | 'hold' | 'exhale';

interface GuideState {
  running: boolean;
  done: boolean;
  cycle: number;
  phase: Phase;
  phaseStartedAt: number;
}

const IDLE: GuideState = { running: false, done: false, cycle: 1, phase: 'inhale', phaseStartedAt: 0 };

function phaseSeconds(exercise: BreathingExercise, phase: Phase) {
  if (phase === 'inhale') return exercise.inhaleSeconds;
  if (phase === 'hold') return exercise.holdSeconds;
  return exercise.exhaleSeconds;
}

/**
 * Paced breathing with a circle that grows on the in-breath. With reduced
 * motion the circle stays still and the words and countdown guide instead.
 */
export function BreathingGuide({ exercise }: { exercise: BreathingExercise }) {
  const { t } = useI18n();
  const [state, setState] = useState<GuideState>(IDLE);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!state.running) return;
    const duration = phaseSeconds(exercise, state.phase) * 1000;
    const timeout = window.setTimeout(() => {
      setState((current) => {
        const at = performance.now();
        if (current.phase === 'inhale') {
          return { ...current, phase: exercise.holdSeconds > 0 ? 'hold' : 'exhale', phaseStartedAt: at };
        }
        if (current.phase === 'hold') return { ...current, phase: 'exhale', phaseStartedAt: at };
        if (current.cycle >= exercise.cycles) return { ...IDLE, done: true };
        return { ...current, cycle: current.cycle + 1, phase: 'inhale', phaseStartedAt: at };
      });
    }, duration);
    const ticker = window.setInterval(() => setNow(performance.now()), 200);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(ticker);
    };
  }, [state.running, state.phase, state.cycle, exercise]);

  const begin = () => {
    const at = performance.now();
    setNow(at);
    setState({ running: true, done: false, cycle: 1, phase: 'inhale', phaseStartedAt: at });
  };

  const seconds = phaseSeconds(exercise, state.phase);
  const remaining = state.running ? Math.max(1, Math.ceil(seconds - (now - state.phaseStartedAt) / 1000)) : null;
  const expanded = state.running && state.phase !== 'exhale';

  return (
    <Card tone="soft" className="flex flex-col items-center gap-6 text-center">
      <div className="relative flex size-56 items-center justify-center" aria-hidden>
        <div className="absolute inset-0 rounded-full bg-accent-soft" />
        <div
          className="absolute inset-4 rounded-full bg-gradient-to-br from-lavender-300 to-lavender-500 opacity-80 shadow-lifted ease-in-out dark:from-lavender-700 dark:to-lavender-500"
          style={{
            transform: `scale(${expanded ? 1 : 0.55})`,
            transitionProperty: 'transform',
            transitionDuration: `${state.running ? seconds : 0.6}s`,
          }}
        />
        {remaining !== null && (
          <span className="relative text-3xl font-semibold text-white tabular-nums drop-shadow">{remaining}</span>
        )}
      </div>

      <div aria-live="polite" className="min-h-14">
        {state.running ? (
          <>
            <p className="font-display text-2xl text-ink">{t(`breathing.${state.phase}`)}</p>
            <p className="text-sm text-ink-muted">{t('breathing.cycle', { current: state.cycle, total: exercise.cycles })}</p>
          </>
        ) : state.done ? (
          <p className="text-ink">{t('breathing.finished')}</p>
        ) : null}
      </div>

      {state.running ? (
        <Button variant="secondary" icon={Pause} onClick={() => setState(IDLE)}>
          {t('breathing.stop')}
        </Button>
      ) : (
        <Button icon={state.done ? RotateCcw : Play} onClick={begin}>
          {state.done ? t('breathing.again') : t('breathing.start')}
        </Button>
      )}
    </Card>
  );
}
