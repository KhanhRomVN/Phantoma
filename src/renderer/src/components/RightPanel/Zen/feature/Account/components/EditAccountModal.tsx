import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X, AlertCircle } from 'lucide-react';
import { useDbFetch } from '../../../services/useDbFetch';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';
import { $ } from '@renderer/utils/color';
import { FlatAccount } from '../types';
import ReactDOM from 'react-dom';
import { AccountModalKeyframes, overlayStyle, useAccountModalLayout } from './accountModalLayout';

interface EditAccountModalProps {
  open: boolean;
  account: FlatAccount | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** Provider config để hiển thị favicon + provider_name trong header */
  providerConfig?: { provider_name?: string; website?: string } | null;
}

// Số ký tự tối đa để ước lượng field chỉ chiếm 1 dòng.
// Vượt ngưỡng này → tự động chuyển sang textarea.
const SINGLE_LINE_CHAR_THRESHOLD = 60;

/**
 * Field input tự động chuyển giữa input 1 dòng và textarea nhiều dòng.
 * Textarea giới hạn max-height ~5 dòng (khoảng 5 * 20px line-height + padding).
 */
const AutoField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}> = ({ label, value, onChange, disabled, readOnly }) => {
  const useTextarea = value.length > SINGLE_LINE_CHAR_THRESHOLD || value.includes('\n');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea: fit content up to 5 lines, then scroll
  useEffect(() => {
    if (!useTextarea) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 20; // matches lineHeight below
    const paddingV = 16;   // paddingTop + paddingBottom (8px each)
    const maxH = lineHeight * 5 + paddingV;
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
  }, [value, useTextarea]);

  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: $('--input-background'),
    border: 'none',
    color: readOnly ? $('--text-secondary') : $('--text-primary'),
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'none',
    lineHeight: '20px',
    cursor: readOnly ? 'default' : 'text',
    opacity: readOnly ? 0.85 : 1,
  };

  return (
    <div style={{ minWidth: 0 }}>
      <label
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: $('--text-secondary'),
          display: 'block',
          marginBottom: '5px',
        }}
      >
        {label}
      </label>
      {useTextarea ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          readOnly={readOnly}
          style={{
            ...baseStyle,
            minHeight: '36px',
            overflowY: 'hidden',
            paddingTop: '8px',
            paddingBottom: '8px',
          }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          readOnly={readOnly}
          style={{ ...baseStyle, height: '34px' }}
        />
      )}
    </div>
  );
};

const EditAccountModal: React.FC<EditAccountModalProps> = ({
  open,
  account,
  onOpenChange,
  onSuccess,
  providerConfig,
}) => {
  const { container, panelStyle } = useAccountModalLayout(open);
  const [email, setEmail] = useState('');
  // Map key → value của các field credential
  const [credFields, setCredFields] = useState<Array<{ key: string; value: string }>>([]);
  // Ghi nhớ credential ban đầu có phải JSON không (để rebuild khi save)
  const [credIsJson, setCredIsJson] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dbFetch = useDbFetch();

  // Parse credential thành các field khi account thay đổi
  const parsedInitial = useMemo(() => {
    if (!account) return { isJson: false, fields: [] as Array<{ key: string; value: string }> };
    const raw = (account.credential || '').trim();
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return {
            isJson: true,
            fields: Object.entries(parsed).map(([k, v]) => ({
              key: k,
              value: typeof v === 'string' ? v : JSON.stringify(v),
            })),
          };
        }
      } catch {
        // fallthrough — coi như string thô
      }
    }
    return {
      isJson: false,
      fields: raw ? [{ key: 'credential', value: account.credential || '' }] : [],
    };
  }, [account]);

  useEffect(() => {
    if (!open || !account) return;
    setEmail(account.email || '');
    setCredFields(parsedInitial.fields);
    setCredIsJson(parsedInitial.isJson);
    setError('');
  }, [open, account, parsedInitial]);

  const handleFieldChange = (key: string, value: string) => {
    setCredFields((prev) => prev.map((f) => (f.key === key ? { ...f, value } : f)));
  };

  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    setError('');
    try {
      // Build credential string
      let credential: string;
      if (credIsJson) {
        const obj: Record<string, string> = {};
        for (const f of credFields) obj[f.key] = f.value;
        credential = JSON.stringify(obj);
      } else {
        credential = credFields[0]?.value ?? '';
      }

      const response = await dbFetch(`/v1/accounts/${account.id}`, {
        method: 'PUT',
        body: JSON.stringify({ email: email.trim(), credential }),
      });
      const data = await response.json();
      if (data.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(data.message || 'Failed to update account');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !account) return null;

  return ReactDOM.createPortal(
    <>
      <div style={overlayStyle} onClick={() => onOpenChange(false)} />
      <div style={panelStyle}>
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${$('--border')}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: $('--text-primary') }}>
                Edit Account
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  color: $('--text-secondary'),
                  opacity: 0.7,
                  minWidth: 0,
                }}
              >
                {providerConfig?.website && (
                  <img
                    src={getFaviconUrl(providerConfig.website)}
                    alt=""
                    width={12}
                    height={12}
                    style={{ borderRadius: '2px', flexShrink: 0 }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <span
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {providerConfig?.provider_name || account.provider_id}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              padding: '6px',
              borderRadius: '4px',
              border: 'none',
              background: 'transparent',
              color: $('--text-secondary'),
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = $('--error', 0.15);
              e.currentTarget.style.color = $('--error');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = $('--text-secondary');
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Fields */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <AutoField
            label="email"
            value={email}
            onChange={setEmail}
            disabled={saving}
            readOnly
          />

          {credFields.map((f) => (
            <AutoField
              key={f.key}
              label={f.key}
              value={f.value}
              onChange={(v) => handleFieldChange(f.key, v)}
              disabled={saving}
            />
          ))}

          {error && (
            <div
              style={{
                backgroundColor: $('--error', 0.08),
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '12px',
                color: $('--error'),
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={12} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            padding: '12px 16px 12px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => onOpenChange(false)}
            disabled={saving}
            style={{
              padding: '8px 14px',
              borderRadius: '9px',
              backgroundColor: $('--text-secondary', 0.08),
              border: 'none',
              color: $('--text-secondary'),
              fontSize: '12px',
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !email.trim()}
            style={{
              padding: '8px 14px',
              borderRadius: '9px',
              backgroundColor: $('--success', 0.12),
              border: 'none',
              color: $('--success'),
              fontSize: '12px',
              fontWeight: 600,
              cursor: saving || !email.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: !email.trim() ? 0.5 : saving ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {saving && <Loader2 size={13} style={{ animation: 'pmdSpin 1s linear infinite' }} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <AccountModalKeyframes />
    </>,
    container,
  );
};

export default EditAccountModal;