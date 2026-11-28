/**
 * ------------------------------------------------------------------
 * BrandHeader
 * ------------------------------------------------------------------
 * Header logo + title "Zen" + slogan xoay vòng cho Home.
 * Luôn hiển thị ở đầu trang chủ.
 *
 * Main features:
 * - Logo static image (zen.png)
 * - Title gradient
 * - Slogan xoay vòng mỗi 3 giây với animation slideUp
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { $ } from '@renderer/utils/color';

// ─── Constants ──────────────────────────────────────────────────────────
const SLOGANS = [
  'Code smarter, not harder',
  'Your AI coding companion',
  'Boost your productivity',
  'Where ideas meet implementation',
  'Ship faster with confidence',
  'Your partner in development',
] as const;

// ─── Interfaces ─────────────────────────────────────────────────────────
interface BrandHeaderProps {
  imagesUri?: string;
}

// ─── Component ──────────────────────────────────────────────────────────
/** Header logo + title + slogan, luôn hiển thị. */
const BrandHeader: React.FC<BrandHeaderProps> = ({ imagesUri }) => {
  // ── State ──
  const [sloganIndex, setSloganIndex] = useState(0);

  // ── Effects ──
  useEffect(() => {
    // Tôn trọng prefers-reduced-motion: không xoay slogan
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      setSloganIndex((prev) => (prev + 1) % SLOGANS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // ── Render ──
  return (
    <div className="zen-home-header-inner relative">
      <style>{`
        .zen-home-header-inner { 
          display: flex; 
          width: 100%; 
          flex-direction: column; 
          align-items: center; 
          text-align: center; 
          margin-bottom: 12px;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={`${imagesUri}/zen-logo.png`}
            alt="Zen Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
        <h1
          style={{
            fontSize: '30px',
            fontWeight: 800,
            margin: 0,
            background: `linear-gradient(to right, ${$('--text-primary')}, ${$('--text-secondary')})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
          }}
        >
          Zen
        </h1>
      </div>
      <div
        style={{
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          key={sloganIndex}
          style={{
            fontSize: '14px',
            color: $('--text-secondary'),
            fontWeight: 500,
            animation: 'slideUp 0.4s ease-out',
            whiteSpace: 'nowrap',
          }}
        >
          {SLOGANS[sloganIndex]}
        </div>
      </div>
    </div>
  );
};

export default BrandHeader;
