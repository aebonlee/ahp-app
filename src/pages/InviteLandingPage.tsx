import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useSurveyConfig, useSurveyQuestions, useConsentRecords, useSurveyResponses } from '../hooks/useSurvey';
import { formatPhone, isRepeatedName } from '../lib/evaluatorUtils';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import styles from './InviteLandingPage.module.css';

// 세션별 고유 식별자 (속도 제한용)
function getSessionFingerprint() {
  const key = '__vfp';
  let fp = sessionStorage.getItem(key);
  if (!fp) {
    fp = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    sessionStorage.setItem(key, fp);
  }
  return fp;
}

export default function InviteLandingPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const ipHash = useMemo(() => getSessionFingerprint(), []);
  const [status, setStatus] = useState('loading');
  const [project, setProject] = useState(null);
  const [evaluator, setEvaluator] = useState(null);

  // 전화번호 인증 관련 상태
  const [phoneLast4, setPhoneLast4] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [matchedEvaluators, setMatchedEvaluators] = useState([]);

  // 공개 접근 관련 상태
  const [accessCode, setAccessCode] = useState('');
  const [accessError, setAccessError] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regError, setRegError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [pendingEvaluator, setPendingEvaluator] = useState(null);

  // 사전설문 관련 hooks
  const { config, loading: configLoading } = useSurveyConfig(token, { publicMode: true });
  const { questions, loading: questionsLoading } = useSurveyQuestions(token);
  const { hasConsented, loading: consentLoading } = useConsentRecords(token);
  const { responses, loading: responsesLoading } = useSurveyResponses(token);

  const checkInvite = useCallback(async () => {
    if (user) {
      // 로그인 사용자도 RPC로 프로젝트 조회 (S2: projects 익명 SELECT 제거 대응)
      // 비회원 경로와 동일한 SECURITY DEFINER RPC를 사용해 RLS와 무관하게 동작.
      const { data: rows, error } = await supabase
        .rpc('ahp_get_project_for_invite', { p_project_id: token });
      const data = rows?.[0];

      if (error || !data) {
        setStatus('invalid');
        return;
      }

      setProject(data);

      // user_id 또는 email로 평가자 매칭
      const { data: evalData } = await supabase
        .from('ahp_evaluators')
        .select('*')
        .eq('project_id', token)
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .limit(1)
        .single();

      if (evalData) {
        // user_id 미연결이면 자동 연결
        if (!evalData.user_id) {
          await supabase.from('ahp_evaluators').update({ user_id: user.id }).eq('id', evalData.id);
        }
        // sessionStorage에도 저장 (EvaluatorGuard/findEvaluatorId 폴백용)
        sessionStorage.setItem(`evaluator_${token}`, evalData.id);
        setEvaluator(evalData);
        setStatus('ready');
      } else if (data.recruit_evaluators) {
        // 마켓플레이스 프로젝트: 자동 참여
        try {
          const { data: evalId, error: joinErr } = await supabase.rpc('ahp_join_marketplace_project', { p_project_id: token });
          if (joinErr) throw joinErr;
          sessionStorage.setItem(`evaluator_${token}`, evalId);
          setEvaluator({ id: evalId, name: user.email });
          setStatus('ready');
        } catch (err: any) {
          // 이미 참여 중 등의 에러 → not_assigned로 폴백
          setStatus('not_assigned');
        }
      } else if (data.public_access_enabled) {
        setStatus('need_access_code');
      } else {
        setStatus('not_assigned');
      }
    } else {
      // 비로그인 사용자: RPC로 프로젝트 조회 (RLS 우회)
      const { data, error } = await supabase
        .rpc('ahp_get_project_for_invite', { p_project_id: token });

      if (error || !data || data.length === 0) {
        setStatus('invalid');
        return;
      }

      setProject(data[0]);

      if (data[0].recruit_evaluators) {
        // 마켓플레이스 → 바로 등록 폼
        setStatus('marketplace_register');
      } else if (data[0].public_access_enabled) {
        setStatus('need_access_code');
      } else {
        setStatus('need_verify');
      }
    }
  }, [token, user]);

  useEffect(() => {
    checkInvite();
  }, [checkInvite]);

  const surveyLoading = configLoading || questionsLoading || consentLoading || responsesLoading;

  const handleVerifyPhone = async () => {
    if (phoneLast4.length !== 4 || !/^\d{4}$/.test(phoneLast4)) {
      setVerifyError('전화번호 뒷 4자리(숫자)를 입력해주세요.');
      return;
    }
    setVerifying(true);
    setVerifyError('');

    const { data: matches, error } = await supabase
      .rpc('ahp_verify_evaluator_phone', { p_project_id: token, p_phone_last4: phoneLast4, p_ip_hash: ipHash });

    if (error) {
      setVerifyError(error.message?.includes('Too many') ? '시도 횟수 초과. 잠시 후 다시 시도해주세요.' : '확인 중 오류가 발생했습니다.');
      setVerifying(false);
      return;
    }

    if (!matches || matches.length === 0) {
      setVerifyError('등록된 전화번호와 일치하지 않습니다.');
      setVerifying(false);
      return;
    }

    if (matches.length === 1) {
      completeVerification(matches[0]);
    } else {
      setMatchedEvaluators(matches);
      setStatus('select_evaluator');
    }
    setVerifying(false);
  };

  const handleVerifyAccessCode = async () => {
    if (accessCode.length !== 4 || !/^\d{4}$/.test(accessCode)) {
      setAccessError('4자리 숫자를 입력해주세요.');
      return;
    }
    setVerifying(true);
    setAccessError('');

    const { data, error } = await supabase
      .rpc('ahp_public_verify_access', { p_project_id: token, p_access_code: accessCode, p_ip_hash: ipHash });

    if (error) {
      setAccessError(error.message?.includes('Too many') ? '시도 횟수 초과. 잠시 후 다시 시도해주세요.' : '확인 중 오류가 발생했습니다.');
      setVerifying(false);
      return;
    }
    if (!data || data.length === 0) {
      setAccessError('비밀번호가 일치하지 않습니다.');
      setVerifying(false);
      return;
    }

    setStatus('need_registration');
    setVerifying(false);
  };

  const handlePublicRegister = async () => {
    if (!regName.trim()) {
      setRegError('이름을 입력해주세요.');
      return;
    }
    if (isRepeatedName(regName)) {
      setRegError('올바른 이름을 입력해주세요.');
      return;
    }
    const cleanPhone = regPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setRegError('올바른 전화번호를 입력해주세요.');
      return;
    }
    setRegistering(true);
    setRegError('');

    const { data, error } = await supabase
      .rpc('ahp_public_register_evaluator', {
        p_project_id: token,
        p_access_code: accessCode,
        p_name: regName.trim(),
        p_phone: cleanPhone,
      });

    if (error) {
      setRegError('등록 중 오류가 발생했습니다.');
      setRegistering(false);
      return;
    }

    if (data && data.length > 0) {
      const row = data[0];
      if (row.is_existing) {
        if (row.completed) {
          // 이미 평가 완료 → 바로 완료 상태로
          completeVerification({ id: row.id, name: row.name, completed: true });
        } else if (row.name === regName.trim()) {
          setPendingEvaluator(row);
          setStatus('confirm_existing');
        } else {
          setRegError('이 전화번호로 이미 등록된 평가자가 있습니다. 등록된 이름을 정확히 입력해주세요.');
        }
      } else {
        completeVerification({ id: row.id, name: row.name });
      }
    }
    setRegistering(false);
  };

  const handleMarketplaceRegister = async () => {
    if (!regName.trim()) {
      setRegError('이름을 입력해주세요.');
      return;
    }
    if (isRepeatedName(regName)) {
      setRegError('올바른 이름을 입력해주세요.');
      return;
    }
    const cleanPhone = regPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setRegError('올바른 전화번호를 입력해주세요.');
      return;
    }
    setRegistering(true);
    setRegError('');

    const { data, error } = await supabase
      .rpc('ahp_marketplace_register_evaluator', {
        p_project_id: token,
        p_name: regName.trim(),
        p_phone: cleanPhone,
      });

    if (error) {
      setRegError(error.message || '등록 중 오류가 발생했습니다.');
      setRegistering(false);
      return;
    }

    if (data && data.length > 0) {
      const row = data[0];
      if (row.is_existing) {
        if (row.completed) {
          // 이미 평가 완료 → 바로 완료 상태로
          completeVerification({ id: row.id, name: row.name, completed: true });
        } else if (row.name === regName.trim()) {
          setPendingEvaluator(row);
          setStatus('confirm_existing');
        } else {
          setRegError('이 전화번호로 이미 등록된 평가자가 있습니다. 등록된 이름을 정확히 입력해주세요.');
        }
      } else {
        completeVerification({ id: row.id, name: row.name });
      }
    }
    setRegistering(false);
  };

  const completeVerification = (ev) => {
    sessionStorage.setItem(`evaluator_${token}`, ev.id);
    setEvaluator(ev);
    setStatus('ready');
  };

  const handleStartEval = () => {
    // 평가 완료된 평가자는 결과 페이지로 바로 이동
    if (evaluator?.completed) {
      navigate(`/eval/project/${token}/result`);
      return;
    }

    // 동의서/연구소개는 project(get_project_for_invite RPC)에서 읽는다
    // (S2: projects 익명 SELECT 제거 대응 — config의 projects 직접조회 의존 제거)
    const hasSurvey = questions.length > 0 ||
      project?.research_description ||
      project?.consent_text;

    if (hasSurvey && evaluator) {
      const consentDone = !project?.consent_text || hasConsented(evaluator.id);
      const evalResponses = responses.filter(r => r.evaluator_id === evaluator.id);
      const surveyDone = questions.length === 0 || evalResponses.length >= questions.length;

      if (!consentDone || !surveyDone) {
        navigate(`/eval/project/${token}/pre-survey`);
        return;
      }
    }

    navigate(`/eval/project/${token}`);
  };

  const handlePhoneInput = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setRegPhone(formatPhone(digits));
    setRegError('');
  };

  if (status === 'loading') return <LoadingSpinner message="초대 확인 중..." />;

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.brand}>AHP Basic</h1>

        {status === 'invalid' && (
          <>
            <p className={styles.errorDesc}>유효하지 않은 초대 링크입니다.</p>
            <Button onClick={() => navigate('/login', { state: { from: location } })}>로그인</Button>
          </>
        )}

        {status === 'need_verify' && (
          <>
            <h2 className={styles.projectName}>{project?.name}</h2>
            <p className={styles.desc}>본인 확인을 위해 등록된 전화번호 뒷 4자리를 입력해주세요.</p>
            <div className={styles.verifyForm}>
              <input
                type="tel"
                maxLength={4}
                value={phoneLast4}
                onChange={(e) => {
                  setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setVerifyError('');
                }}
                placeholder="뒷 4자리"
                className={styles.phoneInput}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyPhone(); }}
              />
              {verifyError && <p className={styles.errorDesc}>{verifyError}</p>}
              <Button onClick={handleVerifyPhone} loading={verifying}>확인</Button>
            </div>
          </>
        )}

        {status === 'need_access_code' && (
          <>
            <h2 className={styles.projectName}>{project?.name}</h2>
            <p className={styles.desc}>설문에 참여하려면 비밀번호를 입력해주세요.</p>
            <div className={styles.verifyForm}>
              <input
                type="tel"
                maxLength={4}
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setAccessError('');
                }}
                placeholder="비밀번호 4자리"
                className={styles.phoneInput}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyAccessCode(); }}
              />
              {accessError && <p className={styles.errorDesc}>{accessError}</p>}
              <Button onClick={handleVerifyAccessCode} loading={verifying}>확인</Button>
            </div>
          </>
        )}

        {status === 'need_registration' && (
          <>
            <h2 className={styles.projectName}>{project?.name}</h2>
            <p className={styles.desc}>참여자 정보를 입력해주세요.</p>
            <div className={styles.verifyForm}>
              <input
                type="text"
                value={regName}
                onChange={(e) => { setRegName(e.target.value); setRegError(''); }}
                placeholder="이름"
                className={styles.regInput}
                autoFocus
              />
              <input
                type="tel"
                value={regPhone}
                onChange={handlePhoneInput}
                placeholder="전화번호 (010-0000-0000)"
                className={styles.regInput}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePublicRegister(); }}
              />
              {regError && <p className={styles.errorDesc}>{regError}</p>}
              <Button onClick={handlePublicRegister} loading={registering}>참여하기</Button>
            </div>
          </>
        )}

        {status === 'select_evaluator' && (
          <>
            <h2 className={styles.projectName}>{project?.name}</h2>
            <p className={styles.desc}>동일한 전화번호 뒷자리가 여러 명 있습니다. 본인을 선택해주세요.</p>
            <div className={styles.selectList}>
              {matchedEvaluators.map(ev => (
                <button
                  key={ev.id}
                  className={styles.selectItem}
                  onClick={() => completeVerification(ev)}
                >
                  {ev.name} ({ev.email})
                </button>
              ))}
            </div>
          </>
        )}

        {status === 'confirm_existing' && pendingEvaluator && (
          <>
            <h2 className={styles.projectName}>{project?.name}</h2>
            <p className={styles.desc}>
              <strong>{pendingEvaluator.name}</strong>님의 기존 평가 기록이 있습니다.<br />
              이전 평가를 이어서 진행하시겠습니까?
            </p>
            <div className={styles.verifyForm}>
              <Button onClick={() => completeVerification(pendingEvaluator)}>
                이어서 진행하기
              </Button>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setPendingEvaluator(null);
                  setStatus('need_registration');
                }}
              >
                돌아가기
              </button>
            </div>
          </>
        )}

        {status === 'marketplace_register' && (
          <>
            <h2 className={styles.projectName}>{project?.name}</h2>
            {project?.recruit_description && (
              <p className={styles.desc}>{project.recruit_description}</p>
            )}
            <p className={styles.desc}>평가에 참여하려면 정보를 입력해주세요.</p>
            <div className={styles.verifyForm}>
              <input
                type="text"
                value={regName}
                onChange={(e) => { setRegName(e.target.value); setRegError(''); }}
                placeholder="이름"
                className={styles.regInput}
                autoFocus
              />
              <input
                type="tel"
                value={regPhone}
                onChange={handlePhoneInput}
                placeholder="전화번호 (010-0000-0000)"
                className={styles.regInput}
                onKeyDown={(e) => { if (e.key === 'Enter') handleMarketplaceRegister(); }}
              />
              {regError && <p className={styles.errorDesc}>{regError}</p>}
              <Button onClick={handleMarketplaceRegister} loading={registering}>참여하기</Button>
            </div>
          </>
        )}

        {status === 'not_assigned' && (
          <>
            <h2 className={styles.projectName}>{project?.name}</h2>
            <p className={styles.desc}>이 프로젝트의 평가자로 배정되지 않았습니다.</p>
            <Button onClick={() => navigate('/eval')}>평가자 화면으로</Button>
          </>
        )}

        {status === 'ready' && (
          <>
            <h2 className={styles.projectName}>{project?.name}</h2>
            {evaluator?.completed ? (
              <>
                <p className={styles.desc}>이미 평가를 완료하셨습니다.</p>
                <Button onClick={handleStartEval}>결과 확인</Button>
              </>
            ) : (
              <>
                <p className={styles.desc}>평가에 참여할 준비가 되었습니다.</p>
                <Button onClick={handleStartEval} loading={surveyLoading}>평가 시작</Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
