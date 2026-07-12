// Project status codes
export const PROJECT_STATUS = {
  CREATING: 2,
  WAITING: 6,
  EVALUATING: 1,
  COMPLETED: 4,
};

export const PROJECT_STATUS_LABELS = {
  2: '생성중',    // CREATING
  6: '대기중',    // WAITING
  1: '평가중',    // EVALUATING
  4: '평가종료',  // COMPLETED
};

export const PROJECT_STATUS_COLORS = {
  2: 'var(--color-creating)',  // CREATING
  6: 'var(--color-warning)',   // WAITING
  1: 'var(--color-success)',   // EVALUATING
  4: 'var(--color-primary)',   // COMPLETED
};

// Evaluation method codes
export const EVAL_METHOD = {
  PAIRWISE_THEORY: 10,
  PAIRWISE_PRACTICAL: 12,
  DIRECT_INPUT: 20,
};

export const EVAL_METHOD_LABELS = {
  10: '쌍대비교-이론',    // PAIRWISE_THEORY
  12: '쌍대비교-실용',    // PAIRWISE_PRACTICAL
  20: '직접입력',         // DIRECT_INPUT
};

// RI table for Consistency Ratio calculation
// Index = matrix size (n), RI[0] and RI[1] are not used
export const RI_TABLE = [
  0,     // n=0 (unused)
  0,     // n=1
  0,     // n=2 (CR always 0)
  0.58,  // n=3
  0.90,  // n=4
  1.12,  // n=5
  1.24,  // n=6
  1.32,  // n=7
  1.41,  // n=8
  1.45,  // n=9
  1.49,  // n=10
  1.51,  // n=11
  1.48,  // n=12
  1.56,  // n=13
  1.57,  // n=14
  1.59,  // n=15
];

// Pairwise comparison scale (1-9)
export const PAIRWISE_SCALE = [
  { value: 1, label: '동등' },
  { value: 2, label: '동등~약간' },
  { value: 3, label: '약간' },
  { value: 4, label: '약간~상당히' },
  { value: 5, label: '상당히' },
  { value: 6, label: '상당히~매우' },
  { value: 7, label: '매우' },
  { value: 8, label: '매우~극히' },
  { value: 9, label: '극히' },
];

// Chart colors for levels
export const LEVEL_COLORS = [
  '#a0a', // Level 1 (purple)
  '#0aa', // Level 2 (cyan)
  '#fa0', // Level 3 (orange)
  '#e55', // Level 4 (red)
  '#5a5', // Level 5 (green)
];

// CR threshold
export const CR_THRESHOLD = 0.1;

// AHP calculation constants
export const AHP_MAX_ITERATIONS = 100;
export const AHP_CONVERGENCE_THRESHOLD = 1e-8;

// Max criteria levels
export const MAX_CRITERIA_LEVELS = 5;

// Modes
export const USER_MODE = {
  ADMIN: 'admin',
  EVALUATOR: 'evaluator',
};

// Point transaction types
export const POINT_TYPE = {
  EARN: 'earn',
  WITHDRAW: 'withdraw',
  WITHDRAW_REFUND: 'withdraw_refund',
  CONVERT: 'convert',
};

export const POINT_TYPE_LABELS = {
  earn: '적립',
  withdraw: '출금',
  withdraw_refund: '출금 환불',
  convert: '연구자 전환',
};

// Withdrawal request status
export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const WITHDRAWAL_STATUS_LABELS = {
  pending: '대기',
  approved: '승인',
  rejected: '거절',
};

// Global superadmin emails (단일 출처)
export const SUPERADMIN_EMAILS = [
  'aebon@kakao.com',
  'aebon@kyonggi.ac.kr',
  'radical8566@gmail.com',
];
