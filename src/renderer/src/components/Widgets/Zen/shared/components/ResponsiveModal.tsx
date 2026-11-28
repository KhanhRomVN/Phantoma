import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { $ } from '@renderer/utils/color';
import { useAgentRoot } from '../../context/AgentRootContext';

const WIDE_BREAKPOINT = 640;
const MODAL_MAX_WIDTH = 560;

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Chiều cao bottom-sheet khi panel hẹp (mặc định 70%). */
  sheetHeight?: string;
  /** Rộng tối đa của modal khi panel rộng (mặc định 560). */
  modalMaxWidth?: number;
  /** true: chiều cao theo nội dung (dialog xác nhận); false: theo tỉ lệ chiều rộng. */
  fitContent?: boolean;
  /** Panel hẹp → bottom-sheet; panel rộng hơn breakpoint → modal giữa màn hình. */
  wideBreakpoint?: number;
  background?: string;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  children,
  sheetHeight = '70%',
  modalMaxWidth = MODAL_MAX_WIDTH,
  fitContent = false,
  wideBreakpoint = WIDE_BREAKPOINT,
  background,
  closeOnEscape = true,
  closeOnBackdrop = true,
  ariaLabelledBy,
  ariaDescribedBy,
}) => {
  const agentRoot = useAgentRoot();
  const [size, setSize] = useState(() => {
    const r = (agentRoot ?? document.body).getBoundingClientRect();
    return { width: r.width, height: r.height };
  });

  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = agentRoot ?? document.body;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ width: r.width, height: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, agentRoot]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const position = agentRoot ? 'absolute' : 'fixed';
  const isWide = size.width > wideBreakpoint;
  const modalWidth = Math.min(modalMaxWidth, Math.max(size.width - 32, 0));
  const modalHeight = Math.min(modalWidth * 1.1, size.height * 0.9);

  const layoutStyle: React.CSSProperties = isWide
    ? {
        position,
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        margin: 'auto',
        width: modalWidth,
        height: fitContent ? 'fit-content' : modalHeight,
        maxHeight: size.height * 0.9,
        border: `1px solid ${$('--border')}`,
        borderRadius: '12px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        animation: 'rmFadeScale 0.2s ease-out',
      }
    : {
        position,
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: fitContent ? 'fit-content' : sheetHeight,
        maxHeight: fitContent ? '90%' : sheetHeight,
        borderTop: `1px solid ${$('--border')}`,
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.2)',
        animation: 'rmSlideUp 0.25s ease-out',
      };

  return createPortal(
    <>
      <div
        onClick={closeOnBackdrop ? onClose : undefined}
        style={{
          position,
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 10000,
          animation: 'rmFadeIn 0.15s ease-out',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        style={{
          ...layoutStyle,
          backgroundColor: background ?? $('--card-background'),
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          color: $('--text-primary'),
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
      <style>{`
        @keyframes rmSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes rmFadeScale { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes rmFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>,
    agentRoot ?? document.body,
  );
};

export default ResponsiveModal;