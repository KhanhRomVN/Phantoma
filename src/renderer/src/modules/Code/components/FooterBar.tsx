import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useCodeStore } from '../hooks/useCodeStore';
import {
  getLSPServer,
  isLSPInstalled,
  isLSPDismissed,
  type LSPServer,
} from '../services/lsp.service';
import { cn } from '@renderer/shared/utils/cn';

interface FooterBarProps {
  className?: string;
}

export function FooterBar({ className }: FooterBarProps) {
  const timeRef = useRef<HTMLSpanElement>(null);
  const [memoryUsage, setMemoryUsage] = useState<{ used: number; total: number } | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [activeLSP, setActiveLSP] = useState<LSPServer | null>(null);
  const [pendingLSP, setPendingLSP] = useState(false);

  const projects = useCodeStore((s) => s.projects);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const setForceShowLSPOverlay = useCodeStore((s) => s.setForceShowLSPOverlay);

  const project = projects.find((p) => p.id === currentProjectId);
  const activeFileTabId = project?.activeFileTabId ?? null;
  const fileDisplayNames = project?.fileDisplayNames ?? {};

  // Kiểm tra LSP cho file đang mở
  const checkLSP = useCallback(() => {
    if (!activeFileTabId) {
      setActiveLSP(null);
      setPendingLSP(false);
      return;
    }

    const filename = fileDisplayNames[activeFileTabId] || activeFileTabId;
    const detected = getLSPServer(filename);

    if (!detected) {
      setActiveLSP(null);
      setPendingLSP(false);
      return;
    }

    setActiveLSP(detected);
    setPendingLSP(!isLSPInstalled(detected.id) && !isLSPDismissed(detected.id));
  }, [activeFileTabId, fileDisplayNames]);

  useEffect(() => {
    const timer = setTimeout(checkLSP, 1500);
    return () => clearTimeout(timer);
  }, [checkLSP]);

  // Cập nhật đồng hồ mỗi giây mà không gây re-render
  useEffect(() => {
    const updateClock = () => {
      if (timeRef.current) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const timeStr = now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        timeRef.current.textContent = `${dateStr} ${timeStr}`;
      }
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const getMemoryInfo = async () => {
      try {
        // @ts-ignore
        if (performance.memory) {
          // @ts-ignore
          const mem = performance.memory;
          setMemoryUsage({
            used: Math.round(mem.usedJSHeapSize / (1024 * 1024)),
            total: Math.round(mem.jsHeapSizeLimit / (1024 * 1024)),
          });
        }
      } catch {
        // Bỏ qua nếu không có memory API
      }
    };

    getMemoryInfo();
    const interval = setInterval(getMemoryInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleRequestUpdate = (event: CustomEvent) => {
      setRequestCount(event.detail?.count || 0);
    };

    window.addEventListener('request-count-update', handleRequestUpdate as EventListener);
    return () => {
      window.removeEventListener('request-count-update', handleRequestUpdate as EventListener);
    };
  }, []);

  const handleLSPClick = () => {
    if (pendingLSP) {
      setForceShowLSPOverlay(true);
    }
  };

  return (
    <div
      className={cn(
        'h-8 border-t border-border bg-sidebar-background/80 backdrop-blur-sm px-4 flex items-center justify-between text-[10px] text-text-secondary select-none shrink-0 w-full',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {/* Trạng thái LSP */}
        {activeLSP && (
          <>
            {pendingLSP ? (
              <button
                onClick={handleLSPClick}
                className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer bg-transparent border-none p-0"
                title={`Cài đặt ${activeLSP.name}`}
              >
                <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                <span className="font-medium">{activeLSP.language}</span>
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400/70">
                <CheckCircle className="w-3 h-3" strokeWidth={2} />
                <span className="font-medium">{activeLSP.language}</span>
              </span>
            )}
            <span className="text-border">|</span>
          </>
        )}

        <span ref={timeRef} className="font-mono">
          {/* Nội dung sẽ được cập nhật trực tiếp bởi useRef */}
        </span>
        <span className="text-border">|</span>
        <span>
          Requests: <span className="text-text-primary font-medium">{requestCount}</span>
        </span>
        {memoryUsage && (
          <>
            <span className="text-border">|</span>
            <span>
              Memory: <span className="text-text-primary font-mono">{memoryUsage.used}MB</span>
              <span className="text-text-secondary/50"> / {memoryUsage.total}MB</span>
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-text-secondary/50">v1.0.0</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-text-secondary/70">Ready</span>
        </span>
      </div>
    </div>
  );
}
