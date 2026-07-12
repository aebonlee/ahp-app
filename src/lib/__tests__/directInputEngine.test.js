import { describe, it, expect } from 'vitest';
import { calculateDirectPriorities, aggregateDirectInputs } from '../directInputEngine';

describe('calculateDirectPriorities', () => {
  it('normalizes values to sum to 1', () => {
    const result = calculateDirectPriorities(['A', 'B', 'C'], { A: 10, B: 20, C: 30 });
    expect(result.priorities[0]).toBeCloseTo(10 / 60);
    expect(result.priorities[1]).toBeCloseTo(20 / 60);
    expect(result.priorities[2]).toBeCloseTo(30 / 60);
    expect(result.priorities.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('returns equal priorities for all-zero values', () => {
    const result = calculateDirectPriorities(['A', 'B', 'C'], { A: 0, B: 0, C: 0 });
    result.priorities.forEach(p => expect(p).toBeCloseTo(1 / 3));
  });

  it('handles missing values as zero', () => {
    const result = calculateDirectPriorities(['A', 'B', 'C'], { A: 10 });
    expect(result.priorities[0]).toBeCloseTo(1);
    expect(result.priorities[1]).toBeCloseTo(0);
    expect(result.priorities[2]).toBeCloseTo(0);
  });

  it('always returns CR = 0', () => {
    const result = calculateDirectPriorities(['A', 'B'], { A: 5, B: 15 });
    expect(result.cr).toBe(0);
  });

  it('handles single item', () => {
    const result = calculateDirectPriorities(['A'], { A: 42 });
    expect(result.priorities).toEqual([1]);
  });

  it('handles empty items', () => {
    const result = calculateDirectPriorities([], {});
    expect(result.priorities).toEqual([]);
    expect(result.cr).toBe(0);
  });
});

describe('aggregateDirectInputs', () => {
  it('aggregates with equal weights', () => {
    const result = aggregateDirectInputs(['A', 'B'], [
      { values: { A: 10, B: 30 }, weight: 1 },
      { values: { A: 30, B: 10 }, weight: 1 },
    ]);
    // Eval1: A=0.25, B=0.75. Eval2: A=0.75, B=0.25
    // Aggregated: A=0.5, B=0.5
    expect(result.priorities[0]).toBeCloseTo(0.5);
    expect(result.priorities[1]).toBeCloseTo(0.5);
    expect(result.cr).toBe(0);
  });

  it('respects different weights', () => {
    const result = aggregateDirectInputs(['A', 'B'], [
      { values: { A: 10, B: 30 }, weight: 3 },
      { values: { A: 30, B: 10 }, weight: 1 },
    ]);
    // Eval1 (w=0.75): A=0.25, B=0.75
    // Eval2 (w=0.25): A=0.75, B=0.25
    // A = 0.75*0.25 + 0.25*0.75 = 0.1875 + 0.1875 = 0.375
    // B = 0.75*0.75 + 0.25*0.25 = 0.5625 + 0.0625 = 0.625
    expect(result.priorities[0]).toBeCloseTo(0.375);
    expect(result.priorities[1]).toBeCloseTo(0.625);
  });

  it('handles single evaluator', () => {
    const result = aggregateDirectInputs(['A', 'B', 'C'], [
      { values: { A: 1, B: 2, C: 3 }, weight: 1 },
    ]);
    expect(result.priorities[0]).toBeCloseTo(1 / 6);
    expect(result.priorities[1]).toBeCloseTo(2 / 6);
    expect(result.priorities[2]).toBeCloseTo(3 / 6);
  });

  it('handles all-zero values from evaluator', () => {
    const result = aggregateDirectInputs(['A', 'B'], [
      { values: { A: 0, B: 0 }, weight: 1 },
    ]);
    expect(result.priorities[0]).toBeCloseTo(0.5);
    expect(result.priorities[1]).toBeCloseTo(0.5);
  });
});
