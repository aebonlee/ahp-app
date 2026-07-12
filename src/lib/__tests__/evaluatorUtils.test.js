import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatPhone, findEvaluatorId } from '../evaluatorUtils';

describe('formatPhone', () => {
  it('11자리 → 010-1234-5678 형식', () => {
    expect(formatPhone('01012345678')).toBe('010-1234-5678');
  });

  it('3자리 이하 → 그대로', () => {
    expect(formatPhone('010')).toBe('010');
    expect(formatPhone('01')).toBe('01');
  });

  it('4~7자리 → 3-나머지 형식', () => {
    expect(formatPhone('0101234')).toBe('010-1234');
    expect(formatPhone('0101')).toBe('010-1');
  });

  it('하이픈 등 비숫자 제거', () => {
    expect(formatPhone('010-1234-5678')).toBe('010-1234-5678');
    expect(formatPhone('010 1234 5678')).toBe('010-1234-5678');
  });

  it('12자리 이상 → 11자리까지만 사용', () => {
    expect(formatPhone('010123456789999')).toBe('010-1234-5678');
  });

  it('빈 문자열 → 빈 문자열', () => {
    expect(formatPhone('')).toBe('');
  });
});

describe('findEvaluatorId', () => {
  const evaluators = [
    { id: 'ev1', user_id: 'u1', email: 'a@test.com' },
    { id: 'ev2', user_id: 'u2', email: 'b@test.com' },
    { id: 'ev3', user_id: null, email: 'c@test.com' },
  ];

  beforeEach(() => {
    sessionStorage.clear();
  });

  it('로그인 사용자 매칭', () => {
    const user = { id: 'u1' };
    expect(findEvaluatorId(evaluators, user, 'proj1')).toBe('ev1');
  });

  it('로그인 사용자 매칭 실패 → sessionStorage 확인', () => {
    const user = { id: 'u999' };
    sessionStorage.setItem('evaluator_proj1', 'ev3');
    expect(findEvaluatorId(evaluators, user, 'proj1')).toBe('ev3');
  });

  it('user 없음 + sessionStorage 매칭', () => {
    sessionStorage.setItem('evaluator_proj1', 'ev2');
    expect(findEvaluatorId(evaluators, null, 'proj1')).toBe('ev2');
  });

  it('아무것도 매칭 안 됨 → null', () => {
    expect(findEvaluatorId(evaluators, null, 'proj1')).toBeNull();
  });

  it('sessionStorage에 존재하지 않는 ID → null', () => {
    sessionStorage.setItem('evaluator_proj1', 'ev999');
    expect(findEvaluatorId(evaluators, null, 'proj1')).toBeNull();
  });

  it('빈 evaluators → null', () => {
    expect(findEvaluatorId([], { id: 'u1' }, 'proj1')).toBeNull();
  });

  it('이메일 매칭 (user_id 미연결 평가자)', () => {
    const user = { id: 'u999', email: 'c@test.com' };
    expect(findEvaluatorId(evaluators, user, 'proj1')).toBe('ev3');
  });

  it('user_id 우선, 이메일은 폴백', () => {
    const user = { id: 'u1', email: 'c@test.com' };
    // user_id 매칭이 먼저 → ev1 (email로 ev3가 아님)
    expect(findEvaluatorId(evaluators, user, 'proj1')).toBe('ev1');
  });

  it('이메일 매칭 안 됨 → null', () => {
    const user = { id: 'u999', email: 'unknown@test.com' };
    expect(findEvaluatorId(evaluators, user, 'proj1')).toBeNull();
  });
});
