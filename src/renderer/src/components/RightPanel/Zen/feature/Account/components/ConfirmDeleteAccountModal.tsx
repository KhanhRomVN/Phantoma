import React from 'react';
import ReactDOM from 'react-dom';
import { Loader2, Trash2 } from 'lucide-react';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';
import { $ } from '@renderer/utils/color';
import { AccountModalKeyframes, overlayStyle, useAccountModalLayout } from './accountModalLayout';

interface ConfirmDeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  email?: string;
  providerName?: string;
  websiteUrl?: string;
  count: number;
}

const ConfirmDeleteAccountModal: React.FC<ConfirmDeleteAccountModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  loading,
  email,
  providerName,
  websiteUrl,
  count,
}) => {
  const { container, panelStyle } = useAccountModalLayout(open);

  if (!open) return null;

  const faviconUrl = websiteUrl ? getFaviconUrl(websiteUrl) : null;
  const isBulk = count > 1;

  return ReactDOM.createPortal(
    <>
      <div style={overlayStyle} onClick={() => !loading && onOpenChange(false)} />

      <div style={panelStyle}>
        <div className="px-4 pb-4 pt-4 flex flex-col items-center gap-2.5">
          <div
            className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: $('--error', 0.1) }}
          >
            <Trash2 size={20} color={$('--error')} />
          </div>

          <div className="text-[15px] font-bold text-center text-text-primary">Delete Account?</div>

          <div className="text-xs text-text-secondary opacity-80 text-center leading-normal">
            {isBulk ? (
              <span>
                Do you want to permanently delete {count} selected accounts? This action cannot be
                undone.
              </span>
            ) : (
              <span>
                Do you want to permanently delete
                {(providerName || email) && (
                  <>
                    {' '}
                    the account
                    {faviconUrl && (
                      <img
                        src={faviconUrl}
                        alt=""
                        width={12}
                        height={12}
                        style={{
                          borderRadius: '2px',
                          flexShrink: 0,
                          verticalAlign: 'middle',
                          margin: '0 3px',
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    {providerName && (
                      <strong style={{ color: $('--text-primary'), fontWeight: 600 }}>
                        {providerName}
                      </strong>
                    )}
                    {providerName && email && ' · '}
                    {email && (
                      <strong style={{ color: $('--text-primary'), fontWeight: 600 }}>
                        {email}
                      </strong>
                    )}
                  </>
                )}
                ? This action cannot be undone.
              </span>
            )}
          </div>

          <div className="flex gap-2 w-full mt-1">
            <button
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 py-2.5 rounded-[9px] border-none text-xs font-medium whitespace-nowrap"
              style={{
                backgroundColor: $('--text-secondary', 0.08),
                color: $('--text-secondary'),
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-[9px] border-none text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
              style={{
                backgroundColor: $('--error', 0.12),
                color: $('--error'),
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading && <Loader2 size={12} style={{ animation: 'pmdSpin 1s linear infinite' }} />}
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
        <AccountModalKeyframes />
      </div>
    </>,
    container,
  );
};

export default ConfirmDeleteAccountModal;