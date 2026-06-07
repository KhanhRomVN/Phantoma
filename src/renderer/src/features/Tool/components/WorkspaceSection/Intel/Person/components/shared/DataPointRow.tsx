import { useState } from 'react';
import type { DataPoint } from '../../types/data-point';
import { ConfidenceBadge } from './ConfidenceBadge';
import {
  resolveFaviconFromValue,
  isWebsiteCategory,
} from '../../../../../../../../core/constants/website-favicon';

interface DataPointRowProps {
  dataPoint: DataPoint;
  compact?: boolean;
}

export function DataPointRow({ dataPoint, compact = false }: DataPointRowProps) {
  const { label, displayValue, value, confidence, source, category, isNoise, verificationStatus } =
    dataPoint;
  const [faviconError, setFaviconError] = useState(false);

  const showFavicon =
    !faviconError &&
    (isWebsiteCategory(category) ||
      (typeof value === 'string' && /^https?:\/\/|^[\w.-]+\.[a-z]{2,}/i.test(String(value))));
  const faviconUrl = showFavicon
    ? resolveFaviconFromValue(typeof value === 'string' ? value : String(displayValue || value))
    : null;

  const categoryColors: Record<string, string> = {
    email: '#0af',
    phone: '#30d158',
    full_name: '#af52de',
    username: '#0a84ff',
    social_profile: '#0a84ff',
    domain: '#64d2ff',
    ip_address: '#ff6b35',
    repository: '#6e5494',
    password_leak: '#ff2d55',
    credential_leak: '#ff375f',
    darkweb_mention: '#af52de',
    crypto_address: '#ff9f0a',
    ssh_key: '#f5a623',
    pgp_key: '#f5a623',
    location: '#30d158',
    job_title: '#64d2ff',
    company: '#64d2ff',
    education: '#64d2ff',
    breach_entry: '#ff375f',
    pastebin_entry: '#f5a623',
    stealer_log: '#ff2d55',
    image: '#f5a623',
    url: '#0af',
    unclassified: '#6a7a9a',
  };

  const accentColor = categoryColors[category] || '#6a7a9a';

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 py-1 px-2 hover:bg-[#111827] transition-colors rounded text-[11px]"
        style={{ opacity: isNoise ? 0.5 : 1 }}
      >
        <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
        <span className="font-mono text-[#6a7a9a] uppercase shrink-0 w-24 truncate">{label}</span>
        <span
          className="font-mono flex-1 truncate flex items-center gap-1"
          style={{ color: accentColor }}
        >
          {faviconUrl && (
            <img
              src={faviconUrl}
              alt=""
              className="w-3.5 h-3.5 shrink-0 rounded-sm"
              onError={() => setFaviconError(true)}
            />
          )}
          {displayValue || String(value).substring(0, 80)}
        </span>
        <ConfidenceBadge value={confidence} />
        <span
          className="text-[9px] font-mono text-[#3a4558] w-20 truncate text-right"
          title={source.name}
        >
          {source.name}
        </span>
      </div>
    );
  }

  return (
    <div
      className="p-2 bg-[#0a0e14] rounded border border-[#1c2333] hover:border-[#2a3548] transition-all"
      style={{ opacity: isNoise ? 0.6 : 1 }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
          <span
            className="text-[11px] font-mono font-bold uppercase tracking-wide"
            style={{ color: accentColor }}
          >
            {label}
          </span>
          {isNoise && (
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-[#f5a62315] text-[#f5a623] border border-[#f5a62330]">
              NOISE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {verificationStatus !== 'unverified' && (
            <span
              className="text-[9px] font-mono px-1 py-0.5 rounded"
              style={{
                color:
                  verificationStatus === 'verified'
                    ? '#30d158'
                    : verificationStatus === 'disputed'
                      ? '#ff2d55'
                      : '#f5a623',
                backgroundColor:
                  verificationStatus === 'verified'
                    ? '#30d15815'
                    : verificationStatus === 'disputed'
                      ? '#ff2d5515'
                      : '#f5a62315',
              }}
            >
              {verificationStatus.toUpperCase()}
            </span>
          )}
          <ConfidenceBadge value={confidence} showLabel />
        </div>
      </div>

      <div
        className="text-[12px] font-mono break-all leading-relaxed mb-1.5 flex items-start gap-1.5"
        style={{ color: accentColor }}
      >
        {faviconUrl && (
          <img
            src={faviconUrl}
            alt=""
            className="w-4 h-4 shrink-0 rounded-sm mt-0.5"
            onError={() => setFaviconError(true)}
          />
        )}
        <span className="flex-1">{displayValue || String(value)}</span>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-[#3a4558]">
          Source: <span className="text-[#6a7a9a]">{source.name}</span>
          {source.url && (
            <span className="text-[#0af] ml-1 truncate max-w-[200px] inline-block align-bottom">
              {source.url}
            </span>
          )}
        </span>
        <span className="text-[#3a4558]">Cred: {Math.round(source.credibility * 100)}%</span>
      </div>

      {dataPoint.tags && dataPoint.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-[#111827]">
          {dataPoint.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1c2333] text-[#6a7a9a]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
