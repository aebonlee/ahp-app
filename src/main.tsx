import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 배포 후 캐시된 HTML이 존재하지 않는 에셋을 참조할 때 자동 새로고침
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
