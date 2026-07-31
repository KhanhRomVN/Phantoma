// Target management types
import { AppPlatform } from '../constants/platforms';
import { ToolType } from '../constants/tools';
import { InspectorFilter } from './filter.types';
import { NetworkRequest } from './inspector';

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

export interface LaunchTargetOptions {
  appId: string;
  proxyUrl: string;
  customUrl?: string;
  mode?: 'browser' | 'electron' | 'native' | 'cdp' | 'frida';
  useEnvInject?: boolean;
}

export interface AppLaunchResult {
  success: boolean;
  pid?: number;
  url?: string;
  error?: string;
}