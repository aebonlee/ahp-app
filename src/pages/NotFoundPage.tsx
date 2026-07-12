import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.code}>404</div>
      <p className={styles.message}>요청하신 페이지를 찾을 수 없습니다.</p>
      <Link to="/" className={styles.link}>홈으로 돌아가기</Link>
    </div>
  );
}
