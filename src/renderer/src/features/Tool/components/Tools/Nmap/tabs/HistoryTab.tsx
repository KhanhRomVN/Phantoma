import React, { useRef, useEffect } from 'react';
import {
  Search,
  ArrowLeft,
  Eye,
  Trash2,
  Copy,
  Clock,
  Activity,
  Network,
  Shield,
  Server,
  FileText,
} from 'lucide-react';
import { ScanResult, ContextMenuState, TooltipState } from '../types';
import { groupHistoryByDate } from '../utils';
import ScanCard from '../components/ScanCard';
import PortsTable from '../components/PortsTable';

import { parseNmapXML, formatDuration } from '../nmapParser';

interface HistoryTabProps {
  history: ScanResult[];
  filteredHistory: ScanResult[];
  expandedCardIndex: number | null;
  setExpandedCardIndex: React.Dispatch<React.SetStateAction<number | null>>;
  historySearchQuery: string;
  setHistorySearchQuery: React.Dispatch<React.SetStateAction<string>>;
  showDetailView: boolean;
  setShowDetailView: React.Dispatch<React.SetStateAction<boolean>>;
  selectedScanForDetail: ScanResult | null;
  setSelectedScanForDetail: React.Dispatch<React.SetStateAction<ScanResult | null>>;
  onDeleteScan: (scan: ScanResult) => void;
  onContextMenuChange: (contextMenu: ContextMenuState | null) => void;
  contextMenu: ContextMenuState | null;
  accentColor: string;
  glow: string;
  onTooltipShow: (tooltip: TooltipState | null) => void;
}

const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  filteredHistory,
  expandedCardIndex,
  setExpandedCardIndex,
  historySearchQuery,
  setHistorySearchQuery,
  showDetailView,
  setShowDetailView,
  selectedScanForDetail,
  setSelectedScanForDetail,
  onDeleteScan,
  onContextMenuChange,
  contextMenu,
  accentColor,
  glow,
}) => {
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const groupedHistory = groupHistoryByDate(filteredHistory);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu?.visible) {
        onContextMenuChange(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu, onContextMenuChange]);

  const handleContextMenu = (e: React.MouseEvent, scan: ScanResult) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenuChange({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      scan: scan,
    });
  };

  const handleViewDetails = (scan: ScanResult) => {
    setSelectedScanForDetail(scan);
    setShowDetailView(true);
    onContextMenuChange(null);
  };

  const renderFullDetail = () => {
    if (!selectedScanForDetail) return null;
    const scan = selectedScanForDetail;

    const rawXml = scan.rawOutput.join('\n');
    const parsedData = parseNmapXML(rawXml);

    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-start items-center gap-3">
          <button
            onClick={() => {
              setShowDetailView(false);
              setSelectedScanForDetail(null);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-bold cursor-pointer font-inherit"
            style={{
              background: 'var(--card-background)',
              border: `1px solid ${accentColor}30`,
              color: accentColor,
            }}
          >
            <ArrowLeft size={14} />
            BACK TO HISTORY
          </button>
        </div>

        <div
          className="p-4 rounded-md"
          style={{
            background: 'var(--card-background)',
            border: `1px solid ${accentColor}30`,
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="m-0 text-base text-text-primary">
                {scan.target}
              </h3>
              <p className="m-0 mt-1 text-[11px] text-text-secondary">
                {scan.scanType} • {scan.duration}
              </p>
            </div>
            <span
              className="px-3 py-1 rounded text-[11px] font-bold bg-border text-primary"
            >
              {new Date(scan.timestamp).toLocaleString()}
            </span>
          </div>

          {parsedData && (
            <div
              className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 mt-3 pt-3"
              style={{ borderTop: `1px solid ${accentColor}20` }}
            >
              <div className="flex items-center gap-2">
                <Clock size={14} color={accentColor} />
                <div>
                  <div className="text-[10px] text-text-secondary">Duration</div>
                  <div className="text-[12px] text-text-primary">
                    {formatDuration(parsedData.duration)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Activity size={14} color={accentColor} />
                <div>
                  <div className="text-[10px] text-text-secondary">Ports</div>
                  <div className="text-[12px] text-text-primary">
                    {parsedData.stats.openPorts} open / {parsedData.stats.filteredPorts} filtered
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Network size={14} color={accentColor} />
                <div>
                  <div className="text-[10px] text-text-secondary">Command</div>
                  <div className="text-[10px] font-mono text-text-primary">
                    {parsedData.args.substring(0, 60)}...
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="p-4 rounded-md bg-card-background"
          style={{
            border: `1px solid ${accentColor}30`,
          }}
        >
          <h4 className="m-0 mb-3 text-[13px] flex items-center gap-2 text-text-primary">
            <Server size={14} className="text-text-secondary" /> HOST INFORMATION
          </h4>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
            {parsedData ? (
              <>
                <div>
                  <span className="text-text-secondary">IP:</span>{' '}
                  <span className="text-text-primary">{parsedData.host.ip}</span>
                </div>
                {parsedData.host.hostname && (
                  <div>
                    <span className="text-text-secondary">Hostname:</span>{' '}
                    <span className="text-text-primary">{parsedData.host.hostname}</span>
                  </div>
                )}
                {parsedData.host.os && (
                  <div>
                    <span className="text-text-secondary">OS:</span>{' '}
                    <span className="text-text-primary">{parsedData.host.os}</span>
                  </div>
                )}
                {parsedData.host.uptime && (
                  <div>
                    <span className="text-text-secondary">Uptime:</span>{' '}
                    <span className="text-text-primary">
                      {formatDuration(parsedData.host.uptime)}
                    </span>
                  </div>
                )}
                {parsedData.host.mac && (
                  <div>
                    <span className="text-text-secondary">MAC:</span>{' '}
                    <span className="text-text-primary">{parsedData.host.mac}</span>
                  </div>
                )}
                <div>
                  <span className="text-text-secondary">Status:</span>{' '}
                  <span style={{ color: parsedData.host.status === 'up' ? 'rgb(var(--primary))' : 'rgb(var(--error))' }}>
                    {parsedData.host.status.toUpperCase()}
                  </span>
                </div>
              </>
            ) : (
              <>
                {scan.host?.ip && (
                  <div>
                    <span className="text-text-secondary">IP:</span>{' '}
                    <span className="text-text-primary">{scan.host.ip}</span>
                  </div>
                )}
                {scan.host?.hostname && (
                  <div>
                    <span className="text-text-secondary">Hostname:</span>{' '}
                    <span className="text-text-primary">{scan.host.hostname}</span>
                  </div>
                )}
                {scan.host?.os && (
                  <div>
                    <span className="text-text-secondary">OS:</span>{' '}
                    <span className="text-text-primary">{scan.host.os}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div
          className="p-4 rounded-md bg-card-background"
          style={{
            border: `1px solid ${accentColor}30`,
          }}
        >
          <h4 className="m-0 mb-3 text-[13px] flex items-center gap-2 text-text-primary">
            <Shield size={14} className="text-text-secondary" /> PORTS SCANNED (
            {scan.ports.length} total, {scan.ports.filter((p) => p.state === 'open').length} open)
          </h4>
          <PortsTable ports={scan.ports} accentColor={accentColor} showRisk={true} />
        </div>

        <div
          className="p-4 rounded-md bg-card-background"
          style={{
            border: `1px solid ${accentColor}30`,
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <h4 className="m-0 text-[13px] flex items-center gap-2 text-text-primary">
              <FileText size={14} className="text-text-secondary" /> RAW OUTPUT (XML)
            </h4>
            <button
              onClick={() => navigator.clipboard.writeText(scan.rawOutput.join('\n'))}
              className="p-1.5 rounded flex items-center justify-center cursor-pointer bg-border"
              style={{
                border: `1px solid ${accentColor}30`,
                color: accentColor,
              }}
              title="Copy to clipboard"
            >
              <Copy size={14} />
            </button>
          </div>
          <div
            className="text-[10px] font-mono p-3 rounded max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words text-text-primary bg-background"
          >
            {scan.rawOutput.map((line, i) => {
              let color = 'var(--text-secondary)';
              if (line.startsWith('<?xml') || line.startsWith('<!DOCTYPE')) color = 'rgb(var(--warning))';
              else if (line.includes('<nmaprun') || line.includes('</nmaprun>')) color = 'rgb(var(--primary))';
              else if (line.includes('<host') || line.includes('</host>')) color = 'rgb(var(--info))';
              else if (line.includes('<port') || line.includes('</port>')) color = 'rgb(var(--accent))';
              else if (line.includes('<service')) color = 'rgb(var(--highlight))';
              else if (line.includes('state="open"')) color = 'rgb(var(--primary))';
              else if (line.includes('state="filtered"')) color = 'rgb(var(--warning))';
              else if (line.includes('state="closed"')) color = 'rgb(var(--error))';
              else if (line.startsWith('<!--')) color = 'var(--text-secondary)';
              return (
                <div key={i} style={{ color, whiteSpace: 'pre-wrap' }}>
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (showDetailView && selectedScanForDetail) {
    return renderFullDetail();
  }

  return (
    <div
      ref={historyContainerRef}
      className="flex flex-col gap-3 overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 180px)' }}
    >
      <div className="relative mb-2">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary"
        />
        <input
          type="text"
          value={historySearchQuery}
          onChange={(e) => setHistorySearchQuery(e.target.value)}
          placeholder="Search by target, scan type, port, or service..."
          className="w-full py-3 pl-9 pr-3 rounded text-[12px] outline-none font-inherit bg-input-background text-text-primary placeholder:text-text-secondary border border-border"
          style={{
            borderColor: historySearchQuery ? accentColor + '50' : undefined,
          }}
        />
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center p-10 text-[12px] text-text-secondary">
          {history.length === 0
            ? 'No scan history yet. Run a scan to see results here.'
            : 'No matching scans found.'}
        </div>
      ) : (
        Object.entries(groupedHistory).map(([dateLabel, scans]) => (
          <div key={dateLabel}>
            <div
              className="text-sm font-bold tracking-wide pt-2 pb-1 mb-2 text-text-primary"
              style={{
                borderBottom: `1px solid ${accentColor}30`,
              }}
            >
              {dateLabel}
            </div>
            {scans.map((scan) => {
              const globalIdx = history.findIndex((h) => h.timestamp === scan.timestamp);
              const isExpanded = expandedCardIndex === globalIdx;
              return (
                <ScanCard
                  key={globalIdx}
                  scan={scan}
                  globalIdx={globalIdx}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedCardIndex(isExpanded ? null : globalIdx)}
                  onContextMenu={handleContextMenu}
                  accentColor={accentColor}
                  glow={glow}
                />
              );
            })}
          </div>
        ))
      )}

      {contextMenu?.visible && contextMenu.scan && (
        <div
          className="fixed z-[1000] min-w-[160px] overflow-hidden rounded-md border border-border shadow-lg"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'rgb(10, 15, 25)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleViewDetails(contextMenu.scan!)}
            className="w-full px-4 py-2.5 bg-transparent border-none text-[12px] font-bold text-left cursor-pointer font-inherit transition-colors flex items-center gap-2"
            style={{ color: accentColor }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${accentColor}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Eye size={14} />
            View Details
          </button>
          <button
            onClick={() => {
              onDeleteScan(contextMenu.scan!);
            }}
            className="w-full px-4 py-2.5 bg-transparent border-none text-[12px] font-bold text-left cursor-pointer font-inherit transition-colors flex items-center gap-2"
            style={{
              borderTop: `1px solid ${accentColor}20`,
              color: 'rgb(var(--error))',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgb(var(--error) / 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;