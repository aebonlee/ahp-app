import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import styles from './AuthPage.module.css';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || '비밀번호 재설정 이메일 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}><Link to="/" className={styles.titleLink}>AHP Basic</Link></h1>
          <p className={styles.subtitle}>이메일 발송 완료</p>
          <div className={styles.success}>
            비밀번호 재설정 링크가 이메일로 발송되었습니다.<br />
            이메일을 확인해주세요.
          </div>
          <p className={styles.link}>
            <Link to="/login">로그인으로 돌아가기</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>AHP Basic</h1>
        <p className={styles.subtitle}>비밀번호 재설정</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error} role="alert">{error}</div>}

          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginBottom: 8 }}>
            가입 시 사용한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.
          </p>

          <label className={styles.field} htmlFor="resetEmail">
            <span>이메일</span>
            <input
              id="resetEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              autoFocus
            />
          </label>

          <Button type="submit" loading={loading} className={styles.submitBtn}>
            재설정 링크 보내기
          </Button>
        </form>

        <p className={styles.link}>
          <Link to="/login">로그인으로 돌아가기</Link>
        </p>
      </div>
    </div>
  );
}
