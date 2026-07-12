import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { updateProfile } from '../utils/auth';

interface Props {
  user: User;
  onComplete: () => Promise<void>;
  onDismiss?: () => void;
}

/** 전화번호 자동 포맷: 01012345678 → 010-1234-5678 */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

const ProfileCompleteModal = ({ user, onComplete, onDismiss }: Props) => {
  const meta = user.user_metadata || {};
  const [name, setName] = useState(meta.full_name || meta.name || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('이름을 입력해주세요.');
      return;
    }

    const rawDigits = phone.replace(/\D/g, '');
    if (rawDigits && !/^01[0-9]\d{7,8}$/.test(rawDigits)) {
      setError('올바른 전화번호를 입력해주세요. (예: 010-1234-5678)');
      return;
    }

    setSaving(true);
    try {
      const updates: Record<string, string> = {
        name: trimmedName,
        display_name: trimmedName,
      };
      if (rawDigits) updates.phone = formatPhone(rawDigits);
      await updateProfile(user.id, updates);
      await onComplete();
    } catch (err) {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
      // error displayed via setError above
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    // 이름이 있으면 저장하고 닫기
    const trimmedName = name.trim();
    if (trimmedName) {
      try {
        await updateProfile(user.id, { name: trimmedName, display_name: trimmedName });
        await onComplete();
        return;
      } catch {
        // 저장 실패해도 모달 닫기
      }
    }
    // 이름 없이 스킵 → 이 세션에서 모달 다시 표시 안 함
    onDismiss?.();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff', borderRadius: '16px', padding: '36px 32px 28px',
          width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          margin: '16px', position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={handleSkip}
          style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'none', border: 'none', color: '#9CA3AF',
            cursor: 'pointer', fontSize: '20px', lineHeight: 1,
            padding: '4px 8px', borderRadius: '6px',
          }}
          title="나중에 입력"
        >
          ✕
        </button>

        <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700, color: '#111' }}>
          프로필 정보 입력
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#666', lineHeight: 1.5 }}>
          원활한 수업 운영을 위해 아래 정보를 입력해주세요.<br />
          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>전화번호는 선택 사항입니다.</span>
        </p>

        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
            이름 <span style={{ color: '#dc2626' }}>*</span>
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="실명을 입력해주세요"
            autoFocus
            style={{
              width: '100%', padding: '10px 12px', fontSize: '15px',
              border: '1.5px solid #d1d5db', borderRadius: '8px',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '20px' }}>
          <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
            전화번호 <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(선택)</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="010-0000-0000"
            style={{
              width: '100%', padding: '10px 12px', fontSize: '15px',
              border: '1.5px solid #d1d5db', borderRadius: '8px',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
          />
        </label>

        {error && (
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#dc2626', fontWeight: 500 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600,
            color: '#fff', background: saving ? '#93c5fd' : '#2563eb',
            border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s', marginBottom: '10px',
          }}
        >
          {saving ? '저장 중...' : '저장하고 시작하기'}
        </button>

        <button
          type="button"
          onClick={handleSkip}
          disabled={saving}
          style={{
            width: '100%', padding: '10px', fontSize: '14px', fontWeight: 500,
            color: '#6B7280', background: 'none',
            border: '1px solid #E5E7EB', borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          나중에 입력하기
        </button>
      </form>
    </div>
  );
};

export default ProfileCompleteModal;
