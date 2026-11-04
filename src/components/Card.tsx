import type { LucideIcon } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'div';
  tone?: 'plain' | 'soft';
}

export function Card({ as: Element = 'section', tone = 'plain', className = '', children, ...props }: CardProps) {
  const surface = tone === 'soft' ? 'bg-surface-muted' : 'bg-surface';
  return (
    <Element className={`rounded-3xl border border-line ${surface} p-5 shadow-soft sm:p-6 ${className}`} {...props}>
      {children}
    </Element>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  /** Heading level, so pages keep a correct outline. */
  level?: 2 | 3;
  id?: string;
}

export function CardHeader({ title, description, icon: Icon, actions, level = 2, id }: CardHeaderProps) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <div className="mb-4 flex items-start gap-3">
      {Icon && (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
          <Icon aria-hidden className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Heading id={id} className="text-xl text-ink">
          {title}
        </Heading>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
