import React, { useRef, useEffect } from 'react';
import { Search, ArrowLeft, Eye, Trash2, Copy, Activity, MapPin, Bug, Radio, FileText } from 'lucide-react';
import { ScanResult, ContextMenuState, TooltipState } from '../types';
import { groupHistoryByDate, getReputationColor, getReputationIcon } from '../utils';
import { REPUTATION_LABELS } from '../constants';
import IndicatorCard from '../components/IndicatorCard';


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
  onTooltipShow,
}) => {
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const groupedHistory = groupHistoryByDate(filteredHistory);

  // Close context menu when clicking elsewhere
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
    const result = scan.result;
    const reputationColor = result ? getReputationColor(result.reputation) : '#64748b';
    const reputationIcon = result ? getReputationIcon(result.reputation) : '?';
    const reputationLabel = result ? REPUTATION_LABELS[result.reputation] : 'UNKNOWN';

    return (
      <div className="flex flex-col gap-4">
        {/* Header with Back button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            onClick={() => {
              setShowDetailView(false);
              setSelectedScanForDetail(null);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-card-background text-[11px] font-bold cursor-pointer"
            style={{
              border: `1px solid ${accentColor}30`,
              color: accentColor,
            }}
          >
            <ArrowLeft size={14} />
            BACK TO HISTORY
          </button>
        </div>

        {/* Scan Header */}
        <div className="p-4 rounded-md bg-card-background" style={{ border: `1px solid ${accentColor}30` }}>
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="m-0 text-base text-text-primary">{scan.indicator}</h3>
              <p className="m-0 mt-1 text-[11px] text-text-secondary">
                {scan.indicatorType.toUpperCase()} • {scan.duration}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <span className="px-3 py-1 rounded text-[11px] bg-border text-text-secondary">
                {new Date(scan.timestamp).toLocaleString()}
              </span>
              <span
                className="px-3 py-1 rounded text-[11px] font-bold"
                style={{
                  background: `${reputationColor}20`,
                  border: `1px solid ${reputationColor}50`,
                  color: reputationColor,
                }}
              >
                {reputationIcon} {reputationLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Reputation & Basic Info */}
        {result && (
          <>
            <div className="p-4 rounded-md bg-card-background" style={{ border: `1px solid ${accentColor}30` }}>
              <h4 className="m-0 mb-3 text-[13px] flex items-center gap-2 text-text-primary">
                <Activity size={14} className="text-text-secondary" /> REPUTATION & ACTIVITY
              </h4>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                <div>
                  <span className="text-text-secondary">Reputation:</span>{' '}
                  <span className="font-bold" style={{ color: reputationColor }}>{reputationLabel}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Activity Count:</span>{' '}
                  <span className="text-text-primary">{result.activityCount}</span>
                </div>
                <div>
                  <span className="text-text-secondary">First Seen:</span>{' '}
                  <span className="text-text-primary">{result.firstSeen || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Last Seen:</span>{' '}
                  <span className="text-text-primary">{result.lastSeen || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Geo Location */}
            {result.geoData && (
              <div className="p-4 rounded-md bg-card-background" style={{ border: `1px solid ${accentColor}30` }}>
                <h4 className="m-0 mb-3 text-[13px] flex items-center gap-2 text-text-primary">
                  <MapPin size={14} className="text-text-secondary" /> GEO LOCATION
                </h4>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                  <div>
                    <span className="text-text-secondary">Country:</span>{' '}
                    <span className="text-text-primary">{result.geoData.country} ({result.geoData.countryCode})</span>
                  </div>
                  {result.geoData.city && (
                    <div>
                      <span className="text-text-secondary">City:</span>{' '}
                      <span className="text-text-primary">{result.geoData.city}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Malware Families */}
            {result.malwareFamilies && result.malwareFamilies.length > 0 && (
              <div className="p-4 rounded-md bg-card-background" style={{ border: `1px solid ${accentColor}30` }}>
                <h4 className="m-0 mb-3 text-[13px] flex items-center gap-2 text-text-primary">
                  <Bug size={14} className="text-text-secondary" /> MALWARE FAMILIES
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.malwareFamilies.map((family, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded text-[11px] font-bold"
                      style={{
                        background: '#ef444420',
                        border: '1px solid #ef444450',
                        color: '#ef4444',
                      }}
                    >
                      {family}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pulses */}
            {result.pulses && result.pulses.length > 0 && (
              <div className="p-4 rounded-md bg-card-background" style={{ border: `1px solid ${accentColor}30` }}>
                <h4 className="m-0 mb-3 text-[13px] flex items-center gap-2 text-text-primary">
                  <Radio size={14} className="text-text-secondary" /> RELATED PULSES
                </h4>
                <div className="max-h-[400px] overflow-y-auto">
                  {result.pulses.map((pulse, i) => (
                    <div
                      key={i}
                      className="p-3 rounded mb-2 bg-input-background"
                      style={{ border: `1px solid ${accentColor}20` }}
                    >
                      <div className="flex justify-between mb-1.5">
                        <span className="font-bold" style={{ color: accentColor }}>{pulse.name}</span>
                        <span className="text-[10px] text-text-secondary">
                          {new Date(pulse.modified).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-primary mb-2">
                        {pulse.description}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pulse.tags.map((tag, j) => (
                          <span
                            key={j}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-border text-text-secondary"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Raw Output */}
        <div className="p-4 rounded-md bg-card-background" style={{ border: `1px solid ${accentColor}30` }}>
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
          <div className="text-[10px] font-mono bg-input-background p-3 rounded max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words">
            {scan.rawOutput.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
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
          placeholder="Search by indicator, type, malware family, or pulse name..."
          className="w-full py-2 px-3 pl-8 bg-input-background rounded text-text-primary text-[11px] outline-none font-inherit"
          style={{
            border: `1px solid ${historySearchQuery ? `${accentColor}50` : 'var(--input-border-default)'}`,
          }}
        />
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-10 text-text-secondary text-xs">
          {history.length === 0
            ? 'No lookup history yet. Run a lookup to see results here.'
            : 'No matching lookups found.'}
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
                <IndicatorCard
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
            <Eye size={14} />
            View Details
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
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;