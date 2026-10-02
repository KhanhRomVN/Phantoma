/**
 * ------------------------------------------------------------------
 * FooterBar
 * ------------------------------------------------------------------
 * Status bar displayed at the bottom of the Code editor module.
 * Shows LSP (Language Server Protocol) status for the active file,
 * including install prompts, initialization progress, and connection state.
 *
 * Main features:
 * - Detects and displays the LSP server for the current file type
 * - Shows install prompt (⚠) for detected but not installed LSP servers
 * - Shows checkmark for installed and active LSP servers
 * - Displays real-time LSP initialization progress bar with percentage
 * - Auto-hides progress bar after diagnostics are ready
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { cn } from '@renderer/shared/utils/cn';
// ─── Interfaces ─────────────────────────────────────────────────────────
interface FooterBarProps {
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────
export function FooterBar({ className }: FooterBarProps) {
  return (
    <div
      className={cn(
        'h-8 border-t border-border bg-sidebar-background/80 backdrop-blur-sm px-4 flex items-center justify-between text-[10px] text-text-secondary select-none shrink-0 w-full',
        className,
      )}
    >
      <div className="flex items-center gap-4 flex-1" />
    </div>
  );
}
