import { Component } from 'react';
import styles from './ErrorBoundary.module.css';

export default class ErrorBoundary extends Component<any, any> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.hash = '#/';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.icon}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="#e11d48" strokeWidth="2" fill="#fff1f2" />
                <path d="M24 14v12" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="24" cy="32" r="1.5" fill="#e11d48" />
              </svg>
            </div>
            <h2 className={styles.title}>오류가 발생했습니다</h2>
            <p className={styles.message}>
              페이지를 표시하는 중 문제가 발생했습니다.
            </p>
            {this.state.error && (
              <details className={styles.details}>
                <summary>오류 상세</summary>
                <pre>{this.state.error.toString()}</pre>
              </details>
            )}
            <div className={styles.actions}>
              <button className={styles.retryBtn} onClick={this.handleReset}>
                다시 시도
              </button>
              <button className={styles.homeBtn} onClick={this.handleGoHome}>
                홈으로 이동
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
