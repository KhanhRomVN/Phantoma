import React from 'react';
import { Plus, X, Zap, ShieldCheck } from 'lucide-react';
import { logger } from '@renderer/utils/logger';
import { useServerHealth } from '@renderer/providers/ServerHealthProvider';
import { useSettings } from '@renderer/components/RightPanel/Agent/context/SettingsContext';
import { LANGUAGES } from '../../feature/Setting/components/LanguageSelector';
import { combinePromptsForMode } from '../../feature/Chat/prompts/code';
import type { SystemInfo } from '../../feature/Chat/prompts/code';
import ModelAccountDrawer from './ModelAccountDrawer';
import StyleCodeDropdown, {
  StyleCodeTriggerIcon,
  STYLE_CODE_MODE_META,
} from './StyleCodeDropdown';
import PromptLengthDropdown, {
  PromptLengthTriggerIcon,
  PROMPT_LENGTH_MODE_META,
} from './PromptLengthDropdown';
import ActionDropdown from './ActionDropdown';
import { getFaviconUrl } from '@renderer/utils/favicon';
import { getClientId } from '@renderer/utils/clientId';
import { countTokens } from '@renderer/utils/tokenizer';
import { buildAcceptString } from '../../feature/Chat/utils/fileUtils';
import type { MessageInputProps, UploadedFile, ToggleButtonProps } from './types';

export type { UploadedFile };

// ============================================================================
// ICONS
// ============================================================================

const BrainCogIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-brain-cog-icon lucide-brain-cog"
  >
    <path d="m10.852 14.772-.383.923" />
    <path d="m10.852 9.228-.383-.923" />
    <path d="m13.148 14.772.382.924" />
    <path d="m13.531 8.305-.383.923" />
    <path d="m14.772 10.852.923-.383" />
    <path d="m14.772 13.148.923.383" />
    <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 0 0-5.63-1.446 3 3 0 0 0-.368 1.571 4 4 0 0 0-2.525 5.771" />
    <path d="M17.998 5.125a4 4 0 0 1 2.525 5.771" />
    <path d="M19.505 10.294a4 4 0 0 1-1.5 7.706" />
    <path d="M4.032 17.483A4 4 0 0 0 11.464 20c.18-.311.892-.311 1.072 0a4 4 0 0 0 7.432-2.516" />
    <path d="M4.5 10.291A4 4 0 0 0 6 18" />
    <path d="M6.002 5.125a3 3 0 0 0 .4 1.375" />
    <path d="m9.228 10.852-.923-.383" />
    <path d="m9.228 13.148-.923.383" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const GlobeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-globe-icon lucide-globe"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

const MemoryIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-database-icon lucide-database"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 12a9 3 0 0 0 18 0" />
    <path d="M3 5v14a9 3 0 0 0 18 0V5" />
  </svg>
);

const formatTokenCount = (count: number): string => {
  if (count < 1000) {
    return count.toString();
  } else if (count < 1000000) {
    const k = count / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  } else {
    const m = count / 1000000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useToggleState = (key: string, defaultValue: boolean = false) => {
  const [state, setState] = React.useState(() => {
    try {
      return localStorage.getItem(key) === 'true';
    } catch {
      return defaultValue;
    }
  });

  const toggle = React.useCallback(() => {
    setState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(key, String(next));
      } catch {}
      return next;
    });
  }, [key]);

  return [state, toggle, setState] as const;
};

const useModelCapabilities = (
  currentModel: any,
  currentModelConfig: any,
  currentProviderConfig: any,
) => {
  const showThinkingButton = React.useMemo(() => {
    return currentModel?.is_thinking !== undefined
      ? !!currentModel.is_thinking
      : !!currentModelConfig?.is_thinking;
  }, [currentModel, currentModelConfig]);

  const showSearchButton = React.useMemo(() => {
    let result: boolean;
    if (currentModel?.is_search !== undefined) {
      result = !!currentModel.is_search;
    } else if (currentModelConfig?.is_search !== undefined) {
      result = !!currentModelConfig.is_search;
    } else {
      result = !!currentProviderConfig?.is_search;
    }
    return result;
  }, [currentModel, currentModelConfig, currentProviderConfig]);

  const showMemoryButton = React.useMemo(() => {
    return currentModel?.is_memory === true;
  }, [currentModel]);

  const supportsUpload = React.useMemo(() => {
    if (currentModel?.is_image_upload !== undefined) {
      return !!currentModel.is_image_upload;
    } else if (currentModelConfig?.is_image_upload !== undefined) {
      return !!currentModelConfig.is_image_upload;
    }
    return false;
  }, [currentModel, currentProviderConfig, currentModelConfig]);

  const supportsImageGenerator = React.useMemo(() => {
    return currentModel?.is_image_generator === true;
  }, [currentModel]);

  const supportsVideoGenerator = React.useMemo(() => {
    return currentModel?.is_video_generator === true;
  }, [currentModel]);

  const supportsDeepResearch = React.useMemo(() => {
    return currentModel?.is_deep_research === true;
  }, [currentModel]);

  return {
    showThinkingButton,
    showSearchButton,
    showMemoryButton,
    supportsUpload,
    supportsImageGenerator,
    supportsVideoGenerator,
    supportsDeepResearch,
  };
};

const useProvidersConfig = (currentModel: any, providers: any[]) => {
  const currentProviderConfig = React.useMemo(() => {
    if (!currentModel?.providerId) {
      return null;
    }
    const found = providers.find(
      (p) => p.provider_id?.toLowerCase() === currentModel.providerId?.toLowerCase(),
    );
    return found ?? null;
  }, [currentModel, providers]);

  const currentModelConfig = React.useMemo(() => {
    if (!currentProviderConfig || !currentModel?.id) {
      return null;
    }
    const found = currentProviderConfig.models?.find(
      (m: any) => m.id?.toLowerCase() === currentModel.id?.toLowerCase(),
    );
    return found ?? null;
  }, [currentProviderConfig, currentModel]);

  return { currentProviderConfig, currentModelConfig };
};

const useTextareaAutoResize = (
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  message: string,
) => {
  const rafIdRef = React.useRef<number | null>(null);
  const lastResizeTime = React.useRef(performance.now());

  React.useEffect(() => {
    const msgLength = message?.length || 0;
    const now = performance.now();
    lastResizeTime.current = now;

    // Cancel any pending resize
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Skip auto-resize for very large text (>50k chars) — use fixed max height.
    const isVeryLargeText = msgLength > 50000;

    if (isVeryLargeText) {
      const el = textareaRef.current;
      if (el) {
        el.style.height = '240px';
        el.style.overflowY = 'auto';
      }
      return;
    }

    rafIdRef.current = requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;

      el.style.height = 'auto';
      const maxHeight = 240;
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';

      rafIdRef.current = null;
    });

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [message, textareaRef]);
};

const useModelSelection = (
  folderPath: string | null | undefined,
  setCurrentModel: (model: any) => void,
  setCurrentAccount: (account: any) => void,
  currentModel: any,
  currentAccount: any,
) => {
  const [isLoadingCache, setIsLoadingCache] = React.useState(true);
  const pendingAccountIdRef = React.useRef<string | null>(null);
  const currentModelRef = React.useRef<any>(null);
  const currentAccountRef = React.useRef<any>(null);

  currentModelRef.current = currentModel;
  currentAccountRef.current = currentAccount;

  // Load saved selection
  React.useEffect(() => {
    let cancelled = false;
    setIsLoadingCache(true);
    const key = `zen-model-selection:${folderPath || 'global'}`;

    const applyCache = (saved: any) => {
      if (cancelled) return;
      if (saved.model && !currentModelRef.current) setCurrentModel(saved.model);
      if (saved.accountId && !currentAccountRef.current) {
        pendingAccountIdRef.current = saved.accountId;
        if (saved.email) {
          setCurrentAccount({ id: saved.accountId, email: saved.email });
        }
      }
    };

    try {
      const savedStr = localStorage.getItem(key);
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        applyCache(saved);
        setIsLoadingCache(false);
      } else {
        const storage = (window as any).storage;
        if (storage) {
          storage
            .get(key)
            .then((res: any) => {
              if (cancelled) return;
              if (res?.value) {
                const saved = JSON.parse(res.value);
                applyCache(saved);
                try {
                  localStorage.setItem(key, res.value);
                } catch {}
              }
              setIsLoadingCache(false);
            })
            .catch(() => {
              if (!cancelled) setIsLoadingCache(false);
            });
        } else {
          setIsLoadingCache(false);
        }
      }
    } catch (e) {
      setIsLoadingCache(false);
    }

    return () => {
      cancelled = true;
    };
  }, [folderPath, setCurrentModel, setCurrentAccount]);

  // Save selection
  React.useEffect(() => {
    if (currentModel) {
      const key = `zen-model-selection:${folderPath || 'global'}`;
      const data = {
        model: currentModel,
        accountId: currentAccount?.id,
        email: currentAccount?.email,
      };
      const dataStr = JSON.stringify(data);
      try {
        localStorage.setItem(key, dataStr);
      } catch (e) {
        logger.warn('[MessageInput] Failed to save model selection:', e);
      }

      const storage = (window as any).storage;
      if (storage) {
        storage.set(key, dataStr);
      }
    }
  }, [currentModel, currentAccount, folderPath]);

  return { isLoadingCache, pendingAccountIdRef };
};

// ============================================================================
// TOGGLE BUTTONS
// ============================================================================

/**
 * Icon-only toggle button dùng chung cho Thinking / Search / Memory.
 * `accentColor` xác định màu khi ON.
 */
const IconToggleButton: React.FC<
  ToggleButtonProps & { accentColor: string; children: React.ReactNode }
> = ({ isOn, onClick, title, accentColor, children }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '24px',
        width: '24px',
        boxSizing: 'border-box',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'all 0.15s ease-in-out',
        border: '1px solid transparent',
        background: isOn
          ? isHovered
            ? `color-mix(in srgb, ${accentColor} 22%, transparent)`
            : `color-mix(in srgb, ${accentColor} 14%, transparent)`
          : isHovered
            ? 'rgba(128, 128, 128, 0.16)'
            : 'transparent',
        color: isOn ? accentColor : 'rgb(var(--text-primary))',
        opacity: isOn ? 1 : isHovered ? 1 : 0.75,
        padding: 0,
      }}
      title={title}
    >
      {children}
    </button>
  );
};

const ThinkingButton: React.FC<ToggleButtonProps> = (props) => (
  <IconToggleButton {...props} accentColor="#a855f7">
    <BrainCogIcon />
  </IconToggleButton>
);

const SearchButton: React.FC<ToggleButtonProps> = (props) => (
  <IconToggleButton {...props} accentColor="#0ea5e9">
    <GlobeIcon />
  </IconToggleButton>
);

const MemoryButton: React.FC<ToggleButtonProps> = (props) => (
  <IconToggleButton {...props} accentColor="#8b5cf6">
    <MemoryIcon />
  </IconToggleButton>
);

// ============================================================================
// GLOBAL PERMISSION BUTTON
// ============================================================================

/** Metadata cho các permission mode — dùng cho trigger + panel + tooltip. */
const PERMISSION_MODE: Record<
  string,
  { label: string; desc: string; icon: React.ReactNode; color: string }
> = {
  fullAccess: {
    label: 'Full Access',
    desc: 'AI has unrestricted access to all project files and tools',
    icon: <Zap size={11} />,
    color: '#f59e0b',
  },
  approval: {
    label: 'Approval Required',
    desc: 'AI must request explicit approval before accessing files or running commands',
    icon: <ShieldCheck size={11} />,
    color: '#3b82f6',
  },
};

const GlobalPermissionButton: React.FC = () => {
  const { permissionMode, setPermissionMode } = useSettings();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = React.useState(false);
  const [tooltip, setTooltip] = React.useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const tooltipTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      setTooltip(null);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    }
  }, [open]);

  const handleItemMouseEnter = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.parentElement) return;
    if (
      !e.currentTarget.style.backgroundColor ||
      e.currentTarget.style.backgroundColor === 'transparent'
    ) {
      e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
    }
    const rect = e.currentTarget.getBoundingClientRect();
    tooltipTimer.current = setTimeout(() => {
      setTooltip({ id, x: rect.right + 6, y: rect.top });
    }, 500);
  };

  const handleItemMouseLeave = (isSelected: boolean, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(null);
  };

  const metadata = PERMISSION_MODE[permissionMode] || PERMISSION_MODE.fullAccess;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0 8px',
          height: '22px',
          boxSizing: 'border-box',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.3px',
          transition: 'all 0.2s ease-in-out',
          border: `1px solid ${metadata.color}40`,
          background: isHovered
            ? `color-mix(in srgb, ${metadata.color} 20%, transparent)`
            : `color-mix(in srgb, ${metadata.color} 12%, transparent)`,
          color: metadata.color,
          opacity: 1,
          lineHeight: 1,
          verticalAlign: 'middle',
        }}
        title="Tool permission mode"
      >
        {metadata.icon}
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.3px' }}>
          {metadata.label}
        </span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1000,
            backgroundColor:
              'var(--vscode-dropdown-background, var(--vscode-editorHoverWidget-background, #252526))',
            border: '1px solid var(--vscode-widget-border, var(--border-color, #454545))',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.35)',
            minWidth: '180px',
          }}
        >
          {Object.entries(PERMISSION_MODE).map(([modeId, meta]) => {
            const isSelected = permissionMode === modeId;
            return (
              <button
                key={modeId}
                onClick={() => {
                  setPermissionMode(modeId as any);
                  setOpen(false);
                  setTooltip(null);
                  if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '7px 12px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--vscode-button-background)' : 'transparent',
                  color: isSelected
                    ? 'var(--vscode-button-foreground)'
                    : 'var(--vscode-foreground)',
                }}
                onMouseEnter={(e) => handleItemMouseEnter(modeId, e)}
                onMouseLeave={(e) => handleItemMouseLeave(isSelected, e)}
              >
                <span
                  style={{
                    color: isSelected ? 'inherit' : meta.color,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {meta.icon}
                </span>
                {meta.label}
              </button>
            );
          })}
        </div>
      )}
      {tooltip && PERMISSION_MODE[tooltip.id] && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 9999,
            backgroundColor: 'var(--vscode-editorHoverWidget-background, #1e1e1e)',
            border: '1px solid var(--vscode-editorHoverWidget-border, #454545)',
            borderRadius: '6px',
            padding: '8px 10px',
            maxWidth: '220px',
            fontSize: '11px',
            color: 'var(--vscode-foreground)',
            lineHeight: 1.5,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: '3px',
              color: PERMISSION_MODE[tooltip.id].color,
            }}
          >
            {PERMISSION_MODE[tooltip.id].label}
          </div>
          {PERMISSION_MODE[tooltip.id].desc}
        </div>
      )}
    </div>
  );
};

const PROMPT_HISTORY_KEY = 'zen:user_prompt_history';
const MAX_PROMPT_HISTORY = 50;

const getStoredPromptHistory = (): string[] => {
  try {
    const raw = localStorage.getItem(PROMPT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const savePromptToHistory = (prompt: string) => {
  if (!prompt || !prompt.trim()) return;
  const clean = prompt.trim();
  try {
    const history = getStoredPromptHistory().filter((p) => p !== clean);
    history.push(clean);
    if (history.length > MAX_PROMPT_HISTORY) {
      history.splice(0, history.length - MAX_PROMPT_HISTORY);
    }
    localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(history));
  } catch {}
};

const MessageInput: React.FC<MessageInputProps> = React.memo(
  ({
    message,
    setMessage,
    isHistoryMode = false,
    uploadedFiles,
    attachedItems = [],
    textareaRef,
    handleTextareaChange,
    handleKeyDown,
    handlePaste,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    fileInputRef,
    onOpenProjectStructure,
    showChangesDropdown,
    setShowChangesDropdown,
    messages,
    handleSend,
    hasProjectContext,
    onOpenProjectContext,
    folderPath,
    isConversationStarted,
    currentModel,
    setCurrentModel,
    currentAccount,
    setCurrentAccount,
    isProcessing,
    isStreaming,
    onStopGeneration,
    showBrowserWarning = false,
    isLaunchingBrowser = false,
    onLaunchBrowserSession,
    onGitPullRequest,
    isGitLoading = false,
    isGitStatusVisible = false,
    gitStatus,
    onOpenGitStatus,
    conversationFileStats,
    onReviewClick,
    responseRange,
    responseRanges = [],
    onOpenModelDrawer,
    onModelSwitch,
    enableViewOnlyMode = false,
  }) => {
    // Prompt History Navigation State (ArrowUp / ArrowDown)
    const historyIndexRef = React.useRef<number>(-1);
    const tempDraftRef = React.useRef<string>('');

    const getCombinedPromptHistory = React.useCallback((): string[] => {
      const currentChatUserPrompts = (messages || [])
        .filter(
          (m: any) =>
            m &&
            (m.sender === 'user' || m.role === 'user') &&
            m.content &&
            typeof m.content === 'string' &&
            m.content.trim(),
        )
        .map((m: any) => m.content.trim());

      const stored = getStoredPromptHistory();
      const combined = [...stored];
      for (const p of currentChatUserPrompts) {
        if (!combined.includes(p)) {
          combined.push(p);
        }
      }
      return combined.filter(Boolean);
    }, [messages]);

    const handlePromptHistoryKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'ArrowUp') {
        const target = e.currentTarget;
        const textBeforeCursor = target.value.substring(0, target.selectionStart);
        const isAtFirstLine = !textBeforeCursor.includes('\n');
        const isNavigating = historyIndexRef.current >= 0;

        if (isAtFirstLine || isNavigating) {
          const history = getCombinedPromptHistory();
          if (history.length === 0) return;

          if (!isNavigating) {
            tempDraftRef.current = message;
          }

          const nextIndex = historyIndexRef.current + 1;
          if (nextIndex < history.length) {
            e.preventDefault();
            historyIndexRef.current = nextIndex;
            const promptText = history[history.length - 1 - nextIndex];
            setMessage(promptText);
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = promptText.length;
                textareaRef.current.selectionEnd = promptText.length;
              }
            }, 0);
          }
        }
      } else if (e.key === 'ArrowDown') {
        if (historyIndexRef.current >= 0) {
          const target = e.currentTarget;
          const textAfterCursor = target.value.substring(target.selectionEnd);
          const isAtLastLine = !textAfterCursor.includes('\n');

          if (isAtLastLine) {
            const history = getCombinedPromptHistory();
            const prevIndex = historyIndexRef.current - 1;

            e.preventDefault();
            if (prevIndex >= 0) {
              historyIndexRef.current = prevIndex;
              const promptText = history[history.length - 1 - prevIndex];
              setMessage(promptText);
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.selectionStart = promptText.length;
                  textareaRef.current.selectionEnd = promptText.length;
                }
              }, 0);
            } else {
              historyIndexRef.current = -1;
              const draft = tempDraftRef.current;
              setMessage(draft);
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.selectionStart = draft.length;
                  textareaRef.current.selectionEnd = draft.length;
                }
              }, 0);
            }
          }
        }
      }
    };

    const onSendMessage = () => {
      if (isTokenLimitExceeded) {
        return;
      }
      if (message.trim()) {
        savePromptToHistory(message);
      }
      historyIndexRef.current = -1;
      tempDraftRef.current = '';
      handleSend(currentModel, currentAccount);
    };

    const { isValid: isConnected } = useServerHealth();
    const {
      apiUrl,
      aiLanguage: preferredLanguage,
      systemPromptMode,
      setSystemPromptMode,
      promptLengthMode,
      setPromptLengthMode,
    } = useSettings();

    const [providers, setProviders] = React.useState<any[]>([]);
    const [showModelDrawer, setShowModelDrawer] = React.useState(false);
    const [isSystemPromptHovered, setIsSystemPromptHovered] = React.useState(false);
    const [isPromptLengthHovered, setIsPromptLengthHovered] = React.useState(false);

    const [pendingModelSwitch, setPendingModelSwitch] = React.useState<{
      model: any;
      account: any;
    } | null>(null);
    const [isModelSwitchMode, setIsModelSwitchMode] = React.useState(false);
    const [isPlusHovered, setIsPlusHovered] = React.useState(false);

    // Use custom hooks
    const [isThinking, toggleThinking, setIsThinking] = useToggleState('zen-thinking-enabled');
    const [isSearch, toggleSearch, setIsSearch] = useToggleState('zen-search-enabled');
    const [isMemory, , setIsMemory] = useToggleState('zen-memory-enabled');

    const { isLoadingCache, pendingAccountIdRef } = useModelSelection(
      folderPath,
      setCurrentModel,
      setCurrentAccount,
      currentModel,
      currentAccount,
    );

    // ─── Presence heartbeat ──────────────────────────────────────────
    // Báo cho backend biết cửa sổ này đang active account nào, để các
    // cửa sổ khác thấy badge "In use". Gửi ngay khi account đổi và lặp
    // lại mỗi 20s; release account cũ khi đổi/đóng.
    React.useEffect(() => {
      const accountId = currentAccount?.id;
      if (!accountId) return;
      const clientId = getClientId();
      let cancelled = false;
      const beat = () => {
        if (cancelled) return;
        fetch(`${apiUrl}/v1/accounts/${accountId}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId }),
        }).catch(() => {});
      };
      beat();
      const intervalId = setInterval(beat, 20000);
      return () => {
        cancelled = true;
        clearInterval(intervalId);
        fetch(
          `${apiUrl}/v1/accounts/${accountId}/presence?clientId=${encodeURIComponent(clientId)}`,
          { method: 'DELETE' },
        ).catch(() => {});
      };
    }, [currentAccount?.id, apiUrl]);

    const { currentProviderConfig, currentModelConfig } = useProvidersConfig(
      currentModel,
      providers,
    );

    // ─── View-only mode detection ────────────────────────────────────
    // Provider không cần auth (auth_method rỗng) CHỈ disable input
    // khi conversation được load từ History (có conversationFileStats).
    // Conversation mới tạo → không disable
    const isViewOnlyProvider = React.useMemo(() => {
      if (!enableViewOnlyMode) return false;
      if (!currentProviderConfig) return false;

      const isLoadedFromHistory = conversationFileStats != null;
      if (!isLoadedFromHistory) return false;

      const authMethod = currentProviderConfig.auth_method;
      return Array.isArray(authMethod) && authMethod.length === 0;
    }, [enableViewOnlyMode, currentProviderConfig, conversationFileStats]);

    const {
      showThinkingButton,
      showSearchButton,
      showMemoryButton,
      supportsUpload,
      supportsImageGenerator,
      supportsVideoGenerator,
      supportsDeepResearch,
    } = useModelCapabilities(currentModel, currentModelConfig, currentProviderConfig);

    useTextareaAutoResize(textareaRef, message);

    const displayModel = React.useMemo(() => {
      return currentModel || null;
    }, [currentModel]);

    const displayAccount = React.useMemo(() => {
      return currentAccount || null;
    }, [currentAccount]);

    // Dynamic placeholder text
    const placeholderText = React.useMemo(() => {
      if (isHistoryMode) {
        return 'History mode - enter a search query';
      }
      if (!isConnected) {
        return 'Connecting to backend...';
      }
      if (isLoadingCache) {
        return 'Loading cache...';
      }
      if (isProcessing) {
        return 'Processing...';
      }
      if (isViewOnlyProvider) {
        return 'This provider does not require authentication';
      }
      if (!currentModel) {
        return 'Select a model to start';
      }
      if (!currentAccount) {
        return 'Select an account to start';
      }

      const hints: string[] = [];
      hints.push('@agent');
      if (supportsUpload) {
        hints.push('attach files');
      }
      if (showThinkingButton) {
        hints.push('🧠 thinking');
      }
      if (showSearchButton) {
        hints.push('🔍 search');
      }
      if (showMemoryButton) {
        hints.push('💾 memory');
      }

      return hints.length > 1
        ? `Message ${hints[0]} (Alt+@) · ${hints.slice(1).join(' · ')}`
        : `Message ${hints[0]} (Alt+@)`;
    }, [
      isHistoryMode,
      isConnected,
      isLoadingCache,
      isProcessing,
      isViewOnlyProvider,
      currentModel,
      currentAccount,
      supportsUpload,
      showThinkingButton,
      showSearchButton,
      showMemoryButton,
    ]);

    // Calculate token count for message input (including system prompt + text snippets)
    const messageTokenCount = React.useMemo(() => {
      let totalTokens = countTokens(message);

      if (attachedItems && attachedItems.length > 0) {
        attachedItems.forEach((item: any) => {
          if (item.type === 'text-snippet' && item.content) {
            totalTokens += countTokens(item.content);
          }
        });
      }

      // Add system prompt tokens (only for first message in conversation)
      if (!isConversationStarted) {
        try {
          const systemPrompt = combinePromptsForMode(
            {
              language: preferredLanguage,
              systemInfo: {
                os: 'Unknown OS',
                ide: 'Zen IDE',
                shell: 'unknown',
                homeDir: '~',
                cwd: folderPath || '.',
                language: preferredLanguage,
              } as SystemInfo,
            },
            systemPromptMode,
          );
          totalTokens += countTokens(systemPrompt);
        } catch (e) {
          logger.warn('[MessageInput] Failed to calculate system prompt tokens:', e);
        }
      }

      return totalTokens;
    }, [
      message,
      isConversationStarted,
      preferredLanguage,
      systemPromptMode,
      folderPath,
      JSON.stringify(
        attachedItems?.map((item: any) => ({
          id: item.id,
          type: item.type,
          contentLength: item.content?.length || 0,
        })),
      ),
    ]);

    // Get max input tokens from model config
    const maxInputTokens = React.useMemo(() => {
      return currentModelConfig?.max_input_tokens || null;
    }, [currentModelConfig]);

    const isTokenLimitExceeded = React.useMemo(() => {
      return maxInputTokens !== null && messageTokenCount > maxInputTokens;
    }, [messageTokenCount, maxInputTokens]);

    const toggleMemory = async () => {
      if (!currentAccount?.id) {
        logger.warn('[MessageInput] No account selected, cannot toggle memory');
        return;
      }

      const newState = !isMemory;
      setIsMemory(newState);
      localStorage.setItem('zen-memory-enabled', String(newState));

      try {
        const response = await fetch(`${apiUrl}/v1/accounts/${currentAccount.id}/memory`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_memory_enabled: newState }),
        });
        const result = await response.json();
        if (!result.success) {
          setIsMemory(!newState);
          localStorage.setItem('zen-memory-enabled', String(!newState));
          logger.error('Failed to update memory state on server:', result.message);
        }
      } catch (error) {
        setIsMemory(!newState);
        localStorage.setItem('zen-memory-enabled', String(!newState));
        logger.error('Failed to sync memory state with server:', error);
      }
    };

    const fetchProviders = React.useCallback(async () => {
      try {
        const response = await fetch(`${apiUrl}/v1/providers`);
        const result = await response.json();
        if (result.success) {
          setProviders(result.data.filter((p: any) => p.is_enabled));
        }
      } catch (error) {
        logger.warn('[MessageInput] Failed to fetch providers:', error);
      }
    }, [apiUrl]);

    // Initial fetch
    React.useEffect(() => {
      fetchProviders();
    }, [fetchProviders]);

    // Re-fetch providers every time the model drawer opens so stale data
    // (e.g. "No accounts" after user just added an account) is never shown.
    React.useEffect(() => {
      if (showModelDrawer) {
        fetchProviders();
      }
    }, [showModelDrawer, fetchProviders]);

    // Close model drawer when user navigates to another panel so the drawer
    // doesn't linger behind when they come back.
    React.useEffect(() => {
      const handler = () => setShowModelDrawer(false);
      window.addEventListener('zen:panel-change', handler);
      return () => window.removeEventListener('zen:panel-change', handler);
    }, []);

    // Validation: check if currentModel and currentAccount still exist after providers loaded
    React.useEffect(() => {
      if (providers.length === 0 || isLoadingCache) return;

      let needsReset = false;

      if (currentModel?.id && currentModel?.providerId) {
        const provider = providers.find(
          (p: any) => p.provider_id?.toLowerCase() === currentModel.providerId?.toLowerCase(),
        );

        if (!provider) {
          needsReset = true;
        } else {
          const modelExists = provider.models?.some(
            (m: any) => m.id?.toLowerCase() === currentModel.id?.toLowerCase(),
          );
          if (!modelExists) {
            needsReset = true;
          }
        }
      }

      if (currentAccount?.id && currentModel?.providerId && !needsReset) {
        const validateAccount = async () => {
          try {
            const response = await fetch(
              `${apiUrl}/v1/accounts?page=1&limit=50&provider_id=${currentModel.providerId}`,
            );
            const result = await response.json();

            if (result.success && result.data?.accounts) {
              const matchedAccount = result.data.accounts.find(
                (a: any) => a.id === currentAccount.id,
              );

              if (!matchedAccount) {
                setCurrentModel(null);
                setCurrentAccount(null);
              } else if (matchedAccount.email && matchedAccount.email !== currentAccount.email) {
                setCurrentAccount({
                  ...currentAccount,
                  email: matchedAccount.email,
                });
              }
            }
          } catch (error) {
            logger.warn('[MessageInput] Failed to validate account:', error);
          }
        };

        validateAccount();
      }

      if (needsReset) {
        setCurrentModel(null);
        setCurrentAccount(null);
      }
    }, [
      providers,
      currentModel,
      currentAccount,
      isLoadingCache,
      apiUrl,
      setCurrentModel,
      setCurrentAccount,
    ]);

    // Sync thinking and search toggles when model changes
    React.useEffect(() => {
      if (providers.length === 0 || !currentModel) {
        return;
      }
      const hasThinking =
        currentModel?.is_thinking !== undefined
          ? !!currentModel.is_thinking
          : !!currentModelConfig?.is_thinking;
      const hasSearch =
        currentModel?.is_search !== undefined
          ? !!currentModel.is_search || !!currentProviderConfig?.is_search
          : !!currentModelConfig?.is_search || !!currentProviderConfig?.is_search;

      if (!hasThinking && isThinking) {
        setIsThinking(false);
        try {
          localStorage.setItem('zen-thinking-enabled', 'false');
        } catch {}
      }
      if (!hasSearch && isSearch) {
        setIsSearch(false);
        try {
          localStorage.setItem('zen-search-enabled', 'false');
        } catch {}
      }
    }, [
      currentModel,
      currentModelConfig,
      currentProviderConfig,
      providers,
      isThinking,
      isSearch,
      setIsThinking,
      setIsSearch,
    ]);

    // Handle auto-selection of account from cache once providers are loaded
    React.useEffect(() => {
      if (
        pendingAccountIdRef.current &&
        providers.length > 0 &&
        !currentAccount?.email &&
        currentModel?.providerId
      ) {
        const fetchAccountsForProvider = async () => {
          try {
            const response = await fetch(
              `${apiUrl}/v1/accounts?page=1&limit=50&provider_id=${currentModel.providerId}`,
            );
            const result = await response.json();
            if (result.success && result.data?.accounts) {
              const acc = result.data.accounts.find(
                (a: any) => a.id === pendingAccountIdRef.current,
              );
              if (acc) {
                setCurrentAccount({ id: acc.id, email: acc.email });
                pendingAccountIdRef.current = null;
              }
            }
          } catch (error) {
            logger.warn('[MessageInput] Failed to fetch accounts for provider:', error);
          }
        };
        fetchAccountsForProvider();
      }
    }, [providers, currentModel, currentAccount, apiUrl, setCurrentAccount]);

    return (
      <div
        style={{
          padding: 'var(--spacing-md) var(--spacing-lg)',
          backgroundColor: 'rgb(var(--card-background))',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            borderRadius: 'var(--border-radius)',
            border: !isConnected
              ? '1px dashed var(--vscode-errorForeground, #f44336)'
              : isTokenLimitExceeded
                ? '2px dashed var(--vscode-errorForeground, #f44336)'
                : isViewOnlyProvider
                  ? '1px dashed #f44336'
                  : '1px solid var(--vscode-widget-border, rgba(255,255,255,0.08))',
            transition: 'border 0.3s ease',
            marginTop:
              !isConversationStarted || isConversationStarted ? '24px' : '0px',
          }}
        >
          {/* HOME PANEL BADGE (Stuck to Border) - Only when !isConversationStarted */}
          {!isConversationStarted && (
            <div
              onClick={() => {
                if (providers.length === 0) fetchProviders();
                if (onOpenModelDrawer) {
                  onOpenModelDrawer();
                } else {
                  setShowModelDrawer((v) => !v);
                }
              }}
              style={{
                position: 'absolute',
                bottom: !isConnected ? 'calc(100% + 2px)' : '100%',
                left: '8px',
                backgroundColor: 'rgb(var(--input-background))',
                color: 'rgb(var(--text-primary))',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 -2px 6px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
                marginBottom: isConnected ? '-1px' : '0',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--input-background))';
              }}
              title="Click to select Model and Account"
            >
              {displayModel ? (
                <>
                  {(() => {
                    const prov = providers.find(
                      (p: any) => p.provider_id === displayModel.providerId,
                    );
                    if (!prov?.website) {
                      return (
                        <span className="codicon codicon-server-process" style={{ fontSize: '12px' }} />
                      );
                    }
                    const faviconUrl = getFaviconUrl(prov.website);
                    return (
                      <img
                        key={faviconUrl}
                        src={faviconUrl}
                        alt=""
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '2px',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    );
                  })()}
                  {displayModel.providerId}/{displayModel.id}
                  {displayAccount?.email && (
                    <span style={{ opacity: 0.8, fontStyle: 'italic', marginLeft: '2px' }}>
                      {displayAccount.email}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="codicon codicon-server-process" style={{ fontSize: '12px' }} />
                  Select Model
                </>
              )}
            </div>
          )}

          {showModelDrawer && !onOpenModelDrawer && (
            <ModelAccountDrawer
              isOpen={showModelDrawer}
              onClose={() => setShowModelDrawer(false)}
              providers={providers}
              apiUrl={apiUrl}
              onSelect={(selected) => {
                const prov = providers.find((p: any) => p.provider_id === selected.providerId);
                const modelObj = prov?.models?.find((m: any) => m.id === selected.modelId);
                let faviconUrl = '';
                if (prov?.website) {
                  faviconUrl = getFaviconUrl(prov.website);
                }

                const newModel = {
                  ...selected,
                  id: selected.modelId,
                  name: modelObj?.name || selected.modelId,
                  favicon: faviconUrl,
                  is_thinking: modelObj?.is_thinking ?? false,
                  is_search: modelObj?.is_search ?? false,
                  is_image_upload: modelObj?.is_image_upload ?? false,
                  is_video_upload: modelObj?.is_video_upload ?? false,
                  is_audio_upload: modelObj?.is_audio_upload ?? false,
                  is_file_upload: modelObj?.is_file_upload ?? false,
                  is_memory: modelObj?.is_memory ?? prov?.is_memory ?? false,
                };

                const newAccount = {
                  id: selected.accountId,
                  email: selected.email,
                };

                if (isModelSwitchMode) {
                  setPendingModelSwitch({ model: newModel, account: newAccount });
                  setShowModelDrawer(false);
                  setIsModelSwitchMode(false);
                } else {
                  setCurrentModel(newModel);
                  setCurrentAccount(newAccount);

                  const fetchMemoryState = async () => {
                    try {
                      const response = await fetch(
                        `${apiUrl}/v1/accounts/${selected.accountId}/memory`,
                      );
                      const result = await response.json();
                      if (result.success && result.data) {
                        setIsMemory(result.data.is_memory_enabled);
                        localStorage.setItem(
                          'zen-memory-enabled',
                          String(result.data.is_memory_enabled),
                        );
                      }
                    } catch (error) {
                      logger.error('[MessageInput] Failed to fetch memory state:', error);
                    }
                  };
                  fetchMemoryState();
                  setShowModelDrawer(false);
                }
              }}
            />
          )}

          {/* Model Switch Confirmation Dialog */}
          {pendingModelSwitch && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10001,
              }}
              onClick={() => setPendingModelSwitch(null)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-widget-border)',
                  borderRadius: '8px',
                  padding: '20px',
                  maxWidth: '400px',
                  width: '90%',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    marginBottom: '12px',
                    color: 'var(--vscode-foreground)',
                  }}
                >
                  Switch Model?
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    marginBottom: '16px',
                    color: 'var(--vscode-descriptionForeground)',
                    lineHeight: 1.5,
                  }}
                >
                  You're about to switch to:
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'var(--vscode-input-background)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'var(--vscode-editor-font-family, monospace)',
                    }}
                  >
                    <strong>
                      {pendingModelSwitch.model.providerId}/{pendingModelSwitch.model.id}
                    </strong>
                    {pendingModelSwitch.account.email && (
                      <div style={{ marginTop: '4px', opacity: 0.8 }}>
                        {pendingModelSwitch.account.email}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setPendingModelSwitch(null)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '4px',
                      border: '1px solid var(--vscode-widget-border)',
                      backgroundColor: 'transparent',
                      color: 'var(--vscode-foreground)',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const currentRange = responseRanges.find((r) => r.isCurrent);

                      const userMessagesInRange: Array<{
                        content: string;
                        responseNumber: number;
                      }> = [];
                      if (currentRange) {
                        let responseCount = 0;
                        for (const msg of messages) {
                          if (msg.role === 'assistant') {
                            responseCount++;
                          }
                          if (
                            msg.role === 'user' &&
                            responseCount >= currentRange.start - 1 &&
                            responseCount <= currentRange.end
                          ) {
                            userMessagesInRange.push({
                              content: msg.content,
                              responseNumber: responseCount,
                            });
                          }
                        }
                      }

                      const contextData = {
                        fileChanges: currentRange
                          ? Array.from(currentRange.fileChanges.entries()).map(([path, stats]) => ({
                              path,
                              additions: stats.additions,
                              deletions: stats.deletions,
                            }))
                          : [],
                        userMessages: userMessagesInRange,
                      };

                      if (onModelSwitch) {
                        onModelSwitch(
                          pendingModelSwitch.model,
                          pendingModelSwitch.account,
                          contextData,
                        );
                      }

                      setCurrentModel(pendingModelSwitch.model);
                      setCurrentAccount(pendingModelSwitch.account);
                      setPendingModelSwitch(null);
                    }}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: 'var(--vscode-button-background)',
                      color: 'var(--vscode-button-foreground)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        'var(--vscode-button-hoverBackground)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
                    }}
                  >
                    Confirm Switch
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Browser session warning - bottom right inside MessageInput */}
          {showBrowserWarning && currentModel?.providerId === 'zai-browser' && (
            <div
              onClick={isLaunchingBrowser ? undefined : onLaunchBrowserSession}
              style={{
                position: 'absolute',
                top: '100%',
                right: '8px',
                backgroundColor: 'rgba(251, 146, 60, 0.15)',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 500,
                borderBottomLeftRadius: '8px',
                borderBottomRightRadius: '8px',
                border: '1px solid rgba(251, 146, 60, 0.3)',
                borderTop: 'none',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isLaunchingBrowser ? 'not-allowed' : 'pointer',
                marginTop: '-1px',
                opacity: isLaunchingBrowser ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLaunchingBrowser) {
                  e.currentTarget.style.backgroundColor = 'rgba(251, 146, 60, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(251, 146, 60, 0.15)';
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 500 }}>
                {isLaunchingBrowser
                  ? 'Launching browser session...'
                  : 'Browser session not ready. Click here'}
              </span>
            </div>
          )}

          <div
            style={{
              position: 'relative',
              backgroundColor: 'var(--input-bg)',
              borderTopLeftRadius: 'var(--border-radius)',
              borderTopRightRadius: 'var(--border-radius)',
              padding: '12px',
            }}
          >
            <style>{`
              .custom-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: var(--scrollbar-thumb, rgba(255,255,255,0.2)) transparent;
              }
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
                height: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
                border-radius: 10px;
                margin: 4px 0;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: var(--scrollbar-thumb, rgba(255,255,255,0.2));
                border-radius: 10px;
                border: 2px solid transparent;
                background-clip: padding-box;
                min-height: 40px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background-color: var(--scrollbar-thumb-hover, rgba(255,255,255,0.35));
              }
              .custom-scrollbar::-webkit-scrollbar-corner {
                background: transparent;
              }
            `}</style>

            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                historyIndexRef.current = -1;
                handleTextareaChange(e);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (
                    !isHistoryMode &&
                    isConnected &&
                    !isLoadingCache &&
                    !isProcessing &&
                    !isTokenLimitExceeded
                  ) {
                    onSendMessage();
                  }
                } else {
                  handlePromptHistoryKeyDown(e);
                  handleKeyDown(e);
                }
              }}
              onPaste={(e) => {
                if (!supportsUpload && e.clipboardData.files.length > 0) {
                  logger.warn('[MessageInput] onPaste: Upload is not supported, preventing paste.');
                  e.preventDefault();
                  return;
                }
                handlePaste(e);
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => {
                if (!supportsUpload) {
                  e.preventDefault();
                  return;
                }
                handleDrop(e);
              }}
              onFocus={(e) => {
                e.target.style.border = 'none';
                e.target.style.boxShadow = 'none';
              }}
              placeholder={placeholderText}
              disabled={isViewOnlyProvider}
              rows={1}
              style={{
                width: '100%',
                minHeight: '24px',
                maxHeight: '240px',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                fontSize: 'var(--font-size-sm)',
                backgroundColor: 'transparent',
                color: 'rgb(var(--text-primary))',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                opacity: 1,
                cursor: 'text',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Bottom Part: Toolbar */}
          <div
            style={{
              backgroundColor: 'var(--input-bg)',
              borderBottomLeftRadius: 'var(--border-radius)',
              borderBottomRightRadius: 'var(--border-radius)',
              padding: '8px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Left Icons */}
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
              <ActionDropdown
                onSelectAttach={() => {
                  if (fileInputRef?.current) {
                    fileInputRef.current.accept = buildAcceptString(
                      currentModelConfig ?? currentModel,
                    );
                    (fileInputRef.current as any).dataset.textOnly = String(!supportsUpload);
                    fileInputRef.current.click();
                  } else {
                    handleFileSelect();
                  }
                }}
                onSelectImageGenerator={() => {}}
                onSelectVideoGenerator={() => {}}
                onSelectDeepResearch={() => {}}
                onSelectPullRequest={onGitPullRequest}
                onToggleMemory={showMemoryButton ? toggleMemory : undefined}
                isMemoryOn={isMemory}
                showImageGenerator={supportsImageGenerator}
                showVideoGenerator={supportsVideoGenerator}
                showDeepResearch={supportsDeepResearch}
                currentModel={currentModel}
                currentModelConfig={currentModelConfig}
                triggerButton={
                  <div
                    onMouseEnter={() => setIsPlusHovered(true)}
                    onMouseLeave={() => setIsPlusHovered(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '22px',
                      width: '22px',
                      boxSizing: 'border-box',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      border: '1px solid rgba(128, 128, 128, 0.2)',
                      background: isPlusHovered
                        ? 'rgba(128, 128, 128, 0.2)'
                        : 'rgba(128, 128, 128, 0.12)',
                      color: 'var(--vscode-foreground)',
                      opacity: isPlusHovered ? 0.9 : 0.7,
                    }}
                    title={supportsUpload ? 'Attach files' : 'Attach text files only'}
                  >
                    <Plus size={14} />
                  </div>
                }
              />

              {showThinkingButton && (
                <ThinkingButton
                  isOn={isThinking}
                  onClick={toggleThinking}
                  title="Toggle AI Thinking Process"
                />
              )}

              {showSearchButton && (
                <SearchButton
                  isOn={isSearch}
                  onClick={toggleSearch}
                  title="Toggle Web Search Grounding"
                />
              )}

              <div
                style={{
                  width: '1px',
                  height: '16px',
                  background: 'var(--border-color)',
                  margin: '0 2px',
                  flexShrink: 0,
                }}
              />

              <GlobalPermissionButton />

              {/* System Prompt Mode Selector - Home only */}
              {!isConversationStarted && (
                <StyleCodeDropdown
                  currentMode={systemPromptMode}
                  onSelect={setSystemPromptMode}
                  triggerButton={(() => {
                    const meta =
                      STYLE_CODE_MODE_META.find((m) => m.key === systemPromptMode) ??
                      STYLE_CODE_MODE_META[1];
                    return (
                      <button
                        onMouseEnter={() => setIsSystemPromptHovered(true)}
                        onMouseLeave={() => setIsSystemPromptHovered(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '24px',
                          width: '24px',
                          boxSizing: 'border-box',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease-in-out',
                          border: '1px solid transparent',
                          background: isSystemPromptHovered
                            ? 'rgba(128, 128, 128, 0.16)'
                            : 'transparent',
                          color: meta.color,
                          opacity: 1,
                          padding: 0,
                        }}
                        title={`Style Code — ${meta.label}`}
                      >
                        <StyleCodeTriggerIcon mode={systemPromptMode} />
                      </button>
                    );
                  })()}
                />
              )}

              {/* Prompt Length Selector - Home only */}
              {!isConversationStarted && (
                <PromptLengthDropdown
                  currentMode={promptLengthMode}
                  onSelect={setPromptLengthMode}
                  triggerButton={(() => {
                    const meta =
                      PROMPT_LENGTH_MODE_META.find((m) => m.key === promptLengthMode) ??
                      PROMPT_LENGTH_MODE_META[3];
                    return (
                      <button
                        onMouseEnter={() => setIsPromptLengthHovered(true)}
                        onMouseLeave={() => setIsPromptLengthHovered(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '24px',
                          width: '24px',
                          boxSizing: 'border-box',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease-in-out',
                          border: '1px solid transparent',
                          background: isPromptLengthHovered
                            ? 'rgba(128, 128, 128, 0.16)'
                            : 'transparent',
                          color: meta.color,
                          opacity: 1,
                          padding: 0,
                        }}
                        title={`Prompt Length — ${meta.label}`}
                      >
                        <PromptLengthTriggerIcon mode={promptLengthMode} />
                      </button>
                    );
                  })()}
                />
              )}
            </div>

            {/* Right Icons */}
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
              {isConnected && (
                <div
                  style={{
                    cursor:
                      isHistoryMode || isLoadingCache
                        ? 'not-allowed'
                        : isStreaming || isProcessing
                          ? 'pointer'
                          : isTokenLimitExceeded
                            ? 'not-allowed'
                            : message.trim() || uploadedFiles.length > 0
                              ? 'pointer'
                              : 'default',
                    padding:
                      isStreaming || isProcessing ? 'var(--spacing-xs)' : '4px 8px',
                    borderRadius: 'var(--border-radius)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color:
                      isHistoryMode || isLoadingCache
                        ? 'var(--secondary-text)'
                        : isStreaming || isProcessing
                          ? 'var(--vscode-errorForeground, #f44336)'
                          : isTokenLimitExceeded
                            ? 'var(--vscode-errorForeground, #f44336)'
                            : 'var(--vscode-descriptionForeground, #888)',
                    pointerEvents:
                      isHistoryMode ||
                      isLoadingCache ||
                      (isTokenLimitExceeded && !isStreaming && !isProcessing)
                        ? 'none'
                        : 'auto',
                    backgroundColor:
                      isStreaming || isProcessing
                        ? 'transparent'
                        : isTokenLimitExceeded
                          ? 'color-mix(in srgb, var(--vscode-errorForeground, #f44336) 12%, transparent)'
                          : 'color-mix(in srgb, var(--vscode-descriptionForeground, #888) 8%, transparent)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.3px',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => {
                    if ((isStreaming || isProcessing) && onStopGeneration) {
                      onStopGeneration();
                      return;
                    }

                    if (isTokenLimitExceeded) {
                      return;
                    }

                    if (!currentModel) {
                      logger.warn('[MessageInput] send: no model selected, aborting');
                      return;
                    }
                    onSendMessage();
                  }}
                  onMouseEnter={(e) => {
                    if (isStreaming || isProcessing) {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                    } else if (isTokenLimitExceeded) {
                      e.currentTarget.style.backgroundColor =
                        'color-mix(in srgb, var(--vscode-errorForeground, #f44336) 18%, transparent)';
                    } else if (message.trim() || uploadedFiles.length > 0) {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isStreaming || isProcessing) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    } else if (isTokenLimitExceeded) {
                      e.currentTarget.style.backgroundColor =
                        'color-mix(in srgb, var(--vscode-errorForeground, #f44336) 12%, transparent)';
                    } else {
                      e.currentTarget.style.backgroundColor =
                        'color-mix(in srgb, var(--vscode-descriptionForeground, #888) 8%, transparent)';
                    }
                  }}
                  title={
                    isStreaming || isProcessing
                      ? 'Stop Generation'
                      : isTokenLimitExceeded
                        ? `Token limit exceeded (${messageTokenCount.toLocaleString()}/${maxInputTokens?.toLocaleString()})`
                        : maxInputTokens
                          ? `${messageTokenCount.toLocaleString()}/${maxInputTokens.toLocaleString()} tokens`
                          : `${messageTokenCount.toLocaleString()} tokens`
                  }
                >
                  {isStreaming || isProcessing ? (
                    <X size={16} strokeWidth={2.5} />
                  ) : (
                    <span style={{ lineHeight: 1 }}>
                      {maxInputTokens
                        ? `${formatTokenCount(messageTokenCount)}/${formatTokenCount(maxInputTokens)}`
                        : messageTokenCount > 0
                          ? `${formatTokenCount(messageTokenCount)}`
                          : '0'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Language Badge - HomePanel only */}
          {!isConversationStarted &&
            isConnected &&
            LANGUAGES.some((l: { code: string }) => l.code === preferredLanguage) && (
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: 'var(--vscode-badge-background)',
                  color: 'var(--vscode-badge-foreground)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 5,
                  opacity: 0.8,
                  pointerEvents: 'none',
                }}
              >
                <span>
                  {LANGUAGES.find((l: any) => l.code === preferredLanguage)?.flag || '🇺🇸'}{' '}
                  {preferredLanguage.toUpperCase()}
                </span>
              </div>
            )}
        </div>
      </div>
    );
  },
);

export default React.memo(MessageInput, (prevProps, nextProps) => {
  // Only re-render when essential props change.
  const messageSame = prevProps.message === nextProps.message;
  const isProcessingSame = prevProps.isProcessing === nextProps.isProcessing;
  const isStreamingSame = prevProps.isStreaming === nextProps.isStreaming;
  const currentModelSame = prevProps.currentModel?.id === nextProps.currentModel?.id;
  const currentAccountSame = prevProps.currentAccount?.id === nextProps.currentAccount?.id;
  const messagesLengthSame = prevProps.messages?.length === nextProps.messages?.length;
  const responseRangesSame = prevProps.responseRanges?.length === nextProps.responseRanges?.length;
  const conversationFileStatsSame =
    prevProps.conversationFileStats === nextProps.conversationFileStats;
  const attachedItemsSame = prevProps.attachedItems?.length === nextProps.attachedItems?.length;

  return (
    messageSame &&
    isProcessingSame &&
    isStreamingSame &&
    currentModelSame &&
    currentAccountSame &&
    messagesLengthSame &&
    responseRangesSame &&
    conversationFileStatsSame &&
    attachedItemsSame
  );
});