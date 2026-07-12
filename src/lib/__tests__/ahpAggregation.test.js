import { describe, it, expect } from 'vitest';
import { aggregateComparisons, calculateGlobalPriorities } from '../ahpAggregation';

describe('aggregateComparisons', () => {
  it('produces valid priorities summing to ~1', () => {
    const items = ['A', 'B', 'C'];
    const evalValues = [
      { values: { 'A:B': -3, 'A:C': -5, 'B:C': -2 }, weight: 1 },
    ];
    const result = aggregateComparisons(items, evalValues);
    const sum = result.priorities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 4);
    expect(result.priorities.length).toBe(3);
  });

  it('returns CR 0 for 2 items', () => {
    const items = ['A', 'B'];
    const evalValues = [
      { values: { 'A:B': 3 }, weight: 1 },
    ];
    const result = aggregateComparisons(items, evalValues);
    expect(result.cr).toBe(0);
  });

  it('aggregates multiple evaluators', () => {
    const items = ['A', 'B'];
    const evalValues = [
      { values: { 'A:B': -3 }, weight: 1 },
      { values: { 'A:B': 3 }, weight: 1 },
    ];
    const result = aggregateComparisons(items, evalValues);
    // Geometric mean: (-3→ratio=3) and (3→ratio=1/3)
    // product = 3^0.5 * (1/3)^0.5 = 1 → equal
    expect(result.priorities[0]).toBeCloseTo(0.5, 2);
    expect(result.priorities[1]).toBeCloseTo(0.5, 2);
  });

  it('respects different evaluator weights', () => {
    const items = ['A', 'B'];
    const evalValues = [
      { values: { 'A:B': -5 }, weight: 3 },
      { values: { 'A:B': 5 }, weight: 1 },
    ];
    const result = aggregateComparisons(items, evalValues);
    // Heavy weight on eval1 which prefers A
    expect(result.priorities[0]).toBeGreaterThan(result.priorities[1]);
  });

  it('handles empty comparisons', () => {
    const items = ['A', 'B', 'C'];
    const evalValues = [
      { values: {}, weight: 1 },
    ];
    const result = aggregateComparisons(items, evalValues);
    // All equal (identity matrix)
    result.priorities.forEach(p => expect(p).toBeCloseTo(1 / 3, 2));
  });
});

describe('calculateGlobalPriorities', () => {
  it('calculates global priorities for flat structure', () => {
    const tree = [
      { id: 'A', parent_id: null },
      { id: 'B', parent_id: null },
    ];
    const localPriorities = { A: 0.6, B: 0.4 };
    const result = calculateGlobalPriorities(tree, localPriorities);
    expect(result.A).toBeCloseTo(0.6);
    expect(result.B).toBeCloseTo(0.4);
  });

  it('calculates global priorities for nested structure', () => {
    const tree = [
      { id: 'root1', parent_id: null },
      { id: 'root2', parent_id: null },
      { id: 'child1', parent_id: 'root1' },
      { id: 'child2', parent_id: 'root1' },
    ];
    const localPriorities = {
      root1: 0.7,
      root2: 0.3,
      child1: 0.6,
      child2: 0.4,
    };
    const result = calculateGlobalPriorities(tree, localPriorities);
    expect(result.root1).toBeCloseTo(0.7);
    expect(result.root2).toBeCloseTo(0.3);
    expect(result.child1).toBeCloseTo(0.7 * 0.6);
    expect(result.child2).toBeCloseTo(0.7 * 0.4);
  });
});
