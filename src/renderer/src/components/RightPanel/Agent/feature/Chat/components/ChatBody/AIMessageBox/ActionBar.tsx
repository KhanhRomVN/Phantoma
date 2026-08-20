import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';

// Constants
import { TOOL_ACTION_TYPES } from '../../../constants/constants';

// Types
import { ToolAction } from '../../../services/ResponseParser';

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

const ActionBar: React.FC<ActionBarProps> = ({
  onAction,
  isCompleted = false,
  hasError = false,
  isLoading = false,
  toolColor,
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
    return (
      <div className="flex gap-1.5 mt-0 mb-2 flex-wrap justify-end">
        <button
          onClick={(e) => handleClick(e, TOOL_ACTION_TYPES.REJECT)}
          disabled={isLoading}
          className={cn(
            'flex items-center justify-center gap-1.5 px-2 py-[5px] rounded text-[11px] font-semibold h-6 transition-all duration-200',
            'bg-error/4 text-error/85 border border-error/20',
            isLoading ? 'cursor-wait' : 'cursor-pointer',
          )}
          onMouseEnter={(e) => {
            e.currentTarget.className = cn(
              'flex items-center justify-center gap-1.5 px-2 py-[5px] rounded text-[11px] font-semibold h-6 transition-all duration-200',
              'bg-error/10 text-error border border-error/35',
              isLoading ? 'cursor-wait' : 'cursor-pointer',
            );
          }}
          onMouseLeave={(e) => {
            e.currentTarget.className = cn(
              'flex items-center justify-center gap-1.5 px-2 py-[5px] rounded text-[11px] font-semibold h-6 transition-all duration-200',
              'bg-error/4 text-error/85 border border-error/20',
              isLoading ? 'cursor-wait' : 'cursor-pointer',
            );
          }}
          title="Skip this tool due to error and continue to next tool"
        >
          <span>Skip this tool because of error</span>
        </button>
      </div>
    );
  }

  // PRIORITY 3: If loading, show spinner
  if (isLoading) {
    return (
      <button
        disabled={true}
        className={cn(
          'flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold h-6 transition-all duration-200 cursor-wait',
          toolColor ? '' : 'bg-primary/12 text-primary border border-primary/25',
        )}
        style={
          toolColor
            ? {
                background: `${toolColor}20`,
                color: toolColor,
                border: `1px solid ${toolColor}40`,
              }
            : undefined
        }
        title="Loading..."
      >
        <div className="codicon codicon-loading codicon-modifier-spin text-sm" />
      </button>
    );
  }

  // DEFAULT: Show Accept + Reject buttons for approval
  return (
    <div className="flex gap-1.5 mt-0 mb-2 flex-wrap justify-end">
      {/* Accept button */}
      <button
        onClick={(e) => handleClick(e, TOOL_ACTION_TYPES.ACCEPT)}
        disabled={isLoading}
        className={cn(
          'flex items-center justify-center gap-1.5 px-2 py-[5px] rounded text-[11px] font-semibold h-6 transition-all duration-200',
          isLoading ? 'cursor-wait' : 'cursor-pointer',
          toolColor ? '' : 'bg-primary/4 text-primary border border-primary/20',
        )}
        style={
          toolColor
            ? {
                background: `color-mix(in srgb, ${toolColor} 4%, transparent)`,
                color: toolColor,
                border: `1px solid color-mix(in srgb, ${toolColor} 20%, transparent)`,
              }
            : undefined
        }
        onMouseEnter={(e) => {
          if (toolColor) {
            e.currentTarget.style.background = `color-mix(in srgb, ${toolColor} 12%, transparent)`;
            e.currentTarget.style.borderColor = `color-mix(in srgb, ${toolColor} 35%, transparent)`;
          }
        }}
        onMouseLeave={(e) => {
          if (toolColor) {
            e.currentTarget.style.background = `color-mix(in srgb, ${toolColor} 4%, transparent)`;
            e.currentTarget.style.borderColor = `color-mix(in srgb, ${toolColor} 20%, transparent)`;
          }
        }}
        title="Accept this tool action"
      >
        <Check size={14} strokeWidth={2.5} />
        <span>Accept</span>
      </button>

      {/* Reject button */}
      <button
        onClick={(e) => handleClick(e, TOOL_ACTION_TYPES.REJECT)}
        disabled={isLoading}
        className={cn(
          'flex items-center justify-center gap-1.5 px-2 py-[5px] rounded text-[11px] font-semibold h-6 transition-all duration-200',
          'bg-error/4 text-error border border-error/20',
          isLoading ? 'cursor-wait' : 'cursor-pointer',
        )}
        onMouseEnter={(e) => {
          e.currentTarget.className = cn(
            'flex items-center justify-center gap-1.5 px-2 py-[5px] rounded text-[11px] font-semibold h-6 transition-all duration-200',
            'bg-error/10 text-error border border-error/35',
            isLoading ? 'cursor-wait' : 'cursor-pointer',
          );
        }}
        onMouseLeave={(e) => {
          e.currentTarget.className = cn(
            'flex items-center justify-center gap-1.5 px-2 py-[5px] rounded text-[11px] font-semibold h-6 transition-all duration-200',
            'bg-error/4 text-error border border-error/20',
            isLoading ? 'cursor-wait' : 'cursor-pointer',
          );
        }}
        title="Reject this tool action"
      >
        <X size={14} strokeWidth={2.5} />
        <span>Reject</span>
      </button>
    </div>
  );
};

export default ActionBar;
