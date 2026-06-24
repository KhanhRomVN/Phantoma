import React, { useRef, useEffect } from 'react';
import {
  Search,
  ArrowLeft,
  Eye,
  Trash2,
  Copy,
  Clock,
  Activity,
  Database,
  Globe,
  FileText,
} from 'lucide-react';
import { AmassScanResult, ContextMenuState, TooltipState } from '../types';
import { groupHistoryByDate } from '../utils';
import ScanCard from '../components/ScanCard';
import ResultsTable from '../components/ResultsTable';

export interface ExportButtonConfig {
  label: string;
  onClick: () => void;
  title?: string;
  icon?: string;
}

interface ExportButtonsProps {
  buttons: ExportButtonConfig[];
  accentColor: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ buttons, accentColor }) => {
  const buttonStyle = {
    background: 'rgb(var(--card-background))',
    border: `1px solid ${accentColor}30`,
    color: accentColor,
  };

  return (
    <div className="flex gap-2">
      {buttons.map((btn, idx) => (
        <button
          key={idx}
          onClick={btn.onClick}
          className="px-3 py-1.5 rounded text-[11px] font-bold font-inherit cursor-pointer transition-all hover:opacity-80"
          style={buttonStyle}
          title={btn.title}
        >
          {btn.icon && <span className="mr-1">{btn.icon}</span>}
          {btn.label}
        </button>
      ))}
    </div>
  );
};

interface HistoryTabProps {
  history: AmassScanResult[];
  filteredHistory: AmassScanResult[];
  expandedCardIndex: number | null;
  setExpandedCardIndex: React.Dispatch<React.SetStateAction<number | null>>;
  historySearchQuery: string;
  setHistorySearchQuery: React.Dispatch<React.SetStateAction<string>>;
  showDetailView: boolean;
  setShowDetailView: React.Dispatch<React.SetStateAction<boolean>>;
  selectedScanForDetail: AmassScanResult | null;
  setSelectedScanForDetail: React.Dispatch<React.SetStateAction<AmassScanResult | null>>;
  onDeleteScan: (scan: AmassScanResult) => void;
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
  onTooltipShow,
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

  const handleContextMenu = (e: React.MouseEvent, scan: AmassScanResult) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenuChange({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      scan: scan,
    });
  };

  const handleViewDetails = (scan: AmassScanResult) => {
    setSelectedScanForDetail(scan);
    setShowDetailView(true);
    onContextMenuChange(null);
  };

  const renderFullDetail = () => {
    if (!selectedScanForDetail) return null;
    const scan = selectedScanForDetail;

    return (
      <div className="flex flex-col gap-4">
        {/* Header with Back button */}
        <div className="flex justify-start items-center gap-3">
          <button
            onClick={() => {
              setShowDetailView(false);
              setSelectedScanForDetail(null);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-card-background text-[11px] font-bold cursor-pointer font-inherit"
            style={{ border: `1px solid ${accentColor}30`, color: accentColor }}
          >
            <ArrowLeft size={14} />
            BACK TO HISTORY
          </button>
          <ExportButtons scan={scan} accentColor={accentColor} />
        </div>

        {/* Scan Header */}
        <div
          className="p-4 rounded-md bg-card-background"
          style={{ border: `1px solid ${accentColor}30` }}
        >
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="m-0 text-base text-text-primary">{scan.target}</h3>
              <p className="m-0 mt-1 text-[11px] text-text-secondary">
                {scan.mode} • {scan.duration}
              </p>
            </div>
            <span
              className="px-3 py-1 rounded text-[11px] font-bold bg-border"
              style={{ color: '#34d399' }}
            >
              {new Date(scan.timestamp).toLocaleString()}
            </span>
          </div>

          <div
            className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 mt-3 pt-3"
            style={{ borderTop: `1px solid ${accentColor}20` }}
          >
            <div className="flex items-center gap-2">
              <Clock size={14} color={accentColor} />
              <div>
                <div className="text-[10px] text-text-secondary">Duration</div>
                <div className="text-[12px] text-text-primary">{scan.duration}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Database size={14} color={accentColor} />
              <div>
                <div className="text-[10px] text-text-secondary">Subdomains</div>
                <div className="text-[12px] text-text-primary">{scan.subdomains.length}</div>
              </div>
            </div>
            {scan.stats && (
              <div className="flex items-center gap-2">
                <Activity size={14} color={accentColor} />
                <div>
                  <div className="text-[10px] text-text-secondary">Unique</div>
                  <div className="text-[12px] text-text-primary">{scan.stats.unique}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subdomains Table */}
        <div
          className="p-4 rounded-md bg-card-background"
          style={{ border: `1px solid ${accentColor}30` }}
        >
          <h4 className="m-0 mb-3 text-[13px] flex items-center gap-2 text-text-primary">
            <Globe size={14} className="text-text-secondary" /> SUBDOMAINS FOUND (
            {scan.subdomains.length})
          </h4>
          <ResultsTable subdomains={scan.subdomains} accentColor={accentColor} />
        </div>

        {/* Raw Output */}
        <div
          className="p-4 rounded-md bg-card-background"
          style={{ border: `1px solid ${accentColor}30` }}
        >
          <div className="flex justify-between items-center mb-3">
            <h4 className="m-0 text-[13px] flex items-center gap-2 text-text-primary">
              <FileText size={14} className="text-text-secondary" /> RAW OUTPUT
            </h4>
            <button
              onClick={() => navigator.clipboard.writeText(scan.rawOutput.join('\n'))}
              className="p-1.5 rounded flex items-center justify-center cursor-pointer bg-border"
              style={{ border: `1px solid ${accentColor}30`, color: accentColor }}
              title="Copy to clipboard"
            >
              <Copy size={14} />
            </button>
          </div>
          <div className="text-[10px] font-mono bg-input-background p-3 rounded max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words">
            {scan.rawOutput.map((line, i) => {
              let color = 'var(--text-secondary)';
              if (line.includes('[INF]')) color = '#34d399';
              else if (line.includes('[ERR]')) color = '#ef4444';
              else if (line.includes('[WRN]')) color = '#fbbf24';
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
      style={{ maxHeight: 'calc(100vh - 300px)' }}
    >
      {/* Search Bar */}
      <div className="relative mb-2">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
        />
        <input
          type="text"
          value={historySearchQuery}
          onChange={(e) => setHistorySearchQuery(e.target.value)}
          placeholder="Search by target, mode, or subdomain..."
          className="w-full py-2 px-3 pl-8 bg-input-background rounded text-text-primary text-[11px] outline-none font-inherit"
          style={{
            border: `1px solid ${historySearchQuery ? accentColor + '50' : 'var(--input-border-default)'}`,
          }}
        />
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-10 text-text-secondary text-xs">
          {history.length === 0
            ? 'No scan history yet. Run a scan to see results here.'
            : 'No matching scans found.'}
        </div>
      ) : (
        Object.entries(groupedHistory).map(([dateLabel, scans]) => (
          <div key={dateLabel}>
            <div
              className="text-[11px] font-bold py-2 pb-1 mb-2"
              style={{
                color: accentColor,
                letterSpacing: '0.1em',
                borderBottom: `1px solid ${accentColor}30`,
              }}
            >
              {dateLabel}
            </div>
            {scans.map((scan, idx) => {
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

      {/* Context Menu */}
      {contextMenu?.visible && contextMenu.scan && (
        <div
          className="fixed rounded-md shadow-lg z-[1000] min-w-[160px] overflow-hidden"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--dropdown-background)',
            border: `1px solid ${accentColor}50`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleViewDetails(contextMenu.scan!)}
            className="w-full px-4 py-2.5 bg-transparent border-none text-left cursor-pointer font-inherit transition-colors duration-150 flex items-center gap-2 text-xs font-bold"
            style={{ color: accentColor }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${accentColor}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Eye size={14} /> View Details
          </button>
          <button
            onClick={() => {
              onDeleteScan(contextMenu.scan!);
              onContextMenuChange(null);
            }}
            className="w-full px-4 py-2.5 bg-transparent border-none border-t border-[#ef4444]/20 text-left cursor-pointer font-inherit transition-colors duration-150 flex items-center gap-2 text-xs font-bold text-red-500"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef444410';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
