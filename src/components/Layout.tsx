import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHeader({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex animate-fade-up flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl text-ink sm:text-4xl">{title}</h1>
        {intro && <p className="mt-2 max-w-prose text-ink-muted">{intro}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Callout({
  icon: Icon,
  title,
  children,
  tone = 'calm',
}: {
  icon: LucideIcon;
  title?: string;
  children: ReactNode;
  tone?: 'calm' | 'accent' | 'caution';
}) {
  const tones = {
    calm: 'bg-calm-soft text-ink',
    accent: 'bg-accent-soft text-ink',
    caution: 'bg-caution-soft text-ink',
  } as const;
  const iconTones = { calm: 'text-calm', accent: 'text-accent-ink', caution: 'text-caution' } as const;
  return (
    <div className={`flex gap-3 rounded-2xl p-4 text-sm ${tones[tone]}`}>
      <Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${iconTones[tone]}`} />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-ink-muted">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, children, action }: { icon: LucideIcon; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line-strong px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
        <Icon aria-hidden className="size-6" />
      </span>
      <p className="max-w-sm text-ink-muted">{children}</p>
      {action}
    </div>
  );
}

export function Chip({ children, icon: Icon, tone = 'accent' }: { children: ReactNode; icon?: LucideIcon; tone?: 'accent' | 'calm' | 'muted' }) {
  const tones = {
    accent: 'bg-accent-soft text-accent-ink',
    calm: 'bg-calm-soft text-calm',
    muted: 'bg-surface-muted text-ink-muted',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {children}
    </span>
  );
}
