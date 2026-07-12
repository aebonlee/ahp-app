import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.brand}>AHP Basic</span>
        <span className={styles.sub}>Decision Analysis Platform</span>
        <span className={styles.copy}>&copy; {new Date().getFullYear()} DreamIT Biz. All rights reserved.</span>
      </div>
    </footer>
  );
}
