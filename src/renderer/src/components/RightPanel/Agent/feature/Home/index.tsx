/**
 * ------------------------------------------------------------------
 * HomePanel
 * ------------------------------------------------------------------
 * Trang chủ của Agent, hiển thị dashboard thống kê (stats, model
 * distribution, daily usage, recent activity) và ô nhập message.
 *
 * Main features:
 * - Hiển thị stats grid và model distribution
 * - Hiển thị recent activity từ conversation history
 * - Ô nhập message với model/account selection
 * - Slogan xoay vòng tự động
 * ------------------------------------------------------------------
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import StatsGrid from './components/StatsGrid';
import RecentActivity from './components/RecentActivity';
import ModelDistributionCard from './components/ModelDistributionCard';
import DailyUsageChart from './components/DailyUsageChart';
import InstallationBanner from './components/InstallationBanner';
import ModelAccountDrawer from '../../components/MessageInput/ModelAccountDrawer';
import { ConversationItem } from '../History/types';
import { useSettings } from '../../context/SettingsContext';
import MessageInput from '../../components/MessageInput';
import FilesPreviews from '../../components/MessageInput/FilesPreviews';
import { useFileHandling } from '../../hooks/useFileHandling';
import ConversationService from '../../services/ConversationService';
import { logger } from '@renderer/utils/logger';

/**
 * Get moduleId from current context
 */
function getCurrentModuleId(): string | null {
  const feature = (window as any).__activeFeature;
  const targetId = (window as any).__activeTargetId;
  const projectId = (window as any).__currentProjectId;

  if (feature === 'emulate' && targetId) {
    return `emulate:${targetId}`;
  } else if (feature === 'code' && projectId) {
    return `code:${projectId}`;
  } else if (feature === 'recon' && targetId) {
    return `recon:${targetId}`;
  }

  return null;
}

const SLOGANS = [
  'Code smarter, not harder',
  'Your AI coding companion',
  'Boost your productivity',
  'Where ideas meet implementation',
  'Ship faster with confidence',
  'Your partner in development',
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
  // Instance ID
  const renderCount = React.useRef(0);
  renderCount.current += 1;
  const { apiUrl } = useSettings();

  const folderPath = (window as any).__zenWorkspaceFolderPath as string | null | undefined;

  const [currentModel, setCurrentModel] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('zen_last_model');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      logger.warn('[Home] Failed to parse saved model:', e);
    }
    return null;
  });
  const [currentAccount, setCurrentAccount] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('zen_last_account');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      logger.warn('[Home] Failed to parse saved account:', e);
    }
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
      logger.error('[Phantoma][Home] Failed to fetch providers:', error);
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
    const loadHistory = async () => {
      const moduleId = getCurrentModuleId();
      if (!moduleId) {
        logger.warn('[Home] No active moduleId, cannot load history');
        setIsLoading(false);
        return;
      }

      try {
        // Get list of conversation IDs
        const conversationIds = await ConversationService.list(moduleId);

        // Load each conversation's data
        const conversationsData = await Promise.all(
          conversationIds.slice(0, 10).map(async (id) => {
            // Load first 10 for home
            try {
              const data = await ConversationService.get(moduleId, id);
              if (!data) return null;

              // Convert to ConversationItem format
              const firstMessage = data.messages[0];
              const title = firstMessage?.content.substring(0, 100) || 'New Conversation';
              const preview = data.messages
                .slice(0, 3)
                .map((m) => m.content.substring(0, 50))
                .join(' ');

              return {
                id: data.conversationId,
                title,
                preview,
                timestamp: data.createdAt,
                lastModified: data.lastModified,
                createdAt: data.createdAt,
                messageCount: data.messages.length,
                tabId: -1,
                totalRequests: 0,
                totalTokenUsage: 0,
                folderPath: null,
              } as ConversationItem;
            } catch (error) {
              logger.warn(`[Home] Failed to load conversation ${id}:`, error);
              return null;
            }
          }),
        );

        const validHistory = conversationsData.filter((c): c is ConversationItem => c !== null);
        setConversations(validHistory);
      } catch (error) {
        logger.error('[Home] Failed to load history:', error);
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
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
                } catch {
                  logger.warn('[Home] Invalid website URL for favicon:', p.website);
                }
              }
            });
            setProviderFavicons(favicons);
          }
        }
      } catch (err) {
        logger.warn('[Home] Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, [apiUrl]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSloganIndex((prev) => (prev + 1) % SLOGANS.length);
    }, 3000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const timeA = new Date(a.lastModified || a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastModified || b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [conversations]);

  const imagesUri = (window as any).__zenImagesUri;

  // Calculate percent changes for StatsGrid (same logic as Zen)
  const percentChanges = useMemo(() => {
    const sorted = [...dailyUsage].sort((a, b) => b.date.localeCompare(a.date));
    const today = sorted[0];
    const yesterday = sorted[1];
    const tokenChange = yesterday?.tokens
      ? ((today.tokens - yesterday.tokens) / yesterday.tokens) * 100
      : null;
    const requestChange = yesterday?.requests
      ? ((today.requests - yesterday.requests) / yesterday.requests) * 100
      : null;
    const totalModelRequests = modelDistribution.reduce(
      (s: number, m: any) => s + m.total_requests,
      0,
    );
    const favModel = modelDistribution.find((m: any) => m.model_id === favoriteModel);
    const favShare =
      totalModelRequests > 0 && favModel
        ? (favModel.total_requests / totalModelRequests) * 100
        : null;
    return [tokenChange, requestChange, favShare, null];
  }, [dailyUsage, modelDistribution, favoriteModel]);

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

  const messageInputProps = {
    message,
    setMessage,
    isHistoryMode: false as const,
    uploadedFiles,
    textareaRef: textareaRef as React.RefObject<HTMLTextAreaElement>,
    handleTextareaChange,
    handleKeyDown,
    handlePaste,
    handleDragOver,
    handleDrop,
    setShowAtMenu: () => {},
    handleFileSelect,
    onOpenProjectStructure: () => {},
    showChangesDropdown: false,
    setShowChangesDropdown: () => {},
    messages: [] as any[],
    handleSend,
    hasProjectContext: false,
    onOpenProjectContext: () => {},
    folderPath: folderPath || null,
    isConversationStarted: false,
    currentModel,
    setCurrentModel,
    currentAccount,
    setCurrentAccount,
    isProcessing: false,
    isStreaming: false,
    onOpenModelDrawer: handleOpenModelDrawer,
  };

  return (
    <div
      className="home-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--primary-bg)',
        position: 'relative',
      }}
    >
      {/* ─── Dashboard scroll area ─── */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--secondary-bg)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '32px 16px 20px 16px',
            color: 'var(--text-primary)',
            animation: 'fadeIn 0.5s ease-out',
            maxWidth: '680px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0',
              textAlign: 'center',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={`${imagesUri}/icon.png`}
                  alt="Phantoma Logo"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
              <h1
                style={{
                  fontSize: '30px',
                  fontWeight: 800,
                  margin: 0,
                  background:
                    'linear-gradient(to right, var(--text-primary, #fff), var(--text-secondary, #a8a8a8))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em',
                }}
              >
                Phantoma
              </h1>
            </div>

            <div
              style={{
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                margin: '0 0 12px 0',
              }}
            >
              <div
                key={sloganIndex}
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  animation: 'slideUp 0.4s ease-out',
                  whiteSpace: 'nowrap',
                }}
              >
                {SLOGANS[sloganIndex]}
              </div>
            </div>

            <InstallationBanner />
          </div>

          {/* Dashboard content */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <StatsGrid
              todayTokens={todayTokens}
              todayRequests={todayRequests}
              favoriteModel={favoriteModel}
              totalAccounts={totalAccounts}
              percentChanges={percentChanges}
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
              providerFavicons={providerFavicons}
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
              } catch {
                logger.warn('[Home] Invalid website URL for favicon:', prov.website);
              }
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

      {/* ─── Bottom Input Area ─── */}
      <div
        style={{
          flexShrink: 0,
          padding: '0 16px 8px 16px',
          backgroundColor: 'var(--primary-bg)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          accept="image/*,text/*"
        />
        <input
          ref={externalFileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
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
        <MessageInput {...(messageInputProps as any)} />
      </div>
    </div>
  );
};

export default HomePanel;
