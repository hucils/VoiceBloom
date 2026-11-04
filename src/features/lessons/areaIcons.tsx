import { AudioLines, Feather, MessageCircle, Music, Sprout, Sun, type LucideIcon } from 'lucide-react';

import type { SkillAreaId } from '../../lessons/types';

const ICONS: Record<SkillAreaId, LucideIcon> = {
  foundations: Sprout,
  pitch: AudioLines,
  resonance: Sun,
  weight: Feather,
  intonation: Music,
  articulation: MessageCircle,
};

export function AreaIcon({ area, size = 'md' }: { area: SkillAreaId; size?: 'sm' | 'md' }) {
  const Icon = ICONS[area];
  const box = size === 'sm' ? 'size-8 rounded-xl' : 'size-11 rounded-2xl';
  return (
    <span className={`flex shrink-0 items-center justify-center bg-accent-soft text-accent-ink ${box}`}>
      <Icon aria-hidden className={size === 'sm' ? 'size-4' : 'size-5'} />
    </span>
  );
}
