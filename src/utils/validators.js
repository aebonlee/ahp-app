/**
 * Validate email format.
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate password strength (8+ chars, must contain letter + digit).
 */
export function isValidPassword(password) {
  return typeof password === 'string'
    && password.length >= 8
    && /[a-zA-Z]/.test(password)
    && /[0-9]/.test(password);
}

/**
 * Return array of password error messages for real-time feedback.
 */
export function getPasswordErrors(password) {
  if (typeof password !== 'string') return ['비밀번호를 입력해주세요.'];
  const errors = [];
  if (password.length < 8) errors.push('8자 이상 입력해주세요.');
  if (!/[a-zA-Z]/.test(password)) errors.push('영문자를 포함해주세요.');
  if (!/[0-9]/.test(password)) errors.push('숫자를 포함해주세요.');
  return errors;
}

/**
 * Validate project name.
 */
export function isValidProjectName(name) {
  return typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 100;
}

/**
 * Validate criterion name.
 */
export function isValidCriterionName(name) {
  return typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 50;
}

/**
 * Validate pairwise comparison value.
 */
export function isValidComparisonValue(value) {
  const num = Number(value);
  return Number.isInteger(num) && num >= -9 && num <= 9;
}
