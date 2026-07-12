import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail, getPasswordErrors } from '../utils/validators';
import Button from '../components/common/Button';
import styles from './AuthPage.module.css';

export default function SignupPage() {
  const navigate = useNavigate();
  const { isLoggedIn, signUp, loginWithGoogle, loginWithKakao } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [role, setRole] = useState('user');

  // Field-level validation state
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  const emailError = emailTouched && email && !isValidEmail(email)
    ? '올바른 이메일 형식이 아닙니다.'
    : '';
  const passwordErrors = passwordTouched ? getPasswordErrors(password) : [];
  const confirmError = confirmTouched && confirmPassword && password !== confirmPassword
    ? '비밀번호가 일치하지 않습니다.'
    : '';
  const confirmOk = confirmTouched && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    const pwErrors = getPasswordErrors(password);
    if (pwErrors.length > 0) {
      setError(pwErrors.join(' '));
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, displayName, role);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}><Link to="/" className={styles.titleLink}>AHP Basic</Link></h1>
          <p className={styles.subtitle}>회원가입 완료</p>
          <p style={{ textAlign: 'center', margin: '16px 0' }}>
            이메일 확인 후 로그인해주세요.
          </p>
          <Button onClick={() => navigate('/login')} className={styles.submitBtn}>
            로그인으로 이동
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>AHP Basic</h1>
        <p className={styles.subtitle}>회원가입</p>

        <div className={styles.roleToggle}>
          <button
            type="button"
            className={`${styles.roleBtn} ${role === 'user' ? styles.roleBtnActive : ''}`}
            onClick={() => setRole('user')}
          >
            연구자
          </button>
          <button
            type="button"
            className={`${styles.roleBtn} ${role === 'evaluator' ? styles.roleBtnActive : ''}`}
            onClick={() => setRole('evaluator')}
          >
            평가자
          </button>
        </div>
        {role === 'evaluator' && (
          <p className={styles.roleHint}>평가자로 가입하면 평가 참여 후 포인트를 적립할 수 있습니다.</p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error} role="alert">{error}</div>}

          <label className={styles.field} htmlFor="signupName">
            <span>이름</span>
            <input
              id="signupName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="이름 입력"
              required
              aria-required="true"
              autoFocus
            />
          </label>

          <label className={styles.field} htmlFor="signupEmail">
            <span>이메일</span>
            <input
              id="signupEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="email@example.com"
              required
              aria-required="true"
              aria-invalid={!!emailError}
            />
            {emailError && <span className={styles.fieldError}>{emailError}</span>}
          </label>

          <label className={styles.field} htmlFor="signupPassword">
            <span>비밀번호</span>
            <input
              id="signupPassword"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true); }}
              placeholder="8자 이상, 영문+숫자 포함"
              required
              aria-required="true"
            />
            {passwordTouched && password && (
              passwordErrors.length > 0
                ? passwordErrors.map((msg, i) => <span key={i} className={styles.fieldError}>{msg}</span>)
                : <span className={styles.fieldHint}>안전한 비밀번호입니다.</span>
            )}
          </label>

          <label className={styles.field} htmlFor="signupConfirmPassword">
            <span>비밀번호 확인</span>
            <input
              id="signupConfirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setConfirmTouched(true); }}
              placeholder="비밀번호 재입력"
              required
              aria-required="true"
            />
            {confirmError && <span className={styles.fieldError}>{confirmError}</span>}
            {confirmOk && <span className={styles.fieldHint}>비밀번호가 일치합니다.</span>}
          </label>

          <Button type="submit" loading={loading} className={styles.submitBtn}>
            회원가입
          </Button>
        </form>

        <div className={styles.divider}>또는</div>

        <div className={styles.socialButtons}>
          <button className={styles.googleBtn} onClick={() => { setError(''); loginWithGoogle().catch(err => setError(err.message || 'Google 가입에 실패했습니다.')); }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 가입
          </button>

          <button className={styles.kakaoBtn} onClick={() => { setError(''); loginWithKakao().catch(err => setError(err.message || 'Kakao 가입에 실패했습니다.')); }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#3C1E1E" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.37 6.24l-1.12 4.16c-.08.3.26.54.52.37l4.97-3.28c.41.04.83.07 1.26.07 5.52 0 10-3.36 10-7.56S17.52 3 12 3z"/>
            </svg>
            Kakao로 가입
          </button>
        </div>

        <p className={styles.link}>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}
