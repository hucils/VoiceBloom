// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { centsBetween, hzToMidi, hzToNote, midiToHz, semitonesBetween } from './pitchMath';

describe('pitch math', () => {
  it('converts between Hz and MIDI note numbers', () => {
    expect(hzToMidi(440)).toBeCloseTo(69, 10);
    expect(midiToHz(60)).toBeCloseTo(261.626, 3);
    expect(hzToMidi(midiToHz(53.3))).toBeCloseTo(53.3, 10);
  });

  it('measures intervals in semitones and cents', () => {
    expect(semitonesBetween(220, 440)).toBeCloseTo(12, 10);
    expect(semitonesBetween(440, 220)).toBeCloseTo(-12, 10);
    expect(centsBetween(440, midiToHz(70))).toBeCloseTo(100, 6);
  });

  it('names the nearest note in scientific pitch notation', () => {
    expect(hzToNote(261.63)).toEqual({ pitchClass: 0, octave: 4, cents: 0, midi: 60 });
    expect(hzToNote(110)).toMatchObject({ pitchClass: 9, octave: 2, cents: 0 });
    expect(hzToNote(185)).toMatchObject({ pitchClass: 6, octave: 3 }); // F♯3
  });

  it('reports the deviation from the nearest note in cents', () => {
    expect(hzToNote(445)?.cents).toBe(20);
    expect(hzToNote(435)?.cents).toBe(-20);
  });

  it('returns null for frequencies that are not positive and finite', () => {
    expect(hzToNote(0)).toBeNull();
    expect(hzToNote(-10)).toBeNull();
    expect(hzToNote(Number.NaN)).toBeNull();
    expect(hzToNote(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
