import { describe, it, expect } from 'vitest';
import { sensitivityAnalysis } from '../sensitivityAnalysis';

describe('sensitivityAnalysis', () => {
  it('returns correct number of data points', () => {
    const basePriorities = [0.5, 0.3, 0.2];
    const altPriorities = [
      [0.4, 0.6],
      [0.7, 0.3],
      [0.5, 0.5],
    ];
    const result = sensitivityAnalysis(basePriorities, altPriorities, 0, 10);
    expect(result.length).toBe(11); // 0 to 10 inclusive
  });

  it('first data point has weight=0 for varied criterion', () => {
    const basePriorities = [0.6, 0.4];
    const altPriorities = [
      [0.3, 0.7],
      [0.8, 0.2],
    ];
    const result = sensitivityAnalysis(basePriorities, altPriorities, 0, 10);
    expect(result[0].weight).toBe(0);
    // When criterion 0 has weight 0, all weight goes to criterion 1
    expect(result[0].scores[0]).toBeCloseTo(0.8, 2);
    expect(result[0].scores[1]).toBeCloseTo(0.2, 2);
  });

  it('last data point has weight=1 for varied criterion', () => {
    const basePriorities = [0.6, 0.4];
    const altPriorities = [
      [0.3, 0.7],
      [0.8, 0.2],
    ];
    const result = sensitivityAnalysis(basePriorities, altPriorities, 0, 10);
    expect(result[10].weight).toBe(1);
    // When criterion 0 has weight 1, scores equal criterion 0's alt priorities
    expect(result[10].scores[0]).toBeCloseTo(0.3, 2);
    expect(result[10].scores[1]).toBeCloseTo(0.7, 2);
  });

  it('scores always sum to approximately 1', () => {
    const basePriorities = [0.5, 0.3, 0.2];
    const altPriorities = [
      [0.4, 0.35, 0.25],
      [0.2, 0.5, 0.3],
      [0.6, 0.1, 0.3],
    ];
    const result = sensitivityAnalysis(basePriorities, altPriorities, 1, 20);
    for (const point of result) {
      const sum = point.scores.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 4);
    }
  });

  it('handles two criteria with equal base weights', () => {
    const basePriorities = [0.5, 0.5];
    const altPriorities = [
      [1, 0],
      [0, 1],
    ];
    const result = sensitivityAnalysis(basePriorities, altPriorities, 0, 2);
    // weight=0: only criterion 1 → alt0=0, alt1=1
    expect(result[0].scores[0]).toBeCloseTo(0);
    expect(result[0].scores[1]).toBeCloseTo(1);
    // weight=0.5: balanced → alt0=0.5, alt1=0.5
    expect(result[1].scores[0]).toBeCloseTo(0.5);
    expect(result[1].scores[1]).toBeCloseTo(0.5);
    // weight=1: only criterion 0 → alt0=1, alt1=0
    expect(result[2].scores[0]).toBeCloseTo(1);
    expect(result[2].scores[1]).toBeCloseTo(0);
  });

  it('handles empty alternative priorities', () => {
    const basePriorities = [0.5, 0.5];
    const altPriorities = [[], []];
    const result = sensitivityAnalysis(basePriorities, altPriorities, 0, 5);
    expect(result.length).toBe(6);
    for (const point of result) {
      expect(point.scores).toEqual([]);
    }
  });
});
