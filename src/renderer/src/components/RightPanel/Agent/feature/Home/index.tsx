import React, { useEffect, useState, useCallback } from 'react';
import StatsGrid from './components/StatsGrid';
import RecentActivity from './components/RecentActivity';
import ModelDistributionCard from './components/ModelDistributionCard';
import DailyUsageChart from './components/DailyUsageChart';
import ModelAccountDrawer from '../../components/common/MessageInput/ModelAccountDrawer';
import { ConversationItem } from '../History/types';
import { useSettings } from '../../context/SettingsContext';
import MessageInput from '../../components/common/MessageInput';
import FilesPreviews from '../../components/common/MessageInput/FilesPreviews';
import { extensionService } from '../../services/ExtensionService';
import { useFileHandling } from '../../hooks/useFileHandling';
import { $ } from '@renderer/utils/color';

const SLOGANS = [
  'Your AI-powered coding assistant',
  'Build faster with intelligent automation',
  'Streamline your development workflow',
  'Smart code analysis at your fingertips',
  'From idea to implementation in seconds',
  'Elevate your productivity with AI',
];

interface HomePanelProps {
  onSendMessage: (content: string, files: any[], model: any, account: any) => void;
  onLoadConversation: (conversationId: string, tabId: number, folderPath: string | null) => void;
  initialValue?: string;
}

const HomePanel: React.FC<HomePanelProps> = ({
  onSendMessage,
  onLoadConversation,
  initialValue,
}) => {
  const { apiUrl } = useSettings();

  const folderPath = (window as any).__zenWorkspaceFolderPath as string | null | undefined;

  const [currentModel, setCurrentModel] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('zen_last_model');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const [currentAccount, setCurrentAccount] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('zen_last_account');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const [message, setMessage] = useState(initialValue || '');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // ModelAccountDrawer state
  const [showModelDrawer, setShowModelDrawer] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);

  const fetchProviders = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/v1/providers`);
      const result = await response.json();
      if (result.success) {
        setProviders(result.data.filter((p: any) => p.is_enabled));
      }
    } catch (error) {
      console.error('[Phantoma][Home] Failed to fetch providers:', error);
    }
  }, [apiUrl]);

  const handleOpenModelDrawer = () => {
    if (providers.length === 0) {
      fetchProviders();
    }
    setShowModelDrawer((v) => !v);
  };

  useEffect(() => {
    if (currentModel) {
      localStorage.setItem('zen_last_model', JSON.stringify(currentModel));
    }
  }, [currentModel]);

  useEffect(() => {
    if (currentAccount) {
      localStorage.setItem('zen_last_account', JSON.stringify(currentAccount));
    }
  }, [currentAccount]);

  const [sloganIndex, setSloganIndex] = useState(0);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayTokens, setTodayTokens] = useState<number>(0);
  const [todayRequests, setTodayRequests] = useState<number>(0);
  const [favoriteModel, setFavoriteModel] = useState<string>('—');
  const [totalAccounts, setTotalAccounts] = useState<number>(0);
  const [modelDistribution, setModelDistribution] = useState<
    {
      model_id: string;
      provider_id: string;
      total_requests: number;
      total_tokens: number;
    }[]
  >([]);
  const [dailyUsage, setDailyUsage] = useState<
    { date: string; requests: number; tokens: number }[]
  >([]);
  const [providerFavicons, setProviderFavicons] = useState<Record<string, string>>({});

  useEffect(() => {
    extensionService.postMessage({
      command: 'getHistory',
      requestId: `home-enforce-${Date.now()}`,
    });
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, accountsRes, providersRes] = await Promise.all([
          fetch(`${apiUrl}/v1/stats?period=day`),
          fetch(`${apiUrl}/v1/accounts?page=1&limit=1000`),
          fetch(`${apiUrl}/v1/providers`),
        ]);
        if (statsRes.ok) {
          const stats = await statsRes.json();
          if (stats.success && stats.data) {
            const usage: { requests: number; tokens: number }[] = stats.data.usage || [];
            setTodayTokens(usage.reduce((s: number, u: any) => s + (u.tokens || 0), 0));
            setTodayRequests(usage.reduce((s: number, u: any) => s + (u.requests || 0), 0));
            const models: any[] = (stats.data.models || []).filter(
              (m: any) => m.total_requests > 0,
            );
            setModelDistribution(models.slice(0, 5));
            setDailyUsage(stats.data.usage || []);
            if (models.length > 0) setFavoriteModel(models[0].model_id);
          }
        }
        if (accountsRes.ok) {
          const accs = await accountsRes.json();
          if (accs.success && accs.data) {
            setTotalAccounts(accs.data.total ?? accs.data.accounts?.length ?? 0);
          }
        }
        if (providersRes.ok) {
          const prov = await providersRes.json();
          if (prov.success && prov.data) {
            const favicons: Record<string, string> = {};
            prov.data.forEach((p: any) => {
              if (p.provider_id && p.website) {
                try {
                  favicons[p.provider_id] = `${new URL(p.website).origin}/favicon.ico`;
                } catch {}
              }
            });
            setProviderFavicons(favicons);
          }
        }
      } catch {}
    };
    fetchStats();
  }, [apiUrl]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSloganIndex((prev) => (prev + 1) % SLOGANS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Subscribe to historyResult events from main process via IPC
    const unsubscribe = extensionService.onMessage('historyResult', (msg: any) => {
      // console.log(
      //   '[Phantoma][Home] historyResult received | history count:',
      //   msg?.history?.length,
      //   '| history:',
      //   msg?.history,
      // );
      // console.log(
      //   '[Phantoma][Home] historyResult raw data:',
      //   JSON.stringify(msg?.history, null, 2),
      // );
      if (msg?.history) {
        // Ensure each conversation has required fields
        const validHistory = msg.history.filter((c: any) => c && c.id);
        // console.log('[Phantoma][Home] Valid history count:', validHistory.length);
        setConversations(validHistory);
      }
      setIsLoading(false);
    });

    // Also listen for deleteConversationResult events
    const unsubscribeDelete = extensionService.onMessage('deleteConversationResult', (msg: any) => {
      if (msg?.success) {
        setConversations((prev) => prev.filter((c) => c.id !== msg.conversationId));
      }
    });

    // Listen for deleteConfirmed events (triggered by HistoryCard)
    const unsubscribeConfirm = extensionService.onMessage('deleteConfirmed', (msg: any) => {
      if (msg?.conversationId) {
        console.log('[Phantoma][Home] deleteConfirmed received for:', msg.conversationId);
        extensionService.postMessage({
          command: 'deleteConversation',
          conversationId: msg.conversationId,
        });
      }
    });

    // Send getHistory request
    console.log('[Phantoma][Home] Sending getHistory request via extensionService...');
    extensionService.postMessage({
      command: 'getHistory',
      requestId: `welcome-hist-${Date.now()}`,
    });

    // Cleanup subscriptions
    return () => {
      unsubscribe();
      unsubscribeDelete();
      unsubscribeConfirm();
    };
  }, []);

  const sortedConversations = [...conversations].sort((a, b) => {
    const timeA = new Date(a.lastModified || a.timestamp || a.createdAt || 0).getTime();
    const timeB = new Date(b.lastModified || b.timestamp || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const handleSend = (model: any, account: any) => {
    if (message.trim() || uploadedFiles.length > 0) {
      onSendMessage(message, [...uploadedFiles], model, account);
      setMessage('');
      clearFiles();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {};

  const {
    uploadedFiles,
    fileInputRef,
    externalFileInputRef,
    handlePaste,
    handleFileSelect,
    handleFileInputChange,
    removeFile,
    handleExternalFileInputChange,
    handleDragOver,
    handleDrop,
    clearFiles,
  } = useFileHandling({
    accountId: currentAccount?.id,
    onAddAttachedItem: () => {},
  });

  return (
    <div
      className="home-panel flex flex-col h-full relative"
      style={{ backgroundColor: $('--primary-bg') || 'transparent' }}
    >
      {/* Dashboard scroll area */}
      <div
        className="flex-1 overflow-auto flex flex-col"
        style={{ backgroundColor: $('--secondary-bg') || 'transparent' }}
      >
        <div
          className="flex-1 flex flex-col items-center justify-start px-4 pt-8 pb-5 max-w-[680px] mx-auto w-full box-border animate-[fadeIn_0.5s_ease-out]"
          style={{ color: $('--text-primary') }}
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-0.5 text-center w-full">
            <h1 className="text-[30px] font-extrabold m-0 tracking-[-0.02em] leading-tight py-1 text-text-primary">
              Phantoma
            </h1>

            <div className="h-7 flex items-center justify-center overflow-hidden m-0 mb-4">
              <div
                key={sloganIndex}
                className="text-sm font-medium whitespace-nowrap animate-[slideUp_0.4s_ease-out] text-secondary"
              >
                {SLOGANS[sloganIndex]}
              </div>
            </div>
          </div>

          {/* Dashboard content */}
          <div className="w-full flex flex-col gap-4">
            <StatsGrid
              todayTokens={todayTokens}
              todayRequests={todayRequests}
              favoriteModel={favoriteModel}
              totalAccounts={totalAccounts}
            />

            <ModelDistributionCard
              modelDistribution={modelDistribution}
              providerFavicons={providerFavicons}
              title="AI Model Distribution"
              emptyText="Loading history..."
            />

            <DailyUsageChart usage={dailyUsage} title="Daily Usage" />

            <RecentActivity
              conversations={sortedConversations}
              isLoading={isLoading}
              onLoadConversation={onLoadConversation}
            />
          </div>
        </div>
      </div>

      {/* ModelAccountDrawer Overlay */}
      {showModelDrawer && (
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
              try {
                faviconUrl = `${new URL(prov.website).origin}/favicon.ico`;
              } catch {}
            }

            const newModel = {
              ...selected,
              id: selected.modelId,
              name: modelObj?.name || selected.modelId,
              favicon: faviconUrl,
              is_thinking: modelObj?.is_thinking ?? false,
              is_search: modelObj?.is_search ?? false,
              is_upload: modelObj?.is_upload ?? false,
              is_memory: modelObj?.is_memory ?? prov?.is_memory ?? false,
            };
            setCurrentModel(newModel);
            setCurrentAccount({
              id: selected.accountId,
              email: selected.email,
            });
            setShowModelDrawer(false);
          }}
        />
      )}

      {/* MessageInput */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        accept="image/*,text/*"
      />
      <input
        ref={externalFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleExternalFileInputChange}
      />
      <FilesPreviews
        uploadedFiles={uploadedFiles}
        attachedItems={[]}
        onRemoveFile={removeFile}
        onRemoveAttachedItem={() => {}}
        onOpenImage={(file) => {
          const vscodeApi = (window as any).vscodeApi;
          if (vscodeApi) {
            vscodeApi.postMessage({
              command: 'openTempImage',
              content: file.content,
              filename: file.name,
            });
          }
        }}
        onAttachedItemClick={() => {}}
      />
      <MessageInput
        message={message}
        setMessage={setMessage}
        isHistoryMode={false}
        uploadedFiles={uploadedFiles}
        textareaRef={textareaRef}
        handleTextareaChange={handleTextareaChange}
        handleKeyDown={handleKeyDown}
        handlePaste={handlePaste}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        setShowAtMenu={() => {}}
        handleFileSelect={handleFileSelect}
        onOpenProjectStructure={() => {}}
        showChangesDropdown={false}
        setShowChangesDropdown={() => {}}
        messages={[]}
        handleSend={handleSend}
        hasProjectContext={false}
        onOpenProjectContext={() => {}}
        folderPath={folderPath || null}
        isConversationStarted={false}
        currentModel={currentModel}
        setCurrentModel={setCurrentModel}
        currentAccount={currentAccount}
        setCurrentAccount={setCurrentAccount}
        isProcessing={false}
        isStreaming={false}
        onOpenModelDrawer={handleOpenModelDrawer}
      />
    </div>
  );
};

export default HomePanel;
