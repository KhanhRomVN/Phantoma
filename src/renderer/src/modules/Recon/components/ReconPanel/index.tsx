import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Plus, X } from 'lucide-react';

import { AgentPanel } from '@renderer/components/Widgets/Zen';
import { AgentTools } from '@renderer/components/Widgets/AgentTools';
import { SettingsProvider } from '@renderer/components/Widgets/Zen/context/SettingsContext';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { getFaviconUrl } from '@renderer/utils/favicon';
import { cn } from '@renderer/utils/cn';

import { useReconStore } from '../../stores/useReconStore';
import {
  useReconPanelStore,
  createDefaultTargetTabs,
  type ReconPanelTab,
} from '../../stores/useReconPanelStore';

const MIN_WIDTH = 300;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 450;
const NO_TARGET_KEY = '__none__';

const ZenLogo = ({ className }: { className?: string }) => (
  <img
    src={`${(window as any).__zenImagesUri || '/images'}/zen-logo.png`}
    alt="Zen"
    className={cn(className, 'object-contain')}
    style={{ pointerEvents: 'none' }}
    draggable={false}
  />
);

const AgentToolsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

const getTabTitle = (tab: ReconPanelTab) =>
  tab.type === 'zen' ? 'Zen' : tab.providerName || 'Agent Tools';

function TabIcon({ tab, className }: { tab: ReconPanelTab; className: string }) {
  if (tab.type === 'zen') return <ZenLogo className={className} />;
  if (tab.providerUrl) {
    return (
      <img
        src={getFaviconUrl(tab.providerUrl, 16)}
        alt=""
        className={className}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  return <AgentToolsIcon className={className} />;
}

export function ReconPanel() {
  const activeTargetId = useReconStore((s) => s.activeTargetId);
  const targets = useReconStore((s) => s.targets);
  const targetKey = activeTargetId ?? NO_TARGET_KEY;

  const stored = useReconPanelStore((s) => s.byTarget[targetKey]);
  const ensureTarget = useReconPanelStore((s) => s.ensureTarget);
  const addZenTab = useReconPanelStore((s) => s.addZenTab);
  const openAgentTools = useReconPanelStore((s) => s.openAgentTools);
  const setActiveTab = useReconPanelStore((s) => s.setActiveTab);
  const closeTab = useReconPanelStore((s) => s.closeTab);
  const updateTab = useReconPanelStore((s) => s.updateTab);
  const removeTarget = useReconPanelStore((s) => s.removeTarget);

  const fallback = useMemo(createDefaultTargetTabs, []);
  const { tabs, activeTabId } = stored ?? fallback;

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ startX: 0, startWidth: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflowIds, setOverflowIds] = useState<string[]>([]);

  useEffect(() => {
    ensureTarget(targetKey);
  }, [targetKey, ensureTarget]);

  // Target bị xoá → dọn tab đã lưu
  const knownIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const current = new Set(targets.map((t) => t.id));
    knownIdsRef.current.forEach((id) => {
      if (!current.has(id)) removeTarget(id);
    });
    knownIdsRef.current = current;
  }, [targets, removeTarget]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = resizeStartRef.current.startX - e.clientX;
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartRef.current.startWidth + delta)));
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { startX: e.clientX, startWidth: width };
    setIsResizing(true);
  };

  // Tab nào bị cắt khỏi vùng nhìn thấy của tabBar thì đưa vào dropdown số
  const measureOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const viewLeft = el.scrollLeft;
    const viewRight = viewLeft + el.clientWidth;
    const ids: string[] = [];
    el.querySelectorAll<HTMLElement>('[data-tab-id]').forEach((node) => {
      const left = node.offsetLeft;
      const right = left + node.offsetWidth;
      if (left < viewLeft - 1 || right > viewRight + 1) ids.push(node.dataset.tabId as string);
    });
    setOverflowIds((prev) =>
      prev.length === ids.length && prev.every((v, i) => v === ids[i]) ? prev : ids,
    );
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    measureOverflow();
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    el.addEventListener('scroll', measureOverflow);
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', measureOverflow);
    };
  }, [tabs, width, measureOverflow]);

  useEffect(() => {
    if (!activeTabId) return;
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTabId, tabs.length]);

  const handleConversationChange = useCallback(
    (tabId: string, conversationId: string | null) => {
      updateTab(targetKey, tabId, { conversationId });
    },
    [targetKey, updateTab],
  );

  const overflowTabs = tabs.filter((t) => overflowIds.includes(t.id));

  return (
    <SettingsProvider>
      <div
        className="shrink-0 border-l border-divider flex flex-col overflow-hidden relative h-full"
        style={{ width: `${width}px` }}
      >
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group',
            'hover:bg-primary/30 transition-colors',
            isResizing && 'bg-primary/50',
          )}
          style={{ zIndex: 9999 }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-4 -translate-x-1.5" />
        </div>

        <div className="h-9 w-full shrink-0 flex items-end bg-sidebar-background border-b border-divider">
          <div
            ref={scrollRef}
            onWheel={(e) => {
              if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY || e.deltaX;
            }}
            className="relative flex items-end min-w-0 overflow-x-hidden"
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const title = getTabTitle(tab);
              return (
                <div
                  key={tab.id}
                  data-tab-id={tab.id}
                  onClick={() => setActiveTab(targetKey, tab.id)}
                  className={cn(
                    'group/tab h-9 px-3 flex items-center gap-2 shrink-0 text-[13px] relative select-none border-r border-divider transition-colors cursor-pointer',
                    isActive
                      ? 'bg-card-background text-text-primary border-b-2 border-b-primary/80'
                      : 'bg-sidebar-background text-text-secondary hover:bg-white/[0.03]',
                  )}
                >
                  <TabIcon tab={tab} className="w-3.5 h-3.5 shrink-0" />
                  <span className="max-w-[180px] truncate" style={{ pointerEvents: 'none' }}>
                    {title}
                  </span>
                  <button
                    draggable={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(targetKey, tab.id);
                    }}
                    className="opacity-0 group-hover/tab:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 p-0 border-0 outline-none focus:outline-none ml-auto"
                    aria-label={`Close ${title}`}
                  >
                    <X className="w-3.5 h-3.5 stroke-current" strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>

          {overflowTabs.length > 0 && (
            <Dropdown align="end" side="bottom" sideOffset={4} width={240} className="shrink-0">
              <DropdownTrigger asChild>
                <button
                  className="h-9 min-w-9 px-2 flex items-center justify-center border border-dashed border-primary/50 text-primary text-[11px] font-semibold hover:bg-white/[0.05] transition-colors"
                  aria-label={`${overflowTabs.length} hidden tabs`}
                >
                  {overflowTabs.length}
                </button>
              </DropdownTrigger>
              <DropdownContent>
                {overflowTabs.map((tab) => (
                  <DropdownItem
                    key={tab.id}
                    icon={<TabIcon tab={tab} className="w-4 h-4" />}
                    className={cn(tab.id === activeTabId && 'bg-white/[0.06]')}
                    onClick={() => setActiveTab(targetKey, tab.id)}
                  >
                    <span className="truncate">{getTabTitle(tab)}</span>
                  </DropdownItem>
                ))}
              </DropdownContent>
            </Dropdown>
          )}

          <Dropdown align="start" side="bottom" sideOffset={4} width={200} className="shrink-0">
            <DropdownTrigger asChild>
              <button
                className="h-9 w-9 flex items-center justify-center hover:bg-white/[0.05] text-text-secondary hover:text-text-primary transition-colors shrink-0"
                aria-label="Add tab"
              >
                <Plus className="w-4 h-4" />
              </button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem
                icon={<ZenLogo className="w-4 h-4" />}
                onClick={() => addZenTab(targetKey)}
              >
                Zen
              </DropdownItem>
              <DropdownItem
                icon={<AgentToolsIcon className="w-4 h-4" />}
                onClick={() => openAgentTools(targetKey)}
              >
                Agent Tools
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>

        {/* ASSUMED: đóng hết tab được phép (giống Workspace); hội thoại khôi phục qua conversationId đã lưu */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {tabs.map((tab) => (
            <div
              key={`${targetKey}:${tab.id}`}
              className={cn('h-full', tab.id !== activeTabId && 'hidden')}
            >
              {tab.type === 'zen' ? (
                <AgentPanel
                  feature="recon"
                  initialConversationId={tab.conversationId ?? null}
                  onConversationChange={(id) => handleConversationChange(tab.id, id)}
                />
              ) : (
                <AgentTools
                  onProviderChange={(provider: { id: string; name: string; url?: string }) =>
                    updateTab(targetKey, tab.id, {
                      providerName: provider.name,
                      providerUrl: provider.url,
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </SettingsProvider>
  );
}

export default ReconPanel;