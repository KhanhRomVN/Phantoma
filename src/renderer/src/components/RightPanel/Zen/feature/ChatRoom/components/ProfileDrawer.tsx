/**
 * ------------------------------------------------------------------
 * ProfileDrawer
 * ------------------------------------------------------------------
 * Drawer nhập name + chọn country trước khi vào chatroom lần đầu.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Upload, X } from 'lucide-react';
import { COUNTRIES, getCountryFlagEmoji } from '../utils/countryFlags';
import { TIMEZONE_COUNTRY } from '../constants/timezoneCountries';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface ProfileDrawerProps {
  onSubmit: (value: { name: string; country: string; avatar?: string }) => Promise<void>;
  onClose?: () => void;
  initialName?: string;
  initialCountry?: string;
  initialAvatar?: string;
}

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────
const NAME_MAX_LENGTH = 32;
const AVATAR_SIZE = 128;

const fileToAvatarDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Cannot read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        canvas
          .getContext('2d')
          ?.drawImage(
            img,
            (img.width - side) / 2,
            (img.height - side) / 2,
            side,
            side,
            0,
            0,
            AVATAR_SIZE,
            AVATAR_SIZE,
          );
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  fontSize: 13,
  color: 'var(--text-primary)',
  backgroundColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
  border: 'none',
  borderRadius: 6,
  outline: 'none',
};

// ─── Helpers ────────────────────────────────────────────────────────────
const detectCountry = async (): Promise<string> => {
  const isKnown = (code?: string) => !!code && COUNTRIES.some((c) => c.code === code);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzCountry = TIMEZONE_COUNTRY[timeZone];
  if (isKnown(tzCountry)) return tzCountry;
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (isKnown(data?.country_code)) return data.country_code;
    }
  } catch {
    /* ignore network failures */
  }
  const region = navigator.language.split('-')[1]?.toUpperCase();
  return isKnown(region) ? (region as string) : '';
};

// ─── Sub components ─────────────────────────────────────────────────────
const CountrySelect: React.FC<CountrySelectProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q,
    );
  }, [sorted, query]);
  const selected = COUNTRIES.find((c) => c.code === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...inputStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>
          {selected ? `${getCountryFlagEmoji(selected.code)} ${selected.name}` : 'Select country'}
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 'calc(100% + 4px)',
            zIndex: 100000,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--card-background, var(--background))',
            border: '1px solid var(--divider)',
            borderRadius: 6,
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country..."
            style={{ ...inputStyle, borderRadius: '6px 6px 0 0' }}
          />
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.map((c) => (
              <div
                key={c.code}
                className="cr-country-item"
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                  setQuery('');
                }}
                style={{
                  padding: '6px 10px',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: c.code === value ? 600 : 400,
                }}
              >
                {getCountryFlagEmoji(c.code)} {c.name}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 12, opacity: 0.6 }}>No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Component ──────────────────────────────────────────────────────────
const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  onSubmit,
  onClose,
  initialName = '',
  initialCountry = '',
  initialAvatar = '',
}) => {
  const [name, setName] = useState(initialName);
  const [country, setCountry] = useState(initialCountry);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    try {
      setAvatar(await fileToAvatarDataUrl(file));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const canSubmit = name.trim().length > 0 && !!country && !saving;
  const isUpdate = !!initialName;
  const softButtonStyle = (color: string, enabled = true): React.CSSProperties => ({
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.5,
    color,
    backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
  });

  useEffect(() => {
    if (initialCountry) return;
    let disposed = false;
    detectCountry().then((code) => {
      if (!disposed && code) setCountry((prev) => prev || code);
    });
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), country, avatar: avatar || undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 99998,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          height: '50vh',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--text-primary)',
          backgroundColor: 'var(--background)',
          borderTop: '1px solid var(--divider)',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.3)',
          animation: 'crProfileSlideUp 0.3s ease-out',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Your profile</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>
              Choose a name and country to join the chat room
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'flex',
                padding: 6,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--text-primary)',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            padding: 16,
            flex: 1,
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 56,
                height: 56,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderRadius: 6,
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                backgroundColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
              }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt="Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Upload size={18} />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Avatar</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={softButtonStyle('var(--text-primary)')}
                >
                  Upload image
                </button>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    style={softButtonStyle('#ef4444')}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => void handleAvatarFile(e)}
              style={{ display: 'none' }}
            />
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Name</span>
            <input
              autoFocus
              value={name}
              maxLength={NAME_MAX_LENGTH}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSubmit();
              }}
              placeholder="Your display name"
              style={inputStyle}
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Country</span>
            <CountrySelect value={country} onChange={setCountry} />
          </div>

          {error && <div style={{ fontSize: 11, color: '#ef4444' }}>{error}</div>}

          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'auto' }}
          >
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={softButtonStyle('var(--text-primary)')}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              style={softButtonStyle('#3b82f6', canSubmit)}
            >
              {saving ? 'Saving...' : isUpdate ? 'Update Profile' : 'Create Profile'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes crProfileSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .cr-country-item:hover { background: color-mix(in srgb, var(--text-primary) 10%, transparent); }
      `}</style>
    </>
    ,
    document.body,
  );
};

export default ProfileDrawer;