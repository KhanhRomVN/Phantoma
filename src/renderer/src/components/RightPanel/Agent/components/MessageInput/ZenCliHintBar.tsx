import * as React from "react";
import { $ } from '@renderer/utils/color';
import { extensionService } from "../../services/ExtensionService";

const ZENCLI_URL = "https://www.npmjs.com/package/@khanhromvn/zencli";

/**
 * Thanh hint ZenCLI — bậc 3 của MessageInput (dưới textarea + toolbar).
 * - Width 100%, height auto theo content (1 dòng text).
 * - Text căn phải, padding-top/bottom 4px.
 * - KHÔNG có background, border, outline nào cả.
 * - Click bất kỳ đâu → mở link npmjs trong browser mặc định của hệ điều hành
 *   (thông qua command `openExternalUrl` ở extension host).
 * - Màu: nhạt hơn (text-secondary), giảm fontSize xuống 10px.
 */
export const ZenCliHintBar: React.FC<{ isClaudeProvider: boolean }> = ({
  isClaudeProvider,
}) => {
  const color = isClaudeProvider ? $('--error') : $('--text-secondary');

  const title = isClaudeProvider
    ? "Use ZenCLI to avoid Claude path errors"
    : "Prefer terminal? Try ZenCLI";

  const handleClick = React.useCallback(() => {
    extensionService.postMessage({ command: "openExternalUrl", url: ZENCLI_URL });
  }, []);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "4px 12px 0 12px",
        fontSize: "10px",
        lineHeight: 1.4,
        textAlign: "right",
        color,
        cursor: "pointer",
        userSelect: "none",
        transition: "opacity 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "0.7";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      title={ZENCLI_URL}
    >
      {title}
    </div>
  );
};