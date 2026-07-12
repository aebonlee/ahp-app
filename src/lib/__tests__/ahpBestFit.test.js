import { describe, it, expect } from 'vitest';
import { findBestFit } from '../ahpBestFit';
import { calculateAHP } from '../ahpEngine';

describe('findBestFit', () => {
  it('returns recommendations that lower CR', () => {
    const items = ['A', 'B', 'C', 'D'];
    // Create an inconsistent set of values
    const values = {
      'A:B': -3,  // A preferred
      'A:C': 5,   // C preferred
      'A:D': -2,  // A preferred
      'B:C': 7,   // C preferred
      'B:D': -4,  // B preferred
      'C:D': -3,  // C preferred
    };

    const { cr: currentCR } = calculateAHP(items, values);
    const recs = findBestFit(items, values, 5);

    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(5);

    // Each recommendation should have lower CR
    for (const rec of recs) {
      expect(rec.cr).toBeLessThan(currentCR);
      expect(rec.improvement).toBeGreaterThan(0);
    }

    // Recommendations should be sorted by improvement
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].improvement).toBeGreaterThanOrEqual(recs[i].improvement);
    }
  });

  it('returns empty array for already consistent matrix', () => {
    const items = ['A', 'B'];
    const values = { 'A:B': 3 };
    const recs = findBestFit(items, values, 5);
    // For 2 items, CR is always 0, so no improvements possible
    expect(recs.length).toBe(0);
  });
});
