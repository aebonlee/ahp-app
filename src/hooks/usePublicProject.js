import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * 평가자 화면에서 쓰는 프로젝트 기본 정보(이름·평가방식) 조회.
 *
 * 익명 평가자는 sessionStorage 기반이라 auth.uid()가 없다. 그래서 RLS의
 * is_project_evaluator(auth.uid() 기반)에 걸리지 않고, projects 테이블을 직접
 * select 하면 비공개 프로젝트에서 아무 행도 못 읽는다(= 이름 공백, eval_method null →
 * 직접입력 프로젝트인데 쌍대비교 페이지로 오라우팅되는 버그).
 *
 * get_project_for_invite 는 SECURITY DEFINER 라 RLS와 무관하게 동작하므로
 * 익명·로그인 평가자 양쪽에서 안전하게 쓸 수 있다. 이 RPC는 access_code 를
 * 반환하지 않는다(서버의 public_verify_access 가 검증 전담).
 */
export function usePublicProject(projectId) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(!!projectId);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    supabase
      .rpc('ahp_get_project_for_invite', { p_project_id: projectId })
      .then(({ data }) => {
        if (!alive) return;
        setProject(data?.[0] ?? null);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [projectId]);

  return {
    project,
    projectName: project?.name ?? '',
    evalMethod: project?.eval_method ?? null,
    loading,
  };
}
