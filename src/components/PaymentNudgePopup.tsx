/**
 * PaymentNudgePopup — 가입 7일 경과 + 미결제 사용자에게 부드러운 결제 유도 팝업
 * [2026-04-23] 콘텐츠 제한 해제 후 대체 수익화 수단
 *
 * 조건: 로그인 && created_at > 7일 && user_licenses에 유효 라이선스 없음
 * 세션당 1회만 표시, Superadmin 자동 바이패스, 조회 실패 시 미표시 (fail-safe)
 */
import { useState, useEffect } from 'react';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import { SUPERADMIN_EMAILS } from '../lib/constants';

/** 사이트별 supabase export 패턴 차이를 자동 감지 */
async function resolveSupabase(): Promise<SupabaseClient | null> {
  // @vite-ignore prevents Rollup from statically resolving these dynamic imports
  const paths = ['../utils/supabase', '../config/supabase'];
  for (const p of paths) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await import(/* @vite-ignore */ p);
      if (typeof mod.default === 'function') return mod.default();
      if (mod.default) return mod.default;
      if (mod.supabase) return mod.supabase;
      if (typeof mod.getSupabase === 'function') return mod.getSupabase();
    } catch { /* try next path */ }
  }
  return null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface PaymentNudgePopupProps {
  user: User;
  siteSlug: string;
  shopUrl?: string;
}

export default function PaymentNudgePopup({
  user,
  siteSlug,
  shopUrl = 'https://biz-hub.dreamitbiz.com/shop',
}: PaymentNudgePopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const SESSION_KEY = `nudge_dismissed_${siteSlug}`;

    // 이미 이번 세션에서 닫았으면 스킵
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Superadmin 바이패스
    const email = (user.email || '').toLowerCase();
    if (SUPERADMIN_EMAILS.includes(email)) return;

    // 가입일 7일 미만이면 스킵
    const createdAt = user.created_at ? new Date(user.created_at).getTime() : Date.now();
    if (Date.now() - createdAt < SEVEN_DAYS_MS) return;

    // user_licenses 조회
    const checkLicense = async () => {
      try {
        const supabase = await resolveSupabase();
        if (!supabase) return; // Supabase 없으면 미표시

        const { data, error } = await supabase
          .from('ahp_user_licenses')
          .select('id, license_type, site_slug, expires_at')
          .eq('user_id', user.id);

        if (error) return; // 조회 실패 시 미표시 (fail-safe)

        if (data && data.length > 0) {
          const now = new Date();
          const hasValid = data.some((lic: { license_type: string; site_slug: string | null; expires_at: string | null }) => {
            if (lic.expires_at && new Date(lic.expires_at) < now) return false;
            return lic.license_type === 'bundle' || lic.site_slug === siteSlug;
          });
          if (hasValid) return; // 유효 라이선스 있으면 미표시
        }

        setVisible(true);
      } catch {
        // 에러 시 미표시 (fail-safe)
      }
    };

    checkLicense();
  }, [user, siteSlug]);

  const handleDismiss = () => {
    sessionStorage.setItem(`nudge_dismissed_${siteSlug}`, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '16px', padding: '36px 32px 28px',
          width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          margin: '16px', position: 'relative', textAlign: 'center',
        }}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'none', border: 'none', color: '#9CA3AF',
            cursor: 'pointer', fontSize: '20px', lineHeight: 1,
            padding: '4px 8px', borderRadius: '6px',
          }}
          title="닫기"
        >
          ✕
        </button>

        {/* 아이콘 */}
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📚</div>

        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#111' }}>
          더 나은 학습 경험을 위해
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
          이용권을 구매하시면 모든 콘텐츠를<br />
          제한 없이 평생 이용하실 수 있습니다.
        </p>

        {/* 가격 정보 */}
        <div style={{
          background: '#F0F7FF', borderRadius: '12px', padding: '16px',
          marginBottom: '20px', textAlign: 'left',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#333' }}>개별 사이트 이용권</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#2563EB' }}>30,000원</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#333' }}>
              전체 사이트 이용권
              <span style={{
                background: '#DC2626', color: '#fff', fontSize: '11px', fontWeight: 600,
                padding: '2px 6px', borderRadius: '4px', marginLeft: '6px',
              }}>~55% 할인</span>
            </span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#DC2626' }}>150,000원</span>
          </div>
        </div>

        {/* 이용권 보기 버튼 */}
        <a
          href={shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', width: '100%', padding: '13px', fontSize: '15px', fontWeight: 600,
            color: '#fff', background: '#2563EB', border: 'none', borderRadius: '8px',
            cursor: 'pointer', textDecoration: 'none', textAlign: 'center',
            marginBottom: '10px', boxSizing: 'border-box',
          }}
        >
          이용권 보기
        </a>

        {/* 다음에 버튼 */}
        <button
          onClick={handleDismiss}
          style={{
            width: '100%', padding: '11px', fontSize: '14px', fontWeight: 500,
            color: '#6B7280', background: 'none',
            border: '1px solid #E5E7EB', borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          다음에 할게요
        </button>

        <p style={{ margin: '14px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
          1회 결제로 평생 무제한 이용
        </p>
      </div>
    </div>
  );
}
