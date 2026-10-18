import React from 'react';
import { Activity, Coins, BarChart3, Clock, TrendingUp, CheckCircle } from 'lucide-react';
import { FlatAccount } from '../types';
import {
  formatInUserTimezone,
  parseIsoSafe,
  getUserTimezone,
  computeNextResetVN,
} from '@renderer/utils/timezone';
import {
  extractAccessToken,
  formatJwtExpiry,
  isJwtExpired,
  extractCookieSessionExpiry,
  formatExpiryMs,
} from '@renderer/utils/jwt';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';
import { $ } from '@renderer/utils/color';

// ─── Helpers ────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

type Period = 'day' | 'week' | 'month' | 'year' | 'all';

const PERIOD_LABEL: Record<Period, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year',
  all: 'All-time',
};

// ─── Row ─────────────────────────────────────────────────────────────────

const Row: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}> = ({ icon, label, value, valueColor }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '14px 1fr auto',
      alignItems: 'center',
      gap: '6px',
      padding: '2px 0',
    }}
  >
    <span style={{ color: $('--text-secondary'), display: 'flex', alignItems: 'center' }}>
      {icon}
    </span>
    <span style={{ fontSize: '11px', color: $('--text-secondary') }}>{label}</span>
    <span
      style={{
        fontSize: '11px',
        fontWeight: 600,
        color: valueColor ?? $('--text-primary'),
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </span>
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: '10px',
      fontWeight: 700,
      color: $('--text-secondary'),
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      margin: '6px 0 2px',
    }}
  >
    {children}
  </div>
);

const Divider: React.FC = () => (
  <div style={{ borderTop: `1px solid ${$('--border')}`, margin: '4px 0' }} />
);

// ─── Component ───────────────────────────────────────────────────────────

interface AccountTooltipProps {
  account: FlatAccount;
  providerConfig?: any;
  x: number;
  y: number;
  visible: boolean;
  statsPeriod?: Period;
}

const AccountTooltip: React.FC<AccountTooltipProps> = ({
  account,
  providerConfig,
  x,
  y,
  visible,
  statsPeriod = 'day',
}) => {
  if (!visible) return null;

  // ── Favicon ───────────────────────────────────────────────────────────
  const faviconUrl = providerConfig?.website ? getFaviconUrl(providerConfig.website) : null;
  const providerName = providerConfig?.provider_name ?? account.provider_id;

  // ── Token expiry ──────────────────────────────────────────────────────
  const accessToken = extractAccessToken(account.credential || '');
  const tokenExpiry = accessToken
    ? formatJwtExpiry(accessToken)
    : (() => {
        const ms = extractCookieSessionExpiry(account.credential || '');
        return ms !== null ? formatExpiryMs(ms) : null;
      })();
  const isExpired = accessToken
    ? isJwtExpired(accessToken)
    : (() => {
        const ms = extractCookieSessionExpiry(account.credential || '');
        return ms !== null ? Date.now() >= ms : false;
      })();

  // ── Usage ─────────────────────────────────────────────────────────────
  const usageNum = account.usage != null ? Number(account.usage) : null;
  const usageColor =
    usageNum == null
      ? $('--text-secondary')
      : usageNum >= 90
        ? $('--error')
        : usageNum >= 70
          ? $('--warn')
          : $('--purple');
  // ── Reset time ────────────────────────────────────────────────────────
  let resetDate: Date | null = null;
  if (account.reset_usage_at != null) {
    const stored = parseIsoSafe(account.reset_usage_at);
    resetDate =
      !isNaN(stored.getTime()) && stored.getTime() > Date.now()
        ? stored
        : computeNextResetVN('day');
  }
  const resetLabel = resetDate ? formatInUserTimezone(resetDate) : null;
  const resetDiffMs = resetDate ? resetDate.getTime() - Date.now() : null;
  const resetIn =
    resetDiffMs != null && resetDiffMs > 0
      ? (() => {
          const h = Math.floor(resetDiffMs / 3_600_000);
          const m = Math.floor((resetDiffMs % 3_600_000) / 60_000);
          return h > 0 ? `${h}h ${m}m` : `${m}m`;
        })()
      : null;

  // ── Provider request limit ────────────────────────────────────────────
  const requestLimit = providerConfig?.usagePolicy?.requestLimit as number | undefined;

  // ── Position: bám con trỏ, tránh tràn màn hình ───────────────────────
  const TOOLTIP_W = 248;
  const TOOLTIP_H_EST = 240;
  const OFFSET = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = x + OFFSET + TOOLTIP_W > vw ? x - TOOLTIP_W - OFFSET + 4 : x + OFFSET;
  const top = y + TOOLTIP_H_EST > vh ? y - TOOLTIP_H_EST : y + OFFSET;

  const periodLabel = PERIOD_LABEL[statsPeriod];

  return (
    <div
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 99999,
        width: TOOLTIP_W,
        pointerEvents: 'none',
        backgroundColor: $('--card-background'),
        border: `1px solid ${$('--border')}`,
        borderRadius: '10px',
        padding: '10px 12px',
        boxShadow: '0 4px 24px rgb(0,0,0,0.28)',
        fontFamily: 'inherit',
      }}
    >
      {/* ── Header: favicon + provider + email ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '7px',
            backgroundColor: $('--text-secondary', 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt={providerName}
              style={{ width: '18px', height: '18px', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span style={{ fontSize: '11px', fontWeight: 700, color: $('--text-secondary') }}>
              {providerName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: $('--text-primary'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {providerName}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: $('--text-secondary'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {account.email || 'No email'}
          </div>
        </div>
      </div>

      <Divider />

      {/* ── Period stats ── */}
      <SectionLabel>{periodLabel} stats</SectionLabel>
      <Row
        icon={<Activity size={11} />}
        label={`${periodLabel} requests`}
        value={(account.period_requests ?? 0).toLocaleString()}
        valueColor={$('--success')}
      />
      <Row
        icon={<Coins size={11} />}
        label={`${periodLabel} tokens`}
        value={formatTokens(account.period_tokens ?? 0)}
        valueColor={$('--warn')}
      />

      <Divider />

      {/* ── All-time stats ── */}
      <SectionLabel>All-time</SectionLabel>
      <Row
        icon={<TrendingUp size={11} />}
        label="Total requests"
        value={(account.total_requests ?? 0).toLocaleString()}
      />
      <Row
        icon={<CheckCircle size={11} />}
        label="Successful"
        value={(account.successful_requests ?? 0).toLocaleString()}
        valueColor={$('--success')}
      />
      <Row
        icon={<Coins size={11} />}
        label="Total tokens"
        value={formatTokens(account.total_tokens ?? 0)}
      />

      {/* ── Usage + reset ── */}
      {usageNum != null && (
        <>
          <Divider />
          <SectionLabel>Usage limit</SectionLabel>
          <Row
            icon={<BarChart3 size={11} />}
            label={requestLimit != null ? `Used of ${requestLimit.toLocaleString()} req` : 'Usage'}
            value={`${usageNum.toFixed(1)}%`}
            valueColor={usageColor}
          />
          {resetLabel && (
            <>
              <Row
                icon={<Clock size={11} />}
                label={resetIn ? `Resets in ${resetIn}` : 'Resets at'}
                value={resetLabel}
              />
              <div
                style={{
                  fontSize: '10px',
                  color: $('--text-secondary'),
                  textAlign: 'right',
                  marginTop: '1px',
                  opacity: 0.7,
                }}
              >
                {getUserTimezone()}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Token expiry ── */}
      {tokenExpiry && (
        <>
          <Divider />
          <Row
            icon={<Clock size={11} />}
            label="Token"
            value={isExpired ? 'Expired' : `Exp: ${tokenExpiry}`}
            valueColor={isExpired ? $('--error') : undefined}
          />
        </>
      )}
    </div>
  );
};

export default AccountTooltip;
