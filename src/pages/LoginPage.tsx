import { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import styles from './AuthPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, signIn, loginWithGoogle, loginWithKakao } = useAuth();
  const [step, setStep] = useState('method'); // 'method' | 'email'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/admin';

  // 이미 로그인 상태면 리다이렉트
  if (isLoggedIn) {
    return <Navigate to={from} replace />;
  }

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google 로그인에 실패했습니다.');
    }
  };

  const handleKakaoLogin = async () => {
    setError('');
    try {
      await loginWithKakao();
    } catch (err: any) {
      setError(err.message || 'Kakao 로그인에 실패했습니다.');
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}><Link to="/" className={styles.titleLink}>AHP Basic</Link></h1>
        <p className={styles.subtitle}>로그인</p>

        {error && <div className={styles.error} role="alert" id="login-error">{error}</div>}

        {step === 'method' ? (
          <>
            <div className={styles.socialButtons}>
              <button className={styles.googleBtn} onClick={handleGoogleLogin}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google로 로그인
              </button>

              <button className={styles.kakaoBtn} onClick={handleKakaoLogin}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#3C1E1E" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.37 6.24l-1.12 4.16c-.08.3.26.54.52.37l4.97-3.28c.41.04.83.07 1.26.07 5.52 0 10-3.36 10-7.56S17.52 3 12 3z"/>
                </svg>
                Kakao로 로그인
              </button>
            </div>

            <div className={styles.divider}>또는</div>

            <button className={styles.emailBtn} onClick={() => setStep('email')}>
              이메일로 로그인
            </button>
          </>
        ) : (
          <>
            <button className={styles.backBtn} onClick={() => setStep('method')}>
              &larr; 다른 방법으로 로그인
            </button>

            <form onSubmit={handleEmailSubmit} className={styles.form}>
              <label className={styles.field} htmlFor="loginEmail">
                <span>이메일</span>
                <input
                  id="loginEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  autoFocus
                />
              </label>

              <label className={styles.field} htmlFor="loginPassword">
                <span>비밀번호</span>
                <input
                  id="loginPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  required
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </label>

              <Button type="submit" loading={loading} className={styles.submitBtn}>
                로그인
              </Button>
            </form>

            <p className={styles.link}>
              <Link to="/forgot-password">비밀번호를 잊으셨나요?</Link>
            </p>
          </>
        )}

        <p className={styles.link}>
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
