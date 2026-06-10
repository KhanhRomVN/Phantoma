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
      style={{
        background: '#0d1117',
        border: `1px solid ${isExpanded ? '#00e5ff' : '#1a2236'}`,
        borderRadius: 6,
        transition: 'all 0.15s',
        marginBottom: 8,
      }}
      onContextMenu={(e) => onContextMenu(e, scan)}
    >
      <div
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 2 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: reputationColor,
              boxShadow: `0 0 6px ${reputationColor}`,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
            {scan.indicator}
          </span>
          <span
            style={{
              fontSize: 11,
              color: '#64748b',
              background: '#1a2236',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            {scan.indicatorType.toUpperCase()}
          </span>
          <span
            style={{
              fontSize: 10,
              color: reputationColor,
              background: `${reputationColor}20`,
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 700,
            }}
          >
            {reputationIcon} {reputationLabel}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, auto)',
            gap: 20,
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Pulses</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{result?.pulses?.length || 0}</span>
          </div>
          <div>
            <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Malware Families</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{result?.malwareFamilies?.length || 0}</span>
          </div>
          <div>
            <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Related IOCs</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{result?.relatedIndicators || 0}</span>
          </div>
        </div>
      </div>

      {isExpanded && result && (
        <div
          style={{
            borderTop: `1px solid ${accentColor}30`,
            padding: '12px 16px',
            background: '#080b10',
          }}
        >
          {/* Reputation & Basic Info */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#00e5ff',
                marginBottom: 8,
                letterSpacing: '0.1em',
              }}
            >
              REPUTATION & ACTIVITY
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 8,
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>Reputation:</span>{' '}
                <span style={{ color: reputationColor, fontWeight: 700 }}>{reputationLabel}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Activity Count:</span>{' '}
                <span style={{ color: '#94a3b8' }}>{result.activityCount}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>First Seen:</span>{' '}
                <span style={{ color: '#94a3b8' }}>{result.firstSeen || 'N/A'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Last Seen:</span>{' '}
                <span style={{ color: '#94a3b8' }}>{result.lastSeen || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Geo Location (for IP) */}
          {result.geoData && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#e2e8f0',
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                GEO LOCATION
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 8,
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Country:</span>{' '}
                  <span style={{ color: '#94a3b8' }}>{result.geoData.country} ({result.geoData.countryCode})</span>
                </div>
                {result.geoData.city && (
                  <div>
                    <span style={{ color: '#64748b' }}>City:</span>{' '}
                    <span style={{ color: '#94a3b8' }}>{result.geoData.city}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Malware Families */}
          {result.malwareFamilies && result.malwareFamilies.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#e2e8f0',
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                MALWARE FAMILIES ({result.malwareFamilies.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.malwareFamilies.map((family, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '2px 8px',
                      background: '#ef444420',
                      border: '1px solid #ef444450',
                      borderRadius: 4,
                      color: '#ef4444',
                      fontSize: 10,
                      fontWeight: 700,
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
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#e2e8f0',
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                TARGETED INDUSTRIES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.industries.map((industry, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '2px 8px',
                      background: '#fbbf2420',
                      border: '1px solid #fbbf2450',
                      borderRadius: 4,
                      color: '#fbbf24',
                      fontSize: 10,
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
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#e2e8f0',
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                TARGET COUNTRIES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.targetCountries.map((country, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '2px 8px',
                      background: '#60a5fa20',
                      border: '1px solid #60a5fa50',
                      borderRadius: 4,
                      color: '#60a5fa',
                      fontSize: 10,
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
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#e2e8f0',
                  marginBottom: 8,
                  letterSpacing: '0.1em',
                }}
              >
                RELATED PULSES ({result.pulses.length})
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {result.pulses.slice(0, 5).map((pulse, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px',
                      background: '#0d1117',
                      border: `1px solid ${accentColor}20`,
                      borderRadius: 4,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#00e5ff', fontWeight: 700 }}>{pulse.name}</span>
                      <span style={{ fontSize: 9, color: '#64748b' }}>
                        {new Date(pulse.modified).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
                      {pulse.description.substring(0, 100)}...
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {pulse.tags.slice(0, 3).map((tag, j) => (
                        <span
                          key={j}
                          style={{
                            fontSize: 8,
                            padding: '1px 4px',
                            background: '#1a2236',
                            borderRadius: 2,
                            color: '#64748b',
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {result.pulses.length > 5 && (
                  <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 4 }}>
                    ... and {result.pulses.length - 5} more pulses
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Raw Output */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#e2e8f0',
                marginBottom: 8,
                letterSpacing: '0.1em',
              }}
            >
              RAW OUTPUT
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#64748b',
                fontFamily: 'monospace',
                background: '#0d1117',
                padding: 8,
                borderRadius: 4,
                maxHeight: 150,
                overflowY: 'auto',
              }}
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