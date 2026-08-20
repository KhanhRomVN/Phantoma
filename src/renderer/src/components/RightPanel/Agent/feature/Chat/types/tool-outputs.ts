/**
 * ------------------------------------------------------------------
 * Tool Output Types
 * ------------------------------------------------------------------
 * Định nghĩa cấu trúc dữ liệu cho output của tool execution.
 *
 * Main types:
 * - ToolOutput  : Output của một tool execution
 * - ToolOutputs : Map từ actionId sang ToolOutput
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
export interface ToolOutput {
  output: string;
  isError: boolean;
  terminalId?: string;
  diagnostics?: Array<{
    severity: string;
    message: string;
    line: number;
    column: number;
    source?: string;
    code?: string | number;
  }>;
}

export type ToolOutputs = Record<string, ToolOutput>;
