/**
 * ------------------------------------------------------------------
 * ServerHealthGuard
 * ------------------------------------------------------------------
 * Component bảo vệ giao diện khi backend không khả dụng.
 * Tự động chuyển về trang settings nếu mất kết nối và hiển thị
 * trạng thái đang kết nối trong lúc kiểm tra.
 *
 * Main features:
 * - Kiểm tra trạng thái backend qua useServerHealth
 * - Chuyển activeModule về 'settings' khi backend lỗi
 * - Cho phép truy cập trang settings khi backend không khả dụng
 * - Hiển thị loading state trong lúc kiểm tra
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useEffect } from 'react';

// ── Hooks ──
import { useServerHealth } from '../providers/ServerHealthProvider';
import { useActiveModule } from '@renderer/hooks/useActiveModule';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface ServerHealthGuardProps {
  children: React.ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────────
export const ServerHealthGuard: React.FC<ServerHealthGuardProps> = ({ children }) => {
  // ── Store ──
  const { activeModule, setActiveModule } = useActiveModule('recon');
  const { error, isValid } = useServerHealth();

  // ── Effects ──
  useEffect(() => {
    if (activeModule === 'settings') {
      return;
    }

    if (!isValid || error) {
      setActiveModule('settings');
    }
  }, [isValid, error, setActiveModule, activeModule]);

  // ── Render ──
  if (activeModule === 'settings') {
    return <>{children}</>;
  }

  if (isValid && !error) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="text-center">
        <div className="text-sm text-text-secondary">Connecting to Phantoma server...</div>
      </div>
    </div>
  );
};

export default ServerHealthGuard;