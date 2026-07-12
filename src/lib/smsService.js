import { supabase } from './supabaseClient';
import { getSmsType } from './smsUtils';

/**
 * 단일 수신자에게 SMS 발송 (Edge Function 호출)
 */
export async function sendSms({ receiver, message }) {
  const { data, error } = await supabase.functions.invoke('send-sms', {
    body: { receiver, message },
  });
  if (error) {
    // FunctionsHttpError의 경우 응답 본문에서 상세 에러 추출
    const detail = typeof data === 'object' && data?.error
      ? data.error
      : typeof data === 'string'
        ? data
        : error.message || '알 수 없는 오류';
    throw new Error(detail);
  }
  if (data && !data.success) {
    throw new Error(data.message || '발송 실패');
  }
  return data;
}

/**
 * 다수 수신자에게 순차 발송
 * - {이름} 플레이스홀더를 수신자별 이름으로 치환
 * @param {Array<{name: string, phone: string}>} recipients
 * @param {string} message
 * @param {(current: number, total: number) => void} onProgress
 * @param {{ projectId?: string, userId?: string }} options - 로그 저장용 옵션
 * @returns {Promise<Array<{name: string, phone: string, success: boolean, result?: any, error?: string}>>}
 */
export async function sendSmsBulk(recipients, message, onProgress, options = {}) {
  const { projectId, userId } = options;
  const smsType = getSmsType(message);
  const results = [];

  for (let i = 0; i < recipients.length; i++) {
    let success = false;
    let errorMessage = null;
    const personalizedMsg = message.replace(/\{이름\}/g, recipients[i].name || '');

    try {
      const result = await sendSms({ receiver: recipients[i].phone, message: personalizedMsg });
      success = result?.success ?? true;
      results.push({ ...recipients[i], success, result });
    } catch (err) {
      errorMessage = err.message;
      results.push({ ...recipients[i], success: false, error: err.message });
    }

    // sms_logs에 기록 (projectId와 userId가 있을 때만)
    if (projectId && userId) {
      await supabase.from('ahp_sms_logs').insert({
        project_id: projectId,
        sender_id: userId,
        recipient_name: recipients[i].name || '',
        recipient_phone: recipients[i].phone,
        message: personalizedMsg,
        sms_type: smsType === 'OVER' ? 'LMS' : smsType,
        success,
        error_message: errorMessage,
      }).then(null, () => {});
    }

    onProgress?.(i + 1, recipients.length);
  }

  // 발송 성공 건수만큼 프로젝트 SMS 사용량 증가
  const successCount = results.filter(r => r.success).length;
  if (successCount > 0 && projectId) {
    await supabase.rpc('ahp_increment_sms_used', {
      p_project_id: projectId,
      p_count: successCount,
    }).then(null, () => {});
  }

  return results;
}
