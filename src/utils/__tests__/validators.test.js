import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPassword,
  getPasswordErrors,
  isValidProjectName,
  isValidCriterionName,
  isValidComparisonValue,
} from '../validators';

describe('isValidEmail', () => {
  it('accepts valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(isValidEmail('user@mail.example.co.kr')).toBe(true);
  });

  it('rejects email without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects email with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('accepts password with 8+ chars, letter and digit', () => {
    expect(isValidPassword('abcdef12')).toBe(true);
  });

  it('accepts long password with mixed chars', () => {
    expect(isValidPassword('Password123')).toBe(true);
  });

  it('rejects password with only 7 characters', () => {
    expect(isValidPassword('abcde12')).toBe(false);
  });

  it('rejects password with letters only (no digit)', () => {
    expect(isValidPassword('abcdefgh')).toBe(false);
  });

  it('rejects password with digits only (no letter)', () => {
    expect(isValidPassword('12345678')).toBe(false);
  });

  it('rejects password shorter than 8', () => {
    expect(isValidPassword('abc1')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidPassword('')).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isValidPassword(null)).toBe(false);
    expect(isValidPassword(undefined)).toBe(false);
  });
});

describe('getPasswordErrors', () => {
  it('returns empty array for valid password', () => {
    expect(getPasswordErrors('abcdef12')).toEqual([]);
  });

  it('returns length error for short password', () => {
    const errors = getPasswordErrors('ab1');
    expect(errors).toContain('8자 이상 입력해주세요.');
  });

  it('returns letter error for digits-only password', () => {
    const errors = getPasswordErrors('12345678');
    expect(errors).toContain('영문자를 포함해주세요.');
  });

  it('returns digit error for letters-only password', () => {
    const errors = getPasswordErrors('abcdefgh');
    expect(errors).toContain('숫자를 포함해주세요.');
  });

  it('returns multiple errors for empty string', () => {
    const errors = getPasswordErrors('');
    expect(errors.length).toBe(3);
  });

  it('handles non-string input', () => {
    expect(getPasswordErrors(null)).toEqual(['비밀번호를 입력해주세요.']);
  });
});

describe('isValidProjectName', () => {
  it('accepts valid name', () => {
    expect(isValidProjectName('My Project')).toBe(true);
  });

  it('accepts single character', () => {
    expect(isValidProjectName('A')).toBe(true);
  });

  it('accepts name with exactly 100 characters', () => {
    expect(isValidProjectName('a'.repeat(100))).toBe(true);
  });

  it('rejects name with 101 characters', () => {
    expect(isValidProjectName('a'.repeat(101))).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(isValidProjectName('   ')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidProjectName('')).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isValidProjectName(null)).toBe(false);
    expect(isValidProjectName(undefined)).toBe(false);
  });
});

describe('isValidCriterionName', () => {
  it('accepts valid name', () => {
    expect(isValidCriterionName('Cost')).toBe(true);
  });

  it('accepts name with exactly 50 characters', () => {
    expect(isValidCriterionName('a'.repeat(50))).toBe(true);
  });

  it('rejects name with 51 characters', () => {
    expect(isValidCriterionName('a'.repeat(51))).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(isValidCriterionName('   ')).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isValidCriterionName(null)).toBe(false);
    expect(isValidCriterionName(undefined)).toBe(false);
  });
});

describe('isValidComparisonValue', () => {
  it('accepts 0', () => {
    expect(isValidComparisonValue(0)).toBe(true);
  });

  it('accepts positive integer within range', () => {
    expect(isValidComparisonValue(9)).toBe(true);
  });

  it('accepts negative integer within range', () => {
    expect(isValidComparisonValue(-9)).toBe(true);
  });

  it('accepts string number', () => {
    expect(isValidComparisonValue('5')).toBe(true);
  });

  it('rejects value > 9', () => {
    expect(isValidComparisonValue(10)).toBe(false);
  });

  it('rejects value < -9', () => {
    expect(isValidComparisonValue(-10)).toBe(false);
  });

  it('rejects float', () => {
    expect(isValidComparisonValue(1.5)).toBe(false);
  });

  it('rejects NaN', () => {
    expect(isValidComparisonValue(NaN)).toBe(false);
  });
});
