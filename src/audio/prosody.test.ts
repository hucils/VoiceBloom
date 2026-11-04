// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { midiToHz } from './pitchMath';
import { summarizeProsody } from './prosody';

const HOP = 0.02;
/** n frames of pitch, given in semitones relative to 200 Hz. */
const voiced = (n: number, semitones: (i: number) => number = () => 0) =>
  Array.from({ length: n }, (_, i) => midiToHz(67 + semitones(i)) * (200 / midiToHz(67)));
const gap = (n: number) => new Array<null>(n).fill(null);

/** Speech-like phrasing: voiced syllable groups with gently moving pitch, between short pauses. */
const speech = (groups: number) =>
  Array.from({ length: groups }, (_, g) => [...voiced(16, (i) => 2 * Math.sin((g * 16 + i) / 6)), ...gap(6)]).flat();

describe('prosody', () => {
  it('finds no breaks and no held notes in ordinary speech', () => {
    const summary = summarizeProsody(speech(30), HOP)!;
    expect(summary.breaksPerMinute).toBe(0);
    expect(summary.sustainedShare).toBe(0);
  });

  it('recognises held notes and sirens', () => {
    expect(summarizeProsody(voiced(150), HOP)!.sustainedShare).toBe(1);
    expect(summarizeProsody(voiced(150, (i) => i / 10), HOP)!.sustainedShare).toBe(1);
    const mixed = [...speech(10), ...voiced(100)];
    expect(summarizeProsody(mixed, HOP)!.sustainedShare).toBeCloseTo(100 / 260, 5);
  });

  it('counts sudden jumps between registers', () => {
    // 1.2 s phrases that flip 8 semitones every 0.2 s: five breaks per phrase.
    const phrase = [...voiced(60, (i) => (Math.floor(i / 10) % 2 === 0 ? 0 : -8)), ...gap(10)];
    const track = [...phrase, ...phrase, ...phrase];
    const summary = summarizeProsody(track, HOP)!;
    expect(summary.breaksPerMinute).toBeCloseTo(15 / ((180 * HOP) / 60), 5);
  });

  it('does not mistake even a fast glide for a break', () => {
    // 10 semitones in 0.2 s is fast for speech, but it moves 1 semitone per frame.
    const track = [...voiced(20), ...voiced(10, (i) => i + 1), ...voiced(20, () => 10)];
    expect(summarizeProsody(track, HOP)!.breaksPerMinute).toBe(0);
  });

  it('counts a jump across a frame or two lost to outlier removal, but not across a pause', () => {
    const across = (pause: number) => [...voiced(20), ...gap(pause), ...voiced(20, () => -12)];
    expect(summarizeProsody(across(1), HOP)!.breaksPerMinute).toBeGreaterThan(0);
    expect(summarizeProsody(across(2), HOP)!.breaksPerMinute).toBeGreaterThan(0);
    expect(summarizeProsody(across(3), HOP)!.breaksPerMinute).toBe(0);
  });

  it('ignores drops as a phrase fades out, and jumps at its very start', () => {
    const fade = [...voiced(30), ...voiced(4, () => -12)];
    const onset = [...voiced(2, () => 12), ...voiced(30)];
    expect(summarizeProsody(fade, HOP)!.breaksPerMinute).toBe(0);
    expect(summarizeProsody(onset, HOP)!.breaksPerMinute).toBe(0);
  });

  it('returns null without any voiced frames', () => {
    expect(summarizeProsody([], HOP)).toBeNull();
    expect(summarizeProsody(gap(50), HOP)).toBeNull();
  });
});
