import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { sendSms } from '../lib/smsService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import PublicLayout from '../components/layout/PublicLayout';
import styles from './LectureApplyPage.module.css';

const LECTURE_TYPES = [
  {
    key: 'free',
    title: 'AHP App 사용법 소개',
    subtitle: '무료강의',
    duration: '40분',
    price: '무료',
    curriculum: [
      'AHP 분석 개요 및 기본 원리',
      'AHP App 프로그램 구성 소개',
      '프로젝트 생성 및 평가 진행 데모',
      '결과 분석 및 활용 방법',
    ],
  },
  {
    key: 'consulting',
    title: '연구프로젝트 설정 맞춤 컨설팅',
    subtitle: '1:1 맞춤강의',
    duration: '40분',
    price: '무료',
    curriculum: [
      '연구 목적에 맞는 계층구조 설계',
      '평가기준 및 대안 항목 설정',
      '평가자 그룹 구성 전략',
      '결과 해석 및 논문 활용 가이드',
    ],
  },
];

const BookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" />
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

function getMinDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

const INITIAL_FORM = { name: '', email: '', phone: '', preferredDate: '', message: '' };

export default function LectureApplyPage() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (profile || user) {
      const email = user?.email
        || user?.user_metadata?.email
        || user?.identities?.[0]?.identity_data?.email
        || profile?.email
        || '';
      setForm(prev => ({
        ...prev,
        name: prev.name || profile?.display_name || user?.user_metadata?.full_name || '',
        email: prev.email || email,
        phone: prev.phone || profile?.phone || '',
      }));
    }
  }, [profile, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !selectedType) return;

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast.warning('이름을 입력해 주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.warning('올바른 이메일 주소를 입력해 주세요.');
      return;
    }

    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      toast.warning('올바른 전화번호를 입력해 주세요.');
      return;
    }

    if (!form.preferredDate) {
      toast.warning('희망 일자를 선택해 주세요.');
      return;
    }

    setSubmitting(true);

    const lectureInfo = LECTURE_TYPES.find(t => t.key === selectedType);
    const lectureLabel = lectureInfo?.subtitle || selectedType;

    const { error } = await supabase.from('ahp_lecture_applications').insert({
      name: trimmedName,
      email: form.email.trim(),
      phone: form.phone.trim(),
      lecture_type: selectedType,
      preferred_date: form.preferredDate,
      preferred_dates: [],
      message: form.message.trim() || null,
    });

    if (error) {
      toast.error('신청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      setSubmitting(false);
      return;
    }

    // SMS 발송 (실패해도 신청 성공 처리)
    const smsMessage =
      `[AHP App] ${trimmedName}님, 온라인 강의 신청이 접수되었습니다.\n` +
      `- 강의: ${lectureLabel}\n` +
      `- 희망일: ${form.preferredDate}\n` +
      `확정 일정은 별도 안내드리겠습니다.`;

    try {
      await sendSms({ receiver: form.phone.trim(), message: smsMessage });
    } catch {
      // SMS 실패 무시
    }

    toast.success('강의 신청이 완료되었습니다!');
    setForm({ ...INITIAL_FORM });
    setSelectedType(null);
    setSubmitting(false);
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>온라인 강의</span>
          <h1 className={styles.heroTitle}>온라인 강의 신청</h1>
          <p className={styles.heroDesc}>
            AHP App 활용법을 배울 수 있는 온라인 강의입니다.<br />
            원하시는 강의를 선택하고 희망 일자를 지정해 주세요.
          </p>
        </div>
      </section>

      {/* Lecture Types */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>강의 선택</h2>
        <div className={styles.lectureTypeGrid}>
          {LECTURE_TYPES.map(lec => (
            <div
              key={lec.key}
              className={`${styles.lectureTypeCard} ${selectedType === lec.key ? styles.selected : ''}`}
              onClick={() => setSelectedType(lec.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedType(lec.key); }}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  {lec.key === 'free' ? <BookIcon /> : <UserIcon />}
                </div>
                <div className={styles.cardTitle}>{lec.title}</div>
              </div>
              <div className={styles.cardMeta}>
                <span className={styles.metaBadge}>{lec.subtitle}</span>
                <span className={styles.metaBadge}>{lec.duration}</span>
                <span className={`${styles.metaBadge} ${styles.free}`}>{lec.price}</span>
              </div>
              <ul className={styles.cardCurriculum}>
                {lec.curriculum.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Form — 강의 선택 후 표시 */}
        {selectedType && (
          <>
            <h2 className={styles.sectionTitle}>신청서 작성</h2>
            <div className={styles.formWrap}>
              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label>선택한 강의</label>
                  <span className={styles.typeBadge}>
                    {LECTURE_TYPES.find(t => t.key === selectedType)?.subtitle}
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="lec-name">이름 *</label>
                  <input
                    id="lec-name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="홍길동"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="lec-email">이메일 *</label>
                  <input
                    id="lec-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="lec-phone">전화번호 *</label>
                  <input
                    id="lec-phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="010-1234-5678"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="lec-date">희망 일자 *</label>
                  <input
                    id="lec-date"
                    name="preferredDate"
                    type="date"
                    value={form.preferredDate}
                    onChange={handleChange}
                    min={getMinDate()}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="lec-message">문의사항</label>
                  <textarea
                    id="lec-message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="궁금한 점이 있으시면 자유롭게 작성해 주세요."
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? '신청 중...' : '강의 신청하기'}
                </button>
              </form>

              <div className={styles.infoBox}>
                <strong>안내사항</strong><br />
                - 강의는 Zoom을 통해 진행되며, 확정 일정은 별도 안내드립니다.<br />
                - 강의 시간: 약 40분<br />
                - 신청 접수 후 확인 문자가 발송됩니다.<br />
                - 문의: 신청서 하단 문의사항란을 이용해 주세요.
              </div>
            </div>
          </>
        )}
      </section>
    </PublicLayout>
  );
}
