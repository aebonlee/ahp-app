import PublicNav from './PublicNav';
import PublicFooter from './PublicFooter';
import styles from './PublicLayout.module.css';

export default function PublicLayout({ children }: any) {
  return (
    <div className={styles.layout}>
      <a href="#main-content" className="skip-link">본문 바로가기</a>
      <PublicNav />
      <main id="main-content" className={styles.main}>{children}</main>
      <PublicFooter />
    </div>
  );
}
