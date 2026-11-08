/**
 * ------------------------------------------------------------------
 * MCP Panel (Refactored)
 * ------------------------------------------------------------------
 * Empty UI - Coming soon
 * Mapped to Phantoma Theme System.
 * ------------------------------------------------------------------
 */

import { $ } from '@renderer/utils/color';

export function MCPPanel() {
  const textSecondary = $('--text-secondary');
  const textPrimary = $('--text-primary');

  return (
    <div
      className="flex flex-col items-center justify-center h-full p-8 text-center"
      style={{ color: textSecondary }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mb-4 opacity-30"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="M12 8v4"></path>
        <path d="M12 16h.01"></path>
      </svg>
      <h3
        className="text-base font-semibold mb-2"
        style={{ color: textPrimary }}
      >
        MCP Servers Marketplace
      </h3>
      <p className="text-sm opacity-70 max-w-[300px]">
        Browse and configure Model Context Protocol servers. Coming soon!
      </p>
    </div>
  );
}