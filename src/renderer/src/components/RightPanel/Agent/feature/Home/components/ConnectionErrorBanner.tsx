/**
 * ------------------------------------------------------------------
 * ConnectionErrorBanner
 * ------------------------------------------------------------------
 * Banner hiển thị lỗi kết nối khi không tìm thấy hoặc không kết nối 
 * được với backend AIWeb2API.
 * Áp dụng UI tham khảo: dashed border, glow animation, icon ping/jolt.
 * ------------------------------------------------------------------
 */

import React from "react";

interface ConnectionErrorBannerProps {
  isConnected: boolean;
}

const styles = `
  .phantoma-conn-error-banner {
    position: relative;
    width: 100%; max-width: 480px;
    display: flex; gap: 14px; align-items: center;
    padding: 16px;
    border-radius: 12px;
    border: 1px dashed color-mix(in srgb, var(--error) 50%, transparent);
    background:
      radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--error) 13%, transparent), transparent 55%),
      var(--card-background);
    overflow: hidden;
    animation: phantoma-glow 3s ease-in-out infinite;
    box-sizing: border-box;
    margin-bottom: 12px;
  }
  @keyframes phantoma-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0), 0 8px 28px -14px rgba(239,68,68,.15); }
    50%      { box-shadow: 0 0 0 1px rgba(239,68,68,.12), 0 8px 28px -10px rgba(239,68,68,.35); }
  }
  .phantoma-conn-error-banner::after {
    content: ""; position: absolute; top: 0; bottom: 0; left: -40%; width: 30%;
    background: linear-gradient(100deg, transparent, rgba(239,68,68,.08), transparent);
    animation: phantoma-sweep 5s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes phantoma-sweep {
    0%, 55% { left: -40%; }
    100%    { left: 130%; }
  }

  .phantoma-conn-error-icon {
    flex: none; width: 40px; height: 40px; border-radius: 10px;
    display: grid; place-items: center;
    background: color-mix(in srgb, var(--error) 14%, transparent);
    color: var(--error);
    position: relative;
  }
  .phantoma-conn-error-icon svg { width: 20px; height: 20px; }
  .phantoma-conn-error-icon::after {
    content: ""; position: absolute; inset: 0; border-radius: inherit;
    border: 1px solid var(--error);
    animation: phantoma-ping 2.2s ease-out infinite;
    opacity: 0;
  }
  @keyframes phantoma-ping {
    0%   { opacity: .7; transform: scale(1); }
    100% { opacity: 0;  transform: scale(1.6); }
  }
  .phantoma-conn-error-icon::before {
    content: ""; position: absolute; inset: -5px; border-radius: 14px;
    border: 1px dashed color-mix(in srgb, var(--error) 55%, transparent);
    animation: phantoma-orbit 8s linear infinite;
  }
  @keyframes phantoma-orbit { to { transform: rotate(360deg); } }
  
  .phantoma-conn-error-icon svg { animation: phantoma-jolt 3s linear infinite; }
  @keyframes phantoma-jolt {
    0%, 70%, 80%, 100% { transform: translateX(0); }
    72% { transform: translateX(-1.5px); }
    74% { transform: translateX(1.5px); }
    76% { transform: translateX(-1px); }
    78% { transform: translateX(1px); }
  }
  .phantoma-conn-error-icon .gap { animation: phantoma-flicker 3s steps(1) infinite; }
  @keyframes phantoma-flicker {
    0%, 70%, 78%, 100% { opacity: 1; }
    72%, 76% { opacity: .2; }
  }

  .phantoma-conn-error-body { flex: 1; min-width: 0; position: relative; z-index: 1; }
  .phantoma-conn-error-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .phantoma-conn-error-title { 
    font-size: 14px; font-weight: 600; letter-spacing: .01em; 
    color: var(--text-primary);
  }
  .phantoma-conn-error-status {
    display: inline-flex; align-items: center; gap: 6px; line-height: 1;
    font-size: 11px; font-weight: 500; 
    color: var(--error);
    padding: 2px 8px; border-radius: 4px;
    background: color-mix(in srgb, var(--error) 12%, transparent);
    border: 1px dashed color-mix(in srgb, var(--error) 45%, transparent);
  }
  .phantoma-conn-error-dot { 
    flex: none; display: block; width: 6px; height: 6px; margin-top: 0; 
    border-radius: 50%; background: currentColor; 
    animation: phantoma-blink 1.4s ease-in-out infinite; 
  }
  @keyframes phantoma-blink { 50% { opacity: .25; } }

  .phantoma-conn-error-text { 
    margin-top: 6px; font-size: 13px; line-height: 1.55; 
    color: var(--text-secondary);
    text-align: left;
  }
  .phantoma-conn-error-link {
    font-weight: 700; text-decoration: none;
    background: linear-gradient(90deg, #ff4d4d, #ff9f1c, #ffe14d, #3ddc84, #3b9bff, #8b5cf6, #ff4dc4, #ff4d4d);
    background-size: 200% 100%;
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent; color: transparent;
    animation: phantoma-rainbow 4s linear infinite;
    position: relative;
  }
  .phantoma-conn-error-link::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 1px;
    background: inherit; background-size: 200% 100%;
    opacity: .6;
  }
  .phantoma-conn-error-link:hover::after { opacity: 1; }
  @keyframes phantoma-rainbow { to { background-position: 200% 0; } }
  .phantoma-conn-error-link:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 2px; }

  @media (prefers-reduced-motion: reduce) {
    .phantoma-conn-error-banner, .phantoma-conn-error-banner::after, .phantoma-conn-error-icon::before, .phantoma-conn-error-icon::after, .phantoma-conn-error-icon svg, .phantoma-conn-error-icon .gap, .phantoma-conn-error-dot, .phantoma-conn-error-link { animation: none; }
  }
`;

const ConnectionErrorBanner: React.FC<ConnectionErrorBannerProps> = ({ isConnected }) => {
  if (isConnected) return null;

  return (
    <>
      <style>{styles}</style>
      <div className="phantoma-conn-error-banner" role="alert">
        <div className="phantoma-conn-error-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 7V3M15 7V3M7 7h10v3a5 5 0 01-2 4"/>
            <path d="M9 14a5 5 0 01-2-4"/>
            <path className="gap" d="M12 17v4M4 4l16 16"/>
          </svg>
        </div>

        <div className="phantoma-conn-error-body">
          <div className="phantoma-conn-error-head">
            <span className="phantoma-conn-error-title">Connection Failed</span>
            <span className="phantoma-conn-error-status"><span className="phantoma-conn-error-dot"></span>Not connected to AIWeb2API</span>
          </div>

          <p className="phantoma-conn-error-text">
            Phantoma requires{" "}
            <a 
              href="https://github.com/KhanhRomVN/AIWeb2API" 
              target="_blank" 
              rel="noopener noreferrer"
              className="phantoma-conn-error-link"
            >
              AIWeb2API
            </a>{" "}
            backend running. Make sure AIWeb2API is installed and running before using Phantoma.
          </p>
        </div>
      </div>
    </>
  );
};

export default ConnectionErrorBanner;