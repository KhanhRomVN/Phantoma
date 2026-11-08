import React, { useLayoutEffect, useState } from 'react';
import { useAgentRoot } from '../../../context/AgentRootContext';
import { $ } from '@renderer/utils/color';

// ASSUMED: panel rộng hơn 640px thì coi là vượt chuẩn bottom sheet (giống SelectModelAccountModal)
const MAX_SHEET_WIDTH = 640;
const MODAL_MAX_WIDTH = 560;

export const AccountModalKeyframes: React.FC = () => (
  <style>{`
    @keyframes pmdSlideUpDrawer {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes pmdFadeScaleModal {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes pmdFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes pmdSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `}</style>
);

export const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(2px)',
  zIndex: 10000,
  animation: 'pmdFadeIn 0.15s ease',
};

export function useAccountModalLayout(isOpen: boolean, fixedHeight = false) {
  const agentRoot = useAgentRoot();
  const container: HTMLElement = agentRoot ?? document.body;

  const [size, setSize] = useState(() => {
    const r = container.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });

  useLayoutEffect(() => {
    if (!isOpen) return;
    const measure = () => {
      const r = container.getBoundingClientRect();
      setSize({ width: r.width, height: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [isOpen, container]);

  const isWide = size.width > MAX_SHEET_WIDTH;
  const modalWidth = Math.min(MODAL_MAX_WIDTH, Math.max(size.width - 32, 0));
  const modalHeight = Math.min(modalWidth * 1.1, size.height * 0.9);

  const panelStyle: React.CSSProperties = {
    ...(isWide
      ? {
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          margin: 'auto',
          width: modalWidth,
          ...(fixedHeight ? { height: modalHeight } : { height: 'fit-content', maxHeight: modalHeight }),
          border: `1px solid ${$('--border')}`,
          borderRadius: '12px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          animation: 'pmdFadeScaleModal 0.2s ease-out',
        }
      : {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          ...(fixedHeight ? { height: '70%' } : {}),
          maxHeight: '70%',
          borderTop: `1px solid ${$('--border')}`,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.2)',
          animation: 'pmdSlideUpDrawer 0.25s ease-out',
        }),
    backgroundColor: $('--background'),
    zIndex: 10001,
    display: 'flex',
    flexDirection: 'column',
    color: $('--text-primary'),
    overflow: 'hidden',
  };

  return { container, isWide, panelStyle };
}