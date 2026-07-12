import Navbar from './Navbar';
import Footer from './Footer';
import styles from './PageLayout.module.css';

export default function PageLayout({ children, wide, projectName }: any) {
  return (
    <div className={styles.layout}>
      <Navbar projectName={projectName} />
      <main className={`${styles.content} ${wide ? styles.wide : ''}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
