import React from 'react';
import { AmassScanResult } from '../types';

interface ScanCardProps {
  scan: AmassScanResult;
  globalIdx: number;
  isExpanded: boolean;
  onToggle: () => void;
  onContextMenu: (e: React.MouseEvent, scan: AmassScanResult) => void;
  accentColor: string;
  glow: string;
}

const formatDate = (timestamp: number): string => {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
};

const ScanCard: React.FC<ScanCardProps> = ({
  scan,
  globalIdx,
  isExpanded,
  onToggle,
  onContextMenu,
  accentColor,
  glow,
}) => {
  const uniqueSubdomains = scan.subdomains.length;
  
  return (
    <div
      className="rounded-md transition-all mb-2 bg-card-background"
      style={{
        border: `1px solid ${isExpanded ? accentColor : 'var(--border)'}`,
      }}
      onContextMenu={(e) => onContextMenu(e, scan)}
    >
      <div
        className="p-3 cursor-pointer flex justify-between items-center gap-3 flex-wrap"
        onClick={onToggle}
      >
        <div className="flex flex-col gap-1 flex-[2]">
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: scan.status === 'completed' ? '#34d399' : '#ef4444',
                boxShadow: scan.status === 'completed' ? '0 0 6px #34d399' : 'none',
              }}
            />
            <span className="text-[13px] font-bold text-text-primary">
              {scan.target}
            </span>
            <span
              className="text-[11px] px-2 py-0.5 rounded bg-border text-text-secondary"
            >
              {scan.mode.toUpperCase()}
            </span>
          </div>
          <div className="text-[10px] text-text-secondary pl-5">
            {formatDate(scan.timestamp)}
          </div>
        </div>
        
        <div
          className="grid grid-cols-3 gap-5 items-center"
        >
          <div>
            <span className="text-[10px] block text-text-secondary">Duration</span>
            <span className="text-[11px] text-text-secondary">{scan.duration}</span>
          </div>
          <div>
            <span className="text-[10px] block text-text-secondary">Subdomains</span>
            <span className="text-[11px] text-[#34d399]">{uniqueSubdomains}</span>
          </div>
          {scan.stats && (
            <div>
              <span className="text-[10px] block text-text-secondary">Unique</span>
              <span className="text-[11px] text-text-secondary">{scan.stats.unique}</span>
            </div>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div
          className="pt-3 px-4 pb-4 bg-input-background"
          style={{
            borderTop: `1px solid ${accentColor}30`,
          }}
        >
          {/* Subdomains list */}
          <div className="mb-3">
            <div
              className="text-[11px] font-bold mb-2 tracking-wide text-text-primary"
            >
              SUBDOMAINS FOUND ({uniqueSubdomains})
            </div>
            <div
              className="max-h-[200px] overflow-y-auto text-[11px] font-mono bg-card-background p-2 rounded"
            >
              {scan.subdomains.slice(0, 50).map((sub, i) => (
                <div key={i} className="mb-1" style={{ color: accentColor }}>
                  {sub.name}
                  {sub.source && <span className="text-text-secondary text-[10px]"> ({sub.source})</span>}
                </div>
              ))}
              {scan.subdomains.length > 50 && (
                <div className="text-text-secondary mt-1">
                  ... and {scan.subdomains.length - 50} more
                </div>
              )}
            </div>
          </div>
          
          {/* Stats */}
          {scan.stats && (
            <div className="mb-3">
              <div
                className="text-[11px] font-bold mb-2 tracking-wide text-text-primary"
              >
                STATISTICS
              </div>
              <div
                className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2"
              >
                <div><span className="text-text-secondary">Total:</span> <span className="text-text-secondary">{scan.stats.total}</span></div>
                <div><span className="text-text-secondary">Unique:</span> <span className="text-text-secondary">{scan.stats.unique}</span></div>
                {scan.stats.fromPassive !== undefined && (
                  <div><span className="text-text-secondary">Passive:</span> <span className="text-text-secondary">{scan.stats.fromPassive}</span></div>
                )}
                {scan.stats.fromActive !== undefined && (
                  <div><span className="text-text-secondary">Active:</span> <span className="text-text-secondary">{scan.stats.fromActive}</span></div>
                )}
              </div>
            </div>
          )}
          
          {/* Sources used */}
          {scan.sourcesUsed && scan.sourcesUsed.length > 0 && (
            <div className="mb-3">
              <div
                className="text-[11px] font-bold mb-2 tracking-wide text-text-primary"
              >
                DATA SOURCES ({scan.sourcesUsed.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scan.sourcesUsed.slice(0, 15).map((src, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-border text-text-secondary"
                  >
                    {src}
                  </span>
                ))}
                {scan.sourcesUsed.length > 15 && (
                  <span className="text-[10px] text-text-secondary">
                    +{scan.sourcesUsed.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Raw output (first 10 lines) */}
          <div>
            <div
              className="text-[11px] font-bold mb-2 tracking-wide text-text-primary"
            >
              RAW OUTPUT (first 10 lines)
            </div>
            <div
              className="text-[10px] font-mono bg-card-background p-2 rounded max-h-[150px] overflow-y-auto text-text-secondary"
            >
              {scan.rawOutput.slice(0, 10).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {scan.rawOutput.length > 10 && (
                <div>... and {scan.rawOutput.length - 10} more lines</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanCard;