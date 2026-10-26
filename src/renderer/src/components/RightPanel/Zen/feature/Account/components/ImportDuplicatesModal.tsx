import React, { useState, useMemo } from 'react';
import { Loader2, CheckSquare, Square, Check, X, Search } from 'lucide-react';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';
import { $ } from '@renderer/utils/color';
import ReactDOM from 'react-dom';
import { AccountModalKeyframes, overlayStyle, useAccountModalLayout } from './accountModalLayout';

// ─── Types ───────────────────────────────────────────────────────────────
export interface DuplicateEntry {
  email: string;
  provider_id: string;
  kind?: 'new' | 'changed' | 'identical';
  incoming: {
    id?: string;
    email: string;
    provider_id: string;
    credential?: string;
    [key: string]: any;
  };
  existing: {
    id: string;
    email: string;
    provider_id: string;
    credential: string | null;
    usage: number | null;
    reset_usage_at: string | null;
  } | null;
}

interface ProviderConfig {
  provider_id: string;
  provider_name: string;
  website?: string;
}

interface ImportDuplicatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateEntry[];
  providerConfigs: ProviderConfig[];
  onOverride: (entries: DuplicateEntry[]) => Promise<void>;
  onDone: () => void;
}

type FilterTab = 'all' | 'new' | 'changed' | 'identical';

// ─── Helpers ───────────────────────────────────────────────────────────
function summarizeCredential(raw: string | null | undefined): string {
  if (!raw) return '\u2014';
  try {
    const obj = JSON.parse(raw);
    const key = obj.accessToken || obj.access_token || obj.token || obj.cookie;
    if (key) {
      const s = String(key);
      return s.length > 32 ? `${s.slice(0, 12)}\u2026${s.slice(-8)}` : s;
    }
    const first = Object.keys(obj)[0];
    if (first) {
      const s = String(obj[first]);
      return `${first}: ${s.length > 24 ? s.slice(0, 12) + '\u2026' : s}`;
    }
    return raw.length > 32 ? `${raw.slice(0, 12)}\u2026${raw.slice(-8)}` : raw;
  } catch {
    return raw.length > 32 ? `${raw.slice(0, 12)}\u2026${raw.slice(-8)}` : raw;
  }
}

function credentialsDiffer(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const normalize = (v: string | null | undefined) => {
    if (!v) return null;
    try { return JSON.stringify(JSON.parse(v)); }
    catch { return v; }
  };
  return normalize(a) !== normalize(b);
}

function getKind(entry: DuplicateEntry): 'new' | 'changed' | 'identical' {
  if (entry.kind) return entry.kind;
  if (!entry.existing) return 'new';
  return credentialsDiffer(entry.existing.credential, entry.incoming.credential)
    ? 'changed'
    : 'identical';
}

// ─── DiffRow ─────────────────────────────────────────────────────────────
const DiffRow: React.FC<{
  label: string;
  existing: string;
  incoming: string;
  changed: boolean;
}> = ({ label, existing, incoming, changed }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '60px 1fr 1fr',
    gap: '6px', alignItems: 'start',
    padding: '4px 0', borderBottom: `1px solid ${$('--border')}`,
  }}>
    <span style={{
      fontSize: '10px', fontWeight: 600, color: $('--text-secondary'),
      textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: '1px',
    }}>{label}</span>
    <div style={{
      fontSize: '11px', fontFamily: 'monospace',
      color: changed ? $('--error') : $('--text-secondary'),
      wordBreak: 'break-all',
      backgroundColor: changed ? $('--error', 0.06) : 'transparent',
      borderRadius: '4px', padding: '2px 4px',
    }}>{existing || '\u2014'}</div>
    <div style={{
      fontSize: '11px', fontFamily: 'monospace',
      color: changed ? $('--success') : $('--text-secondary'),
      wordBreak: 'break-all',
      backgroundColor: changed ? $('--success', 0.06) : 'transparent',
      borderRadius: '4px', padding: '2px 4px',
    }}>{incoming || '\u2014'}</div>
  </div>
);

// ─── EntryCard ────────────────────────────────────────────────────────
const EntryCard: React.FC<{
  entry: DuplicateEntry;
  selected: boolean;
  onToggle: () => void;
  providerConfig?: ProviderConfig;
}> = ({ entry, selected, onToggle, providerConfig }) => {
  const [expanded, setExpanded] = useState(false);

  const kind = getKind(entry);
  const faviconUrl = providerConfig?.website ? getFaviconUrl(providerConfig.website) : null;

  const badgeCfg =
    kind === 'new'
      ? { bg: $('--primary', 0.12), color: $('--primary'), label: 'New' }
      : kind === 'changed'
        ? { bg: $('--warn', 0.12), color: $('--warn'), label: 'Changed' }
        : { bg: $('--text-secondary', 0.1), color: $('--text-secondary'), label: 'Identical' };

  const credChanged = kind === 'changed';
  const diffCount = credChanged ? 1 : 0;

  return (
    <div style={{
      backgroundColor: selected
        ? $('--primary', 0.1)
        : $('--input-background'),
      border: selected
        ? `1.5px solid ${$('--primary', 0.6)}`
        : '1.5px solid transparent',
      borderRadius: '12px',
      transition: 'all 0.15s ease',
      flexShrink: 0, overflow: 'hidden',
    }}>
      {/* Main row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', cursor: 'pointer',
      }} onClick={onToggle}>

        <span style={{
          color: selected ? $('--primary') : $('--text-secondary'),
          flexShrink: 0,
        }}>
          {selected ? <CheckSquare size={15} /> : <Square size={15} />}
        </span>

        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          backgroundColor: $('--text-secondary', 0.1),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden',
        }}>
          {faviconUrl ? (
            <img src={faviconUrl} alt={providerConfig?.provider_name}
              style={{ width: '20px', height: '20px', objectFit: 'contain' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <span style={{ fontSize: '12px', fontWeight: 700, color: $('--text-secondary') }}>
              {(providerConfig?.provider_name || entry.provider_id).charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: '13px', fontWeight: 500,
            color: $('--text-primary'), overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            <span style={{ fontWeight: 600 }}>{providerConfig?.provider_name || entry.provider_id}</span>
            <span style={{ color: $('--text-secondary'), margin: '0 4px' }}>|</span>
            <span style={{ color: $('--text-secondary') }}>{entry.email}</span>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{
              fontSize: '10px', fontWeight: 600,
              padding: '1px 6px', borderRadius: '4px',
              backgroundColor: badgeCfg.bg, color: badgeCfg.color,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>{badgeCfg.label}</span>
            {diffCount > 0 && (
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.5 }}>
                {diffCount} field diff
              </span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          style={{
            padding: '3px', borderRadius: '4px', border: 'none',
            backgroundColor: 'transparent', color: 'var(--text-secondary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0,
            transition: 'transform 0.15s ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Detail */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${$('--border')}`, backgroundColor: $('--input-background') }}>
          {kind === 'new' ? (
            /* New: show incoming data only */
            <div style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: 'Email', value: entry.incoming.email },
                { label: 'Credential', value: summarizeCredential(entry.incoming.credential) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px', alignItems: 'start' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, color: $('--text-secondary'),
                    textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: '2px',
                  }}>{label}</span>
                  <div style={{
                    fontSize: '11px', fontFamily: 'monospace',
                    color: $('--text-secondary'), wordBreak: 'break-all', padding: '2px 4px',
                  }}>{value || '\u2014'}</div>
                </div>
              ))}
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: $('--text-secondary'), opacity: 0.5, textAlign: 'center' }}>
                Will be inserted as a new account.
              </p>
            </div>
          ) : kind === 'identical' ? (
            /* Identical: view-only */
            <div style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: 'Email', value: entry.existing?.email ?? '' },
                { label: 'Credential', value: summarizeCredential(entry.existing?.credential) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px', alignItems: 'start' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, color: $('--text-secondary'),
                    textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: '2px',
                  }}>{label}</span>
                  <div style={{
                    fontSize: '11px', fontFamily: 'monospace',
                    color: $('--text-secondary'), wordBreak: 'break-all', padding: '2px 4px',
                  }}>{value || '\u2014'}</div>
                </div>
              ))}
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: $('--text-secondary'), opacity: 0.5, textAlign: 'center' }}>
                No differences \u2014 overriding will have no effect.
              </p>
            </div>
          ) : (
            /* Changed: diff view */
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: '6px', padding: '8px 0 4px' }}>
                <span />
                <span style={{ fontSize: '10px', fontWeight: 600, color: $('--text-secondary'), opacity: 0.6 }}>Existing (DB)</span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: $('--text-secondary'), opacity: 0.6 }}>Incoming (file)</span>
              </div>
              <DiffRow
                label="Email"
                existing={entry.existing?.email ?? ''}
                incoming={entry.incoming.email}
                changed={false}
              />
              <DiffRow
                label="Credential"
                existing={summarizeCredential(entry.existing?.credential)}
                incoming={summarizeCredential(entry.incoming.credential)}
                changed={credChanged}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────
const ImportDuplicatesModal: React.FC<ImportDuplicatesModalProps> = ({
  open,
  onOpenChange,
  duplicates,
  providerConfigs,
  onOverride,
  onDone,
}) => {
  const { container, panelStyle } = useAccountModalLayout(open, true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Auto-tick new + changed khi mở
  React.useEffect(() => {
    if (!open) return;
    setSearch('');
    setActiveTab('all');
    const auto = new Set<number>();
    duplicates.forEach((entry, i) => {
      const k = getKind(entry);
      if (k === 'new' || k === 'changed') auto.add(i);
    });
    setSelected(auto);
  }, [open, duplicates]);

  const providerMap = useMemo(
    () => new Map(providerConfigs.map((p) => [p.provider_id, p])),
    [providerConfigs],
  );

  const classified = useMemo(
    () => duplicates.map((entry, i) => ({ entry, i, kind: getKind(entry) })),
    [duplicates],
  );

  const tabCounts = useMemo(() => ({
    all: classified.length,
    new: classified.filter((c) => c.kind === 'new').length,
    changed: classified.filter((c) => c.kind === 'changed').length,
    identical: classified.filter((c) => c.kind === 'identical').length,
  }), [classified]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classified.filter(({ entry, kind }) => {
      if (activeTab !== 'all' && kind !== activeTab) return false;
      if (!q) return true;
      const pName = providerMap.get(entry.provider_id)?.provider_name ?? entry.provider_id;
      return entry.email.toLowerCase().includes(q) || pName.toLowerCase().includes(q);
    });
  }, [classified, activeTab, search, providerMap]);

  const toggle = (i: number) => {
    const s = new Set(selected);
    if (s.has(i)) s.delete(i); else s.add(i);
    setSelected(s);
  };

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const toProcess = [...selected].map((i) => duplicates[i]);
      await onOverride(toProcess);
      onDone();
      onOpenChange(false);
    } catch (err) {
      console.error('Import confirm failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const TABS: { key: FilterTab; label: string; color?: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'new',       label: 'New',       color: '#60a5fa' },
    { key: 'changed',   label: 'Changed',   color: '#fbbf24' },
    { key: 'identical', label: 'Identical' },
  ];

  const selectedNew     = [...selected].filter((i) => getKind(duplicates[i]) === 'new').length;
  const selectedChanged = [...selected].filter((i) => getKind(duplicates[i]) === 'changed').length;

  const confirmLabel = loading
    ? 'Importing\u2026'
    : selected.size === 0
      ? 'Select accounts to import'
      : [
          selectedNew     > 0 ? `${selectedNew} new`         : '',
          selectedChanged > 0 ? `${selectedChanged} override` : '',
        ].filter(Boolean).join(', ');

  return ReactDOM.createPortal(
    <>
      <div style={overlayStyle} onClick={() => !loading && onOpenChange(false)} />

      <div style={panelStyle}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: `1px solid ${$('--border')}`, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '17px', fontWeight: 700, color: $('--text-primary'), letterSpacing: '0.01em' }}>
              Review Import
            </span>
            <span style={{ fontSize: '11px', color: $('--text-secondary'), opacity: 0.7 }}>
              {duplicates.length} account{duplicates.length !== 1 ? 's' : ''} &mdash; select which to import
            </span>
          </div>
          <button
            onClick={() => !loading && onOpenChange(false)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '6px', borderRadius: '4px', color: $('--text-secondary'),
              display: 'flex', alignItems: 'center', transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = $('--error', 0.15); e.currentTarget.style.color = $('--error'); }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = $('--text-secondary'); }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '10px 16px 8px', flexShrink: 0, borderBottom: `1px solid ${$('--border')}` }}>
          {/* Searchbar */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Search by email or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 32px',
                fontSize: '13px', backgroundColor: $('--input-background'),
                border: 'none', borderRadius: '8px',
                color: $('--text-primary'), outline: 'none',
                boxSizing: 'border-box', height: '34px',
              }}
            />
            <Search style={{
              width: '14px', height: '14px', position: 'absolute',
              left: '10px', top: '50%', transform: 'translateY(-50%)',
              color: $('--text-secondary'), pointerEvents: 'none',
            }} />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                border: 'none', background: 'transparent', padding: '2px',
                cursor: 'pointer', display: 'flex', color: $('--text-secondary'), opacity: 0.5,
              }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {TABS.map(({ key, label, color }) => {
              const isActive = activeTab === key;
              const count = tabCounts[key as keyof typeof tabCounts];
              
              // Map hardcoded hex from TABS definition to valid CSS variables
              let cssVarName = '--text-secondary';
              if (color === '#60a5fa') cssVarName = '--primary';
              else if (color === '#fbbf24') cssVarName = '--warn';
              
              const textColor = isActive ? $(cssVarName) : $('--text-secondary');
              const bgColor = isActive ? $(cssVarName, 0.18) : $(cssVarName, 0.08);
              const badgeBgColor = isActive ? $(cssVarName, 0.25) : $(cssVarName, 0.12);

              return (
                <button key={key} onClick={() => setActiveTab(key)} style={{
                  padding: '4px 10px', borderRadius: '6px', border: 'none',
                  fontSize: '12px', fontWeight: isActive ? 600 : 500, cursor: 'pointer',
                  backgroundColor: bgColor,
                  color: textColor,
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'all 0.12s ease', whiteSpace: 'nowrap',
                }}>
                  {label}
                  {count > 0 && (
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '0 5px', borderRadius: '4px',
                      backgroundColor: badgeBgColor,
                      color: textColor,
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '10px 16px',
          display: 'flex', flexDirection: 'column', gap: '6px', minHeight: 0,
        }}>
          {filtered.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', color: $('--text-secondary'), opacity: 0.5, padding: '24px 0',
            }}>No accounts match</div>
          ) : (
            filtered.map(({ entry, i }) => (
              <EntryCard
                key={`${entry.provider_id}-${entry.email}`}
                entry={entry}
                selected={selected.has(i)}
                onToggle={() => toggle(i)}
                providerConfig={providerMap.get(entry.provider_id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px 16px', flexShrink: 0,
          borderTop: `1px solid ${$('--border')}`, display: 'flex', gap: '8px',
        }}>
          <button
            onClick={() => { onOpenChange(false); onDone(); }}
            disabled={loading}
            style={{
              flex: 1, padding: '9px', borderRadius: '9px',
              backgroundColor: $('--text-secondary', 0.08), border: 'none',
              color: $('--text-secondary'), fontSize: '12px', fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1, whiteSpace: 'nowrap',
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={loading || selected.size === 0}
            style={{
              flex: 2, padding: '9px', borderRadius: '9px',
              backgroundColor: selected.size === 0 ? $('--text-secondary', 0.08) : $('--success', 0.12),
              border: 'none',
              color: selected.size === 0 ? $('--text-secondary') : $('--success'),
              fontSize: '12px', fontWeight: 600,
              cursor: loading || selected.size === 0 ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : selected.size === 0 ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.15s ease', whiteSpace: 'nowrap',
            }}
          >
            {loading
              ? <Loader2 size={13} style={{ animation: 'pmdSpin 1s linear infinite' }} />
              : <Check size={13} />
            }
            {confirmLabel}
          </button>
        </div>
      </div>

      <AccountModalKeyframes />
    </>,
    container,
  );
};

export default ImportDuplicatesModal;