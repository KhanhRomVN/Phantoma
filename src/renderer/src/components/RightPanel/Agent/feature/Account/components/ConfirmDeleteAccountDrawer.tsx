import React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';
import { $ } from '@renderer/utils/color';

interface ConfirmDeleteAccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  email?: string;
  providerName?: string;
  websiteUrl?: string;
  count: number;
}

const ConfirmDeleteAccountDrawer: React.FC<ConfirmDeleteAccountDrawerProps> = ({
  open,
  onOpenChange,
  onConfirm,
  loading,
  email,
  providerName,
  websiteUrl,
  count,
}) => {
  if (!open) return null;

  const faviconUrl = websiteUrl ? getFaviconUrl(websiteUrl) : null;
  const isBulk = count > 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] animate-[cdFadeIn_0.15s_ease]"
        style={{ backgroundColor: 'rgb(0,0,0,0.5)' }} // Overlay usually stays black/dark regardless of theme for contrast
        onClick={() => !loading && onOpenChange(false)}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 rounded-t-2xl z-[201] animate-[cdSlideUp_0.22s_ease]"
        style={{
          backgroundColor: $('--card-background'),
          borderTop: `1px solid ${$('--border')}`,
          boxShadow: '0 -8px 32px rgb(0,0,0,0.25)',
          padding: '0 0 max(20px, env(safe-area-inset-bottom)) 0',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1.5">
          <div className="w-8 h-[3px] rounded-[2px]" style={{ backgroundColor: $('--border') }} />
        </div>

        {/* Content */}
        <div className="px-4 pb-4 pt-1 flex flex-col items-center gap-2.5">
          {/* Badge icon */}
          <div
            className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: $('--error', 0.1) }}
          >
            <Trash2 size={20} color={$('--error')} />
          </div>

          {/* Title */}
          <div className="text-[15px] font-bold text-center text-text-primary">Delete Account?</div>

          {/* Info */}
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

          {/* Buttons */}
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
              {loading && <Loader2 size={12} style={{ animation: 'cdSpin 1s linear infinite' }} />}
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cdSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes cdFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cdSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default ConfirmDeleteAccountDrawer;