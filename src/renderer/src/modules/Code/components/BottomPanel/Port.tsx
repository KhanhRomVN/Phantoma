/**
 * ------------------------------------------------------------------
 * Port
 * ------------------------------------------------------------------
 * Placeholder panel for the port forwarding list. Displays a
 * friendly empty state when no devices or services are connected.
 *
 * Main features:
 * - Empty state with icon and descriptive text
 * - Prompts user to connect a device or service
 * ------------------------------------------------------------------
 */

// ─── Component ──────────────────────────────────────────────────────────
export function Port() {
  // ── Render ──
  return (
    <div className="flex-1 flex items-center justify-center text-text-secondary/40 text-xs">
      <div className="text-center space-y-2">
        <div className="text-3xl">🔌</div>
        <p>Port forwarding list will appear here</p>
        <p className="text-text-secondary/20">Connect a device or service to see active ports</p>
      </div>
    </div>
  );
}

export default Port;