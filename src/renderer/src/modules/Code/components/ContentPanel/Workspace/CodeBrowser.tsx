import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, ExternalLink, Smartphone } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';

interface CodeBrowserProps {
  initialUrl?: string;
  onUrlChange?: (url: string) => void;
}

// ─── Device presets (CSS px) ──────────────────────────────────────────
export interface DevicePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  dpr: number;
  mobile: boolean;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'responsive', label: 'Responsive', width: 0, height: 0, dpr: 1, mobile: false },
  { id: 'iphone-15-pro-max', label: 'iPhone 15 Pro Max', width: 430, height: 932, dpr: 3, mobile: true },
  { id: 'iphone-15', label: 'iPhone 15 / 14 / 13', width: 393, height: 852, dpr: 3, mobile: true },
  { id: 'iphone-se', label: 'iPhone SE', width: 375, height: 667, dpr: 2, mobile: true },
  { id: 'pixel-8-pro', label: 'Pixel 8 Pro', width: 412, height: 915, dpr: 2.5, mobile: true },
  { id: 'galaxy-s23', label: 'Galaxy S23', width: 390, height: 844, dpr: 3, mobile: true },
  { id: 'ipad-mini', label: 'iPad Mini', width: 744, height: 1133, dpr: 2, mobile: false },
  { id: 'ipad-air', label: 'iPad Air', width: 820, height: 1180, dpr: 2, mobile: false },
  { id: 'ipad-pro-12', label: 'iPad Pro 12.9"', width: 1024, height: 1366, dpr: 2, mobile: false },
  { id: 'surface-duo', label: 'Surface Duo', width: 540, height: 720, dpr: 2.5, mobile: true },
];

export const CodeBrowser = ({ initialUrl = 'https://google.com', onUrlChange }: CodeBrowserProps) => {
  const initialUrlRef = useRef(initialUrl);
  const onUrlChangeRef = useRef(onUrlChange);
  onUrlChangeRef.current = onUrlChange;
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('responsive');
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const browserViewIdRef = useRef<string>(
    `browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const deviceBtnRef = useRef<HTMLButtonElement | null>(null);
  const deviceMenuRef = useRef<HTMLDivElement | null>(null);

  /**
   * Gửi bounds (CSS px, tính theo viewport window) của vùng hiển thị web
   * (viewportRef — đã trừ letterbox khi chọn device preset) lên main process.
   * Nếu element không nhìn thấy (tab khác active, panel collapse…) → gửi
   * bounds 0×0 để BrowserView co lại — xử lý lỗi "switch tab vẫn thấy browser".
   */
  const syncBounds = useCallback(() => {
    const el = viewportRef.current;
    if (!el || !window.api?.send) return;
    const rect = el.getBoundingClientRect();

    // Kiểm tra element THỰC SỰ nhìn thấy được.
    // Tailwind class `invisible` (= visibility:hidden) KHÔNG làm rect.width=0,
    // nên chỉ check size là chưa đủ. Quan trọng hơn: wrapper CHA trong
    // WorkspacePanes mới là nơi bị toggle `invisible` khi switch tab, còn
    // element này vẫn "visible" theo computed style riêng nó → phải duyệt
    // hết cây cha để phát hiện bất kỳ tổ tiên nào ẩn đi.
    const isAncestryVisible = (node: HTMLElement | null): boolean => {
      let cur: HTMLElement | null = node;
      while (cur) {
        const cs = window.getComputedStyle(cur);
        if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') {
          return false;
        }
        cur = cur.parentElement;
      }
      return true;
    };

    const isVisible =
      isAncestryVisible(el) &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth;

    window.api.send('browser:set-bounds', {
      browserId: browserViewIdRef.current,
      bounds: isVisible
        ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
        : { x: 0, y: 0, width: 0, height: 0 },
    });
  }, []);

  // ── Create BrowserView + bounds sync ──────────────────────────────────────
  useEffect(() => {
    if (window.api?.invoke) {
      window.api
        .invoke('browser:create', {
          browserId: browserViewIdRef.current,
          url: initialUrlRef.current,
        })
        .then(syncBounds)
        .catch((err) => {
          console.error('[CodeBrowser] Failed to create browser view:', err);
        });
    }

    let ro: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;

    if (containerRef.current) {
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => syncBounds());
        ro.observe(containerRef.current);
      }
      // Element vào/ra viewport (panel collapse…) → re-sync bounds.
      if (typeof IntersectionObserver !== 'undefined') {
        io = new IntersectionObserver(() => syncBounds(), { threshold: 0 });
        io.observe(containerRef.current);
      }
      // FIX #3: Tab switch chỉ toggle class `invisible` trên wrapper cha —
      // ResizeObserver/IntersectionObserver KHÔNG fire vì layout không đổi.
      // MutationObserver bắt class change ở mọi cấp cha để co BrowserView về
      // 0×0 ngay khi panel bị ẩn.
      if (typeof MutationObserver !== 'undefined') {
        mo = new MutationObserver(() => syncBounds());
        let ancestor: HTMLElement | null = containerRef.current.parentElement;
        // Theo dõi tối đa 5 cấp cha (đủ cover pane wrapper của WorkspacePanes)
        for (let i = 0; i < 5 && ancestor; i++) {
          mo.observe(ancestor, { attributes: true, attributeFilter: ['class', 'style'] });
          ancestor = ancestor.parentElement;
        }
      }
    }

    const onWindowResize = () => syncBounds();
    window.addEventListener('resize', onWindowResize);

    return () => {
      ro?.disconnect();
      io?.disconnect();
      mo?.disconnect();
      window.removeEventListener('resize', onWindowResize);
    };
  }, [syncBounds]);

  // Re-sync mỗi khi đổi device preset (letterbox làm viewport div đổi size)
  useEffect(() => {
    syncBounds();
  }, [deviceId, syncBounds]);

  // ── Apply device metrics override trong main process ──────────────────────
  useEffect(() => {
    const preset = DEVICE_PRESETS.find((d) => d.id === deviceId) ?? DEVICE_PRESETS[0];
    if (window.api?.send) {
      window.api.send('browser:set-device-metrics', {
        browserId: browserViewIdRef.current,
        width: preset.width,
        height: preset.height,
        deviceScaleFactor: preset.dpr,
        mobile: preset.mobile,
      });
    }
  }, [deviceId]);

  // ── Navigation state listeners ────────────────────────────────────────────
  useEffect(() => {
    if (!window.api?.on) return;

    const onDidNavigate = (_event: any, payload: { browserId: string; url: string }) => {
      if (payload.browserId === browserViewIdRef.current) {
        setUrl(payload.url);
        setInputUrl(payload.url);
        onUrlChangeRef.current?.(payload.url);
      }
    };

    const onNavigationStateChanged = (
      _event: any,
      payload: { browserId: string; canGoBack: boolean; canGoForward: boolean },
    ) => {
      if (payload.browserId === browserViewIdRef.current) {
        setCanGoBack(payload.canGoBack);
        setCanGoForward(payload.canGoForward);
      }
    };

    const onLoadStart = (_event: any, payload: { browserId: string }) => {
      if (payload.browserId === browserViewIdRef.current) setIsLoading(true);
    };

    const onLoadStop = (_event: any, payload: { browserId: string }) => {
      if (payload.browserId === browserViewIdRef.current) setIsLoading(false);
    };

    window.api.on('browser:did-navigate', onDidNavigate);
    window.api.on('browser:navigation-state-changed', onNavigationStateChanged);
    window.api.on('browser:load-start', onLoadStart);
    window.api.on('browser:load-stop', onLoadStop);

    return () => {
      window.api.off('browser:did-navigate', onDidNavigate);
      window.api.off('browser:navigation-state-changed', onNavigationStateChanged);
      window.api.off('browser:load-start', onLoadStart);
      window.api.off('browser:load-stop', onLoadStop);
    };
  }, []);

  // ── Overlay events (dropdown "+" của TabBar) ────────────────────────────
  // BrowserView là native layer Electron nằm TRÊN web content → mọi dropdown
  // DOM đều bị che bất kể z-index. Bắt buộc phải co bounds về 0×0 khi overlay
  // mở và re-sync khi đóng.
  //
  // BUG ĐÃ SỬA: trước đây dùng IPC global 'browser:restore-all' khôi phục từ
  // cache lastBounds → gây trắng xóa vì (a) cache stale nếu panel resize trong
  // lúc menu mở, (b) Electron suspend paint pipeline khi bounds=0 quá lâu.
  // Giờ renderer tự tính lại bounds tươi qua getBoundingClientRect() VÀ gửi
  // thêm IPC 'browser:force-repaint' để kick web contents vẽ lại frame mới.
  useEffect(() => {
    const id = browserViewIdRef.current;
    const onOverlayOpen = () => {
      if (window.api?.send) {
        window.api.send('browser:set-bounds', {
          browserId: id,
          bounds: { x: 0, y: 0, width: 0, height: 0 },
        });
      }
    };
    const onOverlayClose = () => {
      syncBounds();
      // Force repaint sau khi restore bounds — chống white flash do Electron
      // suspend compositor cho view có bounds 0×0 trong thời gian ngắn.
      if (window.api?.send) {
        setTimeout(() => {
          window.api.send('browser:force-repaint', id);
        }, 50);
      }
    };

    window.addEventListener('phantoma:overlay-open', onOverlayOpen);
    window.addEventListener('phantoma:overlay-close', onOverlayClose);
    return () => {
      window.removeEventListener('phantoma:overlay-open', onOverlayOpen);
      window.removeEventListener('phantoma:overlay-close', onOverlayClose);
    };
  }, [syncBounds]);

  // ── Destroy BrowserView khi component unmount ─────────────────────────────
  useEffect(() => {
    const id = browserViewIdRef.current;
    return () => {
      if (window.api?.send) {
        window.api.send('browser:destroy', id);
      }
    };
  }, []);

  // Close device menu khi click outside
  useEffect(() => {
    if (!deviceMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        deviceMenuRef.current?.contains(e.target as Node) ||
        deviceBtnRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setDeviceMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [deviceMenuOpen]);

  /**
   * Toggle dropdown device preset. Menu này nằm TRONG toolbar (phía trên
   * BrowserView region) nên không bị native layer che → không cần dispatch
   * overlay event, chỉ cần sync bounds sau khi chọn preset.
   */
  const toggleDeviceMenu = () => {
    setDeviceMenuOpen((open) => !open);
  };

  // Chọn preset → đóng menu + re-sync bounds (letterbox thay đổi kích thước viewport div)
  const handleSelectDevice = (presetId: string) => {
    setDeviceId(presetId);
    setDeviceMenuOpen(false);
    setTimeout(syncBounds, 0);
  };

  const handleNavigate = (newUrl: string) => {
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      newUrl = 'https://' + newUrl;
    }
    if (window.api?.send) {
      window.api.send('browser:navigate', {
        browserId: browserViewIdRef.current,
        url: newUrl,
      });
    }
  };

  const handleGoBack = () => {
    if (window.api?.send && canGoBack) {
      window.api.send('browser:go-back', browserViewIdRef.current);
    }
  };

  const handleGoForward = () => {
    if (window.api?.send && canGoForward) {
      window.api.send('browser:go-forward', browserViewIdRef.current);
    }
  };

  const handleReload = () => {
    if (window.api?.send) {
      window.api.send('browser:reload', browserViewIdRef.current);
    }
  };

  const handleHome = () => handleNavigate(initialUrlRef.current);

  const handleOpenExternal = () => {
    if (window.api?.send) window.api.send('browser:open-external', url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleNavigate(inputUrl);
  };

  const activePreset = DEVICE_PRESETS.find((d) => d.id === deviceId) ?? DEVICE_PRESETS[0];
  const isFixedViewport = activePreset.width > 0;

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Toolbar */}
      <div className="h-10 shrink-0 flex items-center gap-2 px-3 bg-sidebar-background border-b border-divider">
        <button
          onClick={handleGoBack}
          disabled={!canGoBack}
          className="p-1.5 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          onClick={handleGoForward}
          disabled={!canGoForward}
          className="p-1.5 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Go forward"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={handleReload}
          className="p-1.5 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Reload"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={handleHome}
          className="p-1.5 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Home"
        >
          <Home className="w-4 h-4" />
        </button>

        {/* URL Bar */}
        <form onSubmit={handleSubmit} className="flex-1 min-w-0">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Enter URL..."
            className="w-full px-3 py-1.5 text-sm bg-card-background border border-border rounded focus:outline-none focus:border-primary text-text-primary placeholder:text-text-secondary"
          />
        </form>

        {/* Device Preset Selector */}
        <div className="relative shrink-0">
          <button
            ref={deviceBtnRef}
            onClick={toggleDeviceMenu}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors',
              deviceId !== 'responsive'
                ? 'bg-primary/15 text-primary'
                : 'text-text-secondary hover:bg-white/[0.05] hover:text-text-primary',
            )}
            aria-label="Select device viewport"
            title={activePreset.label}
          >
            <Smartphone className="w-3.5 h-3.5" />
            {isFixedViewport && (
              <span className="max-w-[110px] truncate">
                {activePreset.label} · {activePreset.width}×{activePreset.height}
              </span>
            )}
          </button>

          {deviceMenuOpen && (
            <div
              ref={deviceMenuRef}
              className="absolute right-0 top-full mt-1 z-[9999] bg-card-background border border-border rounded-lg shadow-xl py-1 min-w-[220px]"
            >
              {DEVICE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectDevice(preset.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs transition-colors',
                    preset.id === deviceId
                      ? 'bg-primary/15 text-primary'
                      : 'text-text-primary hover:bg-white/[0.05]',
                  )}
                >
                  <span>{preset.label}</span>
                  {preset.width > 0 && (
                    <span className="text-text-secondary tabular-nums">
                      {preset.width}×{preset.height} @{preset.dpr}x
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Open in External Browser */}
        <button
          onClick={handleOpenExternal}
          className="p-1.5 rounded hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors shrink-0"
          aria-label="Open in external browser"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Container — bounds region được tính từ viewportRef (đã trừ letterbox) */}
      <div
        ref={containerRef}
        id={`browser-container-${browserViewIdRef.current}`}
        className="flex-1 relative bg-neutral-900 overflow-hidden flex items-center justify-center"
      >

        {/* Letterbox frame cho device preset — chỉ mang tính tham chiếu visual */}
        {isFixedViewport && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <div
              className="border border-white/10 rounded-md shadow-2xl"
              style={{
                width: activePreset.width,
                height: activePreset.height,
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            />
          </div>
        )}

        {/* Vùng thực sự hiển thị web — BrowserView được đặt đúng bounds này */}
        <div
          ref={viewportRef}
          className={cn(
            'relative bg-white',
            isFixedViewport ? 'shadow-2xl rounded-md' : 'w-full h-full',
          )}
          style={
            isFixedViewport
              ? {
                  width: Math.min(activePreset.width, 10000),
                  height: Math.min(activePreset.height, 10000),
                  maxWidth: '100%',
                  maxHeight: '100%',
                }
              : undefined
          }
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-sm bg-white pointer-events-none">
              Loading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeBrowser;