import { supabase } from '../lib/supabaseClient';

// 현재 사이트 origin 기반 리다이렉트 URL 생성
// OAuth용: origin만 사용 (trailing slash 없이 Supabase allowlist와 정확히 일치)
// hash fragment는 Supabase #access_token과 충돌하므로 OAuth에서 사용하지 않음
function getBaseUrl() {
  return window.location.origin;
}

function getRedirectUrl(hash = '') {
  const base = getBaseUrl();
  return hash ? `${base}/#${hash}` : base;
}

// Google OAuth 로그인
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getBaseUrl(),
    },
  });
  if (error) throw error;
  return data;
}

// Kakao OAuth 로그인
export async function signInWithKakao() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: getBaseUrl(),
    },
  });
  if (error) throw error;
  return data;
}

// 이메일/비밀번호 로그인
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// 회원가입 (displayName + role 포함)
export async function signUp(email, password, displayName, role = 'user') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: displayName,
        signup_domain: window.location.hostname,
        role: role === 'evaluator' ? 'evaluator' : undefined,
      },
      emailRedirectTo: getRedirectUrl('/login'),
    },
  });
  if (error) throw error;

  // user_profiles 테이블에 프로필 생성
  if (data?.user) {
    await supabase.from('ahp_user_profiles').upsert({
      id: data.user.id,
      email: data.user.email,
      full_name: displayName || '',
      signup_domain: window.location.hostname,
      visited_sites: [window.location.hostname],
    }, { onConflict: 'id' });
  }

  return data;
}

// 로그아웃
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// 비밀번호 재설정 이메일 발송
export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getRedirectUrl('/login'),
  });
  if (error) throw error;
  return data;
}

// 프로필 조회
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('ahp_user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// 프로필 업데이트
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('ahp_user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
