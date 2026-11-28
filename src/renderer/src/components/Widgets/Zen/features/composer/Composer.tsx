import React from 'react';
import { $ } from '@renderer/utils/color';
import { MentionPopup } from './components/MentionPopup';
import { useMentionEditor } from './hooks/useMentionEditor';
import {
  getFileBadgePath,
  placeCaretAtEnd,
  renderMessageToEditor,
  resolveMentionTokens,
  serializeEditor,
} from './utils/mention-editor.utils';
import { getModelEffortInfo } from './components/EffortDropdown';
import type { EffortLevel } from './components/EffortDropdown';
import GitRepoPickerModal from './components/GitRepoPickerModal';
import { getCommitMessagePrompt } from '@renderer/modules/Code/agent/prompts/code';

import { useServerHealth } from '@renderer/providers/ServerHealthProvider';
import { useSettings } from '@renderer/components/Widgets/Zen/context/SettingsContext';
import { useAgentFeature } from '@renderer/components/Widgets/Zen/context/FeatureContext';
import { useProject } from '../../context/ProjectContext';
import { combinePromptsForMode } from '@renderer/modules/Code/agent/prompts/code';
import type { SystemInfo } from '@renderer/modules/Code/agent/prompts/code';

import SelectModelAccountModal from './components/ModelAccountPickerModal';
import { cacheGet, cacheSet, providersKey } from './stores/provider-model-cache.store';
import SkillPickerDrawer, { type PickedSkill } from './components/SkillPickerDrawer';
import { getFaviconUrl } from '@renderer/utils/favicon';

import type { MessageInputProps, UploadedFile } from './types/composer.types';

const isDeepSeekProvider = (id?: string) => id?.toLowerCase() === 'deepseek';
const isBlockedNow = (_ranges: any) => false;
const getBlockedRangeLabel = (_ranges: any) => '';
const getBlockedHoursDescription = (_ranges: any) => '';

import { useAccountAgents, useWorkflowAgentSync } from '../../context/WorkflowAgentContext';
import { useMultiAgentControl } from '../../context/MultiAgentContext';
import ComposerToolbar from './components/ComposerToolbar';
import {
  useModelCapabilities,
  useModelSelection,
  useProvidersConfig,
} from './hooks/useComposerModel';
import {
  getPromptCapabilities,
  resolvePromptLength,
  resolveStyleCode,
  resolveToolFormats,
} from '../chat/services/module_prompt.service';
import { useGitRepoScanner } from '../chat/hooks/workspace/useGitRepoScanner';
import { countTokens } from '../../shared/utils/tokenizer';
import { useAccountStats } from '../chat/hooks/api/useAccountStats';

export type { UploadedFile };

const CLIENT_ID_STORAGE_KEY = 'zen-client-id';

// ID ổn định cho mỗi cửa sổ app (sessionStorage), để backend phân biệt cửa sổ nào đang active account nào
const getClientId = (): string => {
  try {
    let id = sessionStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `zen-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `zen-fallback-${Date.now()}`;
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
    autoScrollPaused = false,
    scrollToBottom,
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
    const promptLengthResolved = resolvePromptLength(capabilities, promptLengthMode);
    const styleResolved = resolveStyleCode(capabilities, systemPromptMode);
    const supportsPromptLength = promptLengthResolved.selectable;
    const supportsSystemPromptMode = styleResolved.selectable;
    const supportsSkill = capabilities.skill ?? false;
    const supportsMemory = capabilities.memory ?? false;
    const toolFormatOptions = resolveToolFormats(capabilities);
    const supportsToolFormat = toolFormatOptions.length > 1;
    React.useEffect(() => {
      const current = conversationToolFormat ?? 'xml';
      if (!toolFormatOptions.includes(current))
        onConversationToolFormatToggle?.(toolFormatOptions[0]);
    }, [conversationToolFormat, toolFormatOptions, onConversationToolFormatToggle]);
    const supportsMultiAgent = capabilities.multiAgent ?? false;
    const multiAgent = useMultiAgentControl();

    const [providers, setProviders] = React.useState<any[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = React.useState(false);
    const [showModelDrawer, setShowModelDrawer] = React.useState(false);
    const [showSkillPicker, setShowSkillPicker] = React.useState(false);
    const [selectedSkills, setSelectedSkills] = React.useState<PickedSkill[]>([]);

    const [pendingModelSwitch, setPendingModelSwitch] = React.useState<{
      model: any;
      account: any;
    } | null>(null);
    const [isModelSwitchMode, setIsModelSwitchMode] = React.useState(false);
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
    const [isDropActive, setIsDropActive] = React.useState(false);
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
    const { rootPath } = useProject();
    const {
      repos: gitRepos,
      loading: gitReposLoading,
      error: gitReposError,
      scan: refreshGitRepos,
    } = useGitRepoScanner(rootPath);

    // Debug log - có thể xóa sau khi fix
    const handleGitRepoSelect = async (repo: { absPath: string; relPath: string }) => {
      setShowGitRepoPicker(false);
      try {
        const status = await (window as any).api?.invoke?.('git:status', repo.absPath);
        const output = String(status?.output || '')
          .split('\n')
          .filter((l) => l.length >= 3 && l[0] !== ' ' && l[0] !== '?')
          .join('\n')
          .trim();
        if (status?.error || !output) return;
        // ASSUMED: ngôn ngữ commit mặc định 'vi' (Phantoma chưa có setting commit language)
        const prompt = getCommitMessagePrompt(
          'vi',
          repo.relPath && repo.relPath !== '.' ? `Repository: ${repo.relPath}\n${output}` : output,
          undefined,
          conversationToolFormat === 'json' ? 'json' : 'xml',
        );
        setMessage(prompt);
      } catch (err) {
        console.error('[GitRepoPicker] Failed to get git status:', err);
      }
    };

    React.useEffect(() => {
      if (!showGitRepoPicker) return;
      refreshGitRepos().then((found) => {
        if (found.length === 1 && found[0].staged > 0) handleGitRepoSelect(found[0]);
      });
    }, [showGitRepoPicker]);

    // ─── Workspace zip-size badge ────────────────────────────────────
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
              promptLengthMode: promptLengthResolved.value,
            } as any,
            styleResolved.value as any,
          );

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
      promptLengthResolved.value,
      styleResolved.value,
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
        data-zen-message-input=""
        onDragEnter={(e) => {
          if (e.dataTransfer.types.includes('application/x-phantoma-mention'))
            setIsDropActive(true);
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('application/x-phantoma-mention')) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setIsDropActive(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDropActive(false);
        }}
        onDropCapture={() => setIsDropActive(false)}
        onDrop={(e) => {
          mention.handleDropMention(e);
        }}
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
              border: isDropActive
                ? `1px dashed ${$('--text-secondary')}`
                : !isConnected
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
            {isDropActive && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 30,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  backgroundColor: $('--input-background'),
                  color: $('--text-primary'),
                  fontSize: '13px',
                }}
              >
                Drop here to add to message
              </div>
            )}
            {mention.isOpen && (
              <MentionPopup
                items={mention.items}
                query={mention.query ?? ''}
                onSelect={mention.selectItem}
              />
            )}
            {/* HOME PANEL BADGE (Stuck to Border) - Only when !isConversationStarted */}
            {!isConversationStarted && !mention.isOpen && !isDropActive && (
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

            {autoScrollPaused && scrollToBottom && (
              <div
                ref={(el) => {
                  if (el) {
                  }
                }}
                onClick={scrollToBottom}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: '8px',
                  marginBottom: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: $('--text-secondary'),
                  backgroundColor: $('--input-background'),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = $('--primary');
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = $('--text-secondary');
                }}
              >
                <span className="codicon codicon-arrow-down" style={{ fontSize: '12px' }} />
                Scroll to bottom
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
                  if (mention.handleDropMention(e)) return;
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
            <ComposerToolbar
              message={message}
              uploadedFiles={uploadedFiles}
              fileInputRef={fileInputRef}
              handleFileSelect={handleFileSelect}
              isHistoryMode={isHistoryMode}
              isStreaming={isStreaming}
              isProcessing={isProcessing}
              onStopGeneration={onStopGeneration}
              isConversationStarted={isConversationStarted}
              currentModel={currentModel}
              conversationUseSkillEnabled={conversationUseSkillEnabled}
              conversationMemoryEnabled={conversationMemoryEnabled}
              conversationToolFormat={conversationToolFormat}
              onConversationUseSkillToggle={onConversationUseSkillToggle}
              onConversationMemoryToggle={onConversationMemoryToggle}
              onConversationToolFormatToggle={onConversationToolFormatToggle}
              isConnected={isConnected}
              isLoadingCache={isLoadingCache}
              isTimeBlocked={isTimeBlocked}
              timeBlockLabel={timeBlockLabel}
              isTokenLimitExceeded={isTokenLimitExceeded}
              messageTokenCount={messageTokenCount}
              maxInputTokens={maxInputTokens}
              onSendMessage={onSendMessage}
              currentModelConfig={currentModelConfig}
              supportsUpload={supportsUpload}
              supportsImageGenerator={supportsImageGenerator}
              supportsVideoGenerator={supportsVideoGenerator}
              supportsDeepResearch={supportsDeepResearch}
              showThinkingButton={showThinkingButton}
              showSearchButton={showSearchButton}
              isThinking={isThinking}
              toggleThinking={toggleThinking}
              isSearch={isSearch}
              toggleSearch={toggleSearch}
              effortInfo={effortInfo}
              handleEffortChange={handleEffortChange}
              setShowGitRepoPicker={setShowGitRepoPicker}
              selectedSkills={selectedSkills}
              setSelectedSkills={setSelectedSkills}
              supportsMultiAgent={supportsMultiAgent}
              multiAgent={multiAgent}
              supportsSystemPromptMode={supportsSystemPromptMode}
              supportsSkill={supportsSkill}
              supportsMemory={supportsMemory}
              supportsToolFormat={supportsToolFormat}
              supportsPromptLength={supportsPromptLength}
              toolFormatOptions={toolFormatOptions}
              styleResolved={styleResolved}
              promptLengthResolved={promptLengthResolved}
              setSystemPromptMode={setSystemPromptMode}
              setPromptLengthMode={setPromptLengthMode}
            />
          </div>

          {/* ─── Bậc 3: ZenCLI hint bar (ngoài border, chỉ HomePanel) ─── */}
          <GitRepoPickerModal
            isOpen={showGitRepoPicker}
            repos={gitRepos}
            loading={gitReposLoading}
            error={gitReposError}
            onClose={() => setShowGitRepoPicker(false)}
            onRefresh={refreshGitRepos}
            onSelect={handleGitRepoSelect}
          />
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
  const autoScrollPausedSame = prevProps.autoScrollPaused === nextProps.autoScrollPaused;

  const shouldSkip =
    autoScrollPausedSame &&
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
