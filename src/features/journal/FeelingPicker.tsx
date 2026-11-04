import { useI18n } from '../../i18n/I18nContext';
import { VOICE_FEELINGS, type VoiceFeeling } from '../../persistence';

/** How the voice feels, in the person's own words. Pressing a choice again clears it. */
export function FeelingPicker({ value, onChange }: { value: VoiceFeeling | null; onChange: (value: VoiceFeeling | null) => void }) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{t('reflection.feelingLabel')}</legend>
      <div className="flex flex-wrap gap-2">
        {VOICE_FEELINGS.map((feeling) => {
          const selected = value === feeling;
          return (
            <button
              key={feeling}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : feeling)}
              className={`h-9 rounded-full border px-4 text-sm transition-colors ${
                selected
                  ? 'border-accent bg-accent-soft font-semibold text-accent-ink'
                  : 'border-line-strong text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              {t(`feelings.${feeling}`)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
