import React from 'react';
import { X, Zap, ShieldCheck, Eye, PlusIcon, SendIcon } from 'lucide-react';
import { GitPullRequestArrow } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import { LANGUAGES } from '../../../feature/Setting/components/LanguageSelector';
import { cn } from '@renderer/shared/lib/utils';
import { $ } from '@renderer/utils/color';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string; // Base64 or text content
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
        'flex items-center gap-1 h-[22px] px-2 rounded text-[11px] font-semibold tracking-[0.3px] cursor-pointer box-border leading-none align-middle transition-all duration-200 ease-in-out',
        isOn
          ? 'border border-teal text-teal opacity-100'
          : 'border border-[rgba(128,128,128,0.2)] text-text-primary',
        isOn
          ? isHovered
            ? 'bg-teal/20'
            : 'bg-teal/12'
          : isHovered
            ? 'bg-[rgba(128,128,128,0.2)] opacity-90'
            : 'bg-[rgba(128,128,128,0.12)] opacity-70',
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
        'flex items-center gap-1 h-[22px] px-2 rounded text-[11px] font-semibold tracking-[0.3px] cursor-pointer box-border leading-none align-middle transition-all duration-200 ease-in-out',
        isOn
          ? 'border border-info text-info opacity-100'
          : 'border border-[rgba(128,128,128,0.2)] text-text-primary',
        isOn
          ? isHovered
            ? 'bg-info/20'
            : 'bg-info/12'
          : isHovered
            ? 'bg-[rgba(128,128,128,0.2)] opacity-90'
            : 'bg-[rgba(128,128,128,0.12)] opacity-70',
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
        'flex items-center gap-1 h-[22px] px-2 rounded text-[11px] font-semibold tracking-[0.3px] cursor-pointer box-border leading-none align-middle transition-all duration-200 ease-in-out',
        isOn
          ? 'border border-violet text-violet opacity-100'
          : 'border border-[rgba(128,128,128,0.2)] text-text-primary',
        isOn
          ? isHovered
            ? 'bg-violet/20'
            : 'bg-violet/12'
          : isHovered
            ? 'bg-[rgba(128,128,128,0.2)] opacity-90'
            : 'bg-[rgba(128,128,128,0.12)] opacity-70',
      )}
      title={title}
    >
      <MemoryIcon />
      <span className="text-[11px] font-semibold tracking-[0.3px]">Memory</span>
    </button>
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
      desc: 'All tool operations execute automatically',
      icon: <Zap size={11} />,
      color: $('--violet') || '#f59e0b',
    },
    approval: {
      label: 'Approval',
      desc: 'Each edit requires your approval',
      icon: <ShieldCheck size={11} />,
      color: $('--info') || '#3b82f6',
    },
    readOnly: {
      label: 'Read Only',
      desc: 'Tools can read files but not modify',
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
      e.currentTarget.style.backgroundColor = $('--sidebar-item-hover');
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
          'flex items-center gap-1 h-[22px] px-2 rounded text-[11px] font-semibold tracking-[0.3px] cursor-pointer box-border leading-none align-middle transition-all duration-200 ease-in-out opacity-100',
          isHovered
            ? `bg-[color-mix(in_srgb,${metadata.color}_20%,transparent)]`
            : `bg-[color-mix(in_srgb,${metadata.color}_12%,transparent)]`,
        )}
        style={{
          border: `1px solid ${metadata.color}40`,
          color: metadata.color,
        }}
        title="Tool permission mode"
      >
        {metadata.icon}
        <span className="text-[11px] font-semibold tracking-[0.3px]">{metadata.label}</span>
      </button>
      {open && (
        <div
          className="absolute bottom-[calc(100%+4px)] left-0 z-[1000] rounded-md overflow-hidden min-w-[180px] border border-border shadow-[0_-4px_12px_rgba(0,0,0,0.2)]"
          style={{ backgroundColor: 'color-mix(in srgb, ' + $('--input-bg') + ' 100%, black 15%)' }}
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
                  'flex items-center gap-1.5 w-full px-3 py-[7px] text-[11.5px] font-medium text-left border-none cursor-pointer',
                  isSelected
                    ? 'bg-primary text-text-foreground'
                    : 'bg-transparent text-text-primary',
                )}
                onMouseEnter={(e) => handleItemMouseEnter(modeId, e)}
                onMouseLeave={(e) => handleItemMouseLeave(isSelected, e)}
              >
                <span
                  className="flex items-center"
                  style={{ color: isSelected ? 'inherit' : meta.color }}
                >
                  {meta.icon}
                </span>
                {meta.label}
              </button>
            );
          })}
        </div>
      )}
      {tooltip && MODE_METADATA[tooltip.id] && (
        <div
          className="fixed z-[9999] rounded-md px-2.5 py-2 max-w-[220px] text-[11px] leading-relaxed pointer-events-none bg-dropdown-background border text-primary shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div
            className="font-semibold mb-[3px]"
            style={{ color: MODE_METADATA[tooltip.id].color }}
          >
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
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  setShowAtMenu: (show: boolean) => void;
  handleFileSelect: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
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
  onOpenModelDrawer,
}) => {
  const { apiUrl } = useSettings();
  const isConnected = true;
  const isElaraMismatch = false;
  const [providers, setProviders] = React.useState<any[]>([]);
  const [isLoadingCache, setIsLoadingCache] = React.useState(true);
  const preferredLanguage = 'en';
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
    } catch (error) {
      // console.error("Failed to fetch providers:", error);
    }
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
        } catch (error) {
          // ignore
        }
      };
      fetchAccountsForProvider();
    }
  }, [providers, currentModel, currentAccount, apiUrl, setCurrentAccount]);

  return (
    <div className="relative px-3 py-2" style={{ backgroundColor: $('--secondary-bg') }}>
      <div
        className={cn(
          'flex flex-col relative rounded',
          !isConnected ? 'border border-error' : 'border border-transparent',
        )}
        style={{
          transition: 'border 0.3s ease',
          marginTop: !isConversationStarted || (isConnected && isElaraMismatch) ? '24px' : '0px',
        }}
      >
        {/* HOME PANEL BADGE */}
        {!isConversationStarted && (
          <div
            onClick={() => {
              if (providers.length === 0) fetchProviders();
              onOpenModelDrawer?.();
            }}
            className={cn(
              'absolute left-2 flex items-center gap-2 px-2.5 py-[5px] text-[11px] font-semibold rounded-t-lg rounded-b-none z-20 cursor-pointer transition-all duration-200 ease-in-out text-text-primary border border-border shadow-[0_-2px_6px_rgba(0,0,0,0.1)]',
              !isConnected ? 'border-b border-border mb-0' : 'border-b-0 -mb-px',
            )}
            style={{
              bottom: !isConnected ? 'calc(100% + 2px)' : '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = $('--hover-bg');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = $('--input-bg');
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
        {/* Browser session warning */}
        {showBrowserWarning && currentModel?.providerId === 'zai-browser' && (
          <div
            onClick={isLaunchingBrowser ? undefined : onLaunchBrowserSession}
            className={cn(
              'absolute top-full right-2 flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-b-lg border-t-0 z-20 -mt-px bg-[rgba(251,146,60,0.15)] border border-[rgba(251,146,60,0.3)]',
              isLaunchingBrowser ? 'cursor-not-allowed opacity-60' : 'cursor-pointer opacity-100',
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
        <div className="relative rounded-t p-3 bg-input-background">
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
                console.warn(
                  '[Zen Log] MessageInput onPaste: Upload is not supported, preventing paste.',
                );
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
                ? 'History mode — read only'
                : !isConnected
                  ? 'Cannot connect to backend server...'
                  : isLoadingCache
                    ? 'Loading saved session...'
                    : isProcessing
                      ? 'Agent is processing...'
                      : 'Ask anything or @mention a file...'
            }
            disabled={false}
            rows={1}
            className="w-full min-h-[24px] max-h-[240px] border-none outline-none resize-none font-[inherit] text-sm bg-transparent overflow-hidden whitespace-pre-wrap break-words opacity-100 cursor-text box-border text-text-primary"
          />
        </div>

        {/* Bottom Part: Toolbar */}
        <div className="flex justify-between items-center rounded-b px-3 py-2 bg-input-background">
          {/* Left Icons */}
          <div className="flex gap-1 items-center">
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
                'flex items-center justify-center h-[22px] w-[22px] rounded cursor-pointer box-border transition-all duration-200 ease-in-out border border-[rgba(128,128,128,0.2)] text-text-primary',
                isPlusHovered
                  ? 'bg-[rgba(128,128,128,0.2)] opacity-90'
                  : 'bg-[rgba(128,128,128,0.12)] opacity-70',
              )}
              title={supportsUpload ? 'Attach files' : 'Attach text files only'}
            >
              <PlusIcon />
            </div>

            {/* Git Status Button */}
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
                  'flex items-center justify-center h-[22px] w-[22px] rounded box-border transition-all duration-200 ease-in-out border border-[rgba(128,128,128,0.2)]',
                  isGitLoading || isProcessing || isGitStatusVisible
                    ? 'cursor-default bg-[rgba(128,128,128,0.12)] text-text-secondary opacity-50'
                    : isGitHovered
                      ? 'cursor-pointer bg-[rgba(128,128,128,0.2)] text-text-primary opacity-90'
                      : 'cursor-pointer bg-[rgba(128,128,128,0.12)] text-text-primary opacity-70',
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

            {/* Global Tool Permission */}
            <GlobalPermissionButton />

            {/* Thinking Toggle */}
            {showThinkingButton && (
              <ThinkingButton
                isOn={isThinking}
                onClick={toggleThinking}
                title="Toggle AI Thinking Process"
              />
            )}

            {/* Search Toggle */}
            {showSearchButton && (
              <SearchButton
                isOn={isSearch}
                onClick={toggleSearch}
                title="Toggle Web Search Grounding"
              />
            )}

            {/* Memory Toggle */}
            {showMemoryButton && (
              <MemoryButton
                isOn={isMemory}
                onClick={toggleMemory}
                title="Toggle Memory Reference (Saved memories & chat history)"
              />
            )}
          </div>

          {/* Right Icons */}
          <div className="flex gap-1">
            {/* Send / Stop Button */}
            {isConnected && (
              <div
                className={cn(
                  'flex items-center justify-center p-1 rounded transition-colors duration-200',
                  isHistoryMode || isLoadingCache
                    ? 'cursor-not-allowed text-text-secondary pointer-events-none'
                    : isStreaming || isProcessing
                      ? 'cursor-pointer text-error pointer-events-auto'
                      : message.trim() || uploadedFiles.length > 0
                        ? 'cursor-pointer text-primary pointer-events-auto'
                        : 'cursor-default text-text-secondary pointer-events-auto',
                )}
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

        {/* Language Badge */}
        {!isConversationStarted &&
          isConnected &&
          !isElaraMismatch &&
          LANGUAGES.some((l: { code: string }) => l.code === preferredLanguage) && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold z-[5] opacity-80 pointer-events-none bg-primary text-text-foreground">
              <span>
                {LANGUAGES.find((l: any) => l.code === preferredLanguage)?.flag || '🇺🇸'}{' '}
                {preferredLanguage.toUpperCase()}
              </span>
            </div>
          )}

        {/* Elara Version Mismatch Badge */}
        {isConnected && isElaraMismatch && (
          <div
            className="absolute bottom-full right-2 flex items-center gap-1 px-3 py-1 text-[11px] font-semibold rounded-t rounded-b-none border-b-0 cursor-pointer z-20 -mb-px bg-[rgba(255,152,0,0.1)] text-warn border border-[rgba(255,152,0,0.2)] shadow-[0_-2px_4px_rgba(0,0,0,0.1)]"
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
