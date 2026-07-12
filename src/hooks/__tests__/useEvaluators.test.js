import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Supabase mock ───
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

import { useEvaluators } from '../useEvaluators';

// ─── Helpers ───
function createChainMock(resolvedValue) {
  const terminal = {
    then: vi.fn((resolve) => resolve(resolvedValue)),
    order: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    eq: vi.fn(),
  };
  terminal.order.mockReturnValue(terminal);
  terminal.select.mockReturnValue(terminal);
  terminal.single.mockReturnValue(terminal);
  terminal.eq.mockReturnValue(terminal);
  return terminal;
}

const PROJECT_ID = 'proj-1';

const mockEvaluators = [
  { id: 'e1', name: 'Alice', email: 'alice@example.com', project_id: PROJECT_ID },
  { id: 'e2', name: 'Bob', email: 'bob@example.com', project_id: PROJECT_ID },
];

describe('useEvaluators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated mode (has session)
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    // Clear sessionStorage
    sessionStorage.clear();
  });

  // ─── fetchEvaluators - Authenticated mode ───

  it('fetches evaluators in authenticated mode via Supabase query', async () => {
    const chain = createChainMock({ data: mockEvaluators, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.evaluators).toEqual(mockEvaluators);
    expect(result.current.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith('ahp_evaluators');
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('sets error when authenticated fetch returns fetchError', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Permission denied' } });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Permission denied');
    expect(result.current.evaluators).toEqual([]);
  });

  // ─── fetchEvaluators - Anonymous mode (RPC fallback) ───

  it('fetches evaluators in anonymous mode via RPC when no session and storedEvalId exists', async () => {
    // No session
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });
    // Stored evaluator ID in sessionStorage
    sessionStorage.setItem(`evaluator_${PROJECT_ID}`, 'eval-anon-1');

    // RPC mock
    mockSupabase.rpc.mockReturnValue({
      then: vi.fn((resolve) => resolve({ data: mockEvaluators, error: null })),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.evaluators).toEqual(mockEvaluators);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('ahp_anon_get_evaluators', {
      p_evaluator_id: 'eval-anon-1',
    });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('sets error when anonymous RPC fetch returns error', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });
    sessionStorage.setItem(`evaluator_${PROJECT_ID}`, 'eval-anon-1');

    mockSupabase.rpc.mockReturnValue({
      then: vi.fn((resolve) => resolve({ data: null, error: { message: 'RPC error' } })),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('RPC error');
  });

  it('uses authenticated mode when no session and no storedEvalId', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });
    // No sessionStorage entry

    const chain = createChainMock({ data: [], error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should fallback to authenticated (from) query since isAnon is false
    expect(mockSupabase.from).toHaveBeenCalledWith('ahp_evaluators');
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  // ─── fetchEvaluators - edge cases ───

  it('returns empty evaluators and sets loading false when projectId is falsy', async () => {
    const { result } = renderHook(() => useEvaluators(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.evaluators).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('sets error when getSession throws', async () => {
    mockSupabase.auth.getSession.mockRejectedValue(new Error('Auth failure'));

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Auth failure');
  });

  it('sets evaluators to empty array when data is null', async () => {
    const chain = createChainMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.evaluators).toEqual([]);
  });

  // ─── addEvaluator ───

  it('adds an evaluator and appends it to state', async () => {
    // Initial fetch
    const chain = createChainMock({ data: mockEvaluators, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newEvaluator = { id: 'e3', name: 'Charlie', email: 'charlie@example.com', project_id: PROJECT_ID };

    // Set up mock for addEvaluator: first user_profiles lookup, then insert
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'ahp_user_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: vi.fn((resolve) => resolve({ data: null, error: null })),
              }),
            }),
          }),
        };
      }
      if (table === 'ahp_evaluators') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: vi.fn((resolve) => resolve({ data: newEvaluator, error: null })),
              }),
            }),
          }),
        };
      }
    });

    let returnedData;
    await act(async () => {
      returnedData = await result.current.addEvaluator({ name: 'Charlie', email: 'charlie@example.com' });
    });

    expect(returnedData).toEqual(newEvaluator);
    expect(result.current.evaluators).toHaveLength(3);
    expect(result.current.evaluators[2]).toEqual(newEvaluator);
  });

  it('links user_id when email matches existing user profile', async () => {
    const chain = createChainMock({ data: [], error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockReturnValue({
          then: vi.fn((resolve) => resolve({
            data: { id: 'e3', name: 'Dave', email: 'dave@example.com', user_id: 'user-dave', project_id: PROJECT_ID },
            error: null,
          })),
        }),
      }),
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'ahp_user_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: vi.fn((resolve) => resolve({ data: { id: 'user-dave' }, error: null })),
              }),
            }),
          }),
        };
      }
      if (table === 'ahp_evaluators') {
        return { insert: insertMock };
      }
    });

    await act(async () => {
      await result.current.addEvaluator({ name: 'Dave', email: 'dave@example.com' });
    });

    // insert should be called with user_id = 'user-dave'
    const insertedData = insertMock.mock.calls[0][0];
    expect(insertedData.user_id).toBe('user-dave');
  });

  it('throws error when addEvaluator insert fails', async () => {
    const chain = createChainMock({ data: [], error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'ahp_user_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: vi.fn((resolve) => resolve({ data: null, error: null })),
              }),
            }),
          }),
        };
      }
      if (table === 'ahp_evaluators') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: vi.fn((resolve) => resolve({ data: null, error: { message: 'Insert failed' } })),
              }),
            }),
          }),
        };
      }
    });

    await expect(
      act(async () => {
        await result.current.addEvaluator({ name: 'Bad', email: 'bad@example.com' });
      })
    ).rejects.toEqual({ message: 'Insert failed' });
  });

  // ─── updateEvaluator ───

  it('updates an evaluator and reflects change in state', async () => {
    const chain = createChainMock({ data: mockEvaluators, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedEval = { ...mockEvaluators[0], name: 'Alice Updated' };
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              then: vi.fn((resolve) => resolve({ data: updatedEval, error: null })),
            }),
          }),
        }),
      }),
    });

    let returnedData;
    await act(async () => {
      returnedData = await result.current.updateEvaluator('e1', { name: 'Alice Updated' });
    });

    expect(returnedData).toEqual(updatedEval);
    expect(result.current.evaluators[0].name).toBe('Alice Updated');
  });

  it('throws error when updateEvaluator fails', async () => {
    const chain = createChainMock({ data: mockEvaluators, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              then: vi.fn((resolve) => resolve({ data: null, error: { message: 'Update error' } })),
            }),
          }),
        }),
      }),
    });

    await expect(
      act(async () => {
        await result.current.updateEvaluator('e1', { name: 'Bad' });
      })
    ).rejects.toEqual({ message: 'Update error' });
  });

  // ─── deleteEvaluator ───

  it('deletes an evaluator and removes it from state', async () => {
    const chain = createChainMock({ data: mockEvaluators, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          then: vi.fn((resolve) => resolve({ error: null })),
        }),
      }),
    });

    await act(async () => {
      await result.current.deleteEvaluator('e1');
    });

    expect(result.current.evaluators.find(e => e.id === 'e1')).toBeUndefined();
    expect(result.current.evaluators).toHaveLength(1);
  });

  it('throws error when deleteEvaluator fails', async () => {
    const chain = createChainMock({ data: mockEvaluators, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          then: vi.fn((resolve) => resolve({ error: { message: 'Delete error' } })),
        }),
      }),
    });

    await expect(
      act(async () => {
        await result.current.deleteEvaluator('e1');
      })
    ).rejects.toEqual({ message: 'Delete error' });
  });

  // ─── State management ───

  it('initializes with loading=true when projectId is provided', () => {
    const chain = createChainMock({ data: [], error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { result } = renderHook(() => useEvaluators(PROJECT_ID));
    expect(result.current.loading).toBe(true);
  });

  it('initializes with loading=false when projectId is falsy', () => {
    const { result } = renderHook(() => useEvaluators(null));
    expect(result.current.loading).toBe(false);
  });
});
