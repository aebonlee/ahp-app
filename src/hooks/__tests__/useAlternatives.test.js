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

import { useAlternatives } from '../useAlternatives';

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

const mockAlternatives = [
  { id: 'a1', name: 'Option A', sort_order: 0, parent_id: null, project_id: PROJECT_ID },
  { id: 'a2', name: 'Option B', sort_order: 1, parent_id: null, project_id: PROJECT_ID },
  { id: 'a3', name: 'Sub Option', sort_order: 2, parent_id: 'a2', project_id: PROJECT_ID },
];

describe('useAlternatives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── fetchAlternatives ───

  it('fetches alternatives on mount and returns data', async () => {
    setupFetchMock(mockAlternatives);

    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.alternatives).toEqual(mockAlternatives);
    expect(result.current.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith('ahp_alternatives');
  });

  it('sets error state when fetch fails with fetchError', async () => {
    setupFetchMock(null, { message: 'Fetch error' });

    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Fetch error');
    expect(result.current.alternatives).toEqual([]);
  });

  it('sets error state when fetch throws an exception', async () => {
    mockSupabase.from.mockImplementation(() => {
      throw new Error('Network failure');
    });

    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network failure');
  });

  it('returns empty alternatives when projectId is falsy', async () => {
    const { result } = renderHook(() => useAlternatives(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.alternatives).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns empty array when data is null', async () => {
    setupFetchMock(null, null);

    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.alternatives).toEqual([]);
  });

  // ─── addAlternative ───

  it('adds an alternative and appends it to state', async () => {
    const newAlt = { id: 'a4', name: 'Option D', sort_order: 3, parent_id: null, project_id: PROJECT_ID };

    setupFetchMock(mockAlternatives);
    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue({
            then: vi.fn((resolve) => resolve({ data: newAlt, error: null })),
          }),
        }),
      }),
    });

    let returnedData;
    await act(async () => {
      returnedData = await result.current.addAlternative({ name: 'Option D' });
    });

    expect(returnedData).toEqual(newAlt);
    expect(result.current.alternatives).toHaveLength(4);
    expect(result.current.alternatives[3]).toEqual(newAlt);
  });

  it('throws error when addAlternative fails', async () => {
    setupFetchMock([]);
    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

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
        await result.current.addAlternative({ name: 'Bad' });
      })
    ).rejects.toEqual({ message: 'Insert failed' });
  });

  it('calculates sort_order from max existing sort_order', async () => {
    const existing = [
      { id: 'a1', name: 'A', sort_order: 5, parent_id: null, project_id: PROJECT_ID },
      { id: 'a2', name: 'B', sort_order: 10, parent_id: null, project_id: PROJECT_ID },
    ];
    setupFetchMock(existing);
    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockReturnValue({
          then: vi.fn((resolve) => resolve({
            data: { id: 'a3', name: 'C', sort_order: 11, parent_id: null, project_id: PROJECT_ID },
            error: null,
          })),
        }),
      }),
    });
    mockSupabase.from.mockReturnValue({ insert: insertMock });

    await act(async () => {
      await result.current.addAlternative({ name: 'C' });
    });

    // The insert should have been called with sort_order = 10 + 1 = 11
    const insertedData = insertMock.mock.calls[0][0];
    expect(insertedData.sort_order).toBe(11);
  });

  // ─── updateAlternative ───

  it('updates an alternative and reflects change in state', async () => {
    setupFetchMock(mockAlternatives);
    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedAlt = { ...mockAlternatives[0], name: 'Updated A' };
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              then: vi.fn((resolve) => resolve({ data: updatedAlt, error: null })),
            }),
          }),
        }),
      }),
    });

    let returnedData;
    await act(async () => {
      returnedData = await result.current.updateAlternative('a1', { name: 'Updated A' });
    });

    expect(returnedData).toEqual(updatedAlt);
    expect(result.current.alternatives[0].name).toBe('Updated A');
  });

  it('throws error when updateAlternative fails', async () => {
    setupFetchMock(mockAlternatives);
    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

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
        await result.current.updateAlternative('a1', { name: 'Bad' });
      })
    ).rejects.toEqual({ message: 'Update failed' });
  });

  // ─── deleteAlternative ───

  it('deletes an alternative and removes it from state', async () => {
    setupFetchMock(mockAlternatives);
    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

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
      await result.current.deleteAlternative('a1');
    });

    expect(result.current.alternatives.find(a => a.id === 'a1')).toBeUndefined();
    expect(result.current.alternatives).toHaveLength(2);
  });

  it('cascade-deletes children when parent is deleted', async () => {
    setupFetchMock(mockAlternatives);
    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

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

    // a3 is child of a2, deleting a2 should also remove a3
    await act(async () => {
      await result.current.deleteAlternative('a2');
    });

    expect(result.current.alternatives.find(a => a.id === 'a2')).toBeUndefined();
    expect(result.current.alternatives.find(a => a.id === 'a3')).toBeUndefined();
    expect(result.current.alternatives).toHaveLength(1);
  });

  it('throws error when deleteAlternative fails', async () => {
    setupFetchMock(mockAlternatives);
    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

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
        await result.current.deleteAlternative('a1');
      })
    ).rejects.toEqual({ message: 'Delete failed' });
  });

  // ─── moveAlternative ───

  it('performs optimistic update when moving an alternative', async () => {
    const sortedAlts = [
      { id: 'a1', name: 'A', sort_order: 0, parent_id: null, project_id: PROJECT_ID },
      { id: 'a2', name: 'B', sort_order: 1, parent_id: null, project_id: PROJECT_ID },
      { id: 'a3', name: 'C', sort_order: 2, parent_id: null, project_id: PROJECT_ID },
    ];

    setupFetchMock(sortedAlts);
    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          then: vi.fn((resolve) => resolve({ error: null })),
        }),
      }),
    });

    await act(async () => {
      await result.current.moveAlternative('a1', 2);
    });

    // a1 moved from index 0 to index 2: new order is a2(0), a3(1), a1(2)
    const a1 = result.current.alternatives.find(a => a.id === 'a1');
    expect(a1.sort_order).toBe(2);
  });

  it('rolls back state when moveAlternative fails', async () => {
    const sortedAlts = [
      { id: 'a1', name: 'A', sort_order: 0, parent_id: null, project_id: PROJECT_ID },
      { id: 'a2', name: 'B', sort_order: 1, parent_id: null, project_id: PROJECT_ID },
    ];

    setupFetchMock(sortedAlts);
    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          then: vi.fn((resolve) => resolve({ error: { message: 'Update failed' } })),
        }),
      }),
    });

    await expect(
      act(async () => {
        await result.current.moveAlternative('a1', 1);
      })
    ).rejects.toThrow('대안 순서 변경 실패');

    // Should rollback to original sort orders
    const a1 = result.current.alternatives.find(a => a.id === 'a1');
    const a2 = result.current.alternatives.find(a => a.id === 'a2');
    expect(a1.sort_order).toBe(0);
    expect(a2.sort_order).toBe(1);
  });

  it('does nothing when moveAlternative is called with non-existent id', async () => {
    setupFetchMock(mockAlternatives);
    const { result } = renderHook(() => useAlternatives(PROJECT_ID));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.moveAlternative('non-existent', 0);
    });

    expect(result.current.alternatives).toEqual(mockAlternatives);
  });

  // ─── State management ───

  it('initializes with loading=true when projectId is provided', () => {
    setupFetchMock([]);
    const { result } = renderHook(() => useAlternatives(PROJECT_ID));
    expect(result.current.loading).toBe(true);
  });

  it('initializes with loading=false when projectId is falsy', () => {
    const { result } = renderHook(() => useAlternatives(null));
    expect(result.current.loading).toBe(false);
  });
});
