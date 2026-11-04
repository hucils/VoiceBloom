import { useId } from 'react';

/** The VoiceBloom mark: a five-petal bloom around a small sound wave. */
export function Logo({ className = 'size-9', title }: { className?: string; title?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 512 512" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9a2e8" />
          <stop offset="1" stopColor="#7654bc" />
        </linearGradient>
        <linearGradient id={`${id}-core`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8f6dd3" />
          <stop offset="1" stopColor="#60439b" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill={`url(#${id}-bg)`} />
      <g transform="translate(256 262)" fill="#fffcf7" opacity="0.96">
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse key={angle} cx="0" cy="-92" rx="58" ry="94" transform={`rotate(${angle})`} />
        ))}
      </g>
      <circle cx="256" cy="262" r="60" fill={`url(#${id}-core)`} />
      <g fill="#fffcf7">
        <rect x="222" y="244" width="16" height="36" rx="8" />
        <rect x="248" y="228" width="16" height="68" rx="8" />
        <rect x="274" y="244" width="16" height="36" rx="8" />
      </g>
    </svg>
  );
}
