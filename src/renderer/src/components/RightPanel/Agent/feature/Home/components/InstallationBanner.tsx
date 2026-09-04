/**
 * ------------------------------------------------------------------
 * InstallationBanner
 * ------------------------------------------------------------------
 * Banner hiển thị yêu cầu cài đặt AIWeb2API backend.
 * Layout đơn giản: nền color-opacity, không shadow, không animation.
 * ------------------------------------------------------------------
 */

import React from 'react';

const InstallationBanner: React.FC = () => {
  return (
    <div
      style={{
        padding: '14px 18px',
        borderRadius: '8px',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        width: '100%',
        marginBottom: '20px',
        boxSizing: 'border-box',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--primary, #3b82f6)',
          marginBottom: '6px',
          letterSpacing: '0.3px',
        }}
      >
        Installation Required
      </div>
      <div
        style={{
          fontSize: '12.5px',
          color: 'var(--text-primary)',
          lineHeight: 1.5,
        }}
      >
        Phantoma requires{' '}
        <a
          href="https://github.com/KhanhRomVN/AIWeb2API"
          target="_blank"
          rel="noreferrer"
          style={{
            color: 'var(--primary, #3b82f6)',
            textDecoration: 'none',
            fontWeight: 700,
            borderBottom: '2px solid rgba(59, 130, 246, 0.4)',
            paddingBottom: '1px',
          }}
        >
          AIWeb2API
        </a>{' '}
        backend running. Make sure AIWeb2API is installed and running before
        using Phantoma.
      </div>
    </div>
  );
};

export default InstallationBanner;