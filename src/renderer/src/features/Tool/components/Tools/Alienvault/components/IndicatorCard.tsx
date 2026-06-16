import React from 'react';
import { ScanResult, IndicatorResult } from '../types';
import { getReputationColor, getReputationIcon } from '../utils';
import { REPUTATION_LABELS } from '../constants';

interface IndicatorCardProps {
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

const IndicatorCard: React.FC<IndicatorCardProps> = ({
  scan,
  globalIdx,
  isExpanded,
  onToggle,
  onContextMenu,
  accentColor,
  glow,
}) => {
  const result = scan.result;
  const reputationColor = result ? getReputationColor(result.reputation) : '#64748b';
  const reputationIcon = result ? getReputationIcon(result.reputation) : '?';
  const reputationLabel = result ? REPUTATION_LABELS[result.reputation] : 'UNKNOWN';

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
                background: reputationColor,
                boxShadow: `0 0 6px ${reputationColor}`,
              }}
            />
            <span className="text-[13px] font-bold text-text-primary">
              {scan.indicator}
            </span>
            <span
              className="text-[11px] px-2 py-0.5 rounded bg-border text-text-secondary"
            >
              {scan.indicatorType.toUpperCase()}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-bold"
              style={{
                color: reputationColor,
                background: `${reputationColor}20`,
              }}
            >
              {reputationIcon} {reputationLabel}
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
            <span className="text-[10px] block text-text-secondary">Pulses</span>
            <span className="text-[11px] text-text-secondary">{result?.pulses?.length || 0}</span>
          </div>
          <div>
            <span className="text-[10px] block text-text-secondary">Malware Families</span>
            <span className="text-[11px] text-text-secondary">{result?.malwareFamilies?.length || 0}</span>
          </div>
          <div>
            <span className="text-[10px] block text-text-secondary">Related IOCs</span>
            <span className="text-[11px] text-text-secondary">{result?.relatedIndicators || 0}</span>
          </div>
        </div>
      </div>

      {isExpanded && result && (
        <div
          className="pt-3 px-4 pb-4 bg-input-background"
          style={{
            borderTop: `1px solid ${accentColor}30`,
          }}
        >
          {/* Reputation & Basic Info */}
          <div className="mb-3">
            <div
              className="text-[11px] font-bold mb-2 tracking-wide"
              style={{ color: accentColor }}
            >
              REPUTATION & ACTIVITY
            </div>
            <div
              className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2"
            >
              <div>
                <span className="text-text-secondary">Reputation:</span>{' '}
                <span className="font-bold" style={{ color: reputationColor }}>{reputationLabel}</span>
              </div>
              <div>
                <span className="text-text-secondary">Activity Count:</span>{' '}
                <span className="text-text-secondary">{result.activityCount}</span>
              </div>
              <div>
                <span className="text-text-secondary">First Seen:</span>{' '}
                <span className="text-text-secondary">{result.firstSeen || 'N/A'}</span>
              </div>
              <div>
                <span className="text-text-secondary">Last Seen:</span>{' '}
                <span className="text-text-secondary">{result.lastSeen || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Geo Location (for IP) */}
          {result.geoData && (
            <div className="mb-3">
              <div
                className="text-[11px] font-bold mb-2 tracking-wide text-text-primary"
              >
                GEO LOCATION
              </div>
              <div
                className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2"
              >
                <div>
                  <span className="text-text-secondary">Country:</span>{' '}
                  <span className="text-text-secondary">{result.geoData.country} ({result.geoData.countryCode})</span>
                </div>
                {result.geoData.city && (
                  <div>
                    <span className="text-text-secondary">City:</span>{' '}
                    <span className="text-text-secondary">{result.geoData.city}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Malware Families */}
          {result.malwareFamilies && result.malwareFamilies.length > 0 && (
            <div className="mb-3">
              <div
                className="text-[11px] font-bold mb-2 tracking-wide text-text-primary"
              >
                MALWARE FAMILIES ({result.malwareFamilies.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.malwareFamilies.map((family, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[10px] font-bold"
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

          {/* Industries Targeted */}
          {result.industries && result.industries.length > 0 && (
            <div className="mb-3">
              <div
                className="text-[11px] font-bold mb-2 tracking-wide text-text-primary"
              >
                TARGETED INDUSTRIES
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.industries.map((industry, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[10px]"
                    style={{
                      background: '#fbbf2420',
                      border: '1px solid #fbbf2450',
                      color: '#fbbf24',
                    }}
                  >
                    {industry}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Target Countries */}
          {result.targetCountries && result.targetCountries.length > 0 && (
            <div className="mb-3">
              <div
                className="text-[11px] font-bold mb-2 tracking-wide text-text-primary"
              >
                TARGET COUNTRIES
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.targetCountries.map((country, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[10px]"
                    style={{
                      background: '#60a5fa20',
                      border: '1px solid #60a5fa50',
                      color: '#60a5fa',
                    }}
                  >
                    {country}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pulses (Threat Intelligence) */}
          {result.pulses && result.pulses.length > 0 && (
            <div className="mb-3">
              <div
                className="text-[11px] font-bold mb-2 tracking-wide text-text-primary"
              >
                RELATED PULSES ({result.pulses.length})
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {result.pulses.slice(0, 5).map((pulse, i) => (
                  <div
                    key={i}
                    className="p-2 rounded mb-1.5 bg-card-background"
                    style={{ border: `1px solid ${accentColor}20` }}
                  >
                    <div className="flex justify-between mb-1">
                      <span className="font-bold" style={{ color: accentColor }}>{pulse.name}</span>
                      <span className="text-[9px] text-text-secondary">
                        {new Date(pulse.modified).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-[10px] text-text-secondary mb-1">
                      {pulse.description.substring(0, 100)}...
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {pulse.tags.slice(0, 3).map((tag, j) => (
                        <span
                          key={j}
                          className="text-[8px] px-1 py-0.5 rounded bg-border text-text-secondary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {result.pulses.length > 5 && (
                  <div className="text-[10px] text-text-secondary text-center mt-1">
                    ... and {result.pulses.length - 5} more pulses
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Raw Output */}
          <div>
            <div
              className="text-[11px] font-bold mb-2 tracking-wide text-text-primary"
            >
              RAW OUTPUT
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

export default IndicatorCard;