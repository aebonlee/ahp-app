import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContext } from 'react';
import { ToastProvider, useToast, ToastContext } from '../ToastContext';

const wrapper = ({ children }: any) => <ToastProvider>{children}</ToastProvider>;

function useToastFull() {
  return useContext(ToastContext);
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty toasts', () => {
    const { result } = renderHook(() => useToastFull(), { wrapper });
    expect(result.current.toasts).toEqual([]);
  });

  it('toast.success adds a success toast', () => {
    const { result } = renderHook(() => useToastFull(), { wrapper });

    act(() => result.current.toast.success('Saved!'));

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[0].message).toBe('Saved!');
  });

  it('toast.error adds an error toast', () => {
    const { result } = renderHook(() => useToastFull(), { wrapper });

    act(() => result.current.toast.error('Failed!'));

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('error');
  });

  it('toast.warning adds a warning toast', () => {
    const { result } = renderHook(() => useToastFull(), { wrapper });

    act(() => result.current.toast.warning('Watch out'));

    expect(result.current.toasts[0].type).toBe('warning');
  });

  it('toast.info adds an info toast', () => {
    const { result } = renderHook(() => useToastFull(), { wrapper });

    act(() => result.current.toast.info('Info'));

    expect(result.current.toasts[0].type).toBe('info');
  });

  it('non-error toasts auto-remove after 3 seconds', () => {
    const { result } = renderHook(() => useToastFull(), { wrapper });

    act(() => result.current.toast.success('Done'));
    expect(result.current.toasts).toHaveLength(1);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.toasts).toHaveLength(0);
  });

  it('error toasts auto-remove after 5 seconds', () => {
    const { result } = renderHook(() => useToastFull(), { wrapper });

    act(() => result.current.toast.error('Error!'));
    expect(result.current.toasts).toHaveLength(1);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.toasts).toHaveLength(1); // still there

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.toasts).toHaveLength(0); // removed at 5s
  });

  it('removeToast removes a toast immediately', () => {
    const { result } = renderHook(() => useToastFull(), { wrapper });

    let toastId;
    act(() => { toastId = result.current.toast.info('Remove me'); });
    expect(result.current.toasts).toHaveLength(1);

    act(() => result.current.removeToast(toastId));
    expect(result.current.toasts).toHaveLength(0);
  });
});
