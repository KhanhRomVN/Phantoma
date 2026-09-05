/**
 * ------------------------------------------------------------------
 * Inspector Types
 * ------------------------------------------------------------------
 * Type definitions cho WebSocket inspector trong module Emulate.
 * Bao gồm thông tin connection và messages của WebSocket.
 *
 * Các types chính:
 * - NetworkRequest     : Re-export từ shared types
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import type { NetworkRequest } from '@renderer/shared/types/network';

export type { NetworkRequest };
