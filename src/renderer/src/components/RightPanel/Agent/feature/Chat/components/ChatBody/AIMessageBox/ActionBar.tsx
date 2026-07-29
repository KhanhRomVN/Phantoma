import React from 'react';
import { Check, X } from 'lucide-react';

// CONSTANTS
import { TOOL_ACTION_TYPES } from '../../../constants/constants';

// TYPES
import { ToolAction } from '../../../services/ResponseParser';

// UTILS
import { $ } from '@renderer/utils/color';

export interface ActionBarProps {
  /** Tool action object containing type and params */
  action: ToolAction;
  /** Message ID */
  messageId: string;
  /** Action index */
  actionIndex: number;
  /** Callback when user clicks a button */
  onAction: (
    e: React.MouseEvent,
    type: (typeof TOOL_ACTION_TYPES)[keyof typeof TOOL_ACTION_TYPES],
  ) => void;
  /** Whether the action is completed */
  isCompleted?: boolean;
  /** Whether the action has a validation/parsing error */
  hasError?: boolean;
  /** Whether the action is currently loading/executing */
  isLoading?: boolean;
  /** Optional custom tool color */
  toolColor?: string;
}

// MidnightBlue theme error color: rgb(255, 45, 85)
const ERROR_RGB = '255, 45, 85';

/**
 * Smart ActionBar that automatically decides which buttons to show based on action state:
 * - If hasError=true: Show "Skip this tool because of error" button
 * - If isLoading=true: Show spinner
 * - If isCompleted=true: Show nothing (or checkmark in future)
 * - Otherwise: Show "Accept" + "Reject" buttons for approval
 */
const ActionBar: React.FC<ActionBarProps> = ({
  action,
  messageId,
  actionIndex,
  onAction,
  isCompleted = false,
  hasError = false,
  isLoading = false,
  toolColor = $( '--text-secondary'),
}) => {
  const handleClick = React.useCallback(
    (e: React.MouseEvent, type: any) => {
      e.stopPropagation();
      if (!isLoading) {
        onAction(e, type);
      }
    },
    [isLoading, onAction],
  );

  // PRIORITY 1: If completed, don't show anything
  if (isCompleted) {
    return null;
  }

  // PRIORITY 2: If has validation/parsing error, show Skip button
  if (hasError) {
    const errorColor = $( '--error');
    return (
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginTop: '0px',
          marginBottom: '8px',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={(e) => handleClick(e, TOOL_ACTION_TYPES.REJECT)}
          disabled={isLoading}
          style={{
            background: `rgba(${ERROR_RGB}, 0.04)`,
            color: errorColor,
            opacity: 0.85,
            border: `1px solid rgba(${ERROR_RGB}, 0.20)`,
            cursor: isLoading ? 'wait' : 'pointer',
            padding: '5px 8px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 600,
            height: '24px',
            transition: 'all 0.2s ease',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `rgba(${ERROR_RGB}, 0.10)`;
            e.currentTarget.style.borderColor = `rgba(${ERROR_RGB}, 0.35)`;
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.color = `rgba(${ERROR_RGB}, 0.85)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `rgba(${ERROR_RGB}, 0.04)`;
            e.currentTarget.style.borderColor = `rgba(${ERROR_RGB}, 0.20)`;
            e.currentTarget.style.opacity = '0.85';
            e.currentTarget.style.color = errorColor;
          }}
          title="Skip this tool due to error and continue to next tool"
        >
          <span style={{ textTransform: 'none' }}>Skip this tool because of error</span>
        </button>
      </div>
    );
  }

  // PRIORITY 3: If loading, show spinner
  if (isLoading) {
    return (
      <button
        disabled={true}
        style={{
          background: `${toolColor}20`,
          color: toolColor,
          border: `1px solid ${toolColor}40`,
          cursor: 'wait',
          padding: '4px 8px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          fontSize: '12px',
          gap: '6px',
          fontWeight: 600,
          height: '24px',
        }}
        title="Loading..."
      >
        <div
          className="codicon codicon-loading codicon-modifier-spin"
          style={{ fontSize: '14px' }}
        />
      </button>
    );
  }

  // DEFAULT: Show Accept + Reject buttons for approval
  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        marginTop: '0px',
        marginBottom: '8px',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
      }}
    >
      {[
        {
          type: TOOL_ACTION_TYPES.ACCEPT,
          color: toolColor,
          icon: <Check size={14} strokeWidth={2.5} />,
          label: 'Accept',
          title: 'Accept this tool action',
        },
        {
          type: TOOL_ACTION_TYPES.REJECT,
          color: $( '--error'),
          icon: <X size={14} strokeWidth={2.5} />,
          label: 'Reject',
          title: 'Reject this tool action',
        },
      ].map(({ type, color, icon, label, title }) => {
        const isReject = type === TOOL_ACTION_TYPES.REJECT;

        return (
          <button
            key={type}
            onClick={(e) => handleClick(e, type)}
            disabled={isLoading}
            style={{
              background: isReject
                ? `rgba(${ERROR_RGB}, 0.04)`
                : `color-mix(in srgb, ${color} 4%, transparent)`,
              color,
              border: isReject
                ? `1px solid rgba(${ERROR_RGB}, 0.20)`
                : `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
              cursor: isLoading ? 'wait' : 'pointer',
              padding: '5px 8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 600,
              height: '24px',
              transition: 'all 0.2s ease',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isReject
                ? `rgba(${ERROR_RGB}, 0.10)`
                : `color-mix(in srgb, ${color} 12%, transparent)`;
              e.currentTarget.style.borderColor = isReject
                ? `rgba(${ERROR_RGB}, 0.35)`
                : `color-mix(in srgb, ${color} 35%, transparent)`;
              e.currentTarget.style.color = isReject
                ? `rgba(${ERROR_RGB}, 0.85)`
                : `color-mix(in srgb, ${color} 85%, white 15%)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isReject
                ? `rgba(${ERROR_RGB}, 0.04)`
                : `color-mix(in srgb, ${color} 4%, transparent)`;
              e.currentTarget.style.borderColor = isReject
                ? `rgba(${ERROR_RGB}, 0.20)`
                : `color-mix(in srgb, ${color} 20%, transparent)`;
              e.currentTarget.style.color = color;
            }}
            title={title}
          >
            {icon}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ActionBar;