// Entry point for Emulate feature
// Re-export the main component
export { default } from './Emulate';

// Re-export types with explicit naming to avoid conflicts
export type {
  AppPlatform,
  ToolType,
  HttpMethod,
  InspectorFilter,
  NetworkRequest,
  WebSocketConnection,
  WebSocketMessage,
  PayloadItem,
  HistoryEntry,
  ParamItem,
  FuzzerJob,
  FuzzerResult,
  ResourceItem,
  LogEntry,
  LogLevel,
  SavedCompare,
  TargetTab,
  TargetState,
  EmulateState,
  EmulateProps,
} from './types';

// Re-export constants
export {
  HTTP_METHODS,
  METHOD_COLORS,
  DEFAULT_METHOD,
  PLATFORMS,
  TOOLS,
  DEFAULT_TOOL,
  DEFAULT_FILTER_STATE,
  DEFAULT_TARGET_TAB,
  STORAGE_KEYS,
} from './constants';

// Re-export hooks
export {
  useTargetManagement,
  useRequestFilter,
  useNetworkEvents,
  useTimer,
  useTimerMap,
  usePayloadStorage,
  useRepeaterHistory,
} from './hooks';

// Re-export services
export {
  apiService,
  storageService,
  requestService,
  payloadService,
  filterService,
  logcatService,
} from './services';
