/**
 * ------------------------------------------------------------------
 * Target Types
 * ------------------------------------------------------------------
 * Type definitions cho target trong module Emulate.
 * Bao gồm target tab, state, props và launch options.
 *
 * Các types chính:
 * - TargetTab          : Một target trong sidebar
 * - TargetState        : Trạng thái runtime của target
 * - EmulateState       : State tổng thể của module Emulate
 * - EmulateProps       : Props cho Emulate component
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Constants ──
import { ToolType } from '../constants/tools';

// ── Types ──
import { InspectorFilter } from './filter.types';
import { NetworkRequest } from './inspector';

// ─── Types ──────────────────────────────────────────────────────────────
export interface TargetTab {
  id: string;
  title: string;
  favicon?: string;
  icon?: string;
  url?: string;
  platform?: string;
  executablePath?: string;
  startupArgs?: string;
  environment?: Record<string, string>;
  emulatorSerial?: string; // For Android targets
  httpsCount?: number;
  dataUsed?: string;
}

export interface TargetState {
  isActive: boolean;
  mode?: 'mitm' | 'cdp' | 'frida';
  isIntercepting: boolean;
  startTime?: number;
}

export interface EmulateState {
  selectedTool: ToolType;
  targetTabs: TargetTab[];
  activeTargetId: string | null;
  requests: NetworkRequest[];
  selectedId: string | null;
  searchTerm: string;
  targetStates: Record<string, TargetState>;
  // Legacy fields
  isTargetActive: boolean;
  activeTargetMode: 'mitm' | 'cdp' | 'frida' | null;
  isInterceptActive: boolean;
  filter: InspectorFilter;
}

export interface EmulateProps {
  activeAppId?: string;
  _activeAppName?: string;
  onSelectApp?: (
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native' | 'cdp',
  ) => Promise<void>;
  onStopSession?: () => Promise<void>;
}
