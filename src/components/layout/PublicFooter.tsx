import { Link } from 'react-router-dom';
import styles from './PublicFooter.module.css';

export default function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerContent}>
          {/* 브랜드 + 회사 정보 */}
          <div className={styles.footerBrand}>
            <h3 className={styles.brandTitle}>
              <span className={styles.brandMark}>AHP</span>{' '}
              <span className={styles.brandText}>Basic</span>
            </h3>
            <p className={styles.brandTagline}>
              AHP(Analytic Hierarchy Process) 기반의 의사결정 분석 플랫폼으로,
              <br />
              체계적인 다기준 의사결정을 지원합니다.
            </p>
            <div className={styles.companyInfo}>
              <p><strong>드림아이티비즈(DreamIT Biz)</strong></p>
              <p>대표이사: 이애본</p>
              <p>사업자등록번호: 601-45-20154</p>
              <p>통신판매신고번호: 제2024-수원팔달-0584호</p>
            </div>
          </div>

          {/* 바로가기 — AHP Basic 메뉴 */}
          <div className={styles.footerLinks}>
            <h4>바로가기</h4>
            <ul>
              <li><Link to="/">홈</Link></li>
              <li><Link to="/about">AHP 소개</Link></li>
              <li><Link to="/features">주요 기능</Link></li>
              <li><Link to="/survey-stats">설문 및 통계</Link></li>
              <li><Link to="/management">관리 기능</Link></li>
              <li><Link to="/guide">이용 가이드</Link></li>
              <li><Link to="/learn">학습 가이드</Link></li>
              <li><Link to="/manual">사용설명서</Link></li>
              <li><Link to="/pricing">사용요금</Link></li>
              <li><Link to="/login">로그인</Link></li>
            </ul>
          </div>

          {/* 연락처 + Family Site */}
          <div className={styles.footerContact}>
            <h4>Contact</h4>
            <p>경기도 수원시 팔달구 매산로 45, 419호</p>
            <p>aebon@dreamitbiz.com</p>
            <p>010-3700-0629</p>
            <p>카카오톡: aebon</p>
            <p className={styles.businessHours}>평일: 09:00 ~ 18:00</p>

            <div className={styles.footerFamily}>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) window.open(e.target.value, '_blank');
                  e.target.value = '';
                }}
              >
                <option value="" disabled>Family Site</option>
                <option value="https://www.dreamitbiz.com">DreamIT Biz 메인</option>
                <option value="https://books.dreamitbiz.com">DreamIT Biz 출판사</option>
                <option value="https://competency.dreamitbiz.com">핵심역량 자가측정</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>&copy; 2020-{new Date().getFullYear()} DreamIT Biz. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
