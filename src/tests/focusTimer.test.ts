import { describe, expect, it } from 'vitest';
import {
  MAX_FOCUS_MINUTES,
  MIN_FOCUS_MINUTES,
  clampFocusMinutes,
} from '../hooks/useFocusTimer';

describe('useFocusTimer helpers', () => {
  it('clamps custom durations into the supported range', () => {
    expect(clampFocusMinutes(0)).toBe(MIN_FOCUS_MINUTES);
    expect(clampFocusMinutes(-90)).toBe(MIN_FOCUS_MINUTES);
    expect(clampFocusMinutes(10_000)).toBe(MAX_FOCUS_MINUTES);
    expect(clampFocusMinutes(90)).toBe(90);
    expect(clampFocusMinutes(90.4)).toBe(90);
  });

  it('falls back to the default for non-numeric input', () => {
    expect(clampFocusMinutes(Number.NaN)).toBe(25);
    expect(clampFocusMinutes(Number.POSITIVE_INFINITY)).toBe(MAX_FOCUS_MINUTES);
  });
});
