import React from 'react';

interface WarningBlockProps {
  message: string;
  warningColor?: string;
}

/**
 * WarningBlock component — chỉ hiển thị nội dung thông điệp cảnh báo.
 * Header được xử lý bởi WarningRenderer sử dụng TagHeader.
 */
const WarningBlock: React.FC<WarningBlockProps> = ({
  message,
}) => {
  return (
    <div className="relative flex flex-col gap-1.5 pb-0">
      {/* Warning Message Block */}
      {message && (
        <div className="border border-warn/30 bg-warn/5 rounded-md px-4 py-3">
          <span className="text-warn text-[11px] leading-relaxed block">
            {message}
          </span>
        </div>
      )}
    </div>
  );
};

export default WarningBlock;