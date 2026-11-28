/**
 * ------------------------------------------------------------------
 * HomePanel
 * ------------------------------------------------------------------
 * Composition root của trang chủ: dashboard thống kê, hội thoại gần đây,
 * workspace badge và vùng Composer.
 * ------------------------------------------------------------------
 */

import React from 'react';
import BrandHeader from './components/BrandHeader';
import StatusNotices from './components/StatusNotices';
import DashboardOverview from './components/DashboardOverview';
import RecentConversations from './components/RecentConversations';
import WorkspacePathBadge from './components/WorkspacePathBadge';
import ComposerSection, { type SendOverrides } from './components/ComposerSection';
import { useDashboardData } from './hooks/useDashboardData';
import { useRecentConversations } from './hooks/useRecentConversations';
import { useZenUpdate } from './hooks/useZenUpdate';
import AgentNavBadge, { NavTarget } from '../../shared/components/AgentNavBadge';
import { useSettings } from '../../context/SettingsContext';

interface HomePanelProps {
  onSendMessage: (
    content: string,
    files: any[],
    model: any,
    account: any,
    conversationOverrides?: SendOverrides,
  ) => void;
  onLoadConversation: (conversationId: string, tabId: number, folderPath: string | null) => void;
  initialValue?: string;
  /** Điều hướng sang Account / History / Marketplace / Setting từ AgentNavBadge (luôn hiển thị). */
  onOpenSubView: (target: NavTarget) => void;
}

const HomePanel: React.FC<HomePanelProps> = ({
  onSendMessage,
  onLoadConversation,
  onOpenSubView,
}) => {
  const { apiUrl } = useSettings();
  const workspacePath =
    ((window as any).__zenWorkspaceFolderPath as string | null | undefined) || null;
  // Fallback '/images' nếu __zenImagesUri chưa được inject (dev/build)
  const imagesUri = (window as any).__zenImagesUri || '/images';

  const zenUpdateInfo = useZenUpdate();
  const { period, stats, totalAccounts, providerFavicons, accountsLoaded } =
    useDashboardData(apiUrl);
  const { conversations, isLoading } = useRecentConversations();

  return (
    <div className="flex flex-col h-full relative">
      {/* Workspace path badge — góc phải trên */}
      <div className="absolute top-2 right-3 z-10">
        <WorkspacePathBadge path={workspacePath} />
      </div>

      <div className="flex-1 overflow-auto flex flex-col">
        <div
          className="flex-1 flex flex-col items-center justify-start py-8 px-4 text-text-primary"
          style={{
            animation: 'fadeIn 0.5s ease-out',
            maxWidth: '680px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <BrandHeader imagesUri={imagesUri} />

          <AgentNavBadge className="w-full mb-2" onSelect={onOpenSubView} />

          <div className="w-full mb-4 flex flex-col gap-3 empty:hidden">
            <StatusNotices
              zenUpdateInfo={zenUpdateInfo}
              totalAccounts={totalAccounts}
              accountsLoaded={accountsLoaded}
            />
          </div>

          <div className="w-full flex flex-col gap-4">
            <DashboardOverview
              stats={stats}
              totalAccounts={totalAccounts}
              providerFavicons={providerFavicons}
              statsPeriod={period}
            />
            <RecentConversations
              conversations={conversations}
              isLoading={isLoading}
              onLoadConversation={onLoadConversation}
              providerFavicons={providerFavicons}
            />
          </div>
        </div>
      </div>

      <ComposerSection folderPath={workspacePath} onSendMessage={onSendMessage} />

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
