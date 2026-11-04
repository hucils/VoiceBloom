import { useId, type ReactNode } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="font-medium text-ink">
          {label}
        </label>
        {description && (
          <p id={`${id}-description`} className="mt-0.5 text-sm text-ink-muted">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
          checked ? 'bg-accent' : 'bg-line-strong'
        }`}
      >
        <span
          aria-hidden
          className={`inline-block size-5 rounded-full bg-surface shadow-soft transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

/** A row of choices built on native radio buttons (keyboard support included). */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{label}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface-muted p-1">
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="inline-flex h-9 cursor-pointer items-center rounded-full px-4 text-sm font-medium text-ink-muted transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:text-ink">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface ProgressMeterProps {
  value: number;
  max: number;
  label: string;
  className?: string;
}

/** A thin meter: the fill and its lighter track come from the same lavender ramp. */
export function ProgressMeter({ value, max, label, className = '' }: ProgressMeterProps) {
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`h-2 overflow-hidden rounded-full bg-accent-soft ${className}`}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500 ease-gentle"
        style={{ width: `${fraction * 100}%` }}
      />
    </div>
  );
}
