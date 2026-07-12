/**
 * EUC-KR 바이트 수 계산 (한글 2바이트, 영문/숫자/기호 1바이트)
 * icode/js/msg.js의 ChkLen() 로직 포팅
 */
export function getByteLength(str) {
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    // Korean Jamo, syllables, CJK characters → 2 bytes
    if (
      (ch >= 0x3131 && ch <= 0x314e) || // ㄱ-ㅎ
      (ch >= 0x314f && ch <= 0x3163) || // ㅏ-ㅣ
      (ch >= 0xac00 && ch <= 0xd7a3) || // 가-힣
      (ch >= 0x4e00 && ch <= 0x9fff)    // CJK
    ) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
}

/**
 * SMS/LMS 판별
 * @returns {'SMS' | 'LMS' | 'OVER'}
 */
export function getSmsType(msg) {
  const bytes = getByteLength(msg);
  if (bytes <= 90) return 'SMS';
  if (bytes <= 2000) return 'LMS';
  return 'OVER';
}

/**
 * 메시지 바이트 정보 반환
 */
export function getByteInfo(msg) {
  const bytes = getByteLength(msg);
  const type = getSmsType(msg);
  const max = type === 'SMS' ? 90 : 2000;
  return { bytes, type, max };
}
