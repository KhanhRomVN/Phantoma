import { memo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import { getFaviconUrl } from '@renderer/utils/favicon';

interface ProviderModelTriggerProps {
  providerName?: string;
  providerUrl?: string;
  model?: string;
  disabled?: boolean;
  onClick: () => void;
}

const ProviderModelTrigger = memo<ProviderModelTriggerProps>(
  ({ providerName, providerUrl, model, disabled, onClick }) => {
    const [hovered, setHovered] = useState(false);
    const hasSelection = !!providerName && !!model;

    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          height: '22px',
          maxWidth: '100%',
          minWidth: 0,
          padding: '0 8px',
          borderRadius: '6px 6px 0 0',
          border: `1px solid ${$('--border')}`,
          borderBottom: 'none',
          background: hovered
            ? `color-mix(in srgb, ${$('--text-secondary')} 12%, ${$('--input-background')})`
            : $('--input-background'),
          color: $('--text-primary'),
          fontSize: '10px',
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.15s ease-in-out',
        }}
      >
        {providerUrl && (
          <img
            src={getFaviconUrl(providerUrl, 16)}
            alt=""
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              objectFit: 'contain',
              flexShrink: 0,
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        {hasSelection ? (
          <>
            <span style={{ flexShrink: 0 }}>{providerName}</span>
            <span style={{ opacity: 0.4, flexShrink: 0 }}>/</span>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                color: $('--text-secondary'),
              }}
            >
              {model}
            </span>
          </>
        ) : (
          <span>Select Model</span>
        )}
        <ChevronDown size={10} style={{ flexShrink: 0 }} />
      </button>
    );
  }
);

ProviderModelTrigger.displayName = 'ProviderModelTrigger';

export default ProviderModelTrigger;