import { useState, useCallback, useRef } from 'react';

export function useConfirm() {
  const [state, setState] = useState({ isOpen: false, title: '', message: '', variant: 'warning', confirmLabel: '확인', cancelLabel: '취소' });
  const resolveRef = useRef(null);

  const confirm = useCallback(({ title = '확인', message, variant = 'warning', confirmLabel = '확인', cancelLabel = '취소' } = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ isOpen: true, title, message, variant, confirmLabel, cancelLabel });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
    resolveRef.current?.(true);
  }, []);

  const handleClose = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
    resolveRef.current?.(false);
  }, []);

  const confirmDialogProps = {
    isOpen: state.isOpen,
    onClose: handleClose,
    onConfirm: handleConfirm,
    title: state.title,
    message: state.message,
    variant: state.variant,
    confirmLabel: state.confirmLabel,
    cancelLabel: state.cancelLabel,
  };

  return { confirm, confirmDialogProps };
}
