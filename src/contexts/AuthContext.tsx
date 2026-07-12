import { createContext, useState, useReducer, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { USER_MODE, SUPERADMIN_EMAILS } from '../lib/constants';
import {
  signInWithEmail,
  signInWithGoogle,
  signInWithKakao,
  signUp as authSignUp,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  getProfile,
  updateProfile as authUpdateProfile,
} from '../utils/auth';
import { clearAllApiKeys } from '../lib/aiService';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import ProfileCompleteModal from '../components/ProfileCompleteModal';

import PaymentNudgePopup from '../components/PaymentNudgePopup';
export const AuthContext = createContext<any>(null);

const initialState = {
  user: null,
  session: null,
  profile: null,
  profileLoading: true,
  mode: USER_MODE.ADMIN,
  loading: true,
  error: null,
  accountBlock: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        user: action.payload?.user || null,
        session: action.payload,
        loading: false,
        profileLoading: action.payload?.user ? state.profileLoading : false,
        error: null,
      };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload, profileLoading: false };
    case 'SET_PROFILE_LOADING':
      return { ...state, profileLoading: true };
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_ACCOUNT_BLOCK':
      return { ...state, accountBlock: action.payload };
    case 'SIGN_OUT':
      return { ...initialState, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const clearAccountBlock = useCallback(() => {
    dispatch({ type: 'SET_ACCOUNT_BLOCK', payload: null });
  }, []);

  // 프로필 로드 (5초 타임아웃 보호)
  const loadProfile = useCallback(async (userId) => {
    dispatch({ type: 'SET_PROFILE_LOADING' });
    try {
      const profilePromise = getProfile(userId);
      const profile = await Promise.race([
        profilePromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      dispatch({ type: 'SET_PROFILE', payload: profile });

      // signup_domain / visited_sites / check_user_status 자동 처리
      if (profile) {
        const currentDomain = window.location.hostname;
        const updates = {};
        if (!(profile as any).signup_domain) (updates as any).signup_domain = currentDomain;
        const sites = Array.isArray((profile as any).visited_sites) ? (profile as any).visited_sites : [];
        if (!sites.includes(currentDomain)) {
          (updates as any).visited_sites = [...sites, currentDomain];
        }
        if (Object.keys(updates).length > 0) {
          supabase.from('ahp_user_profiles').update(updates).eq('id', userId).then(() => {});
        }

        // 계정 상태 체크
        try {
          const statusPromise = supabase.rpc('ahp_check_user_status', {
            target_user_id: userId,
            current_domain: currentDomain,
          });
          const statusResult = await Promise.race([
            statusPromise,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
          ]);
          const statusData = (statusResult as any)?.data;
          if (statusData && statusData.status && statusData.status !== 'active') {
            dispatch({
              type: 'SET_ACCOUNT_BLOCK',
              payload: {
                status: statusData.status,
                reason: statusData.reason || '',
                suspended_until: statusData.suspended_until || null,
              },
            });
            await supabase.auth.signOut();
            dispatch({ type: 'SIGN_OUT' });
            return;
          }
        } catch {
          // check_user_status 함수 미존재 시 무시
        }
      }
    } catch {
      dispatch({ type: 'SET_PROFILE', payload: null });
    }
  }, []);

  
  // ─── 프로필 완성 체크용 user_profiles 로드 ───
  const [_userProfile, _setUserProfile] = useState<any>(null);
  const [_profileDismissed, _setProfileDismissed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem('ahp_profile_modal_dismissed') === '1'
  );
  const _loadUserProfile = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase!.from('ahp_user_profiles').select('name,phone').eq('id', uid).maybeSingle();
      _setUserProfile(data);
    } catch { _setUserProfile(null); }
  }, []);

  useEffect(() => {
    if (state.user?.id) {
      _loadUserProfile(state.user.id);
    } else {
      _setUserProfile(null);
    }
  }, [state.user?.id, _loadUserProfile]);

  useEffect(() => {
    // 글로벌 안전장치: 7초 후에도 loading 상태이면 강제 해제
    const safetyTimer = setTimeout(() => {
      dispatch({ type: 'SET_SESSION', payload: null });
      dispatch({ type: 'SET_PROFILE', payload: null });
    }, 7000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(safetyTimer);
      dispatch({ type: 'SET_SESSION', payload: session });
      if (session?.user) loadProfile(session.user.id);
      else dispatch({ type: 'SET_PROFILE', payload: null });
    }).catch(() => {
      clearTimeout(safetyTimer);
      dispatch({ type: 'SET_SESSION', payload: null });
      dispatch({ type: 'SET_PROFILE', payload: null });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        dispatch({ type: 'SET_SESSION', payload: session });
        if (session?.user) {
          loadProfile(session.user.id);
          if (event === 'SIGNED_IN') {
            // fire-and-forget (await 제거하여 hang 방지)
            const hostname = window.location.hostname;
            supabase.from('ahp_user_profiles')
              .update({ last_sign_in_at: new Date().toISOString() })
              .eq('id', session.user.id)
              .then(() => {});

            supabase
              .from('ahp_user_profiles')
              .select('visited_sites')
              .eq('id', session.user.id)
              .single()
              .then(({ data: profile }) => {
                if (profile) {
                  const sites = (profile as any).visited_sites || [];
                  if (!sites.includes(hostname)) {
                    supabase.from('ahp_user_profiles')
                      .update({ visited_sites: [...sites, hostname] })
                      .eq('id', session.user.id)
                      .then(() => {});
                  }
                }
              })
              .catch(() => {});
          }
        } else {
          dispatch({ type: 'SET_PROFILE', payload: null });
        }
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const setMode = useCallback((mode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  }, []);

  // 이메일 로그인
  const signIn = useCallback(async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await signInWithEmail(email, password);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  // Google 로그인
  const loginWithGoogle = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await signInWithGoogle();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  // Kakao 로그인
  const loginWithKakao = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await signInWithKakao();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  // 회원가입 (role: 'user' | 'evaluator')
  const signUp = useCallback(async (email, password, displayName, role) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await authSignUp(email, password, displayName, role);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  // 로그아웃
  const signOut = useCallback(async () => {
    clearAllApiKeys();
    try { await authSignOut(); } catch { /* 서버 오류 시에도 로컬 상태 정리 */ }
    dispatch({ type: 'SIGN_OUT' });
  }, []);

  // 비밀번호 재설정
  const resetPassword = useCallback(async (email) => {
    await authResetPassword(email);
  }, []);

  // 프로필 새로고침
  const refreshProfile = useCallback(async () => {
    if (state.user) {
      await loadProfile(state.user.id);
    }
  }, [state.user, loadProfile]);

  // 프로필 업데이트
  const updateProfile = useCallback(async (updates) => {
    if (!state.user) throw new Error('로그인이 필요합니다.');
    const updated = await authUpdateProfile(state.user.id, updates);
    dispatch({ type: 'SET_PROFILE', payload: updated });
    return updated;
  }, [state.user]);

  const isLoggedIn = !!state.user;
  const adminEmails = [
    state.user?.email,
    state.user?.user_metadata?.email,
  ].filter((e): e is string => Boolean(e)).map(e => e.toLowerCase());
  const isAdminByEmail = adminEmails.some(e => SUPERADMIN_EMAILS.includes(e));
  const isAdmin = isLoggedIn && (
    ['admin', 'superadmin'].includes(state.profile?.role) || isAdminByEmail
  );
  const isEvaluator = isLoggedIn && state.profile?.role === 'evaluator';

  // 10분 무동작 세션 타임아웃
  useIdleTimeout({
    enabled: isLoggedIn,
    onTimeout: () => {
      clearAllApiKeys();
      authSignOut().catch(() => {});
      dispatch({ type: 'SIGN_OUT' });
    },
  });

  // 프로필 완성 여부 체크
  const needsProfileCompletion = !!state.user && !!_userProfile && !_userProfile.name && !_profileDismissed;

  const dismissProfileModal = useCallback(() => {
    sessionStorage.setItem('ahp_profile_modal_dismissed', '1');
    _setProfileDismissed(true);
  }, []);

  const value = useMemo(() => ({
    ...state,
    isLoggedIn,
    isAdmin,
    isEvaluator,
    clearAccountBlock,
    setMode,
    signIn,
    loginWithGoogle,
    loginWithKakao,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
    updateProfile,
  }), [state, isLoggedIn, isAdmin, isEvaluator, clearAccountBlock, setMode, signIn, loginWithGoogle, loginWithKakao, signUp, signOut, resetPassword, refreshProfile, updateProfile]);


  return (
    <AuthContext.Provider value={value}>
      {children}
      {needsProfileCompletion && state.user && (
        <ProfileCompleteModal user={state.user} onComplete={refreshProfile} onDismiss={dismissProfileModal} />
      )}
    {isLoggedIn && state.user && !needsProfileCompletion && (
      <PaymentNudgePopup user={state.user} siteSlug="ahp-app" />
    )}
    </AuthContext.Provider>
  );
}
