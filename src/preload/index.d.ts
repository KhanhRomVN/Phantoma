import { ElectronAPI } from '@electron-toolkit/preload';
import { conversationAPI } from './api';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface API {
  conversation: typeof conversationAPI;
  invoke(channel: string, ...args: any[]): Promise<any>;
  send(channel: string, ...args: any[]): void;
  on(channel: string, func: (...args: any[]) => void): (...args: any[]) => void;
  off(channel: string, func: (...args: any[]) => void): void;
  runtime: {
    getPorts(): Promise<{ server: number; emulate: number }>;
    startEmulate(): Promise<{ server: number; emulate: number }>;
  };
  agentTool: {
    discover(config: any): Promise<any>;
    resolvePermission(id: string, approved: boolean): Promise<void>;
    requestPermission(id: string, question: string, options: string[]): Promise<boolean>;
    onPermissionRequest(callback: (data: any) => void): () => void;
    listSessions(config: any): Promise<Array<{ id: string; title: string; updatedAt: number }>>;
    loadSession(
      config: any,
      sessionId: string
    ): Promise<Array<{ role: 'user' | 'assistant'; content: string; thinking?: string; timestamp: number }>>;
    run(request: any): Promise<{ ok: boolean }>;
    interrupt(runId: string): Promise<void>;
    planUsage(kind: string): Promise<import('../shared/types/agent-tool').PlanUsageResult>;
    onEvent(callback: (data: { runId: string; event: any }) => void): () => void;
  };
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ElectronIpcRenderer {}

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: ElectronIpcRenderer;
    };
    api: API;
    electronAPI: API;
  }
}
