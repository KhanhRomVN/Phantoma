import { useState, useEffect, useRef } from 'react';
import { cn } from '../shared/lib/utils';

interface FooterBarProps {
  className?: string;
}

export function FooterBar({ className }: FooterBarProps) {
  const timeRef = useRef<HTMLSpanElement>(null);
  const [memoryUsage, setMemoryUsage] = useState<{ used: number; total: number } | null>(null);
  const [requestCount, setRequestCount] = useState(0);

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

    updateClock(); // Cập nhật ngay lần đầu
    const timer = setInterval(updateClock, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Lấy thông tin memory usage nếu có
    const getMemoryInfo = async () => {
      try {
        // @ts-ignore - performance.memory không có sẵn trong tất cả trình duyệt
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

  // Lắng nghe số lượng request từ event
  useEffect(() => {
    const handleRequestUpdate = (event: CustomEvent) => {
      setRequestCount(event.detail?.count || 0);
    };

    window.addEventListener('request-count-update', handleRequestUpdate as EventListener);
    return () => {
      window.removeEventListener('request-count-update', handleRequestUpdate as EventListener);
    };
  }, []);

  return (
    <div
      className={cn(
        'h-8 border-t border-border bg-sidebar-background/80 backdrop-blur-sm px-4 flex items-center justify-between text-[10px] text-text-secondary select-none shrink-0 w-full',
        className,
      )}
    >
      <div className="flex items-center gap-4">
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
