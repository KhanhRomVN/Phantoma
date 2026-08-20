import React from 'react';
import { $ } from '@renderer/utils/color';

// Components
import WarningBlock from '../../blocks/other/WarningBlock';
import { TagHeader } from '../../TagHeader';

interface WarningRendererProps {
  label: string;
  message: string;
  warningColor?: string;
  isPulsing?: boolean;
}

/**
 * Renderer cho block cảnh báo
 * Hiển thị thông điệp cảnh báo với hiệu ứng nhấp nháy tùy chọn
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
      <WarningBlock message={message} warningColor={warningColor} />
    </div>
  );
};
