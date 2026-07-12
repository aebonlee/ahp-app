import { describe, it, expect } from 'vitest';
import { getByteLength, getSmsType, getByteInfo } from '../smsUtils';

describe('getByteLength', () => {
  it('returns 0 for empty string', () => {
    expect(getByteLength('')).toBe(0);
  });

  it('counts ASCII characters as 1 byte each', () => {
    expect(getByteLength('hello')).toBe(5);
  });

  it('counts Korean syllables as 2 bytes each', () => {
    expect(getByteLength('가나다')).toBe(6);
  });

  it('counts mixed Korean and ASCII correctly', () => {
    expect(getByteLength('hi안녕')).toBe(6); // 2 + 4
  });

  it('counts special ASCII characters as 1 byte', () => {
    expect(getByteLength('!@#$%')).toBe(5);
  });

  it('counts Korean Jamo consonants as 2 bytes', () => {
    expect(getByteLength('ㄱㄴㄷ')).toBe(6);
  });

  it('counts Korean Jamo vowels as 2 bytes', () => {
    expect(getByteLength('ㅏㅓㅗ')).toBe(6);
  });

  it('counts CJK characters as 2 bytes', () => {
    // 漢字 (한자)
    expect(getByteLength('漢字')).toBe(4);
  });

  it('counts digits as 1 byte each', () => {
    expect(getByteLength('12345')).toBe(5);
  });

  it('counts spaces as 1 byte', () => {
    expect(getByteLength('a b')).toBe(3);
  });
});

describe('getSmsType', () => {
  it('returns SMS for ≤90 bytes', () => {
    const msg = 'a'.repeat(90);
    expect(getSmsType(msg)).toBe('SMS');
  });

  it('returns LMS for 91 bytes', () => {
    const msg = 'a'.repeat(91);
    expect(getSmsType(msg)).toBe('LMS');
  });

  it('returns LMS for exactly 2000 bytes', () => {
    const msg = 'a'.repeat(2000);
    expect(getSmsType(msg)).toBe('LMS');
  });

  it('returns OVER for 2001 bytes', () => {
    const msg = 'a'.repeat(2001);
    expect(getSmsType(msg)).toBe('OVER');
  });

  it('returns SMS for empty string', () => {
    expect(getSmsType('')).toBe('SMS');
  });

  it('returns SMS for exactly 45 Korean characters (90 bytes)', () => {
    const msg = '가'.repeat(45); // 45 * 2 = 90
    expect(getSmsType(msg)).toBe('SMS');
  });

  it('returns LMS for 46 Korean characters (92 bytes)', () => {
    const msg = '가'.repeat(46); // 46 * 2 = 92
    expect(getSmsType(msg)).toBe('LMS');
  });
});

describe('getByteInfo', () => {
  it('returns SMS info for short message', () => {
    const info = getByteInfo('hello');
    expect(info).toEqual({ bytes: 5, type: 'SMS', max: 90 });
  });

  it('returns LMS info for long message', () => {
    const msg = 'a'.repeat(100);
    const info = getByteInfo(msg);
    expect(info).toEqual({ bytes: 100, type: 'LMS', max: 2000 });
  });

  it('returns OVER info for very long message', () => {
    const msg = 'a'.repeat(2001);
    const info = getByteInfo(msg);
    expect(info).toEqual({ bytes: 2001, type: 'OVER', max: 2000 });
  });
});
