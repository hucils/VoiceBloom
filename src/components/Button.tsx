import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Icon after the label, e.g. a forward arrow. */
  iconEnd?: LucideIcon;
}

export function Button({
  variant,
  size,
  icon: Icon,
  iconEnd: IconEnd,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...props}>
      {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
      {children}
      {IconEnd && <IconEnd aria-hidden className="size-4 shrink-0" />}
    </button>
  );
}

interface ButtonLinkProps {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconEnd?: LucideIcon;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({ to, variant, size, icon: Icon, iconEnd: IconEnd, className, children }: ButtonLinkProps) {
  return (
    <Link to={to} className={buttonClasses(variant, size, className)}>
      {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
      {children}
      {IconEnd && <IconEnd aria-hidden className="size-4 shrink-0" />}
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: LucideIcon;
}

/** Round icon-only button; `label` is its accessible name and tooltip. */
export function IconButton({ label, icon: Icon, className = '', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-50 ${className}`}
      {...props}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
