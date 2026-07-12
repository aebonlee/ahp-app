import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { USER_MODE } from '../../lib/constants';
import styles from './Navbar.module.css';

function formatDateTime(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

export default function Navbar({ projectName }: any) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, mode, setMode, isAdmin, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isAdminPath = location.pathname.startsWith('/admin');
  const isPreviewMode = isAdmin && mode === USER_MODE.EVALUATOR;

  const handleReturnToAdmin = () => {
    setMode(USER_MODE.ADMIN);
    navigate('/admin');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        {/* Left: Logo → 메인페이지 */}
        <div className={styles.logoGroup}>
          <button className={styles.logo} onClick={() => navigate('/')} aria-label="홈으로 이동">
            <span className={styles.logoText}>AHP Basic</span>
          </button>
          <button
            className={styles.homeBtn}
            onClick={() => navigate(isAdminPath ? '/admin' : isAdmin ? '/admin' : '/eval')}
          >
            대시보드
          </button>
        </div>

        {/* Center: Project Name + DateTime */}
        {projectName && (
          <div className={styles.center}>
            <span className={styles.projectName}>
              {projectName} <span className={styles.dateTime}>— {formatDateTime(now)}</span>
            </span>
          </div>
        )}

        {/* Right: Actions */}
        <div className={styles.actions}>
          <button
            className={styles.themeBtn}
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? '라이트 모드' : '다크 모드'}
            aria-label={darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {darkMode ? '\u2600' : '\u263E'}
          </button>

          {user && (
            <>
              {isPreviewMode && !isAdminPath && (
                <button className={styles.previewBadge} onClick={handleReturnToAdmin}>
                  미리보기 중 — 돌아가기
                </button>
              )}

              {profile?.role === 'superadmin' && (
                <button className={styles.saBadge} onClick={() => navigate('/superadmin')} aria-label="슈퍼관리자 페이지">SA</button>
              )}

              {isAdmin && !isPreviewMode && (
                <span className={styles.roleBadge}>연구자</span>
              )}

              <span className={styles.userInfo}>{user.email}</span>
              <button className={styles.logoutBtn} onClick={handleSignOut}>
                로그아웃
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
