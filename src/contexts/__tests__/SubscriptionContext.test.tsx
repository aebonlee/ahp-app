import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useContext } from 'react';

// ─── Mocks ───
const { mockUser, mockProfile, mockSupabase, mockUseAuth } = vi.hoisted(() => ({
  mockUser: { id: 'user-1' },
  mockProfile: { role: 'user' },
  mockSupabase: { rpc: vi.fn() },
  mockUseAuth: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

// We need actual plan utilities
vi.mock('../../lib/subscriptionPlans', async () => {
  const actual = await vi.importActual('../../lib/subscriptionPlans');
  return actual;
});

import { SubscriptionContext, SubscriptionProvider } from '../SubscriptionContext';

// ─── Helpers ───
function useSubscription() {
  return useContext(SubscriptionContext);
}

function createWrapper() {
  return function Wrapper({ children }) {
    return <SubscriptionProvider>{children}</SubscriptionProvider>;
  };
}

function setupRpcMock(rpcName, data, error = null) {
  mockSupabase.rpc.mockImplementation((name, params) => {
    if (name === rpcName) {
      return {
        then: vi.fn((resolve, reject) => {
          return resolve({ data, error });
        }),
      };
    }
    // Default: return success with null
    return {
      then: vi.fn((resolve, reject) => {
        if (reject) return resolve({ data: null, error: null });
        return resolve({ data: null, error: null });
      }),
    };
  });
}

// Flexible RPC mock: maps rpc name to { data, error }
function setupMultiRpcMock(rpcMap) {
  mockSupabase.rpc.mockImplementation((name, params) => {
    const result = rpcMap[name] || { data: null, error: null };
    return {
      then: vi.fn((resolve, reject) => {
        if (typeof resolve === 'function') {
          return resolve({ data: result.data, error: result.error });
        }
        // .then(null, errorHandler) pattern — return a resolved thenable
        return { then: vi.fn((r) => r && r({ data: result.data, error: result.error })) };
      }),
    };
  });
}

const mockPlans = [
  { id: 'plan-1', plan_type: 'free', status: 'active', max_evaluators: 1, project_id: 'proj-1' },
  { id: 'plan-2', plan_type: 'plan_30', status: 'unassigned', max_evaluators: 30, project_id: null },
  { id: 'plan-3', plan_type: 'plan_50', status: 'active', max_evaluators: 50, project_id: 'proj-2' },
  { id: 'plan-4', plan_type: 'plan_multi_100', status: 'unassigned', max_evaluators: 100, project_id: null },
];

describe('SubscriptionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: regular user
    mockUseAuth.mockReturnValue({ user: mockUser, profile: mockProfile });
    // Default: return empty plans to avoid unhandled rejections
    setupMultiRpcMock({
      ahp_get_user_plans: { data: [], error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });
  });

  // ─── Provider basics ───

  it('renders children correctly', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current.userPlans).toBeDefined();
  });

  it('provides all expected context values', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    const expectedKeys = [
      'userPlans', 'currentProjectPlan', 'isSuperAdmin', 'loaded', 'error',
      'activeMultiPlan', 'hasActiveMultiPlan',
      'fetchUserPlans', 'fetchProjectPlan', 'assignPlan',
      'canAddEvaluator', 'getUnassignedPlans', 'getUnassignedMultiPlans',
      'activateMultiPlan', 'grantFreePlan', 'refreshPlans',
    ];
    for (const key of expectedKeys) {
      expect(result.current).toHaveProperty(key);
    }
  });

  // ─── fetchUserPlans ───

  it('fetches user plans successfully on mount', async () => {
    setupMultiRpcMock({
      ahp_get_user_plans: { data: mockPlans, error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.userPlans).toEqual(mockPlans);
    expect(result.current.error).toBeNull();
    expect(mockSupabase.rpc).toHaveBeenCalledWith('ahp_get_user_plans', { p_user_id: 'user-1' });
  });

  it('sets error when fetchUserPlans RPC fails', async () => {
    setupMultiRpcMock({
      ahp_get_user_plans: { data: null, error: { message: 'RPC failed' } },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.error).toBe('RPC failed');
    expect(result.current.userPlans).toEqual([]);
  });

  it('does not fetch plans when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    // Should not call rpc
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current.userPlans).toEqual([]);
    expect(result.current.loaded).toBe(false);
  });

  // ─── fetchProjectPlan ───

  it('fetches project plan successfully', async () => {
    const projectPlan = { plan_type: 'plan_50', max_evaluators: 50 };

    setupMultiRpcMock({
      ahp_get_user_plans: { data: [], error: null },
      ahp_get_project_plan: { data: projectPlan, error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    let returnedPlan;
    await act(async () => {
      returnedPlan = await result.current.fetchProjectPlan('proj-1');
    });

    expect(returnedPlan).toEqual(projectPlan);
    expect(result.current.currentProjectPlan).toEqual(projectPlan);
  });

  it('returns null and clears currentProjectPlan when projectId is null', async () => {
    setupMultiRpcMock({
      ahp_get_user_plans: { data: [], error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    let returnedPlan;
    await act(async () => {
      returnedPlan = await result.current.fetchProjectPlan(null);
    });

    expect(returnedPlan).toBeNull();
    expect(result.current.currentProjectPlan).toBeNull();
  });

  it('sets error when fetchProjectPlan RPC fails', async () => {
    setupMultiRpcMock({
      ahp_get_user_plans: { data: [], error: null },
      ahp_get_project_plan: { data: null, error: { message: 'Project plan error' } },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    await act(async () => {
      await result.current.fetchProjectPlan('proj-1');
    });

    expect(result.current.error).toBe('Project plan error');
    expect(result.current.currentProjectPlan).toBeNull();
  });

  // ─── canAddEvaluator ───

  it('returns true when currentCount is within plan limit', async () => {
    setupMultiRpcMock({
      ahp_get_user_plans: { data: [], error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    const plan = { max_evaluators: 30 };
    expect(result.current.canAddEvaluator(5, plan)).toBe(true);
    expect(result.current.canAddEvaluator(29, plan)).toBe(true);
  });

  it('returns false when currentCount meets or exceeds plan limit', async () => {
    setupMultiRpcMock({
      ahp_get_user_plans: { data: [], error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    const plan = { max_evaluators: 30 };
    expect(result.current.canAddEvaluator(30, plan)).toBe(false);
    expect(result.current.canAddEvaluator(31, plan)).toBe(false);
  });

  it('returns false when no plan is provided and no currentProjectPlan', async () => {
    setupMultiRpcMock({
      ahp_get_user_plans: { data: [], error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.canAddEvaluator(0, null)).toBe(false);
    expect(result.current.canAddEvaluator(0)).toBe(false);
  });

  it('returns true for superadmin regardless of plan or count', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: { role: 'superadmin' },
    });

    setupMultiRpcMock({
      ahp_get_user_plans: { data: [], error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.canAddEvaluator(999, null)).toBe(true);
    expect(result.current.canAddEvaluator(999)).toBe(true);
  });

  it('returns true for admin regardless of plan or count', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: { role: 'admin' },
    });

    setupMultiRpcMock({
      ahp_get_user_plans: { data: [], error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.canAddEvaluator(999, null)).toBe(true);
  });

  // ─── getUnassignedPlans ───

  it('filters and returns only unassigned plans', async () => {
    setupMultiRpcMock({
      ahp_get_user_plans: { data: mockPlans, error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    const unassigned = result.current.getUnassignedPlans();
    expect(unassigned).toHaveLength(2);
    expect(unassigned.every(p => p.status === 'unassigned')).toBe(true);
    expect(unassigned[0].id).toBe('plan-2');
    expect(unassigned[1].id).toBe('plan-4');
  });

  it('returns empty array when all plans are assigned', async () => {
    const allAssigned = [
      { id: 'plan-1', plan_type: 'free', status: 'active', project_id: 'proj-1' },
    ];
    setupMultiRpcMock({
      ahp_get_user_plans: { data: allAssigned, error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.getUnassignedPlans()).toEqual([]);
  });

  // ─── isSuperAdmin ───

  it('isSuperAdmin is true for admin role', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: { role: 'admin' },
    });

    setupMultiRpcMock({
      ahp_get_user_plans: { data: [], error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.isSuperAdmin).toBe(true);
  });

  it('isSuperAdmin is true for superadmin role', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: { role: 'superadmin' },
    });

    setupMultiRpcMock({
      ahp_get_user_plans: { data: [], error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.isSuperAdmin).toBe(true);
  });

  it('isSuperAdmin is false for regular user role', async () => {
    setupMultiRpcMock({
      ahp_get_user_plans: { data: [], error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.isSuperAdmin).toBe(false);
  });

  // ─── activeMultiPlan / hasActiveMultiPlan ───

  it('detects active multi plan from user plans', async () => {
    const plansWithActiveMulti = [
      { id: 'plan-1', plan_type: 'plan_multi_100', status: 'active', max_evaluators: 100 },
      { id: 'plan-2', plan_type: 'plan_30', status: 'active', max_evaluators: 30 },
    ];

    setupMultiRpcMock({
      ahp_get_user_plans: { data: plansWithActiveMulti, error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.activeMultiPlan).toEqual(plansWithActiveMulti[0]);
    expect(result.current.hasActiveMultiPlan).toBe(true);
  });

  it('hasActiveMultiPlan is false when no multi plan is active', async () => {
    const noMulti = [
      { id: 'plan-1', plan_type: 'plan_30', status: 'active', max_evaluators: 30 },
    ];

    setupMultiRpcMock({
      ahp_get_user_plans: { data: noMulti, error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.activeMultiPlan).toBeNull();
    expect(result.current.hasActiveMultiPlan).toBe(false);
  });

  // ─── getUnassignedMultiPlans ───

  it('returns only unassigned multi plans', async () => {
    setupMultiRpcMock({
      ahp_get_user_plans: { data: mockPlans, error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    const unassignedMulti = result.current.getUnassignedMultiPlans();
    expect(unassignedMulti).toHaveLength(1);
    expect(unassignedMulti[0].id).toBe('plan-4');
    expect(unassignedMulti[0].plan_type).toBe('plan_multi_100');
  });

  // ─── Cleanup on logout ───

  it('clears state when user becomes null', async () => {
    setupMultiRpcMock({
      ahp_get_user_plans: { data: mockPlans, error: null },
      ahp_grant_free_plan: { data: null, error: null },
    });

    const wrapper = createWrapper();
    const { result, rerender } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.userPlans).toEqual(mockPlans);

    // Simulate logout
    mockUseAuth.mockReturnValue({ user: null, profile: null });
    rerender();

    await waitFor(() => {
      expect(result.current.loaded).toBe(false);
    });

    expect(result.current.userPlans).toEqual([]);
    expect(result.current.currentProjectPlan).toBeNull();
  });
});
