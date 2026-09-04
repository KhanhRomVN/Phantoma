/**
 * ------------------------------------------------------------------
 * FooterBar
 * ------------------------------------------------------------------
 * Status bar hiển thị ở đáy module Emulate. Hiển thị trạng thái
 * proxy/session, thống kê requests, trạng thái intercept và thông
 * tin real-time khác về target đang hoạt động.
 *
 * Các chức năng chính:
 * - Hiển thị chế độ target đang hoạt động (MITM/CDP/Frida) kèm status
 * - Hiển thị tổng số requests và phần trăm HTTPS
 * - Hiển thị thống kê data usage
 * - Hiển thị trạng thái intercept khi active
 * - Timer session real-time cho target đang chạy
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useMemo } from 'react';

// ── UI ──
import { Activity, Shield, Clock, Database, Wifi } from 'lucide-react';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ── Types ──
import type { TargetState } from '../types/target.types';

// ── Stores ──
import { useTimerStore } from '../stores/timerStore';
import { useNetworkStore } from '../stores/networkStore';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface FooterBarProps {
  className?: string;
  activeTargetId: string | null;
  targetState?: TargetState;
}

// ─── Component ──────────────────────────────────────────────────────────
export function FooterBar({
  className,
  activeTargetId,
  targetState,
}: FooterBarProps) {
  const sessionTimer = useTimerStore((s) => s.timerDisplay[activeTargetId || ''] || undefined);
  const requests = useNetworkStore((s) => s.requests);

  // ── Derived Stats ──
  const stats = useMemo(() => {
    const totalRequests = requests.length;
    const httpsRequests = requests.filter(
      (r) => r.protocol === 'https' || r.url.startsWith('https://'),
    ).length;
    const httpsPercentage =
      totalRequests > 0 ? Math.round((httpsRequests / totalRequests) * 100) : 0;

    // Calculate total data usage
    const totalBytes = requests.reduce((sum, r) => {
      // Parse size from response (assuming format like "1.2 KB" or "500 B")
      const sizeMatch = r.size?.match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
      if (!sizeMatch) return sum;

      const value = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toUpperCase();

      let bytes = value;
      if (unit === 'KB') bytes *= 1024;
      else if (unit === 'MB') bytes *= 1024 * 1024;
      else if (unit === 'GB') bytes *= 1024 * 1024 * 1024;

      return sum + bytes;
    }, 0);

    const dataUsed =
      totalBytes >= 1024 * 1024
        ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
        : totalBytes >= 1024
          ? `${(totalBytes / 1024).toFixed(1)} KB`
          : `${totalBytes} B`;

    return {
      totalRequests,
      httpsRequests,
      httpsPercentage,
      dataUsed,
    };
  }, [requests]);

  // ── Mode Display ──
  const modeConfig = useMemo(() => {
    if (!targetState?.isActive || !targetState.mode) return null;

    const configs = {
      mitm: {
        label: 'MITM Proxy',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        icon: Shield,
      },
      cdp: {
        label: 'CDP Session',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        icon: Wifi,
      },
      frida: {
        label: 'Frida Hook',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        icon: Activity,
      },
    };

    return configs[targetState.mode];
  }, [targetState]);

  // ── Render ──
  return (
    <div
      className={cn(
        'h-8 border-t border-border bg-sidebar-background/80 backdrop-blur-sm px-4 flex items-center justify-between text-[10px] text-text-secondary select-none shrink-0 w-full',
        className,
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Target ID */}
        {activeTargetId && (
          <span className="text-text-secondary/70 font-mono">
            Target: <span className="text-text-primary">{activeTargetId.slice(0, 8)}</span>
          </span>
        )}

        {/* Session Mode & Status */}
        {modeConfig && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded border border-border/50',
              modeConfig.bgColor,
            )}
          >
            <modeConfig.icon className={cn('w-3 h-3', modeConfig.color)} strokeWidth={2} />
            <span className={cn('font-medium', modeConfig.color)}>{modeConfig.label}</span>
            {/* Pulsing dot for active session */}
            <div className="relative flex h-2 w-2">
              <span
                className={cn(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  modeConfig.color.replace('text-', 'bg-'),
                )}
              ></span>
              <span
                className={cn(
                  'relative inline-flex rounded-full h-2 w-2',
                  modeConfig.color.replace('text-', 'bg-'),
                )}
              ></span>
            </div>
          </div>
        )}

        {/* Intercept Status */}
        {targetState?.isIntercepting && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10">
            <Shield className="w-3 h-3 text-red-400" strokeWidth={2} />
            <span className="font-medium text-red-400">Intercept ON</span>
          </div>
        )}

        {/* Session Timer */}
        {sessionTimer && targetState?.isActive && (
          <div className="flex items-center gap-1.5 text-text-secondary/70">
            <Clock className="w-3 h-3" strokeWidth={2} />
            <span className="font-mono">{sessionTimer}</span>
          </div>
        )}

        {/* Request Stats */}
        {stats.totalRequests > 0 && (
          <>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-400/70" strokeWidth={2} />
              <span>
                <span className="font-medium text-emerald-400">{stats.totalRequests}</span> requests
              </span>
              <span className="text-text-secondary/50">|</span>
              <span>
                <span className="font-medium text-blue-400">{stats.httpsPercentage}%</span> HTTPS
              </span>
            </div>

            {/* Data Usage */}
            <div className="flex items-center gap-1.5">
              <Database className="w-3 h-3 text-purple-400/70" strokeWidth={2} />
              <span>
                Data: <span className="font-medium text-purple-400">{stats.dataUsed}</span>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right side - Connection status or info */}
      {!targetState?.isActive && activeTargetId && (
        <div className="text-text-secondary/50 text-[9px]">Session Idle</div>
      )}
    </div>
  );
}
