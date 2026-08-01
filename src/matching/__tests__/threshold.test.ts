import { describe, it, expect } from 'vitest';
import { threshold, INITIAL_THRESHOLD, MIN_THRESHOLD } from '../matchingService.js';

describe('Matching Threshold Pure Function', () => {
  it('returns INITIAL_THRESHOLD when wait time is 0', () => {
    expect(threshold(0)).toBe(INITIAL_THRESHOLD);
  });

  it('decays to MIN_THRESHOLD exactly at 45 seconds', () => {
    expect(threshold(45)).toBeCloseTo(MIN_THRESHOLD);
  });

  it('does not decay below MIN_THRESHOLD for very long wait times', () => {
    expect(threshold(1000)).toBe(MIN_THRESHOLD);
    expect(threshold(3600)).toBe(MIN_THRESHOLD);
  });

  it('returns a threshold smoothly decaying between 0 and 45 seconds', () => {
    const halfTime = 22.5; // Half of 45 seconds
    const expected = INITIAL_THRESHOLD - ((INITIAL_THRESHOLD - MIN_THRESHOLD) / 2);
    expect(threshold(halfTime)).toBeCloseTo(expected);
  });
});
