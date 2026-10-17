/**
 * ------------------------------------------------------------------
 * HomePanel
 * ------------------------------------------------------------------
 * Panel trang chủ — hiển thị dashboard thống kê và MessageInput.
 * Bao gồm stats grid, model distribution, daily usage chart, recent activity,
 * top accounts, efficiency map.
 *
 * Main features:
 * - Dashboard stats: tổng tokens, requests, favorite model, số tài khoản
 * - Biểu đồ phân bố model và daily usage
 * - Top accounts và efficiency map
 * - Danh sách hội thoại gần đây
 * - MessageInput với draft auto-save, file handling
 * - Per-conversation feature toggles (diagnostic, skill, memory, tool format)
 * - DeepSeek time-block checking
 * - Performance optimizations với memoization
 * - Fixed desktop layout (no responsive breakpoints)
 * ------------------------------------------------------------------
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import StatsGrid from './components/StatsGrid';
import HistoryConversation from './components/HistoryConversation';
import ModelDistribution from './components/ModelDistribution';
import UsageChart from './components/UsageChart';
import HomeHeader from './components/HomeHeader';
import ZenUpdateBanner from './components/ZenUpdateBanner';
import AIWeb2APIUpdateBanner from './components/AIWeb2APIUpdateBanner';
import ConnectionErrorBanner from './components/ConnectionErrorBanner';
import { ConversationItem } from '../History/types';
import { useSettings } from '../../context/SettingsContext';
import MessageInput from '../../components/MessageInput';
import FilesPreviews from '../../components/MessageInput/FilesPreviews';
import { useFileHandling } from '../../hooks/useFileHandling';
import { useHomeDraftManagement } from './hooks/useHomeDraftManagement';
import { useModelAccount } from '../../hooks/useModelAccount';
import { useToolFormatSettings } from '../../hooks/useToolFormatSettings';
import { useZenUpdate } from './hooks/useZenUpdate';
import ConversationService from '../../services/ConversationService';
import {
  isBlockedNow,
  isDeepSeekProvider,
  getBlockedRangeLabel,
  getBlockedHoursDescription,
} from '@renderer/utils/timeBlock';
import { AccountStat } from './utils/format';
import {
  useStatsPeriod,
  readCachedPeriodState,
  readStatsSnapshot,
  writeStatsSnapshot,
  readGlobalSnapshot,
  writeGlobalSnapshot,
} from './hooks/useStatsPeriod';

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

interface HomePanelProps {
  onSendMessage: (
    content: string,
    files: any[],
    model: any,
    account: any,
    conversationOverrides?: {
      diagnosticEnabled?: boolean;
      useSkillEnabled?: boolean;
      memoryEnabled?: boolean;
      toolFormat?: 'xml' | 'json';
    },
  ) => void;
  onLoadConversation: (conversationId: string, tabId: number, folderPath: string | null) => void;
  initialValue?: string;
}

// Memoized dashboard stats component
const DashboardStats = React.memo(
  ({
    todayTokens,
    todayRequests,
    favoriteModel,
    totalAccounts,
    modelDistribution,
    providerFavicons,
    dailyUsage,
    accounts,
    statsPeriod,
  }: {
    todayTokens: number;
    todayRequests: number;
    favoriteModel: string;
    totalAccounts: number;
    modelDistribution: any[];
    providerFavicons: Record<string, string>;
    dailyUsage: any[];
    accounts: AccountStat[];
    statsPeriod: 'day' | 'week' | 'month' | 'year' | 'all';
  }) => {
    const percentChanges = useMemo(() => {
      const sorted = [...dailyUsage].sort((a, b) => b.date.localeCompare(a.date));
      const today = sorted[0];
      const yesterday = sorted[1];
      const tokenChange =
        yesterday?.tokens && today?.tokens
          ? ((today.tokens - yesterday.tokens) / yesterday.tokens) * 100
          : null;
      const requestChange =
        yesterday?.requests && today?.requests
          ? ((today.requests - yesterday.requests) / yesterday.requests) * 100
          : null;
      return [tokenChange, requestChange, null, null];
    }, [dailyUsage]);

    return (
      <>
        <StatsGrid
          todayTokens={todayTokens}
          todayRequests={todayRequests}
          favoriteModel={favoriteModel}
          totalAccounts={totalAccounts}
          percentChanges={percentChanges}
        />

        <ModelDistribution
          modelDistribution={modelDistribution}
          providerFavicons={providerFavicons}
          title="AI Model Distribution"
          emptyText="Loading history..."
        />

        <UsageChart usage={dailyUsage} title="Usage" period={statsPeriod} />
      </>
    );
  },
);

const HomePanel: React.FC<HomePanelProps> = ({ onSendMessage, onLoadConversation }) => {
  const { apiUrl } = useSettings();

  const folderPath = (window as any).__zenWorkspaceFolderPath as string | null | undefined;
  const imagesUri = (window as any).__zenImagesUri;
  const zenUpdateInfo = useZenUpdate();

  // Model & Account state with persistence
  const { currentModel, setCurrentModel, currentAccount, setCurrentAccount } =
    useModelAccount(folderPath);

  // Tool format settings
  const { toolFormat: conversationToolFormat, toggleToolFormat: toggleConversationToolFormat } =
    useToolFormatSettings(currentModel?.providerId, currentModel?.id);

  // Per-conversation feature toggles (default false for Phantoma)
  const [conversationDiagnosticEnabled, setConversationDiagnosticEnabled] = useState(false);
  const [conversationUseSkillEnabled, setConversationUseSkillEnabled] = useState(false);
  const [conversationMemoryEnabled, setConversationMemoryEnabled] = useState(false);

  // Draft management
  const { message, setMessage, clearDraft } = useHomeDraftManagement(folderPath || null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Conversations
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stats state with snapshot cache
  const [initialCache] = useState(() => {
    const p = readCachedPeriodState();
    return {
      stats: readStatsSnapshot(p.period, p.offset),
      global: readGlobalSnapshot(),
    };
  });

  const [todayTokens, setTodayTokens] = useState<number>(initialCache.stats?.todayTokens ?? 0);
  const [todayRequests, setTodayRequests] = useState<number>(
    initialCache.stats?.todayRequests ?? 0,
  );
  const [favoriteModel, setFavoriteModel] = useState<string>(
    initialCache.stats?.favoriteModel ?? '—',
  );
  const [totalAccounts, setTotalAccounts] = useState<number>(
    initialCache.global?.totalAccounts ?? 0,
  );
  const [modelDistribution, setModelDistribution] = useState<any[]>(
    initialCache.stats?.modelDistribution ?? [],
  );
  const [dailyUsage, setDailyUsage] = useState<any[]>(initialCache.stats?.dailyUsage ?? []);
  const [accounts, setAccounts] = useState<AccountStat[]>(initialCache.stats?.accounts ?? []);
  const [providerFavicons, setProviderFavicons] = useState<Record<string, string>>(
    initialCache.global?.providerFavicons ?? {},
  );
  const [providers, setProviders] = useState<any[]>([]);
  const [attachedItems, setAttachedItems] = useState<any[]>([]);

  // Stats period picker
  const { period: statsPeriod, offset: statsOffset } = useStatsPeriod();

  // Apply snapshot cache immediately when period/offset changes
  useEffect(() => {
    const snap = readStatsSnapshot(statsPeriod, statsOffset);
    if (!snap) return;
    setTodayTokens(snap.todayTokens);
    setTodayRequests(snap.todayRequests);
    setFavoriteModel(snap.favoriteModel);
    setModelDistribution(snap.modelDistribution);
    setAccounts(snap.accounts);
    setDailyUsage(snap.dailyUsage);
  }, [statsPeriod, statsOffset]);

  // Cache global data
  useEffect(() => {
    if (Object.keys(providerFavicons).length === 0) return;
    writeGlobalSnapshot({ totalAccounts, providerFavicons });
  }, [totalAccounts, providerFavicons]);

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const periodParam = statsPeriod === 'all' ? 'year' : statsPeriod;
        const offsetParam = statsPeriod === 'all' ? 0 : statsOffset;

        const statsUrl =
          statsPeriod === 'all'
            ? `${apiUrl}/v1/stats?period=year&offset=0`
            : `${apiUrl}/v1/stats?period=${periodParam}&offset=${offsetParam}`;

        const [statsRes, accountsRes, providersRes] = await Promise.all([
          fetch(statsUrl),
          fetch(`${apiUrl}/v1/accounts?page=1&limit=1000`),
          fetch(`${apiUrl}/v1/providers`),
        ]);

        if (statsRes.ok) {
          const stats = await statsRes.json();
          if (stats.success && stats.data) {
            const usage: { requests: number; tokens: number }[] = stats.data.usage || [];
            const sumTokens = usage.reduce((s: number, u: any) => s + (u.tokens || 0), 0);
            const sumRequests = usage.reduce((s: number, u: any) => s + (u.requests || 0), 0);
            setTodayTokens(sumTokens);
            setTodayRequests(sumRequests);

            const models: any[] = (stats.data.models || []).filter(
              (m: any) => m.total_requests > 0,
            );
            setModelDistribution(models.slice(0, 5));
            setAccounts(stats.data.accounts || []);
            setDailyUsage(stats.data.usage || []);
            if (models.length > 0) setFavoriteModel(models[0].model_id);

            writeStatsSnapshot(statsPeriod, statsOffset, {
              todayTokens: sumTokens,
              todayRequests: sumRequests,
              favoriteModel: models.length > 0 ? models[0].model_id : '—',
              modelDistribution: models.slice(0, 5),
              accounts: stats.data.accounts || [],
              dailyUsage: stats.data.usage || [],
            });
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
            setProviders(prov.data);
            const favicons: Record<string, string> = {};
            prov.data.forEach((p: any) => {
              if (p.provider_id && p.website) {
                try {
                  favicons[p.provider_id] = `${new URL(p.website).origin}/favicon.ico`;
                } catch {
                  console.warn('[Home] Invalid website URL for favicon:', p.website);
                }
              }
            });
            setProviderFavicons(favicons);
          }
        }
      } catch (err) {
        console.warn('[Home] Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, [apiUrl, statsPeriod, statsOffset]);

  // Load conversation history
  useEffect(() => {
    const loadHistory = async () => {
      const moduleId = getCurrentModuleId();
      if (!moduleId) {
        console.warn('[Home] No active moduleId, cannot load history');
        setIsLoading(false);
        return;
      }

      try {
        const conversationIds = await ConversationService.list(moduleId);
        const conversationsData = await Promise.all(
          conversationIds.slice(0, 10).map(async (id) => {
            try {
              const data = await ConversationService.get(moduleId, id);
              if (!data) return null;

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
              console.warn(`[Home] Failed to load conversation ${id}:`, error);
              return null;
            }
          }),
        );

        const validHistory = conversationsData.filter((c): c is ConversationItem => c !== null);
        setConversations(validHistory);
      } catch (error) {
        console.error('[Home] Failed to load history:', error);
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, []);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const timeA = new Date(a.lastModified || a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastModified || b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [conversations]);

  const handleAddAttachedItem = useCallback((item: any) => {
    setAttachedItems((prev) => [...prev, item]);
  }, []);

  const handleRemoveAttachedItem = useCallback((id: string) => {
    setAttachedItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

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
    onAddAttachedItem: handleAddAttachedItem,
  });

  const handleRemoveAttachedItemWrapper = useCallback(
    (id: string) => {
      handleRemoveAttachedItem(id);
    },
    [handleRemoveAttachedItem],
  );

  const handleSend = useCallback(
    (model: any, account: any) => {
      if (message.trim() || uploadedFiles.length > 0 || attachedItems.length > 0) {
        // DeepSeek time-block check
        if (isDeepSeekProvider(model?.providerId)) {
          const providerConfig = providers.find(
            (p: any) => p.provider_id?.toLowerCase() === model?.providerId?.toLowerCase(),
          );
          const ranges = providerConfig?.blocked_time_ranges ?? null;
          if (isBlockedNow(ranges)) {
            const rangeLabel = getBlockedRangeLabel(ranges);
            const allRanges = getBlockedHoursDescription(ranges);
            onSendMessage(
              `⛔ DeepSeek bị chặn trong khung giờ ${allRanges}. Hiện tại đang trong khung ${rangeLabel}. Vui lòng thử lại sau.`,
              [],
              model,
              account,
              {},
            );
            return;
          }
        }

        onSendMessage(message, [...uploadedFiles, ...attachedItems], model, account, {
          diagnosticEnabled: conversationDiagnosticEnabled,
          useSkillEnabled: conversationUseSkillEnabled,
          memoryEnabled: conversationMemoryEnabled,
          toolFormat: conversationToolFormat,
        });
        setMessage('');
        clearDraft();
        clearFiles();
        setAttachedItems([]);
      }
    },
    [
      message,
      uploadedFiles,
      attachedItems,
      providers,
      onSendMessage,
      clearDraft,
      clearFiles,
      conversationDiagnosticEnabled,
      conversationUseSkillEnabled,
      conversationMemoryEnabled,
      conversationToolFormat,
    ],
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value);
    },
    [setMessage],
  );

  const handleKeyDown = useCallback((_e: React.KeyboardEvent<HTMLTextAreaElement>) => {}, []);

  return (
    <div className="flex flex-col h-full relative">
      {/* Dashboard scroll area */}
      <div className="flex-1 overflow-auto flex flex-col">
        <div
          className="flex-1 flex flex-col items-center justify-start p-8 text-primary"
          style={{
            animation: 'fadeIn 0.5s ease-out',
            maxWidth: '680px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <HomeHeader imagesUri={imagesUri} />

          <div className="w-full mb-4 flex flex-col gap-3">
            <ConnectionErrorBanner isConnected={true} />
            <ZenUpdateBanner updateInfo={zenUpdateInfo} />
            <AIWeb2APIUpdateBanner updateInfo={null} />
          </div>

          <div className="w-full flex flex-col gap-4">
            <DashboardStats
              todayTokens={todayTokens}
              todayRequests={todayRequests}
              favoriteModel={favoriteModel}
              totalAccounts={totalAccounts}
              modelDistribution={modelDistribution}
              providerFavicons={providerFavicons}
              dailyUsage={dailyUsage}
              accounts={accounts}
              statsPeriod={statsPeriod}
            />

            <HistoryConversation
              conversations={sortedConversations}
              isLoading={isLoading}
              onLoadConversation={onLoadConversation}
              providerFavicons={providerFavicons}
            />
          </div>
        </div>
      </div>

      {/* Bottom Input Area */}
      <div className="shrink-0 px-4 pb-2">
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
          attachedItems={attachedItems}
          onRemoveFile={removeFile}
          onRemoveAttachedItem={handleRemoveAttachedItemWrapper}
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
          attachedItems={attachedItems}
          textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
          handleTextareaChange={handleTextareaChange}
          handleKeyDown={handleKeyDown}
          handlePaste={handlePaste}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
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
          conversationDiagnosticEnabled={conversationDiagnosticEnabled}
          conversationUseSkillEnabled={conversationUseSkillEnabled}
          conversationMemoryEnabled={conversationMemoryEnabled}
          conversationToolFormat={conversationToolFormat}
          onConversationDiagnosticToggle={() => {
            setConversationDiagnosticEnabled(!conversationDiagnosticEnabled);
          }}
          onConversationUseSkillToggle={() => {
            setConversationUseSkillEnabled(!conversationUseSkillEnabled);
          }}
          onConversationMemoryToggle={() => {
            setConversationMemoryEnabled(!conversationMemoryEnabled);
          }}
          onConversationToolFormatToggle={() => {
            toggleConversationToolFormat();
          }}
        />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .spin-animation { animation: spin 1s linear infinite; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HomePanel;
