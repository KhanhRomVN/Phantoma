import React from 'react';
import { ScanResult } from '../types';
import { stateColor } from '../utils';
import PortsTable from './PortsTable';
import { $ } from '@renderer/utils/color';

interface ScanCardProps {
  scan: ScanResult;
  globalIdx: number;
  isExpanded: boolean;
  onToggle: () => void;
  onContextMenu: (e: React.MouseEvent, scan: ScanResult) => void;
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
  const openPorts = scan.ports.filter((p) => p.state === 'open');

  return (
    <div
      className={`rounded-md transition-all mb-2 cursor-pointer bg-card-background ${isExpanded ? 'border border-border' : ''}`}
      style={{
        border: !isExpanded ? `1px solid ${$('--border') || ''}` : undefined,
      }}
      onContextMenu={(e) => onContextMenu(e, scan)}
    >
      <div
        className="p-3 flex justify-between items-center gap-3 flex-wrap"
        onClick={onToggle}
      >
        <div className="flex flex-col gap-1 flex-[2]">
          <div className="flex items-center gap-2">
            {(() => {
              // Check if target is a domain (not an IP address)
              const isDomain = !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(scan.target) && 
                               !scan.target.includes('/') &&
                               scan.target.includes('.');
              const faviconUrl = isDomain ? `https://www.google.com/s2/favicons?domain=${scan.target}&sz=16` : null;
              
              return faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt="favicon"
                  className="w-4 h-4 rounded-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null;
            })()}
            <span className="text-[13px] font-bold text-text-primary">
              {scan.target}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded text-text-secondary bg-border">
              {scan.scanType}
            </span>
          </div>
          <div className="text-xs pl-5 text-text-primary">
            {formatDate(scan.timestamp)}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-5 items-center">
          <div>
            <span className="text-[10px] block text-text-secondary">
              Duration
            </span>
            <span className="text-[11px] text-text-secondary">
              {scan.duration}
            </span>
          </div>
          <div>
            <span className="text-[10px] block text-text-secondary">
              Open Ports
            </span>
            <span className="text-[11px] text-primary">
              {openPorts.length}
            </span>
          </div>
          <div>
            <span className="text-[10px] block text-text-secondary">
              Total Ports
            </span>
            <span className="text-[11px] text-text-secondary">
              {scan.ports.length}
            </span>
          </div>
          {scan.host?.os && (
            <div>
              <span className="text-[10px] block text-text-secondary">
                OS
              </span>
              <span className="text-[11px] text-text-secondary">
                {scan.host.os.substring(0, 20)}
              </span>
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div
          className="pt-3 px-4 pb-4"
          style={{
            borderTop: `1px solid ${accentColor}30`,
            background: $('--input-background'),
          }}
        >
          <div className="mb-3">
            <div
              className="text-[11px] font-bold mb-2 tracking-wide text-text-primary"
            >
              OPEN PORTS
            </div>
            <PortsTable ports={scan.ports} accentColor={accentColor} />
          </div>

          {scan.host && (
            <div className="mb-3">
              <div className="text-[11px] font-bold mb-2 tracking-wide text-text-primary">
                HOST INFORMATION
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                {scan.host.ip && (
                  <div>
                    <span className="text-text-secondary">IP:</span>{' '}
                    <span className="text-text-secondary">{scan.host.ip}</span>
                  </div>
                )}
                {scan.host.hostname && (
                  <div>
                    <span className="text-text-secondary">Hostname:</span>{' '}
                    <span className="text-text-secondary">{scan.host.hostname}</span>
                  </div>
                )}
                {scan.host.os && (
                  <div>
                    <span className="text-text-secondary">OS:</span>{' '}
                    <span className="text-text-secondary">{scan.host.os}</span>
                  </div>
                )}
                {scan.host.uptime && (
                  <div>
                    <span className="text-text-secondary">Uptime:</span>{' '}
                    <span className="text-text-secondary">{scan.host.uptime}</span>
                  </div>
                )}
                {scan.host.mac && (
                  <div>
                    <span className="text-text-secondary">MAC:</span>{' '}
                    <span className="text-text-secondary">{scan.host.mac}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {scan.scripts && scan.scripts.length > 0 && (
            <div className="mb-3">
              <div className="text-[11px] font-bold mb-2 tracking-wide text-text-primary">
                NSE SCRIPTS ({scan.scripts.length})
              </div>
              <div className="max-h-[150px] overflow-y-auto text-[10px] font-mono text-text-secondary">
                {scan.scripts.map((s, i) => (
                  <div key={i} className="mb-1">
                    <span style={{ color: accentColor }}>{s.name}:</span>{' '}
                    {s.output.substring(0, 100)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-bold mb-2 tracking-wide text-text-primary">
              RAW OUTPUT (first 10 lines)
            </div>
            <div className="text-[10px] font-mono p-2 rounded max-h-[150px] overflow-y-auto text-text-secondary bg-card-background">
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