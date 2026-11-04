import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const CONTROL =
  'w-full rounded-2xl border border-line-strong bg-surface px-4 py-2.5 text-ink placeholder:text-ink-subtle transition-colors focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30';

interface FieldChrome {
  label: string;
  hint?: string;
  error?: string;
}

function describedBy(id: string, hint?: string, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
}

export function TextField({ label, hint, error, className = '', ...props }: FieldChrome & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        className={CONTROL}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-record">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({ label, hint, className = '', ...props }: FieldChrome & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        className={`${CONTROL} min-h-28 resize-y leading-relaxed`}
        aria-describedby={describedBy(id, hint)}
        {...props}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
