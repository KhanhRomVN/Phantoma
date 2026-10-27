/**
 * ------------------------------------------------------------------
 * WorkspacePanel
 * ------------------------------------------------------------------
 * Panel chính hiển thị nội dung theo tool đang chọn (Home/Intruder/
 * Repeater/Resource/Source/Log/Device). Chứa TabBar điều hướng.
 *
 * Các chức năng chính:
 * - TabBar điều hướng giữa các tools
 * - Hiển thị RequestTable + RequestDetails cho Home
 * - Điều hướng đến các panel tương ứng theo selectedTool
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useMemo, memo, createElement, FC, useState, useEffect } from 'react';

// ── UI ──
import { RequestTable, RequestDetails, WebSocketUI } from './Home/Home';
import { ResourcesPanel } from './Resources';
import { PayloadPanel } from './Repeater';
import { SourcesPanel } from './Source';
import { ReportPanel } from './Report';
import { LogViewer } from './Log';
import { DevicePanel } from './Device';

// ── Constants ──
import { ToolType, TOOLS } from '../../constants/tools';
import { detectResourceType } from '../../constants/resource';

// ── Stores ──
import { useNetworkStore } from '../../stores/networkStore';

// ── Services ──
import emulateApi from '../../services/emulate-api.service';

// ── Hooks ──
import { CdpScriptUnpackedData } from '../../hooks/useNetworkEvents';

// ── Types ──
import { NetworkRequest } from '../../types/inspector';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ── Icons ──
import { Trash2, Crosshair } from 'lucide-react';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface WorkspacePanelProps {
  selectedTool: ToolType;
  activeTargetId: string | null;
  targetStates: Record<
    string,
    { isActive: boolean; mode?: string; isIntercepting?: boolean; startTime?: number }
  >;
  selectedId: string | null;
  searchTerm: string;
  filter: any;
  isFilterOpen: boolean;
  fuzzerTargetId: string | null;
  unpackedScripts: Map<string, CdpScriptUnpackedData>;
  currentTargetUrl: string | undefined;
  getColorByIndex: (index: number) => string;
  onSetSelectedTool: (tool: ToolType) => void;
  onSetSelectedId: (id: string | null) => void;
  onSearchChange: (term: string) => void;
  onFilterChange: (value: any) => void;
  onToggleFilter: () => void;
  onSendToRepeater: (req: NetworkRequest) => void;
  onClearRequests: () => void;
  onLaunchTarget: (
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native' | 'cdp',
  ) => Promise<void>;
  onToggleIntercept: () => void;
  onStopTarget: () => void;
  onStartTarget: (targetId: string, mode: 'mitm' | 'cdp' | 'frida') => void;
  isTargetActive: (targetId: string) => boolean;
  /** Callback load thêm items từ Worker khi scroll */
  loadMore?: (offset: number, limit?: number) => void;
  /** Tổng số requests trong Worker */
  workerTotalCount?: number;
}

const WorkspacePanel: FC<WorkspacePanelProps> = ({
  selectedTool,
  activeTargetId,
  targetStates,
  selectedId,
  searchTerm,
  filter,
  isFilterOpen,
  fuzzerTargetId,
  unpackedScripts,
  currentTargetUrl,
  getColorByIndex,
  onSetSelectedTool,
  onSetSelectedId,
  onSearchChange,
  onFilterChange,
  onToggleFilter,
  onSendToRepeater,
  onClearRequests,
  onLaunchTarget,
  onToggleIntercept,
  onStopTarget,
  onStartTarget,
  isTargetActive,
  loadMore,
  workerTotalCount,
}) => {
  const emptySet = useMemo(() => new Set<string>(), []);
  const assetsVersion = useNetworkStore((s) => s.assetsVersion);
  const requests = useMemo(
    () => Array.from(useNetworkStore.getState().assetMap.values()),
    [assetsVersion],
  );
  const [dbCounts, setDbCounts] = useState({ repeater: 0, report: 0 });
  const [viewMode, setViewMode] = useState<'https' | 'websocket'>('https');

  useEffect(() => {
    if (!activeTargetId || activeTargetId === 'default') {
      setDbCounts({ repeater: 0, report: 0 });
      return;
    }
    let cancelled = false;
    const loadCounts = async () => {
      const [reqRes, repRes] = await Promise.all([
        emulateApi.listRequests(activeTargetId),
        emulateApi.listReports(activeTargetId),
      ]);
      if (!cancelled) {
        setDbCounts({
          repeater: reqRes.success && reqRes.data ? reqRes.data.length : 0,
          report: repRes.success && repRes.data ? repRes.data.length : 0,
        });
      }
    };
    loadCounts();
    window.addEventListener('repeater-updated', loadCounts);
    return () => {
      cancelled = true;
      window.removeEventListener('repeater-updated', loadCounts);
    };
  }, [activeTargetId]);

  const sourceCount = useMemo(() => {
    const urls = new Set<string>();
    let count = unpackedScripts.size;
    for (const [, script] of unpackedScripts) {
      urls.add(script.url);
    }
    requests.forEach((req) => {
      const isSource =
        req.type?.toUpperCase() === 'JS' ||
        req.type?.toUpperCase() === 'CSS' ||
        req.type?.toUpperCase() === 'HTML';
      if (isSource && req.responseBody && !urls.has(req.url)) {
        urls.add(req.url);
        count++;
      }
    });
    return count;
  }, [requests, unpackedScripts]);

  const resourceCount = useMemo(() => {
    const seen = new Set<string>();
    let count = 0;
    requests.forEach((req) => {
      const type = detectResourceType(
        req.responseHeaders?.['content-type'] || req.responseHeaders?.['Content-Type'] || '',
        req.path,
      );
      if (type !== 'other' && !seen.has(req.url)) {
        seen.add(req.url);
        count++;
      }
    });
    return count;
  }, [requests]);

  const TabBar = (
    <div className="flex h-10 border-b border-border shrink-0 overflow-x-auto gap-0.5 px-2">
      {(Object.keys(TOOLS) as ToolType[]).map((id) => {
        const tool = TOOLS[id];
        const tabColor = getColorByIndex(tool.accentIndex);
        const isActive = selectedTool === id;
        return (
          <button
            key={id}
            onClick={() => onSetSelectedTool(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 h-full text-sm font-medium whitespace-nowrap cursor-pointer transition-all border-b-2',
              isActive
                ? 'text-text-primary'
                : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-dropdown-item-hover',
            )}
            style={{
              borderBottomColor: isActive ? tabColor : 'transparent',
            }}
          >
            <span style={{ color: isActive ? tabColor : undefined }}>
              {createElement(tool.icon, { size: 14, strokeWidth: 1.5 })}
            </span>
            <span>{tool.label}</span>
            {(id === 'repeater' ||
              id === 'source' ||
              id === 'resource' ||
              id === 'report') && (
              <span className="ml-1 text-xs text-text-secondary">
                {id === 'repeater'
                  ? dbCounts.repeater
                  : id === 'source'
                    ? sourceCount
                    : id === 'resource'
                      ? resourceCount
                      : dbCounts.report}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {TabBar}

      {selectedTool === 'device' ? (
        <div className="flex-1 overflow-hidden">
          <DevicePanel />
        </div>
      ) : !activeTargetId || activeTargetId === 'default' ? (
        <div className="w-full h-full flex items-center justify-center bg-background relative overflow-hidden p-6">
          <div className="absolute inset-0 pointer-events-none opacity-[0.05]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-primary blur-[130px]" />
          </div>
          <div className="relative z-10 text-center max-w-[740px] w-full flex flex-col items-center justify-center">
            <div className="relative w-[92px] h-[92px] mb-5">
              <i className="absolute inset-0 rounded-[22px] border border-divider bg-card-background transform rotate-[-8deg]" />
              <i className="absolute inset-0 rounded-[22px] border border-transparent bg-card-hover transform rotate-[5deg]" />
              <i className="absolute inset-0 rounded-[22px] border border-primary/50 bg-card-background shadow-[0_8px_30px_rgba(255,106,31,0.2)] grid place-items-center text-primary">
                <Crosshair className="w-9 h-9 stroke-[1.4]" />
              </i>
            </div>
            <h1 className="text-[17px] font-semibold text-text-primary mb-1.5">
              No target selected
            </h1>
            <p className="text-[12.5px] max-w-[420px] text-text-secondary leading-relaxed">
              Select a target from the left panel, then start a CDP or MITM session to inspect
              requests, replay them and generate reports.
            </p>
          </div>
        </div>
      ) : (
        <>
          {selectedTool === 'home' && (
            <>
              <div className="flex-1 min-h-0 border-b border-border flex flex-col">
                {/* Header: title + protocol toggle + searchbar */}
                <div className="flex items-center gap-2 px-2 py-1.5 border-b border-divider shrink-0">
                  <span className="text-xs font-semibold text-text-primary whitespace-nowrap">
                    Requests
                  </span>
                  <div className="flex items-center gap-0.5 bg-input-background border border-border rounded p-0.5 shrink-0">
                    <button
                      onClick={() => setViewMode('https')}
                      className={cn(
                        'px-2 py-0.5 text-[11px] font-medium rounded transition-colors',
                        viewMode === 'https'
                          ? 'bg-primary/20 text-primary'
                          : 'text-text-secondary hover:bg-sidebar-item-hover/40 hover:text-text-primary',
                      )}
                    >
                      HTTPS
                    </button>
                    <button
                      onClick={() => setViewMode('websocket')}
                      className={cn(
                        'px-2 py-0.5 text-[11px] font-medium rounded transition-colors',
                        viewMode === 'websocket'
                          ? 'bg-primary/20 text-primary'
                          : 'text-text-secondary hover:bg-sidebar-item-hover/40 hover:text-text-primary',
                      )}
                    >
                      WebSocket
                    </button>
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-input-background border border-border rounded px-2 h-9 min-w-0">
                    <input
                      type="text"
                      placeholder={
                        viewMode === 'https' ? 'Filter requests...' : 'Filter WebSocket frames...'
                      }
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="w-full h-full bg-transparent border-none outline-none text-xs text-text-primary placeholder:text-text-secondary"
                    />
                  </div>
                  {viewMode === 'https' && (
                    <button
                      onClick={onClearRequests}
                      title="Clear all HTTPS requests"
                      aria-label="Clear all HTTPS requests"
                      className="shrink-0 p-2 rounded-md border border-border bg-input-background text-text-secondary hover:bg-error/10 hover:text-error hover:border-error/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Independent content div: RequestTable OR WebSocketUI */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  {viewMode === 'https' ? (
                    <RequestTable
                      hideSearchBar
                      filter={filter}
                      selectedId={selectedId}
                      onSelect={onSetSelectedId}
                      searchTerm={searchTerm}
                      onSearchChange={onSearchChange}
                      interceptedIds={emptySet}
                      pendingActionIds={emptySet}
                      onForward={() => {}}
                      onDrop={() => {}}
                      onDelete={() => {}}
                      appId="emulate-app"
                      onSendToRepeater={onSendToRepeater}
                      onLaunchTarget={onLaunchTarget}
                      onClearRequests={onClearRequests}
                      currentTargetAppId={activeTargetId || undefined}
                      currentTargetUrl={currentTargetUrl}
                      isTargetActive={isTargetActive(activeTargetId)}
                      activeTargetMode={
                        (targetStates[activeTargetId]?.mode as
                          | 'mitm'
                          | 'cdp'
                          | 'frida'
                          | undefined) || null
                      }
                      isInterceptActive={targetStates[activeTargetId]?.isIntercepting || false}
                      onToggleIntercept={onToggleIntercept}
                      onStopTarget={onStopTarget}
                      onStartTarget={onStartTarget}
                      loadMore={loadMore}
                      totalCount={workerTotalCount}
                    />
                  ) : (
                    <WebSocketUI searchTerm={searchTerm} />
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <RequestDetails
                  selectedId={selectedId}
                  searchTerm={searchTerm}
                  filter={filter}
                  onFilterChange={onFilterChange}
                  onSearchTermChange={onSearchChange}
                  onSelectRequest={onSetSelectedId}
                  onSetCompare1={() => {}}
                  onSetCompare2={() => {}}
                  appId="emulate-app"
                  onToggleFilter={onToggleFilter}
                  isFilterOpen={isFilterOpen}
                  targetId={activeTargetId}
                  isSessionRunning={targetStates[activeTargetId]?.isActive || false}
                />
              </div>
            </>
          )}
          {selectedTool === 'repeater' && (
            <div className="flex-1 overflow-hidden">
              <PayloadPanel
                selectedRequestId={fuzzerTargetId}
                targetId={activeTargetId}
                isTargetRunning={targetStates[activeTargetId]?.isActive || false}
              />
            </div>
          )}
          {selectedTool === 'resource' && (
            <div className="flex-1 overflow-hidden">
              <ResourcesPanel />
            </div>
          )}
          {selectedTool === 'source' && (
            <div className="flex-1 overflow-hidden">
              <SourcesPanel unpackedScripts={unpackedScripts} />
            </div>
          )}
          {selectedTool === 'report' && (
            <div className="flex-1 overflow-hidden">
              <ReportPanel targetId={activeTargetId} />
            </div>
          )}
          {selectedTool === 'log' && (
            <div className="flex-1 overflow-hidden">
              <LogViewer />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default memo(WorkspacePanel);