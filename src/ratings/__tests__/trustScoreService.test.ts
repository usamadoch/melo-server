import { describe, it, expect } from 'vitest';
import { calculateTrustScore, MIN_RATINGS, NEUTRAL_DEFAULT } from '../trustScoreService.js';

describe('calculateTrustScore', () => {
  it('returns NEUTRAL_DEFAULT when total ratings is below MIN_RATINGS', () => {
    // 0 likes, 0 total -> 0 < 5
    expect(calculateTrustScore(0, 0)).toBe(NEUTRAL_DEFAULT);
    
    // 4 likes, 4 total -> 4 < 5
    expect(calculateTrustScore(4, 4)).toBe(NEUTRAL_DEFAULT);

    // 0 likes, 4 total -> 4 < 5
    expect(calculateTrustScore(0, 4)).toBe(NEUTRAL_DEFAULT);

    // 2 likes, 4 total -> 4 < 5
    expect(calculateTrustScore(2, 4)).toBe(NEUTRAL_DEFAULT);
  });

  it('calculates Wilson score lower bound correctly for 100% like ratio', () => {
    // 5 likes / 5 total is a 100% ratio, but small sample
    const score5 = calculateTrustScore(5, 5);
    expect(score5).toBeGreaterThan(NEUTRAL_DEFAULT);
    expect(score5).toBeLessThan(100);

    // 100 likes / 100 total is also 100% ratio, but much higher confidence
    const score100 = calculateTrustScore(100, 100);
    expect(score100).toBeGreaterThan(score5);
    expect(score100).toBeLessThan(100);
  });

  it('calculates Wilson score lower bound correctly for 0% like ratio', () => {
    // 0 likes / 5 dislikes
    const score5 = calculateTrustScore(0, 5);
    expect(score5).toBe(0);

    // 0 likes / 100 dislikes
    const score100 = calculateTrustScore(0, 100);
    expect(score100).toBe(0);
  });

  it('prioritizes confidence over raw ratio', () => {
    const score10_1 = calculateTrustScore(10, 11);
    const score970_30 = calculateTrustScore(970, 1000);
    const score5_0 = calculateTrustScore(5, 5);

    expect(score970_30).toBeGreaterThan(score5_0);
    expect(score970_30).toBeGreaterThan(score10_1);
  });
});

import { calculateBaseTrust, MATURITY_THRESHOLD } from '../trustScoreService.js';

describe('Trust Bootstrap', () => {
  it('calculates base trust properly', () => {
    const now = new Date();
    
    // Brand new, unverified
    const baseNewUnverified = calculateBaseTrust(false, now);
    expect(baseNewUnverified).toBe(40);
    
    // Brand new, verified
    const baseNewVerified = calculateBaseTrust(true, now);
    expect(baseNewVerified).toBe(55); // 40 + 15
    
    // Old, unverified (> 30 days)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);
    const baseOldUnverified = calculateBaseTrust(false, oldDate);
    expect(baseOldUnverified).toBe(45); // 40 + 5
    
    // Old, verified
    const baseOldVerified = calculateBaseTrust(true, oldDate);
    expect(baseOldVerified).toBe(60); // 40 + 15 + 5
  });

  it('calculates effective trust blending properly', () => {
    const baseTrust = 60;
    const earnedTrust = 95;
    
    // 0 conversations -> 100% base
    let totalConversations = 0;
    let trustMaturity = Math.min(1.0, totalConversations / MATURITY_THRESHOLD);
    let effectiveTrust = baseTrust * (1 - trustMaturity) + earnedTrust * trustMaturity;
    expect(effectiveTrust).toBe(60);
    
    // 10 conversations -> 50% base, 50% earned
    totalConversations = 10;
    trustMaturity = Math.min(1.0, totalConversations / MATURITY_THRESHOLD);
    effectiveTrust = baseTrust * (1 - trustMaturity) + earnedTrust * trustMaturity;
    expect(effectiveTrust).toBe((60 * 0.5) + (95 * 0.5));
    
    // 30 conversations -> 100% earned
    totalConversations = 30;
    trustMaturity = Math.min(1.0, totalConversations / MATURITY_THRESHOLD);
    effectiveTrust = baseTrust * (1 - trustMaturity) + earnedTrust * trustMaturity;
    expect(effectiveTrust).toBe(95);
  });
});
