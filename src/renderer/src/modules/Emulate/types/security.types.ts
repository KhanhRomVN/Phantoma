/**
 * ------------------------------------------------------------------
 * Security Types
 * ------------------------------------------------------------------
 * Type definitions cho security scanning trong module Emulate.
 * Bao gồm security finding và kết quả scan.
 *
 * Các types chính:
 * - SecurityFinding    : Một lỗ hổng bảo mật được phát hiện
 * - SecurityScanResult : Kết quả scan cho một target
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import type { SecurityIssue } from '../../Tool/utils/securityScanner';

export { SecurityIssue };

// ─── Types ──────────────────────────────────────────────────────────────
export interface SecurityFinding {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  location: string;
  evidence?: string;
  recommendation?: string;
  status: 'open' | 'in_progress' | 'fixed' | 'ignored';
  createdAt: number;
  updatedAt: number;
}

export interface SecurityScanResult {
  id: string;
  target: string;
  timestamp: number;
  findings: SecurityFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  scanType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}