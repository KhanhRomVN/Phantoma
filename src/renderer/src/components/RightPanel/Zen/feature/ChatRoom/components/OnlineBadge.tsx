/**
 * ------------------------------------------------------------------
 * OnlineBadge
 * ------------------------------------------------------------------
 * Badge số người online; click phát sự kiện "zen:open-chatroom".
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import React from 'react';
import { useOnlineCount } from '../hooks/useOnlineCount';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface OnlineBadgeProps {
  style?: React.CSSProperties;
}

// ─── Component ──────────────────────────────────────────────────────────
const OnlineBadge: React.FC<OnlineBadgeProps> = ({ style }) => {
  const count = useOnlineCount();

  return (
    <button
      type="button"
      title="Open chat room"
      onClick={() => window.dispatchEvent(new CustomEvent('zen:open-chatroom'))}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        color: '#22c55e',
        backgroundColor: 'color-mix(in srgb, #22c55e 15%, transparent)',
        ...style,
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }}
      />
      {count ?? '–'}
    </button>
  );
};

export default OnlineBadge;