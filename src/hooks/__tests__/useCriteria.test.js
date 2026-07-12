import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Supabase mock ───
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

import { useCriteria } from '../useCriteria';

// ─── Helpers ───
function createChainMock(resolvedValue) {
  const terminal = {
    then: vi.fn((resolve) => resolve(resolvedValue)),
    order: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    eq: vi.fn(),
  };
  // Wire up the chain: each method returns the same terminal object
  terminal.order.mockReturnValue(terminal);
  terminal.select.mockReturnValue(terminal);
  terminal.single.mockReturnValue(terminal);
  terminal.eq.mockReturnValue(terminal);
  return terminal;
}

function setupFetchMock(data, error = null) {
  const chain = createChainMock({ data, error });
  mockSupabase.from.mockReturnValue({
    select: vi.fn().mockReturnValue(chain),
    insert: vi.fn().mockReturnValue(chain),
    update: vi.fn().mockReturnValue(chain),
    delete: vi.fn().mockReturnValue(chain),
    eq: vi.fn().mockReturnValue(chain),
    order: vi.fn().mockReturnValue(chain),
  });
  return chain;
}

const PROJECT_ID = 'proj-1';

const mockCriteria = [
  { id: 'c1', name: 'Cost', sort_order: 0, parent_id: null, project_id: PROJECT_ID },
  { id: 'c2', name: 'Quality', sort_order: 1, parent_id: null, project_id: PROJECT_ID },
  { id: 'c3', name: 'Sub-quality', sort_order: 2, parent_id: 'c2', project_id: PROJECT_ID },
];

describe('useCriteria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── fetchCriteria ───

  it('fetches criteria on mount and returns sorted data', async () => {
    setupFetchMock(mockCriteria);

    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.criteria).toEqual(mockCriteria);
    expect(result.current.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith('ahp_criteria');
  });

  it('sets error state when fetch fails with fetchError', async () => {
    setupFetchMock(null, { message: 'Database error' });

    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Database error');
    expect(result.current.criteria).toEqual([]);
  });

  it('sets error state when fetch throws an exception', async () => {
    mockSupabase.from.mockImplementation(() => {
      throw new Error('Network failure');
    });

    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network failure');
  });

  it('returns empty criteria and sets loading false when projectId is falsy', async () => {
    const { result } = renderHook(() => useCriteria(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.criteria).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('sets criteria to empty array when data is null', async () => {
    setupFetchMock(null, null);

    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.criteria).toEqual([]);
  });

  // ─── addCriterion ───

  it('adds a criterion and appends it to state', async () => {
    const newCriterion = { id: 'c4', name: 'Delivery', sort_order: 3, parent_id: null, project_id: PROJECT_ID };

    // First set up the fetch mock to return initial data
    setupFetchMock(mockCriteria);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Now set up the insert mock
    const insertChain = createChainMock({ data: newCriterion, error: null });
    const fromReturnValue = {
      select: vi.fn().mockReturnValue(insertChain),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue({
            then: vi.fn((resolve) => resolve({ data: newCriterion, error: null })),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue(insertChain),
      delete: vi.fn().mockReturnValue(insertChain),
      eq: vi.fn().mockReturnValue(insertChain),
      order: vi.fn().mockReturnValue(insertChain),
    };
    mockSupabase.from.mockReturnValue(fromReturnValue);

    let returnedData;
    await act(async () => {
      returnedData = await result.current.addCriterion({ name: 'Delivery', description: '' });
    });

    expect(returnedData).toEqual(newCriterion);
    expect(result.current.criteria).toHaveLength(4);
    expect(result.current.criteria[3]).toEqual(newCriterion);
  });

  it('throws error when addCriterion fails', async () => {
    setupFetchMock([]);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Set up insert to return error
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue({
            then: vi.fn((resolve) => resolve({ data: null, error: { message: 'Insert failed' } })),
          }),
        }),
      }),
    });

    await expect(
      act(async () => {
        await result.current.addCriterion({ name: 'Bad' });
      })
    ).rejects.toEqual({ message: 'Insert failed' });
  });

  // ─── updateCriterion ───

  it('updates a criterion and reflects change in state', async () => {
    setupFetchMock(mockCriteria);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedCriterion = { ...mockCriteria[0], name: 'Updated Cost' };
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              then: vi.fn((resolve) => resolve({ data: updatedCriterion, error: null })),
            }),
          }),
        }),
      }),
    });

    let returnedData;
    await act(async () => {
      returnedData = await result.current.updateCriterion('c1', { name: 'Updated Cost' });
    });

    expect(returnedData).toEqual(updatedCriterion);
    expect(result.current.criteria[0].name).toBe('Updated Cost');
  });

  it('throws error when updateCriterion fails', async () => {
    setupFetchMock(mockCriteria);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              then: vi.fn((resolve) => resolve({ data: null, error: { message: 'Update failed' } })),
            }),
          }),
        }),
      }),
    });

    await expect(
      act(async () => {
        await result.current.updateCriterion('c1', { name: 'Bad' });
      })
    ).rejects.toEqual({ message: 'Update failed' });
  });

  // ─── deleteCriterion ───

  it('deletes a criterion and removes it from state', async () => {
    setupFetchMock(mockCriteria);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));

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
      await result.current.deleteCriterion('c1');
    });

    expect(result.current.criteria.find(c => c.id === 'c1')).toBeUndefined();
    expect(result.current.criteria).toHaveLength(2);
  });

  it('cascade-deletes children when parent is deleted', async () => {
    setupFetchMock(mockCriteria);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));

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

    // c3 is a child of c2, so deleting c2 should also remove c3
    await act(async () => {
      await result.current.deleteCriterion('c2');
    });

    expect(result.current.criteria.find(c => c.id === 'c2')).toBeUndefined();
    expect(result.current.criteria.find(c => c.id === 'c3')).toBeUndefined();
    expect(result.current.criteria).toHaveLength(1);
  });

  it('throws error when deleteCriterion fails', async () => {
    setupFetchMock(mockCriteria);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          then: vi.fn((resolve) => resolve({ error: { message: 'Delete failed' } })),
        }),
      }),
    });

    await expect(
      act(async () => {
        await result.current.deleteCriterion('c1');
      })
    ).rejects.toEqual({ message: 'Delete failed' });
  });

  // ─── moveCriterion ───

  it('performs optimistic update when moving a criterion', async () => {
    const sortedCriteria = [
      { id: 'c1', name: 'A', sort_order: 0, parent_id: null, project_id: PROJECT_ID },
      { id: 'c2', name: 'B', sort_order: 1, parent_id: null, project_id: PROJECT_ID },
      { id: 'c3', name: 'C', sort_order: 2, parent_id: null, project_id: PROJECT_ID },
    ];

    setupFetchMock(sortedCriteria);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Set up update mock for move operation (returns success)
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          then: vi.fn((resolve) => resolve({ error: null })),
        }),
      }),
    });

    await act(async () => {
      await result.current.moveCriterion('c1', null, 2);
    });

    // c1 moved from index 0 to index 2, so new order: c2(0), c3(1), c1(2)
    const c1 = result.current.criteria.find(c => c.id === 'c1');
    expect(c1.sort_order).toBe(2);
  });

  it('rolls back state when moveCriterion fails', async () => {
    const sortedCriteria = [
      { id: 'c1', name: 'A', sort_order: 0, parent_id: null, project_id: PROJECT_ID },
      { id: 'c2', name: 'B', sort_order: 1, parent_id: null, project_id: PROJECT_ID },
    ];

    setupFetchMock(sortedCriteria);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Set up update mock to return error
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          then: vi.fn((resolve) => resolve({ error: { message: 'Update failed' } })),
        }),
      }),
    });

    await expect(
      act(async () => {
        await result.current.moveCriterion('c1', null, 1);
      })
    ).rejects.toThrow('기준 순서 변경 실패');

    // Should rollback to original sort orders
    const c1 = result.current.criteria.find(c => c.id === 'c1');
    const c2 = result.current.criteria.find(c => c.id === 'c2');
    expect(c1.sort_order).toBe(0);
    expect(c2.sort_order).toBe(1);
  });

  it('does nothing when moveCriterion is called with non-existent id', async () => {
    setupFetchMock(mockCriteria);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.moveCriterion('non-existent', null, 0);
    });

    // Criteria unchanged
    expect(result.current.criteria).toEqual(mockCriteria);
  });

  // ─── getTree ───

  it('builds tree structure from flat criteria', async () => {
    setupFetchMock(mockCriteria);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const tree = result.current.getTree();
    // Two root nodes: c1 and c2
    expect(tree).toHaveLength(2);
    // c2 has one child: c3
    const c2Node = tree.find(n => n.id === 'c2');
    expect(c2Node.children).toHaveLength(1);
    expect(c2Node.children[0].id).toBe('c3');
  });

  // ─── getLevel ───

  it('getLevel returns correct depth for criteria', async () => {
    setupFetchMock(mockCriteria);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.getLevel('c1')).toBe(0);
    expect(result.current.getLevel('c2')).toBe(0);
    expect(result.current.getLevel('c3')).toBe(1);
  });

  // ─── State management ───

  it('initializes with loading=true when projectId is provided', () => {
    setupFetchMock([]);
    const { result } = renderHook(() => useCriteria(PROJECT_ID));
    // Initially loading should be true (before fetch completes)
    expect(result.current.loading).toBe(true);
  });

  it('initializes with loading=false when projectId is falsy', () => {
    const { result } = renderHook(() => useCriteria(null));
    expect(result.current.loading).toBe(false);
  });
});
