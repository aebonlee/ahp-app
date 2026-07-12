import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * 회귀 방지: 익명(anon) 세션에 프로젝트 비밀 컬럼이 새어나가지 않도록 소스를 검사한다.
 *
 * 배경 (2026-07-12 실측):
 *   projects_marketplace_select 정책이 모집중 프로젝트의 "행 전체"를 익명에게 내준다.
 *   RLS는 행 단위라 컬럼을 가리지 못하므로, 익명 경로가 아래 컬럼을 select 하는 순간
 *   그 값이 그대로 클라이언트로 내려간다.
 *     - access_code        : 공개 설문 접근 비밀번호 (익명 anon key로 실제 유출 확인)
 *     - result_share_token : 결과 공유 링크 토큰
 *
 *   DB 측은 06_S4_column_secrets_revoke.sql 로 anon 의 컬럼 SELECT 권한을 회수했다.
 *   코드 측은 익명 경로가 두 컬럼을 "요청조차 하지 않아야" 한다. 요청하면 PostgREST가
 *   42501로 실패시켜 화면이 깨지므로, 이 테스트는 보안 가드이자 가용성 가드다.
 *
 * 검사 방식:
 *   .select('...') 인자로 넘어가는 문자열만 본다. accessCode(상태변수),
 *   p_access_code(RPC 파라미터), need_access_code(상태문자열)처럼 컬럼 조회와
 *   무관한 식별자는 오탐이므로 제외된다.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(SRC, p), 'utf8');

/** 주석 제거 — 설명문에 쓴 컬럼명이 오탐되지 않도록. */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** 소스에서 .select(...) 에 넘긴 문자열 리터럴을 모두 뽑는다. */
function selectArgs(src) {
  const out = [];
  const re = /\.select\(\s*(['"`])([\s\S]*?)\1/g;
  let m;
  while ((m = re.exec(stripComments(src))) !== null) out.push(m[2]);
  return out;
}

/**
 * projects 테이블에 대한 select() 인자만 뽑는다.
 * select('*') 금지는 projects 에만 적용한다 — 비밀 컬럼(access_code,
 * result_share_token)이 있는 테이블이 projects 뿐이기 때문. 다른 테이블
 * (예: 본인 evaluators 행)의 select('*')까지 막으면 오탐이다.
 */
function projectSelectArgs(src) {
  const clean = stripComments(src);
  const out = [];
  const re = /\.from\(\s*(['"`])projects\1\s*\)([\s\S]{0,300}?)\.select\(\s*(['"`])([\s\S]*?)\3/g;
  let m;
  while ((m = re.exec(clean)) !== null) out.push(m[4]);
  return out;
}

const SECRET_COLUMNS = ['access_code', 'result_share_token'];

// 익명 평가자(sessionStorage 기반, auth.uid() 없음)가 도달할 수 있는 화면·훅.
// EvaluatorGuard는 로그인이 아니라 sessionStorage로 통과시키므로 /eval/* 는 사실상 익명 경로다.
const ANON_REACHABLE = [
  'pages/InviteLandingPage.tsx',
  'pages/EvalPreSurveyPage.tsx',
  'pages/PairwiseRatingPage.tsx',
  'pages/DirectInputPage.tsx',
  'pages/EvalResultPage.tsx',
  'pages/SharedResultPage.tsx',
  'hooks/usePublicProject.js',
];

describe('익명 경로 비밀 컬럼 노출 방지', () => {
  it.each(ANON_REACHABLE)('%s 의 select() 에 비밀 컬럼이 없다', (file) => {
    const src = read(file);
    for (const arg of selectArgs(src)) {
      for (const col of SECRET_COLUMNS) {
        expect(
          arg.includes(col),
          `${file}: select('${arg}') 가 ${col} 을 요청한다 — 익명 세션에 비밀값이 노출된다`,
        ).toBe(false);
      }
    }
    // projects 는 select('*') 금지 — 컬럼을 특정하지 않으면 비밀 컬럼이 함께 딸려온다.
    for (const arg of projectSelectArgs(src)) {
      expect(
        arg.trim(),
        `${file}: 익명 경로에서 projects.select('*') 금지 — 컬럼을 명시할 것`,
      ).not.toBe('*');
    }
  });

  it('ProjectContext.fetchProject 는 PROJECT_FIELDS 를 쓰고 select(*) 를 쓰지 않는다', () => {
    const src = stripComments(read('contexts/ProjectContext.tsx'));
    // 'const fetchProjects'(복수, 목록용)와 구분하기 위해 '= useCallback' 까지 붙여 찾는다.
    const start = src.search(/const fetchProject\s*=\s*useCallback/);
    expect(start, 'fetchProject 선언을 찾지 못함').toBeGreaterThan(-1);
    const end = src.indexOf('const createProject', start);
    const body = src.slice(start, end > -1 ? end : undefined);

    // fetchProject 는 익명 평가자(EvalResultPage)도 호출한다. select('*')면 비밀 컬럼이 함께 내려간다.
    expect(body).not.toMatch(/select\(\s*['"`]\*['"`]\s*\)/);
    expect(body).toContain('PROJECT_FIELDS');
  });

  it('PROJECT_FIELDS 공용 컬럼 목록에 비밀 컬럼이 없다', () => {
    const src = stripComments(read('contexts/ProjectContext.tsx'));
    const start = src.indexOf('const PROJECT_FIELDS');
    const decl = src.slice(start, src.indexOf(';', start));
    for (const col of SECRET_COLUMNS) {
      expect(decl.includes(col), `PROJECT_FIELDS 에 ${col} 이 포함됨`).toBe(false);
    }
    // 화면이 실제로 쓰는 필드는 남아 있어야 한다(과도한 제거로 인한 기능 회귀 방지).
    for (const col of ['id', 'name', 'owner_id', 'eval_method', 'consent_text', 'reward_points']) {
      expect(decl, `PROJECT_FIELDS 에서 ${col} 이 빠짐`).toContain(col);
    }
  });

  // NOTE(ahp-app): DB GRANT 목록 ↔ PROJECT_FIELDS 대조 테스트는
  // supabase/schema/01_schema.sql 이 확정된 뒤 되살린다.
  // (ahp-basic 에서는 06_S4 스크립트와 대조했다 — 같은 방식으로 복원할 것)

  it('useSurveyConfig 의 publicMode 분기는 RPC를 쓰고 access_code 를 채우지 않는다', () => {
    const src = stripComments(read('hooks/useSurvey.js'));
    const start = src.indexOf('if (publicMode)');
    expect(start, 'publicMode 분기를 찾지 못함').toBeGreaterThan(-1);
    // 분기 끝 = 그 다음에 오는 테이블 직접 조회(소유자 경로) 시작 지점
    const end = src.indexOf(".from('ahp_projects')", start);
    const branch = src.slice(start, end > -1 ? end : undefined);

    expect(branch).toContain('get_project_for_invite');
    // RPC가 access_code 를 반환하지 않으므로 빈 문자열로 고정한다.
    expect(branch).toMatch(/access_code:\s*['"`]{2}/);
    // publicMode 분기 안에서 projects 테이블을 직접 읽으면 안 된다.
    expect(branch).not.toContain("from('projects')");
  });
});
