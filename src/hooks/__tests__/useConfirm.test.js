import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfirm } from '../useConfirm';

describe('useConfirm', () => {
  it('starts with isOpen=false', () => {
    const { result } = renderHook(() => useConfirm());
    expect(result.current.confirmDialogProps.isOpen).toBe(false);
  });

  it('confirm() returns a Promise and sets isOpen=true', async () => {
    const { result } = renderHook(() => useConfirm());

    let promise;
    act(() => {
      promise = result.current.confirm({ message: 'Are you sure?' });
    });

    expect(promise).toBeInstanceOf(Promise);
    expect(result.current.confirmDialogProps.isOpen).toBe(true);
    expect(result.current.confirmDialogProps.message).toBe('Are you sure?');

    // cleanup: resolve the promise
    act(() => result.current.confirmDialogProps.onConfirm());
  });

  it('handleConfirm resolves with true and closes', async () => {
    const { result } = renderHook(() => useConfirm());

    let resolved;
    act(() => {
      result.current.confirm({ message: 'test' }).then(v => { resolved = v; });
    });

    act(() => {
      result.current.confirmDialogProps.onConfirm();
    });

    await Promise.resolve(); // flush microtask
    expect(resolved).toBe(true);
    expect(result.current.confirmDialogProps.isOpen).toBe(false);
  });

  it('handleClose resolves with false and closes', async () => {
    const { result } = renderHook(() => useConfirm());

    let resolved;
    act(() => {
      result.current.confirm({ message: 'test' }).then(v => { resolved = v; });
    });

    act(() => {
      result.current.confirmDialogProps.onClose();
    });

    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(result.current.confirmDialogProps.isOpen).toBe(false);
  });

  it('passes custom title, variant, and labels', () => {
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.confirm({
        title: '삭제',
        message: '정말 삭제하시겠습니까?',
        variant: 'danger',
        confirmLabel: '삭제',
        cancelLabel: '돌아가기',
      });
    });

    const props = result.current.confirmDialogProps;
    expect(props.title).toBe('삭제');
    expect(props.variant).toBe('danger');
    expect(props.confirmLabel).toBe('삭제');
    expect(props.cancelLabel).toBe('돌아가기');

    // cleanup
    act(() => props.onClose());
  });

  it('uses default title and variant when not specified', () => {
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.confirm({ message: 'test' });
    });

    const props = result.current.confirmDialogProps;
    expect(props.title).toBe('확인');
    expect(props.variant).toBe('warning');
    expect(props.confirmLabel).toBe('확인');
    expect(props.cancelLabel).toBe('취소');

    // cleanup
    act(() => props.onClose());
  });
});
