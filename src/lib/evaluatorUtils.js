/**
 * 숫자만 추출 후 한국 전화번호 형식으로 포맷팅
 * 01012345678 → 010-1234-5678
 */
export function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/**
 * 이름이 같은 글자만 반복되는지 검사 (예: "김김김", "ㅋㅋㅋ", "aaa")
 * 2글자 미만이거나 모든 글자가 동일하면 true
 */
export function isRepeatedName(name) {
  const trimmed = name.trim();
  if (trimmed.length < 2) return true;
  const chars = [...trimmed];
  return chars.every(c => c === chars[0]);
}

export function findEvaluatorId(evaluators, user, projectId) {
  // 1. 로그인 사용자: user_id 매칭
  if (user?.id) {
    const match = evaluators.find(e => e.user_id === user.id);
    if (match) return match.id;
  }
  // 2. sessionStorage에서 evaluatorId (전화인증 + 로그인 사용자 공통)
  const storedId = sessionStorage.getItem(`evaluator_${projectId}`);
  if (storedId) {
    const match = evaluators.find(e => e.id === storedId);
    if (match) return match.id;
  }
  // 3. 이메일 매칭 (user_id 미연결 상태의 로그인 평가자)
  if (user?.email) {
    const match = evaluators.find(e => e.email === user.email);
    if (match) return match.id;
  }
  return null;
}
