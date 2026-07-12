import { describe, it, expect } from 'vitest';
import { formatPercent, formatNumber, formatCR, formatDate, truncate } from '../formatters';

describe('formatPercent', () => {
  it('formats 0.5 as 50.000%', () => {
    expect(formatPercent(0.5)).toBe('50.000%');
  });

  it('formats 0 as 0.000%', () => {
    expect(formatPercent(0)).toBe('0.000%');
  });

  it('formats 1 as 100.000%', () => {
    expect(formatPercent(1)).toBe('100.000%');
  });

  it('respects custom decimals', () => {
    expect(formatPercent(0.12345, 1)).toBe('12.3%');
  });

  it('formats with 0 decimals', () => {
    expect(formatPercent(0.5, 0)).toBe('50%');
  });

  it('handles small values', () => {
    expect(formatPercent(0.001)).toBe('0.100%');
  });
});

describe('formatNumber', () => {
  it('formats integer with 5 decimal places by default', () => {
    expect(formatNumber(3)).toBe('3.00000');
  });

  it('respects custom decimals', () => {
    expect(formatNumber(3.14159, 2)).toBe('3.14');
  });

  it('formats 0', () => {
    expect(formatNumber(0)).toBe('0.00000');
  });
});

describe('formatCR', () => {
  it('returns "-" when n <= 2', () => {
    expect(formatCR(0.05, 2)).toBe('-');
    expect(formatCR(0.05, 1)).toBe('-');
  });

  it('formats CR value for n > 2', () => {
    expect(formatCR(0.05, 3)).toBe('0.05000');
  });

  it('formats 0 CR for n > 2', () => {
    expect(formatCR(0, 3)).toBe('0.00000');
  });

  it('formats large CR value', () => {
    expect(formatCR(1.23456, 4)).toBe('1.23456');
  });
});

describe('formatDate', () => {
  it('formats ISO date string to Korean locale', () => {
    const result = formatDate('2024-01-15');
    // Korean locale: "2024. 01. 15." or similar
    expect(result).toContain('2024');
    expect(result).toContain('01');
    expect(result).toContain('15');
  });

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });
});

describe('truncate', () => {
  it('returns short text unchanged', () => {
    expect(truncate('hello', 30)).toBe('hello');
  });

  it('truncates long text with ellipsis', () => {
    const long = 'a'.repeat(50);
    const result = truncate(long, 10);
    expect(result).toBe('a'.repeat(10) + '...');
  });

  it('returns text unchanged when exactly maxLen', () => {
    expect(truncate('abcde', 5)).toBe('abcde');
  });

  it('uses default maxLen of 30', () => {
    const text = 'a'.repeat(31);
    const result = truncate(text);
    expect(result).toBe('a'.repeat(30) + '...');
  });

  it('returns null for null input', () => {
    expect(truncate(null)).toBeNull();
  });

  it('returns undefined for undefined input', () => {
    expect(truncate(undefined)).toBeUndefined();
  });

  it('returns empty string for empty string', () => {
    expect(truncate('')).toBe('');
  });
});
