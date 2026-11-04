// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { harmonicTone, silence, sine } from '../test/signals';
import { FrameHistory, LiveAnalyzer, steadinessCents, type LiveFrame } from './live';
import { classifyMicrophoneError } from './microphone';
import { extensionForMimeType, pickRecordingMimeType } from './recorder';

const SR = 48_000;
const FRAME = 2048;
const frameOf = (signal: Float32Array, index = 0) => signal.subarray(index * FRAME, (index + 1) * FRAME);

describe('LiveAnalyzer', () => {
  it('reads pitch and level from microphone frames', () => {
    const analyzer = new LiveAnalyzer(SR);
    const tone = harmonicTone(196, SR, 0.2);
    const reading = analyzer.process(frameOf(tone), 1);
    expect(reading.frequency).toBeCloseTo(196, 0);
    expect(reading.levelDb).toBeGreaterThan(-20);
    expect(reading.time).toBe(1);
  });

  it('reports silence without a pitch', () => {
    const reading = new LiveAnalyzer(SR).process(frameOf(silence(SR, 0.1)), 0);
    expect(reading.frequency).toBeNull();
    expect(reading.levelDb).toBe(-100);
  });

  it('smooths away a single-frame octave jump', () => {
    const analyzer = new LiveAnalyzer(SR);
    const low = frameOf(sine(200, SR, 0.1));
    const high = frameOf(sine(400, SR, 0.1));
    const outputs = [low, low, high, low].map((frame, i) => analyzer.process(frame, i).frequency!);
    expect(Math.max(...outputs)).toBeLessThan(210);
  });

  it('holds back a short leap at the end of a phrase', () => {
    const analyzer = new LiveAnalyzer(SR);
    const held = frameOf(sine(200, SR, 0.1));
    const leap = frameOf(sine(600, SR, 0.1));
    for (let i = 0; i < 6; i++) analyzer.process(held, i);
    expect(analyzer.process(leap, 6).frequency).toBeNull();
    expect(analyzer.process(leap, 7).frequency).toBeNull();
  });

  it('follows a change of register that persists', () => {
    const analyzer = new LiveAnalyzer(SR);
    const low = frameOf(sine(150, SR, 0.1));
    const high = frameOf(sine(400, SR, 0.1));
    for (let i = 0; i < 5; i++) analyzer.process(low, i);
    const outputs = Array.from({ length: 6 }, (_, i) => analyzer.process(high, 5 + i).frequency);
    expect(outputs.slice(0, 3)).toEqual([null, null, null]);
    expect(outputs.at(-1)).toBeCloseTo(400, 0);
  });

  it('starts fresh after a pause', () => {
    const analyzer = new LiveAnalyzer(SR);
    const low = frameOf(sine(150, SR, 0.1));
    const quiet = frameOf(silence(SR, 0.1));
    const high = frameOf(sine(300, SR, 0.1));
    [low, low, quiet, quiet, quiet].forEach((frame, i) => analyzer.process(frame, i));
    expect(analyzer.process(high, 5).frequency).toBeCloseTo(300, 0);
  });
});

describe('steadiness', () => {
  const frames = (values: Array<number | null>): LiveFrame[] =>
    values.map((frequency, i) => ({ time: i / 60, frequency, levelDb: -20 }));

  it('is near zero for a held note and larger for a wavering one', () => {
    const steady = frames(Array.from({ length: 60 }, () => 220));
    const wavering = frames(Array.from({ length: 60 }, (_, i) => 220 * 2 ** ((Math.sin(i / 3) * 0.5) / 12)));
    expect(steadinessCents(steady, 1)).toBeCloseTo(0, 5);
    expect(steadinessCents(wavering, 1)!).toBeGreaterThan(20);
  });

  it('needs most of the window to be voiced', () => {
    const patchy = frames(Array.from({ length: 60 }, (_, i) => (i % 2 ? 220 : null)));
    expect(steadinessCents(patchy, 1)).toBeNull();
  });
});

describe('FrameHistory', () => {
  it('keeps only recent frames', () => {
    const history = new FrameHistory(2);
    for (let t = 0; t <= 5; t += 0.5) history.push({ time: t, frequency: 100, levelDb: -20 });
    expect(history.all[0]!.time).toBe(3);
    expect(history.latest?.time).toBe(5);
    history.clear();
    expect(history.all).toHaveLength(0);
  });
});

describe('microphone errors', () => {
  it('maps browser errors to friendly categories', () => {
    expect(classifyMicrophoneError({ name: 'NotAllowedError' })).toBe('denied');
    expect(classifyMicrophoneError({ name: 'NotFoundError' })).toBe('not-found');
    expect(classifyMicrophoneError({ name: 'NotReadableError' })).toBe('in-use');
    expect(classifyMicrophoneError(new Error('boom'))).toBe('unknown');
    expect(classifyMicrophoneError(null)).toBe('unknown');
  });
});

describe('recording formats', () => {
  it('prefers Opus, falling back to whatever is supported', () => {
    expect(pickRecordingMimeType(() => true)).toBe('audio/webm;codecs=opus');
    expect(pickRecordingMimeType((type) => type.startsWith('audio/mp4'))).toBe('audio/mp4;codecs=mp4a.40.2');
    expect(pickRecordingMimeType(() => false)).toBeUndefined();
  });

  it('chooses a file extension for downloads', () => {
    expect(extensionForMimeType('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionForMimeType('audio/mp4')).toBe('m4a');
    expect(extensionForMimeType('audio/ogg; codecs=opus')).toBe('ogg');
  });
});
