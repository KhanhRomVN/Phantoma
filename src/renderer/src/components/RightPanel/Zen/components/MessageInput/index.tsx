import React from 'react';
import { Plus, X } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import { MentionPopup } from './MentionPopup';
import { useMentionEditor } from './hooks/useMentionEditor';
import {
  getFileBadgePath,
  placeCaretAtEnd,
  renderMessageToEditor,
  resolveMentionTokens,
  serializeEditor,
} from './mentionEditor';
import EffortDropdown, { getModelEffortInfo } from './EffortDropdown';
import type { EffortLevel } from './EffortDropdown';
import GitRepoPickerDrawer from './GitRepoPickerDrawer';
import { useGitRepoScanner } from '../../feature/Chat/hooks/workspace/useGitRepoScanner';

import { useServerHealth } from '@renderer/providers/ServerHealthProvider';
import { useSettings } from '@renderer/components/RightPanel/Zen/context/SettingsContext';
import { useAgentFeature } from '@renderer/components/RightPanel/Zen/context/FeatureContext';
import { useProject } from '../../context/ProjectContext';
import { combinePromptsForMode } from '@renderer/modules/Code/prompts/code';
import type { SystemInfo } from '@renderer/modules/Code/prompts/code';
import { getPromptCapabilities } from '../../feature/Chat/services/ModuleRegistry';
// Use existing Phantoma drawer component
import SelectModelAccountModal from './SelectModelAccountModal';
import { cacheGet, cacheSet, providersKey } from './providerModelCache';
import SkillPickerDrawer, { type PickedSkill } from './SkillPickerDrawer';
import PromptLengthDropdown, {
  PromptLengthTriggerIcon,
  PROMPT_LENGTH_MODE_META,
} from './PromptLengthDropdown';
import PromptSettingsDropdown from './PromptSettingsDropdown'; // New component to replace StyleCodeDropdown logic
import ActionDropdown from './ActionDropdown';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';
import { getClientId } from '@renderer/utils/clientId';
import { countTokens } from '@renderer/utils/tokenizer';
import { buildAcceptString } from '../../feature/Chat/utils/fileUtils';
import type { MessageInputProps, UploadedFile, ToggleButtonProps } from './types';

// Fallback for missing modules in Phantoma to allow compilation
// TODO: Implement actual time-block logic and claude prompt builder in Phantoma backend/services

const isDeepSeekProvider = (id?: string) => id?.toLowerCase() === 'deepseek';
const isBlockedNow = (_ranges: any) => false;
const getBlockedRangeLabel = (_ranges: any) => '';
const getBlockedHoursDescription = (_ranges: any) => '';

import { useWorkspaceZipSize } from './hooks/useWorkspaceZipSize';
import { useAccountStats } from '../../feature/Chat/hooks/api/useAccountStats';
import { ClaudeZipBadge } from './ClaudeZipBadge';
import { useAccountAgents, useWorkflowAgentSync } from '../../context/WorkflowAgentContext';
import { useMultiAgentControl } from '../../context/MultiAgentContext';
import { Workflow as WorkflowIcon } from 'lucide-react';
import { ZenCliHintBar } from './ZenCliHintBar';
import { SimpleTooltip, TooltipRow, TooltipCard } from './SimpleTooltip';

// Stub for buildClaudePrompt if not available
const buildClaudePrompt = ({ language }: { language: string }) =>
  `System prompt for Claude (${language})`;

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

  const supportsUpload = React.useMemo(() => {
    let result: boolean;
    if (currentModel?.is_image_upload !== undefined) {
      result = !!currentModel.is_image_upload;
    } else if (currentModelConfig?.is_image_upload !== undefined) {
      result = !!currentModelConfig.is_image_upload;
    } else {
      result = false;
    }

    return result;
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

    // Cancel any pending resize
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // 🚀 OPTIMIZATION: Skip auto-resize for very large text (>50k chars)
    const isVeryLargeText = msgLength > 50000;

    if (isVeryLargeText) {
      const el = textareaRef.current;
      if (el) {
        el.style.height = '240px'; // max height
        el.style.overflowY = 'auto';
      }
      lastResizeTime.current = performance.now();
      return;
    }

    // Schedule resize in next animation frame for normal text
    rafIdRef.current = requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;

      el.style.height = 'auto';
      const maxHeight = 240;
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';

      rafIdRef.current = null;
      lastResizeTime.current = performance.now();
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
          setCurrentAccount({
            id: saved.accountId,
            email: saved.email,
            _partial: true,
          });
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
      } catch (e) {}

      const storage = (window as any).storage;
      if (storage) {
        storage.set(key, dataStr);
      }
    }
  }, [currentModel, currentAccount, folderPath]);

  return {
    isLoadingCache,
    pendingAccountIdRef,
  };
};

// ============================================================================
// TOGGLE BUTTONS
// ============================================================================

/** Render "Label ... [ON|OFF]" dạng pill với màu accent khi ON, mờ khi OFF */
const TooltipToggle = ({
  label,
  isOn,
  accentColor,
}: {
  label: string;
  isOn: boolean;
  accentColor: string;
}) => (
  <TooltipCard>
    <TooltipRow label={label} value={isOn ? 'ON' : 'OFF'} color={accentColor} active={isOn} />
  </TooltipCard>
);

/**
 * Icon-only toggle button dùng chung cho Thinking / Search.
 */
const IconToggleButton: React.FC<
  ToggleButtonProps & {
    accentColor: string;
    children: React.ReactNode;
    tooltipContent: React.ReactNode;
  }
> = ({ isOn, onClick, accentColor, children, tooltipContent }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <SimpleTooltip content={tooltipContent}>
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
              ? `color-mix(in srgb, ${$('--text-secondary')} 16%, transparent)`
              : 'transparent',
          color: isOn ? accentColor : $('--text-primary'),
          opacity: isOn ? 1 : isHovered ? 1 : 0.75,
          padding: 0,
        }}
      >
        {children}
      </button>
    </SimpleTooltip>
  );
};

const THINKING_COLOR = $('--purple');
const SEARCH_COLOR = $('--blue');

const ThinkingButton: React.FC<ToggleButtonProps> = ({ isOn, onClick, title }) => (
  <IconToggleButton
    isOn={isOn}
    onClick={onClick}
    title={title}
    accentColor={THINKING_COLOR}
    tooltipContent={<TooltipToggle label="Thinking" isOn={isOn} accentColor={THINKING_COLOR} />}
  >
    <BrainCogIcon />
  </IconToggleButton>
);

const SearchButton: React.FC<ToggleButtonProps> = ({ isOn, onClick, title }) => (
  <IconToggleButton
    isOn={isOn}
    onClick={onClick}
    title={title}
    accentColor={SEARCH_COLOR}
    tooltipContent={<TooltipToggle label="Search" isOn={isOn} accentColor={SEARCH_COLOR} />}
  >
    <GlobeIcon />
  </IconToggleButton>
);

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
    // onOpenProjectStructure, // Unused
    // showChangesDropdown, // Unused
    // setShowChangesDropdown, // Unused
    messages,
    handleSend,
    // hasProjectContext, // Unused
    // onOpenProjectContext, // Unused
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
    responseRanges = [],
    onModelSwitch,
    onSelectSkills,
    conversationUseSkillEnabled,
    conversationMemoryEnabled,
    conversationToolFormat,
    onConversationUseSkillToggle,
    onConversationMemoryToggle,
    onConversationToolFormatToggle,
    workflowAgentId,
  }) => {
    const onSendMessage = () => {
      const resolved = resolveMentionTokens(message);
      if (resolved.trim()) {
        savePromptToHistory(resolved);
      }
      if (resolved !== message) {
        setMessage(resolved);
      }
      handleSend(currentModel, currentAccount);
    };

    const { isValid: isConnected } = useServerHealth();
    const {
      aiLanguage: preferredLanguage,
      apiUrl,
      systemPromptMode,
      setSystemPromptMode,
      promptLengthMode,
      setPromptLengthMode,
    } = useSettings();
    const { activeFeature } = useAgentFeature();
    const workflowSync = useWorkflowAgentSync();
    const accountAgentsMap = useAccountAgents();
    // Get capabilities based on moduleId + promptId
    // workflowAgentId (orchestrator/planner/executor/reviewer) is used as promptId for Code module
    // Priority: explicit prop > context > undefined
    const resolvedWorkflowAgentId =
      workflowAgentId ?? workflowSync?.agentType ?? workflowSync?.agentId ?? undefined;
    const promptId = resolvedWorkflowAgentId ?? undefined; // undefined defaults to main prompt (code/emulate/recon)
    const capabilities = React.useMemo(() => {
      const caps = getPromptCapabilities(activeFeature ?? 'code', promptId);
      return caps;
    }, [activeFeature, promptId]);
    const supportsPromptLength = capabilities.promptLength ?? false;
    const supportsSystemPromptMode = capabilities.systemPromptMode ?? false;
    const supportsSkill = capabilities.skill ?? false;
    const supportsMemory = capabilities.memory ?? false;
    const supportsToolFormat = capabilities.toolFormat ?? false;
    const supportsMultiAgent = capabilities.multiAgent ?? false;
    const multiAgent = useMultiAgentControl();

    const [providers, setProviders] = React.useState<any[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = React.useState(false);
    const [showModelDrawer, setShowModelDrawer] = React.useState(false);
    const [showSkillPicker, setShowSkillPicker] = React.useState(false);
    const [selectedSkills, setSelectedSkills] = React.useState<PickedSkill[]>([]);
    const [isPromptLengthHovered, setIsPromptLengthHovered] = React.useState(false);

    const [pendingModelSwitch, setPendingModelSwitch] = React.useState<{
      model: any;
      account: any;
    } | null>(null);
    const [isModelSwitchMode, setIsModelSwitchMode] = React.useState(false);
    const [isPlusHovered, setIsPlusHovered] = React.useState(false);
    const [showGitRepoPicker, setShowGitRepoPicker] = React.useState(false);

    // Use custom hooks
    const [isThinking, toggleThinking, setIsThinking] = useToggleState('zen-thinking-enabled');
    const [isSearch, toggleSearch, setIsSearch] = useToggleState('zen-search-enabled');

    const { isLoadingCache, pendingAccountIdRef } = useModelSelection(
      folderPath,
      setCurrentModel,
      setCurrentAccount,
      currentModel,
      currentAccount,
    );

    // ─── Presence heartbeat ──────────────────────────────────────────
    React.useEffect(() => {
      const accountId = currentAccount?.id;
      if (!accountId) return;
      const clientId = getClientId();
      const projectName =
        (folderPath || '')
          .replace(/[\\/]+$/, '')
          .split(/[\\/]/)
          .pop() || '';
      let cancelled = false;
      const beat = () => {
        if (cancelled) return;
        fetch(`${apiUrl}/v1/accounts/${accountId}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, projectName }),
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
    }, [currentAccount?.id, apiUrl, folderPath]);

    const { currentProviderConfig, currentModelConfig } = useProvidersConfig(
      currentModel,
      providers,
    );

    // ─── Anti-System-Prompt-Injection detection ──────────────────────
    // Cờ này lấy từ backend constant. Nếu true, toàn bộ cơ chế đặc thù (zip badge, ẩn dropdown, prompt riêng) sẽ bật.
    const isAntiInjectionProvider = !!(currentProviderConfig as any)?.anti_system_prompt_injection;

    // ─── Effort info (dropdown tren toolbar) ────────────────────────
    const effortInfo = React.useMemo(
      () => getModelEffortInfo(providers, currentModel?.providerId, currentModel?.id),
      [providers, currentModel?.providerId, currentModel?.id],
    );

    const handleEffortChange = React.useCallback(
      (lvl: EffortLevel) => {
        if (!currentModel || !effortInfo) return;
        const nextId = `${effortInfo.base}-${lvl}`;
        const prov = providers.find(
          (p: any) => p.provider_id?.toLowerCase() === currentModel.providerId?.toLowerCase(),
        );
        const modelObj = prov?.models?.find((m: any) => m.id === nextId);
        if (!modelObj) return;
        setCurrentModel({
          ...currentModel,
          id: nextId,
          modelId: nextId,
          name: modelObj.name || nextId,
          is_thinking: modelObj.is_thinking ?? false,
          is_search: modelObj.is_search ?? false,
          is_image_upload: modelObj.is_image_upload ?? false,
          is_video_upload: modelObj.is_video_upload ?? false,
          is_audio_upload: modelObj.is_audio_upload ?? false,
          is_file_upload: modelObj.is_file_upload ?? false,
        });
      },
      [currentModel, effortInfo, providers, setCurrentModel],
    );

    // ─── Mention editor (contenteditable thay textarea) ─────────────
    const editorRef = React.useRef<HTMLDivElement>(null);
    const syncEditorToMessage = React.useCallback(() => {
      const editor = editorRef.current;
      const hidden = textareaRef.current;
      if (!editor || !hidden) return;
      hidden.value = serializeEditor(editor);
      handleTextareaChange({
        target: hidden,
        currentTarget: hidden,
      } as React.ChangeEvent<HTMLTextAreaElement>);
    }, [textareaRef, handleTextareaChange]);

    const { rootPath: mentionRootPath } = useProject();
    const mention = useMentionEditor(editorRef, syncEditorToMessage, folderPath || mentionRootPath);

    React.useEffect(() => {
      const editor = editorRef.current;
      if (!editor) return;
      if (serializeEditor(editor) === message) return;
      renderMessageToEditor(editor, message);
      if (document.activeElement === editor) placeCaretAtEnd(editor);
    }, [message]);

    // ─── Git repo scanner (cho GitRepoPickerDrawer) ──────────────────
    const {
      repos: gitRepos,
      loading: gitReposLoading,
      error: gitReposError,
      scan: refreshGitRepos,
    } = useGitRepoScanner();

    // ─── Workspace zip-size badge ────────────────────────────────────
    // Chỉ kích hoạt khi provider có anti-injection flag = true.
    const { rootPath } = useProject();
    // triggerKey: đổi khi rootPath hoặc model đổi → invalidate cache, chạy lại
    const zipTriggerKey = React.useMemo(() => {
      if (!isAntiInjectionProvider || !rootPath) return null;
      return `${rootPath}::${currentModel?.id ?? ''}`;
    }, [isAntiInjectionProvider, rootPath, currentModel?.id]);
    const zipSizeState = useWorkspaceZipSize(isAntiInjectionProvider, zipTriggerKey);

    // ─── Time-block detection ────────────────────────────────────────
    const [timeBlockTick, setTimeBlockTick] = React.useState(0);
    React.useEffect(() => {
      const id = setInterval(() => setTimeBlockTick((n) => n + 1), 30_000);
      return () => clearInterval(id);
    }, []);
    const providerBlockedRanges = (currentProviderConfig as any)?.blocked_time_ranges ?? null;
    const isTimeBlocked = React.useMemo(() => {
      void timeBlockTick;
      return isDeepSeekProvider(currentModel?.providerId) && isBlockedNow(providerBlockedRanges);
    }, [currentModel?.providerId, timeBlockTick, providerBlockedRanges]);

    const timeBlockLabel = React.useMemo(() => {
      if (!isTimeBlocked) return null;
      return {
        current: getBlockedRangeLabel(providerBlockedRanges),
        all: getBlockedHoursDescription(providerBlockedRanges),
      };
    }, [isTimeBlocked, providerBlockedRanges]);

    const {
      showThinkingButton,
      showSearchButton,
      supportsUpload,
      supportsImageGenerator,
      supportsVideoGenerator,
      supportsDeepResearch,
    } = useModelCapabilities(currentModel, currentModelConfig, currentProviderConfig);

    useTextareaAutoResize(textareaRef, message);

    // ─── Live account stats (30s refresh) ───────────────────────────
    useAccountStats({
      accountId: currentAccount?.id,
      onStats: (freshAccount) => {
        setCurrentAccount((prev: any) => ({ ...prev, ...freshAccount }));
      },
      refreshInterval: 30_000,
    });

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
      if (isTimeBlocked && timeBlockLabel) {
        return `DeepSeek is blocked during ${timeBlockLabel.all}`;
      }
      if (!currentModel) {
        return 'Select a model to start';
      }
      if (!currentAccount) {
        return 'Select an account to start';
      }

      // Default: concise single-line placeholder, no emoji
      return 'Type a message...';
    }, [
      isHistoryMode,
      isConnected,
      isLoadingCache,
      isProcessing,
      isTimeBlocked,
      timeBlockLabel,
      currentModel,
      currentAccount,
      supportsUpload,
      showThinkingButton,
      showSearchButton,
    ]);

    // Calculate token count for message input (including system prompt + text snippets)
    const messageTokenCount = React.useMemo(() => {
      let totalTokens = countTokens(message);

      if (attachedItems && attachedItems.length > 0) {
        attachedItems.forEach((item: any) => {
          if (item.type === 'text-snippet' && item.content) {
            const snippetTokens = countTokens(item.content);
            totalTokens += snippetTokens;
          }
        });
      }

      // Add system prompt tokens (only for first message in conversation)
      if (!isConversationStarted) {
        try {
          let systemPrompt: string;

          if (isAntiInjectionProvider) {
            // Anti-injection provider dùng prompt riêng — không phụ thuộc promptLengthMode/systemPromptMode
            systemPrompt = buildClaudePrompt({ language: preferredLanguage });
          } else {
            // Generic providers: build theo mode + length
            systemPrompt = combinePromptsForMode(
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
                promptLengthMode,
              } as any,
              systemPromptMode as any,
            );
          }

          const systemPromptTokens = countTokens(systemPrompt);
          totalTokens += systemPromptTokens;
        } catch (e) {
          console.warn('[MessageInput] Failed to calculate system prompt tokens:', e);
        }
      }

      return totalTokens;
    }, [
      message,
      isConversationStarted,
      preferredLanguage,
      promptLengthMode,
      systemPromptMode,
      folderPath,
      currentModel?.providerId,
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

    // Check if token limit exceeded
    const isTokenLimitExceeded = React.useMemo(() => {
      return maxInputTokens !== null && messageTokenCount > maxInputTokens;
    }, [messageTokenCount, maxInputTokens]);

    const providersScope = 'default';

    const fetchProviders = React.useCallback(
      async (force = false) => {
        const cacheKey = providersKey(providersScope);
        const cached = cacheGet<any[]>(cacheKey);
        if (cached) setProviders(cached);
        try {
          if (!cached || force === true) setIsLoadingProviders(true);
          const response = await fetch(`${apiUrl}/v1/providers`);
          const result = await response.json();
          if (result.success) {
            const enabled = result.data.filter((p: any) => p.is_enabled);
            cacheSet(cacheKey, enabled);
            setProviders(enabled);
          }
        } catch (error) {
          console.error('Failed to fetch providers:', error);
        } finally {
          setIsLoadingProviders(false);
        }
      },
      [apiUrl],
    );

    const refreshProviders = React.useCallback(async () => {
      try {
        // Invalidate cache trước để force re-fetch models từ upstream
        await fetch(`${apiUrl}/v1/providers/cache/clear`, { method: 'POST' });
      } catch {
        // non-fatal
      }
      await fetchProviders(true);
    }, [apiUrl, fetchProviders]);

    // Initial fetch
    React.useEffect(() => {
      fetchProviders();
    }, [fetchProviders]);

    // Re-fetch providers every time the model drawer opens
    React.useEffect(() => {
      if (showModelDrawer) {
        fetchProviders();
      }
    }, [showModelDrawer, fetchProviders]);

    // Close model drawer when user navigates to another panel
    React.useEffect(() => {
      const handler = () => setShowModelDrawer(false);
      window.addEventListener('zen:panel-change', handler);
      return () => window.removeEventListener('zen:panel-change', handler);
    }, []);

    // VALIDATION: Check if currentModel and currentAccount still exist after providers loaded
    React.useEffect(() => {
      if (providers.length === 0 || isLoadingCache) return;

      let needsReset = false;

      if (currentModel?.id && currentModel?.providerId) {
        const provider = providers.find(
          (p: any) => p.provider_id?.toLowerCase() === currentModel.providerId?.toLowerCase(),
        );

        if (!provider) {
          console.warn(
            `[MessageInput] Provider ${currentModel.providerId} not found - resetting model`,
          );
          needsReset = true;
        } else {
          const modelExists = provider.models?.some(
            (m: any) => m.id?.toLowerCase() === currentModel.id?.toLowerCase(),
          );

          if (!modelExists) {
            console.warn(
              `[MessageInput] Model ${currentModel.id} not found in provider ${currentModel.providerId} - resetting model`,
            );
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
                console.warn(
                  `[MessageInput] Account ${currentAccount.id} not found - resetting model + account`,
                );
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
            console.error('[MessageInput] Failed to validate account:', error);
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

    // Auto-fix promptLengthMode & systemPromptMode khi provider có anti_system_prompt_injection
    React.useEffect(() => {
      if (!currentProviderConfig) return;
      if (!(currentProviderConfig as any).anti_system_prompt_injection) return;

      // Cast to string for comparison to avoid TS enum mismatch errors during migration
      const plModeStr = String(promptLengthMode);
      const spModeStr = String(systemPromptMode);

      if (plModeStr !== 'none') {
        setPromptLengthMode('none' as any);
      }
      if (spModeStr !== 'none') {
        setSystemPromptMode('none' as any);
      }
    }, [
      currentProviderConfig,
      promptLengthMode,
      systemPromptMode,
      setPromptLengthMode,
      setSystemPromptMode,
    ]);

    // Handle auto-selection of account from cache once providers are loaded
    React.useEffect(() => {
      if (
        pendingAccountIdRef.current &&
        providers.length > 0 &&
        (!currentAccount?.email || currentAccount?._partial) &&
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
                setCurrentAccount(acc);
                pendingAccountIdRef.current = null;
              }
            }
          } catch (error) {
            // ignore
          }
        };
        fetchAccountsForProvider();
      }
    }, [providers, currentModel, currentAccount, apiUrl, setCurrentAccount]);

    return (
      <div
        style={{
          padding: '12px 16px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            marginTop: '24px', // Simplified logic: always add space for badges/DiffSummaryBar sticking up
          }}
        >
          {/* ─── Wrapper có border: chỉ bao quanh textarea + toolbar ─── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              borderRadius: '6px',
              border: !isConnected
                ? `1px dashed ${$('--error')}`
                : isTimeBlocked
                  ? `1px dashed ${$('--warn')}`
                  : isTokenLimitExceeded
                    ? `2px dashed ${$('--error')}`
                    : `1px solid ${$('--border')}`,
              transition: 'border 0.3s ease',
              backgroundColor: $('--input-background'),
            }}
          >
            {mention.isOpen && (
              <MentionPopup
                items={mention.items}
                query={mention.query ?? ''}
                onSelect={mention.selectItem}
              />
            )}
            {/* HOME PANEL BADGE (Stuck to Border) - Only when !isConversationStarted */}
            {!isConversationStarted && !mention.isOpen && (
              <div
                onClick={() => {
                  setShowModelDrawer((v) => !v);
                }}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '8px',
                  backgroundColor: $('--input-background'),
                  color: $('--text-primary'),
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
                  marginBottom:
                    !isConnected || isTimeBlocked || isTokenLimitExceeded ? '1px' : '-1px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = $('--card-background-hover');
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = $('--input-background');
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
                          <span
                            className="codicon codicon-server-process"
                            style={{ fontSize: '12px' }}
                          />
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
                    {displayModel.providerId}/
                    {(() => {
                      // Tách effort suffix khỏi model id để hiển thị riêng
                      const EFFORT_LEVELS_TRIGGER = [
                        'low',
                        'medium',
                        'high',
                        'xhigh',
                        'max',
                      ] as const;
                      type EffortLvl = (typeof EFFORT_LEVELS_TRIGGER)[number];
                      const EFFORT_COLOR_TRIGGER: Record<EffortLvl, string> = {
                        low: $('--text-secondary'),
                        medium: $('--blue'),
                        high: $('--green'),
                        xhigh: $('--yellow'),
                        max: $('--red'),
                      };
                      const EFFORT_LABEL_TRIGGER: Record<EffortLvl, string> = {
                        low: 'Low',
                        medium: 'Medium',
                        high: 'High',
                        xhigh: 'Extra',
                        max: 'Max',
                      };
                      let baseId = displayModel.id;
                      let effort: EffortLvl | null = null;
                      for (const lvl of EFFORT_LEVELS_TRIGGER) {
                        if (displayModel.id.endsWith(`-${lvl}`)) {
                          baseId = displayModel.id.slice(0, -(lvl.length + 1));
                          effort = lvl;
                          break;
                        }
                      }
                      if (!effort) return <>{baseId}</>;
                      const effortColor = EFFORT_COLOR_TRIGGER[effort];
                      return (
                        <>
                          {baseId}{' '}
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: `color-mix(in srgb, ${effortColor} 15%, transparent)`,
                              color: effortColor,
                              letterSpacing: '0.02em',
                              verticalAlign: 'middle',
                            }}
                          >
                            {EFFORT_LABEL_TRIGGER[effort]}
                          </span>
                        </>
                      );
                    })()}
                    {displayAccount?.email && (
                      <span
                        style={{
                          opacity: 0.8,
                          fontStyle: 'italic',
                          marginLeft: '2px',
                        }}
                      >
                        {displayAccount.email}
                      </span>
                    )}
                    {/* period_requests + period_tokens: hiển thị độc lập, không phụ thuộc usage */}
                    {displayAccount?.period_requests != null && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          opacity: 0.75,
                          marginLeft: '4px',
                          color: $('--text-secondary'),
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={$('--success')}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        {Number(displayAccount.period_requests).toLocaleString()}
                      </span>
                    )}
                    {displayAccount?.period_tokens != null && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          opacity: 0.75,
                          marginLeft: '2px',
                          color: $('--text-secondary'),
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={$('--warn')}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="8" cy="8" r="6" />
                          <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                          <path d="M7 6h1v4" />
                          <path d="m16.71 13.88.7.71-2.82 2.82" />
                        </svg>
                        {(() => {
                          const n = Number(displayAccount.period_tokens);
                          if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
                          if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
                          return String(n);
                        })()}
                      </span>
                    )}
                    {/* usage %: chỉ hiển thị khi có */}
                    {displayAccount?.usage != null &&
                      (() => {
                        const usageNum = Number(displayAccount.usage);
                        const usageColor =
                          usageNum >= 90
                            ? $('--error')
                            : usageNum >= 70
                              ? $('--warn')
                              : $('--text-secondary');
                        return (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              opacity: 0.85,
                              marginLeft: '4px',
                              color: usageColor,
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="9"
                              height="9"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="18" y1="20" x2="18" y2="10" />
                              <line x1="12" y1="20" x2="12" y2="4" />
                              <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                            {usageNum.toFixed(1)}%
                          </span>
                        );
                      })()}
                  </>
                ) : (
                  <>
                    <span className="codicon codicon-server-process" style={{ fontSize: '12px' }} />
                    Select Model
                  </>
                )}
              </div>
            )}

            {showModelDrawer && (
              <SelectModelAccountModal
                isOpen={showModelDrawer}
                onClose={() => setShowModelDrawer(false)}
                providers={providers}
                apiUrl={apiUrl}
                onRefresh={refreshProviders}
                isLoadingProviders={isLoadingProviders}
                cacheScope={providersScope}
                currentProviderId={currentModel?.providerId}
                currentModelId={currentModel?.id}
                currentAccountId={currentAccount?.id}
                currentEffort={effortInfo?.effort}
                accountAgents={accountAgentsMap}
                onSelect={(selected) => {
                  const prov = providers.find((p: any) => p.provider_id === selected.providerId);
                  const modelObj = prov?.models?.find((m: any) => m.id === selected.modelId);
                  let faviconUrl = '';
                  if (prov?.website) {
                    try {
                      faviconUrl = getFaviconUrl(prov.website);
                    } catch {}
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
                  };

                  // Cast to any to handle potential missing fields in Phantoma's ModelAccountDrawer selection object
                  const selAny = selected as any;
                  const newAccount = {
                    id: selAny.accountId,
                    email: selAny.email,
                    provider_id: selAny.accountProviderId,
                    usage: selAny.usage ?? null,
                    period_requests: selAny.period_requests ?? null,
                    period_tokens: selAny.period_tokens ?? null,
                  };

                  if (isModelSwitchMode) {
                    setPendingModelSwitch({
                      model: newModel,
                      account: newAccount,
                    });
                    setShowModelDrawer(false);
                    setIsModelSwitchMode(false);
                  } else {
                    setCurrentModel(newModel);
                    setCurrentAccount(newAccount);
                    setShowModelDrawer(false);
                  }
                }}
              />
            )}

            {showSkillPicker && (
              <SkillPickerDrawer
                isOpen={showSkillPicker}
                selectedSlugs={selectedSkills.map((s) => s.slug)}
                onClose={() => setShowSkillPicker(false)}
                onConfirm={(skills) => {
                  setSelectedSkills(skills);
                  onSelectSkills?.(
                    skills.map((s) => ({
                      id: s.slug,
                      path: '',
                      type: 'skill' as any, // Cast to match AttachedItem if needed, or adjust types later
                      content: s.name,
                    })),
                  );
                  setShowSkillPicker(false);
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
                    backgroundColor: $('--card-background'),
                    border: `1px solid ${$('--border')}`,
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
                      color: $('--text-primary'),
                    }}
                  >
                    Switch Model?
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      marginBottom: '16px',
                      color: $('--text-secondary'),
                      lineHeight: 1.5,
                    }}
                  >
                    You're about to switch to:
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: $('--input-background'),
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: "'Courier New', monospace",
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
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <button
                      onClick={() => setPendingModelSwitch(null)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '4px',
                        border: `1px solid ${$('--border')}`,
                        backgroundColor: 'transparent',
                        color: $('--text-primary'),
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--text-primary')} 5%, transparent)`;
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
                            ? Array.from(currentRange.fileChanges.entries()).map(
                                ([path, stats]) => ({
                                  path,
                                  additions: stats.additions,
                                  deletions: stats.deletions,
                                }),
                              )
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
                        backgroundColor: $('--primary'),
                        color: $('--text-primary'),
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--primary')} 80%, black)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = $('--primary');
                      }}
                    >
                      Confirm Switch
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Browser session warning */}
            {showBrowserWarning && currentModel?.providerId === 'zai-browser' && (
              <div
                onClick={isLaunchingBrowser ? undefined : onLaunchBrowserSession}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: '8px',
                  backgroundColor: `color-mix(in srgb, ${$('--warn')} 15%, transparent)`,
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 500,
                  borderBottomLeftRadius: '8px',
                  borderBottomRightRadius: '8px',
                  border: `1px solid color-mix(in srgb, ${$('--warn')} 30%, transparent)`,
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
                    e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--warn')} 25%, transparent)`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--warn')} 15%, transparent)`;
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
                backgroundColor: $('--input-background'),
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
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
            background-color: color-mix(in srgb, var(--text-secondary) 20%, transparent);
            border-radius: 10px;
            border: 2px solid transparent;
            background-clip: padding-box;
            min-height: 40px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: color-mix(in srgb, var(--text-secondary) 35%, transparent);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:active {
            background-color: color-mix(in srgb, var(--text-secondary) 40%, transparent);
          }
          .custom-scrollbar::-webkit-scrollbar-corner {
            background: transparent;
          }
        `}</style>

              <textarea
                ref={textareaRef}
                value={message}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                style={{ display: 'none' }}
              />
              <style>{`
                .zen-message-input { position: relative; }
                .zen-message-input[data-empty="true"]::before {
                  content: attr(data-placeholder);
                  position: absolute;
                  left: 0;
                  right: 0;
                  top: 0;
                  overflow: hidden;
                  white-space: nowrap;
                  text-overflow: ellipsis;
                  pointer-events: none;
                  color: ${$('--text-secondary')};
                  opacity: 0.6;
                }
              `}</style>
              <div
                ref={editorRef}
                contentEditable="plaintext-only"
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                data-empty={message === '' ? 'true' : 'false'}
                onInput={() => {
                  syncEditorToMessage();
                  mention.updateFromSelection();
                }}
                onKeyUp={mention.updateFromSelection}
                onClick={(e) => {
                  const badgePath = getFileBadgePath(e.target);
                  if (badgePath) {
                    (window as any).api?.invoke?.('shell:open-path', badgePath).catch(() => {});
                    return;
                  }
                  mention.updateFromSelection();
                }}
                onBlur={mention.closePopup}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (
                      !isHistoryMode &&
                      isConnected &&
                      !isLoadingCache &&
                      !isProcessing &&
                      !isTokenLimitExceeded &&
                      !isTimeBlocked
                    ) {
                      onSendMessage();
                    }
                  } else {
                    handleKeyDown(e as unknown as React.KeyboardEvent<HTMLTextAreaElement>);
                  }
                }}
                onPaste={(e) => {
                  const hasFileInClipboard = Array.from(e.clipboardData.items).some(
                    (it) => it.kind === 'file',
                  );
                  if (!supportsUpload && hasFileInClipboard) {
                    e.preventDefault();
                    return;
                  }
                  handlePaste(e as unknown as React.ClipboardEvent<HTMLTextAreaElement>);
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  if (!supportsUpload) {
                    e.preventDefault();
                    return;
                  }
                  handleDrop(e);
                }}
                className="zen-message-input"
                data-placeholder={placeholderText}
                style={{
                  width: '100%',
                  minHeight: '24px',
                  maxHeight: '240px',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  backgroundColor: 'transparent',
                  color: $('--text-primary'),
                  overflowX: 'hidden',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  opacity: 1,
                  cursor: 'text',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Bottom Part: Toolbar */}
            <div
              style={{
                backgroundColor: $('--input-background'),
                borderBottomLeftRadius: '6px',
                borderBottomRightRadius: '6px',
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pointerEvents: !isConnected || isTimeBlocked ? 'none' : undefined,
              }}
            >
              {/* Left Icons */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                }}
              >
                <ActionDropdown
                  onSelectAttach={() => {
                    const acceptStr = buildAcceptString(currentModelConfig ?? currentModel);
                    if (fileInputRef?.current) {
                      fileInputRef.current.accept = acceptStr;
                      (fileInputRef.current as any).dataset.textOnly = String(!supportsUpload);
                      fileInputRef.current.click();
                    } else {
                      // Call original handleFileSelect without args if signature differs
                      handleFileSelect();
                    }
                  }}
                  onSelectImageGenerator={() => {}}
                  onSelectVideoGenerator={() => {}}
                  onSelectDeepResearch={() => {}}
                  onSelectPullRequest={() => {
                    if (onGitPullRequest) onGitPullRequest();
                    else setShowGitRepoPicker(true);
                  }}
                  showImageGenerator={supportsImageGenerator}
                  showVideoGenerator={supportsVideoGenerator}
                  showDeepResearch={supportsDeepResearch}
                  currentModel={currentModel}
                  currentModelConfig={currentModelConfig}
                  onSelectSkills={(items) => {
                    setSelectedSkills(
                      items.map((i: any) => ({ slug: i.id.replace('skill-', ''), name: i.path })),
                    );
                    // TODO: Sync with parent attachedItems when backend ready
                  }}
                  selectedSkillSlugs={selectedSkills.map((s) => s.slug)}
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
                        border: `1px solid color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`,
                        background: isPlusHovered
                          ? `color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`
                          : `color-mix(in srgb, ${$('--text-secondary')} 12%, transparent)`,
                        color: $('--text-primary'),
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
                    background: $('--border'),
                    margin: '0 2px',
                    flexShrink: 0,
                  }}
                />

                {!isConversationStarted && effortInfo && effortInfo.options.length > 1 && (
                  <EffortDropdown
                    effort={effortInfo.effort}
                    options={effortInfo.options}
                    onChange={handleEffortChange}
                  />
                )}

                {!isConversationStarted && supportsMultiAgent && multiAgent && (
                  <SimpleTooltip
                    content={
                      multiAgent.enabled
                        ? 'Multi-agent: on (Orchestrator)'
                        : multiAgent.blocked
                          ? 'This branch already has an Orchestrator'
                          : 'Enable multi-agent for this branch'
                    }
                  >
                    <button
                      type="button"
                      disabled={multiAgent.blocked && !multiAgent.enabled}
                      onClick={multiAgent.toggle}
                      aria-pressed={multiAgent.enabled}
                      style={{
                        width: '26px',
                        height: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        border: 'none',
                        background: multiAgent.enabled ? 'rgba(167,139,250,0.15)' : 'transparent',
                        color: multiAgent.enabled ? '#A78BFA' : $('--text-secondary'),
                        opacity: multiAgent.blocked && !multiAgent.enabled ? 0.4 : 1,
                        cursor:
                          multiAgent.blocked && !multiAgent.enabled ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <WorkflowIcon size={14} />
                    </button>
                  </SimpleTooltip>
                )}

                {/* Prompt Settings (Style · Skill · Memory · Format) — Home only, ẩn khi promptLength=none */}
                {!isConversationStarted &&
                  (supportsSystemPromptMode ||
                    supportsSkill ||
                    supportsMemory ||
                    supportsToolFormat) &&
                  (!supportsPromptLength || promptLengthMode !== 'none') && (
                    <>
                      <PromptSettingsDropdown
                        systemPromptMode={systemPromptMode}
                        onSelectSystemPromptMode={
                          supportsSystemPromptMode
                            ? (mode) => {
                                if (!!(currentProviderConfig as any)?.anti_system_prompt_injection)
                                  return;
                                setSystemPromptMode(mode as any);
                              }
                            : undefined
                        }
                        isAntiInjection={
                          !!(currentProviderConfig as any)?.anti_system_prompt_injection
                        }
                        skillEnabled={supportsSkill ? !!conversationUseSkillEnabled : undefined}
                        onSkillToggle={supportsSkill ? onConversationUseSkillToggle : undefined}
                        memoryEnabled={supportsMemory ? !!conversationMemoryEnabled : undefined}
                        onMemoryToggle={supportsMemory ? onConversationMemoryToggle : undefined}
                        toolFormat={
                          supportsToolFormat ? (conversationToolFormat ?? 'xml') : undefined
                        }
                        onToolFormatToggle={
                          supportsToolFormat
                            ? () => {
                                onConversationToolFormatToggle?.();
                              }
                            : undefined
                        }
                      />
                    </>
                  )}

                {/* Prompt Length Selector - Home only, hidden when anti-injection is active */}
                {!isConversationStarted && supportsPromptLength && !isAntiInjectionProvider && (
                  <PromptLengthDropdown
                    currentMode={promptLengthMode as any}
                    onSelect={(mode: any) => {
                      if (isAntiInjectionProvider && mode !== 'none') return;
                      setPromptLengthMode(mode);
                    }}
                    triggerButton={(() => {
                      const meta =
                        PROMPT_LENGTH_MODE_META.find((m) => m.key === promptLengthMode) ??
                        PROMPT_LENGTH_MODE_META[3];
                      return (
                        <SimpleTooltip
                          content={
                            <>
                              <span>Prompt Length</span>
                              <span style={{ fontWeight: 700, color: meta.color }}>
                                {meta.label}
                              </span>
                            </>
                          }
                        >
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
                                ? `color-mix(in srgb, ${$('--text-secondary')} 16%, transparent)`
                                : 'transparent',
                              color: meta.color,
                              opacity: 1,
                              padding: 0,
                            }}
                          >
                            <PromptLengthTriggerIcon mode={promptLengthMode} />
                          </button>
                        </SimpleTooltip>
                      );
                    })()}
                  />
                )}
              </div>

              {/* Right Icons */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                }}
              >
                {/* Workspace zip-size badge — chỉ hiện khi provider có anti-injection flag = true */}
                {isAntiInjectionProvider && <ClaudeZipBadge state={zipSizeState} />}

                {/* Token Count Badge / Stop Button */}
                {isConnected && (
                  <div
                    style={{
                      cursor:
                        isHistoryMode || isLoadingCache
                          ? 'not-allowed'
                          : isStreaming || isProcessing
                            ? 'pointer'
                            : isTokenLimitExceeded || isTimeBlocked
                              ? 'not-allowed'
                              : message.trim() || uploadedFiles.length > 0
                                ? 'pointer'
                                : 'default',
                      padding: isStreaming || isProcessing ? '4px' : '4px 8px',
                      borderRadius: '6px',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color:
                        isHistoryMode || isLoadingCache
                          ? $('--text-secondary')
                          : isStreaming || isProcessing
                            ? $('--error')
                            : isTokenLimitExceeded || isTimeBlocked
                              ? $('--error')
                              : $('--text-secondary'),
                      pointerEvents:
                        isHistoryMode ||
                        isLoadingCache ||
                        ((isTokenLimitExceeded || isTimeBlocked) && !isStreaming && !isProcessing)
                          ? 'none'
                          : 'auto',
                      backgroundColor:
                        isStreaming || isProcessing
                          ? 'transparent'
                          : isTokenLimitExceeded || isTimeBlocked
                            ? `color-mix(in srgb, ${$('--error')} 12%, transparent)`
                            : `color-mix(in srgb, ${$('--text-secondary')} 8%, transparent)`,
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

                      if (isTokenLimitExceeded || isTimeBlocked) {
                        return;
                      }

                      if (!currentModel) {
                        console.warn('[Zen] MessageInput send: no model selected, aborting');
                        return;
                      }
                      onSendMessage();
                    }}
                    onMouseEnter={(e) => {
                      if (isStreaming || isProcessing) {
                        e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--text-primary')} 5%, transparent)`;
                      } else if (isTokenLimitExceeded || isTimeBlocked) {
                        e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--error')} 18%, transparent)`;
                      } else if (message.trim() || uploadedFiles.length > 0) {
                        e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--text-primary')} 5%, transparent)`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isStreaming || isProcessing) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      } else if (isTokenLimitExceeded || isTimeBlocked) {
                        e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--error')} 12%, transparent)`;
                      } else {
                        e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--text-secondary')} 8%, transparent)`;
                      }
                    }}
                    title={
                      isStreaming || isProcessing
                        ? 'Stop Generation'
                        : isTimeBlocked && timeBlockLabel
                          ? `DeepSeek is blocked during ${timeBlockLabel.all}`
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
                        {(() => {
                          const formatTokenCount = (count: number): string => {
                            if (count < 1000) return count.toString();
                            else if (count < 1000000) {
                              const k = count / 1000;
                              return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
                            } else {
                              const m = count / 1000000;
                              return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
                            }
                          };
                          return maxInputTokens
                            ? `${formatTokenCount(messageTokenCount)}/${formatTokenCount(maxInputTokens)}`
                            : messageTokenCount > 0
                              ? `${formatTokenCount(messageTokenCount)}`
                              : '0';
                        })()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Bậc 3: ZenCLI hint bar (ngoài border, chỉ HomePanel) ─── */}
          <GitRepoPickerDrawer
            isOpen={showGitRepoPicker}
            repos={gitRepos}
            loading={gitReposLoading}
            error={gitReposError}
            onClose={() => setShowGitRepoPicker(false)}
            onRefresh={refreshGitRepos}
            onSelect={(repo) => {
              setShowGitRepoPicker(false);
              (window as any).api?.invoke?.('shell:open-path', repo.absPath).catch(() => {});
            }}
          />

          {!isConversationStarted && <ZenCliHintBar isClaudeProvider={isAntiInjectionProvider} />}
        </div>
      </div>
    );
  },
);

export default React.memo(MessageInput, (prevProps, nextProps) => {
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
  const useSkillSame =
    prevProps.conversationUseSkillEnabled === nextProps.conversationUseSkillEnabled;
  const memorySame = prevProps.conversationMemoryEnabled === nextProps.conversationMemoryEnabled;
  const toolFormatSame = prevProps.conversationToolFormat === nextProps.conversationToolFormat;

  const shouldSkip =
    messageSame &&
    isProcessingSame &&
    isStreamingSame &&
    currentModelSame &&
    currentAccountSame &&
    messagesLengthSame &&
    responseRangesSame &&
    conversationFileStatsSame &&
    attachedItemsSame &&
    useSkillSame &&
    memorySame &&
    toolFormatSame;

  return shouldSkip;
});
