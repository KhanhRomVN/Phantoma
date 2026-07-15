import React from 'react';
import { cn } from '@renderer/shared/lib/utils';
import { $ } from '@renderer/utils/color';
import { X, Zap, ShieldCheck, Eye, PlusIcon, SendIcon } from 'lucide-react';
import { GitPullRequestArrow } from 'lucide-react';
import { useServerHealth } from '@renderer/providers/ServerHealthProvider';
import { LANGUAGES } from '@renderer/components/RightPanel/Agent/feature/Setting/components/LanguageSelector';
import { useSettings } from '@renderer/components/RightPanel/Agent/context/SettingsContext';
import DiffSummaryBar from './DiffSummaryBar';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  file_id?: string;
  isUploading?: boolean;
  error?: string;
}

const BrainCogIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="11"
    height="11"
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
    width="11"
    height="11"
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
    width="11"
    height="11"
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

const SummaryIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-summary-icon lucide-summary"
  >
    <path d="M15 4H7" />
    <path d="m18 16 3 3-3 3" />
    <path d="M3 4v13a2 2 0 0 0 2 2h16" />
    <path d="M7 14h7" />
    <path d="M7 9h12" />
  </svg>
);

interface ToggleButtonProps {
  isOn: boolean;
  onClick: () => void;
  title: string;
}

const ThinkingButton: React.FC<ToggleButtonProps> = ({ isOn, onClick, title }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'flex items-center gap-1 px-2 h-[22px] box-border rounded cursor-pointer text-[11px] font-semibold tracking-[0.3px] transition-all duration-200 border-none leading-none align-middle',
        isOn
          ? 'text-purple opacity-100'
          : isHovered
            ? 'text-text-primary opacity-90'
            : 'text-text-primary opacity-70',
        isOn
          ? isHovered
            ? 'bg-purple/20'
            : 'bg-purple/12'
          : isHovered
            ? 'bg-[rgba(128,128,128,0.2)]'
            : 'bg-[rgba(128,128,128,0.12)]',
      )}
      title={title}
    >
      <BrainCogIcon />
      <span className="text-[11px] font-semibold tracking-[0.3px]">Thinking</span>
    </button>
  );
};

const SearchButton: React.FC<ToggleButtonProps> = ({ isOn, onClick, title }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'flex items-center gap-1 px-2 h-[22px] box-border rounded cursor-pointer text-[11px] font-semibold tracking-[0.3px] transition-all duration-200 border-none leading-none align-middle',
        isOn
          ? 'text-info opacity-100'
          : isHovered
            ? 'text-text-primary opacity-90'
            : 'text-text-primary opacity-70',
        isOn
          ? isHovered
            ? 'bg-info/20'
            : 'bg-info/12'
          : isHovered
            ? 'bg-[rgba(128,128,128,0.2)]'
            : 'bg-[rgba(128,128,128,0.12)]',
      )}
      title={title}
    >
      <GlobeIcon />
      <span className="text-[11px] font-semibold tracking-[0.3px]">Search</span>
    </button>
  );
};

const MemoryButton: React.FC<ToggleButtonProps> = ({ isOn, onClick, title }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'flex items-center gap-1 px-2 h-[22px] box-border rounded cursor-pointer text-[11px] font-semibold tracking-[0.3px] transition-all duration-200 leading-none align-middle',
        isOn
          ? 'text-violet opacity-100 border border-violet'
          : isHovered
            ? 'text-text-primary opacity-90 border border-[rgba(128,128,128,0.2)]'
            : 'text-text-primary opacity-70 border border-[rgba(128,128,128,0.2)]',
        isOn
          ? isHovered
            ? 'bg-violet/20'
            : 'bg-violet/12'
          : isHovered
            ? 'bg-[rgba(128,128,128,0.2)]'
            : 'bg-[rgba(128,128,128,0.12)]',
      )}
      title={title}
    >
      <MemoryIcon />
      <span className="text-[11px] font-semibold tracking-[0.3px]">Memory</span>
    </button>
  );
};

interface CompressButtonProps {
  onClick: () => void;
  title: string;
}

const CompressButton: React.FC<CompressButtonProps> = ({ onClick, title }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'flex items-center justify-center h-[22px] w-[22px] box-border rounded cursor-pointer transition-all duration-200 border border-solid border-border text-text-primary',
        isHovered
          ? 'opacity-90 bg-[rgba(128,128,128,0.2)]'
          : 'opacity-70 bg-[rgba(128,128,128,0.12)]',
      )}
      title={title}
    >
      <SummaryIcon />
    </div>
  );
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

  const MODE_METADATA: Record<
    string,
    { label: string; desc: string; icon: React.ReactNode; color: string }
  > = {
    fullAccess: {
      label: 'Full Access',
      desc: 'AI has unrestricted access to all project files and tools',
      icon: <Zap size={11} />,
      color: $('--warn') || '#f59e0b',
    },
    approval: {
      label: 'Approval Required',
      desc: 'AI must request explicit approval before accessing files or running commands',
      icon: <ShieldCheck size={11} />,
      color: $('--info') || '#3b82f6',
    },
    readOnly: {
      label: 'Read Only',
      desc: 'AI can only read project files, cannot modify them or run commands',
      icon: <Eye size={11} />,
      color: $('--purple') || '#8b5cf6',
    },
  };

  const handleItemMouseEnter = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.parentElement) return;
    if (
      !e.currentTarget.style.backgroundColor ||
      e.currentTarget.style.backgroundColor === 'transparent'
    ) {
      e.currentTarget.style.backgroundColor =
        $('--dropdown-item-hover') || 'rgba(128,128,128,0.08)';
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

  const metadata = MODE_METADATA[permissionMode] || MODE_METADATA.fullAccess;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'flex items-center gap-1 px-2 h-[22px] box-border rounded cursor-pointer text-[11px] font-semibold tracking-[0.3px] transition-all duration-200 leading-none align-middle',
          isHovered ? 'opacity-100' : 'opacity-90',
          permissionMode === 'fullAccess'
            ? 'text-warn'
            : permissionMode === 'approval'
              ? 'text-info'
              : 'text-purple',
        )}
        style={{
          border: `1px solid ${metadata.color}40`,
          background: isHovered
            ? `color-mix(in srgb, ${metadata.color} 20%, transparent)`
            : `color-mix(in srgb, ${metadata.color} 12%, transparent)`,
        }}
        title="Tool permission mode"
      >
        {metadata.icon}
        <span className="text-[11px] font-semibold tracking-[0.3px]">{metadata.label}</span>
      </button>
      {open && (
        <div
          className="absolute bottom-[calc(100%+4px)] left-0 z-[1000] rounded-md overflow-hidden shadow-[0_-4px_12px_rgba(0,0,0,0.2)] min-w-[180px]"
          style={{
            backgroundColor: `color-mix(in srgb, ${$('--input-background')} 100%, black 15%)`,
            border: `1px solid ${$('--border')}`,
          }}
        >
          {Object.entries(MODE_METADATA).map(([modeId, meta]) => {
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
                className={cn(
                  'flex items-center gap-1.5 w-full px-3 py-1.5 text-[11.5px] font-medium text-left border-none cursor-pointer',
                  isSelected
                    ? 'bg-primary text-button-solid-text'
                    : 'bg-transparent text-text-primary',
                )}
                onMouseEnter={(e) => handleItemMouseEnter(modeId, e)}
                onMouseLeave={(e) => handleItemMouseLeave(isSelected, e)}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      )}
      {tooltip && MODE_METADATA[tooltip.id] && (
        <div
          className="fixed z-[9999] rounded-md p-2 max-w-[220px] text-[11px] leading-relaxed pointer-events-none shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            backgroundColor: $('--card-background'),
            border: `1px solid ${$('--border')}`,
            color: $('--text-primary'),
          }}
        >
          <div className="font-semibold mb-0.5" style={{ color: MODE_METADATA[tooltip.id].color }}>
            {MODE_METADATA[tooltip.id].label}
          </div>
          {MODE_METADATA[tooltip.id].desc}
        </div>
      )}
    </div>
  );
};

interface MessageInputProps {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  isHistoryMode?: boolean;
  uploadedFiles: UploadedFile[];
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  setShowAtMenu: (show: boolean) => void;
  handleFileSelect: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  onOpenProjectStructure: () => void;
  showChangesDropdown: boolean;
  setShowChangesDropdown: (show: boolean) => void;
  messages: any[];
  handleSend: (model: any, account: any) => void;
  hasProjectContext: boolean;
  onOpenProjectContext: () => void;
  folderPath?: string | null;
  isConversationStarted?: boolean;
  currentModel: any;
  setCurrentModel: (model: any) => void;
  currentAccount: any;
  setCurrentAccount: (account: any) => void;
  isProcessing?: boolean;
  isStreaming?: boolean;
  onStopGeneration?: () => void;
  showBrowserWarning?: boolean;
  isLaunchingBrowser?: boolean;
  onLaunchBrowserSession?: () => void;
  onGitPullRequest?: () => void;
  isGitLoading?: boolean;
  isGitStatusVisible?: boolean;
  showCompressButton?: boolean;
  onCompress?: () => void;
  gitStatus?: { items?: any[]; branch?: string } | null;
  onOpenGitStatus?: () => void;
  conversationFileStats?: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    responseNumber?: number;
  };
  onReviewClick?: () => void;
  responseRange?: { start: number; end: number } | null;
  responseRanges?: Array<{
    start: number;
    end: number;
    isCurrent: boolean;
    fileChanges: Map<
      string,
      {
        additions: number;
        deletions: number;
        toolType?: 'write_to_file' | 'replace_in_file';
        content?: string;
        oldContent?: string;
        newContent?: string;
      }
    >;
  }>;
  onOpenModelDrawer?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  message,
  setMessage,
  isHistoryMode = false,
  uploadedFiles,
  textareaRef,
  handleTextareaChange,
  handleKeyDown,
  handlePaste,
  handleDragOver,
  handleDrop,
  setShowAtMenu,
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
  showCompressButton = false,
  onCompress,
  gitStatus,
  onOpenGitStatus,
  conversationFileStats,
  onReviewClick,
  responseRange,
  responseRanges = [],
  onOpenModelDrawer,
}) => {
  const { isValid: isConnected, error: isElaraMismatch } = useServerHealth();
  const { apiUrl } = useSettings();
  const [providers, setProviders] = React.useState<any[]>([]);
  const [isLoadingCache, setIsLoadingCache] = React.useState(true);
  const { aiLanguage: preferredLanguage } = useSettings();
  const pendingAccountIdRef = React.useRef<string | null>(null);

  const currentModelRef = React.useRef<any>(null);
  const currentAccountRef = React.useRef<any>(null);
  currentModelRef.current = currentModel;
  currentAccountRef.current = currentAccount;

  const displayModel = React.useMemo(() => {
    return currentModel || null;
  }, [currentModel]);

  const [isThinking, setIsThinking] = React.useState(() => {
    try {
      return localStorage.getItem('zen-thinking-enabled') === 'true';
    } catch {
      return false;
    }
  });

  const [isSearch, setIsSearch] = React.useState(() => {
    try {
      return localStorage.getItem('zen-search-enabled') === 'true';
    } catch {
      return false;
    }
  });

  const [isMemory, setIsMemory] = React.useState(() => {
    try {
      return localStorage.getItem('zen-memory-enabled') === 'true';
    } catch {
      return false;
    }
  });

  const [isPlusHovered, setIsPlusHovered] = React.useState(false);
  const [isGitHovered, setIsGitHovered] = React.useState(false);

  const toggleThinking = () => {
    setIsThinking((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zen-thinking-enabled', String(next));
      } catch {}
      return next;
    });
  };

  const toggleSearch = () => {
    setIsSearch((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zen-search-enabled', String(next));
      } catch {}
      return next;
    });
  };

  const toggleMemory = async () => {
    if (!currentAccount?.id) {
      console.warn('No account selected, cannot toggle memory');
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
        console.error('Failed to update memory state on server:', result.message);
      }
    } catch (error) {
      setIsMemory(!newState);
      localStorage.setItem('zen-memory-enabled', String(!newState));
      console.error('Failed to sync memory state with server:', error);
    }
  };

  const displayAccount = React.useMemo(() => {
    return currentAccount || null;
  }, [currentAccount]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 240;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [message, textareaRef]);

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

  const showThinkingButton = React.useMemo(() => {
    const result =
      currentModel?.is_thinking !== undefined
        ? !!currentModel.is_thinking
        : !!currentModelConfig?.is_thinking;
    return result;
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
    const result = currentModel?.is_memory === true;
    return result;
  }, [currentModel]);

  React.useEffect(() => {
    if (providers.length === 0 || !currentModel) return;
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
  }, [currentModel, currentModelConfig, currentProviderConfig, providers, isThinking, isSearch]);

  const supportsUpload = React.useMemo(() => {
    let result: boolean;
    if (currentModel?.is_upload !== undefined) {
      result = !!currentModel.is_upload;
    } else if (currentModelConfig?.is_upload !== undefined) {
      result = !!currentModelConfig.is_upload;
    } else {
      result = !!currentProviderConfig?.is_upload;
    }
    return result;
  }, [currentModel, currentProviderConfig, currentModelConfig]);

  const formatWorkspacePath = (path: string) => {
    if (!path) return '';
    const parts = path.split(/[/\\]/).filter(Boolean);
    if (parts.length <= 5) return path;
    const lastFive = parts.slice(-5).join('/');
    return `../${lastFive}`;
  };

  const fetchProviders = React.useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/v1/providers`);
      const result = await response.json();
      if (result.success) {
        setProviders(result.data.filter((p: any) => p.is_enabled));
      }
    } catch (error) {}
  }, [apiUrl]);

  React.useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

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
  }, [folderPath]);

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
  }, [currentModel, currentAccount, folderPath, setCurrentModel, setCurrentAccount]);

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
            const acc = result.data.accounts.find((a: any) => a.id === pendingAccountIdRef.current);
            if (acc) {
              setCurrentAccount({ id: acc.id, email: acc.email });
              pendingAccountIdRef.current = null;
            }
          }
        } catch (error) {}
      };
      fetchAccountsForProvider();
    }
  }, [providers, currentModel, currentAccount, apiUrl, setCurrentAccount]);

  return (
    <div className="relative bg-secondary-bg rounded-md">
      <div
        className={cn(
          'flex flex-col relative rounded-[var(--border-radius)] transition-[border] duration-300',
          !isConversationStarted || (isConnected && isElaraMismatch) || isConversationStarted
            ? 'mt-6'
            : 'mt-0',
          !isConnected ? 'border border-error' : 'border border-border',
        )}
      >
        {!isConversationStarted && (
          <div
            onClick={() => {
              if (onOpenModelDrawer) {
                onOpenModelDrawer();
              }
            }}
            className={cn(
              'absolute left-2 z-20 flex items-center gap-2 cursor-pointer transition-all duration-200',
              'px-2.5 py-1 text-[11px] font-semibold',
              'border border-border rounded-t-[8px] rounded-b-none',
              'shadow-[0_-2px_6px_rgba(0,0,0,0.1)]',
              'bg-input-background text-text-primary',
              isConnected ? 'mb-[-1px]' : 'mb-0',
            )}
            style={{
              bottom: !isConnected ? 'calc(100% + 2px)' : '100%',
              borderBottom: !isConnected ? `1px solid ${$('--border')}` : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = $('--hover-bg');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = $('--input-background');
            }}
            title="Click to select Model and Account"
          >
            {displayModel ? (
              <>
                {displayModel.favicon ? (
                  <img
                    src={displayModel.favicon}
                    alt="favicon"
                    className="w-3 h-3 rounded-[2px]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="codicon codicon-server-process text-xs" />
                )}
                {displayModel.providerId}/{displayModel.id}
                {displayAccount?.email && (
                  <span className="opacity-80 italic ml-0.5">{displayAccount.email}</span>
                )}
              </>
            ) : (
              <>
                <span className="codicon codicon-server-process text-xs" />
                Select Model
              </>
            )}
          </div>
        )}

        {isConversationStarted && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-[98%] z-20">
            <DiffSummaryBar
              totalChanges={conversationFileStats?.totalFiles || 0}
              addedLines={conversationFileStats?.totalAdditions || 0}
              removedLines={conversationFileStats?.totalDeletions || 0}
              onClick={onOpenGitStatus}
              onReviewClick={onReviewClick}
              responseRange={responseRange}
              responseRanges={responseRanges}
            />
          </div>
        )}
        {showBrowserWarning && currentModel?.providerId === 'zai-browser' && (
          <div
            onClick={isLaunchingBrowser ? undefined : onLaunchBrowserSession}
            className={cn(
              'absolute top-full right-2 z-20 flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-b-lg border-t-0',
              'bg-[rgba(251,146,60,0.15)] border border-[rgba(251,146,60,0.3)] -mt-[1px]',
              isLaunchingBrowser ? 'opacity-60 cursor-not-allowed' : 'opacity-100 cursor-pointer',
            )}
            onMouseEnter={(e) => {
              if (!isLaunchingBrowser) {
                e.currentTarget.style.backgroundColor = 'rgba(251, 146, 60, 0.25)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(251, 146, 60, 0.15)';
            }}
          >
            <span className="text-[11px] font-medium">
              {isLaunchingBrowser
                ? 'Launching browser session...'
                : 'Browser session not ready. Click here'}
            </span>
          </div>
        )}
        <div className="relative p-3 bg-input-background rounded-t-md">
          <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: var(--scrollbar-thumb);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: var(--scrollbar-thumb-hover);
          }
        `}</style>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isHistoryMode && isConnected && !isLoadingCache && !isProcessing) {
                  handleSend(currentModel, currentAccount);
                }
              } else {
                handleKeyDown(e);
              }
            }}
            onPaste={(e) => {
              if (!supportsUpload && e.clipboardData.files.length > 0) {
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
            placeholder={
              isHistoryMode
                ? 'History mode - enter a search query'
                : !isConnected
                  ? 'Connecting to backend...'
                  : isLoadingCache
                    ? 'Loading cache...'
                    : isProcessing
                      ? 'Processing...'
                      : 'Message @agent (Alt+@)'
            }
            disabled={false}
            rows={1}
            className="w-full min-h-[24px] max-h-[240px] border-none outline-none resize-none font-inherit text-[var(--font-size-sm)] bg-transparent text-text-primary overflow-hidden whitespace-pre-wrap break-word opacity-100 cursor-text box-border"
          />
        </div>

        <div className="px-3 py-2 flex justify-between items-center bg-input-background rounded-b-md">
          <div className="flex gap-[var(--spacing-xs)] items-center">
            <div
              onClick={() => {
                if (fileInputRef?.current) {
                  (fileInputRef.current as any).dataset.textOnly = String(!supportsUpload);
                  fileInputRef.current.click();
                } else {
                  handleFileSelect();
                }
              }}
              onMouseEnter={() => setIsPlusHovered(true)}
              onMouseLeave={() => setIsPlusHovered(false)}
              className={cn(
                'flex items-center justify-center h-[22px] w-[22px] box-border rounded cursor-pointer transition-all duration-200 border border-solid border-border text-text-primary',
                isPlusHovered
                  ? 'opacity-90 bg-[rgba(128,128,128,0.2)]'
                  : 'opacity-70 bg-[rgba(128,128,128,0.12)]',
              )}
              title={supportsUpload ? 'Attach files' : 'Attach text files only'}
            >
              <PlusIcon />
            </div>

            {onGitPullRequest && (
              <div
                onClick={() => {
                  if (!isGitLoading && !isProcessing && !isGitStatusVisible) {
                    onGitPullRequest();
                  }
                }}
                onMouseEnter={() => setIsGitHovered(true)}
                onMouseLeave={() => setIsGitHovered(false)}
                className={cn(
                  'flex items-center justify-center h-[22px] w-[22px] box-border rounded transition-all duration-200 border border-solid border-border',
                  isGitLoading || isProcessing || isGitStatusVisible
                    ? 'cursor-default text-text-secondary opacity-50 bg-[rgba(128,128,128,0.12)]'
                    : isGitHovered
                      ? 'cursor-pointer text-text-primary opacity-90 bg-[rgba(128,128,128,0.2)]'
                      : 'cursor-pointer text-text-primary opacity-70 bg-[rgba(128,128,128,0.12)]',
                )}
                title={
                  isGitStatusVisible
                    ? 'Git Status đang hiển thị'
                    : isGitLoading
                      ? 'Đang kiểm tra git status...'
                      : isProcessing
                        ? 'Đang xử lý task, vui lòng đợi...'
                        : 'Git Status - Kiểm tra thay đổi đã staged'
                }
              >
                <GitPullRequestArrow size={16} />
              </div>
            )}

            {showCompressButton && (
              <CompressButton
                onClick={onCompress || (() => {})}
                title="Context Compression - Compress conversation history"
              />
            )}

            <GlobalPermissionButton />

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

            {showMemoryButton && (
              <MemoryButton
                isOn={isMemory}
                onClick={toggleMemory}
                title="Toggle Memory Reference (Saved memories & chat history)"
              />
            )}
          </div>

          <div className="flex gap-[var(--spacing-xs)]">
            {isConnected && (
              <div
                className={cn(
                  'p-[var(--spacing-xs)] rounded-[var(--border-radius)] transition-colors duration-200 flex items-center justify-center',
                  isHistoryMode || isLoadingCache
                    ? 'cursor-not-allowed text-text-secondary pointer-events-none'
                    : isStreaming || isProcessing
                      ? 'cursor-pointer text-error'
                      : message.trim() || uploadedFiles.length > 0
                        ? 'cursor-pointer'
                        : 'cursor-default text-text-secondary',
                )}
                style={
                  !isHistoryMode &&
                  !isLoadingCache &&
                  !isStreaming &&
                  !isProcessing &&
                  message.trim() &&
                  uploadedFiles.length === 0
                    ? { color: $('--accent-text') }
                    : undefined
                }
                onClick={() => {
                  if ((isStreaming || isProcessing) && onStopGeneration) {
                    onStopGeneration();
                    return;
                  }

                  if (!currentModel) {
                    console.warn('[Zen] MessageInput send: no model selected, aborting');
                    return;
                  }
                  handleSend(currentModel, currentAccount);
                }}
                onMouseEnter={(e) => {
                  if (isStreaming || isProcessing || message.trim() || uploadedFiles.length > 0) {
                    e.currentTarget.style.backgroundColor = $('--hover-bg');
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title={isStreaming || isProcessing ? 'Stop Generation' : 'Send Message'}
              >
                {isStreaming || isProcessing ? (
                  <X size={16} strokeWidth={2.5} />
                ) : (
                  <SendIcon size={16} />
                )}
              </div>
            )}
          </div>
        </div>

        {!isConversationStarted &&
          isConnected &&
          !isElaraMismatch &&
          LANGUAGES.some((l: { code: string }) => l.code === preferredLanguage) && (
            <div
              className="absolute top-2 right-2 z-5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold opacity-80 pointer-events-none bg-card-background text-text-primary"
            >
              <span>
                {LANGUAGES.find((l: any) => l.code === preferredLanguage)?.flag || '🇺🇸'}{' '}
                {preferredLanguage.toUpperCase()}
              </span>
            </div>
          )}

        {isConnected && isElaraMismatch && (
          <div
            className="absolute bottom-full right-2 z-20 flex items-center gap-1 px-3 py-1 text-[11px] font-semibold cursor-pointer bg-[rgba(255,152,0,0.1)] text-warn border border-[rgba(255,152,0,0.2)] border-b-0 rounded-t-[var(--border-radius)] rounded-b-none shadow-[0_-2px_4px_rgba(0,0,0,0.1)]"
            style={{ marginBottom: '-1px' }}
            onClick={() => {
              const vscodeApi = (window as any).vscodeApi;
              if (vscodeApi) {
                vscodeApi.postMessage({
                  command: 'openExternal',
                  url: 'https://github.com/KhanhRomVN/Elara',
                });
              }
            }}
          >
            Elara Version Mismatch
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
