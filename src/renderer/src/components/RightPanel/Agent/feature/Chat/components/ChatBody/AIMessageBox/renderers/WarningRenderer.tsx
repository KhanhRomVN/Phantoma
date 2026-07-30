import React from 'react';
import { $ } from '@renderer/utils/color';

// COMPONENTS
import WarningBlock from '../blocks/WarningBlock';
import { TagHeader } from '../TagHeader';

interface WarningRendererProps {
  label: string;
  message: string;
  warningColor?: string;
  isPulsing?: boolean;
}

/**
 * Renderer for warning blocks
 * Displays warning messages with optional pulsing animation
 */
export const WarningRenderer: React.FC<WarningRendererProps> = ({
  label,
  message,
  warningColor = $('--warn'),
  isPulsing = false,
}) => {
  return (
    <div className="flex flex-col gap-1">
      <TagHeader
        title={label}
        statusColor={warningColor}
        isPartial={isPulsing}
        statusTooltip="Warning"
      />
      <WarningBlock
        message={message}
        warningColor={warningColor}
      />
    </div>
  );
};