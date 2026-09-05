/**
 * ------------------------------------------------------------------
 * App Types
 * ------------------------------------------------------------------
 * Type definitions cho ứng dụng (app) trong module Emulate —
 * bao gồm app do người dùng tạo và app được phát hiện
 * tự động (DiscoveredApp).
 *
 * Các types chính:
 * - AppPlatform   : Re-export từ constants/platforms
 * - AppMode       : Chế độ hoạt động (intercept/record/observe)
 * - DiscoveredApp : App được phát hiện tự động từ hệ thống
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import type { AppPlatform } from '../constants/platforms';

export type { AppPlatform };

// ─── Types ──────────────────────────────────────────────────────────────
export type AppMode = 'intercept' | 'record' | 'observe';

export interface DiscoveredApp {
  name: string;
  description?: string;
  icon?: string;
  source?: string;
  confidence?: number;
  tags?: string[];
  discoveredAt?: string;
  platform?: AppPlatform;
  url?: string;
  executablePath?: string;
  packageName?: string;
  exec?: string;
  appSize?: string;
  lastUsed?: string;
  addedToTarget?: boolean;
}
