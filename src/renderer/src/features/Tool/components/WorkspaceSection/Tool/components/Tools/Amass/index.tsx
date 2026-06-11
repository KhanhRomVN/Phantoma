import React, { useState } from 'react';
import { useServerConfig } from '../../../../../../context/ServerConfigContext';
import { useAmassScan } from './hooks/useAmassScan';
import { useHistory } from './hooks/useHistory';
import MarkdownBlock from '../../common/MarkdownBlock';
import ExecutionTab from './tabs/ExecutionTab';
import HistoryTab from './tabs/HistoryTab';
import Tooltip from './components/Tooltip';
import { TooltipState, ContextMenuState } from './types';
import { AMASS_DOC } from './constants';

interface AmassToolProps {
  accentColor?: string;
  activeTab?: 'information' | 'execution' | 'history' | 'logs';
  onTabChange?: (tab: 'information' | 'execution' | 'history' | 'logs') => void;
}

const AmassTool: React.FC<AmassToolProps> = ({
  accentColor = '#34d399',
  activeTab = 'information',
  onTabChange,
}) => {
  const { getFullUrl } = useServerConfig();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const {
    params,
    setParams,
    scanning,
    progress,
    logOutput,
    handleScan: scanHandler,
  } = useAmassScan(getFullUrl, onTabChange);

  const {
    history,
    setHistory,
    expandedCardIndex,
    setExpandedCardIndex,
    historySearchQuery,
    setHistorySearchQuery,
    showDetailView,
    setShowDetailView,
    selectedScanForDetail,
    setSelectedScanForDetail,
    targetHistory,
    setTargetHistory,
    deleteScan,
    filteredHistory,
  } = useHistory();

  const glow = accentColor + '25';

  const handleScan = () => {
    scanHandler(setHistory, setExpandedCardIndex);
  };

  const handleDeleteScan = (scan: any) => {
    deleteScan(scan);
  };

  const handleContextMenuChange = (menu: ContextMenuState | null) => {
    setContextMenu(menu);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontFamily: '"JetBrains Mono", monospace',
        position: 'relative',
      }}
    >
      {activeTab === 'information' && <MarkdownBlock content={AMASS_DOC} accentColor={accentColor} />}

      {activeTab === 'execution' && (
        <ExecutionTab
          params={params}
          setParams={setParams}
          scanning={scanning}
          progress={progress}
          logOutput={logOutput}
          onScan={handleScan}
          accentColor={accentColor}
          glow={glow}
          targetHistory={targetHistory}
          onTooltipShow={setTooltip}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab
          history={history}
          filteredHistory={filteredHistory}
          expandedCardIndex={expandedCardIndex}
          setExpandedCardIndex={setExpandedCardIndex}
          historySearchQuery={historySearchQuery}
          setHistorySearchQuery={setHistorySearchQuery}
          showDetailView={showDetailView}
          setShowDetailView={setShowDetailView}
          selectedScanForDetail={selectedScanForDetail}
          setSelectedScanForDetail={setSelectedScanForDetail}
          onDeleteScan={handleDeleteScan}
          onContextMenuChange={handleContextMenuChange}
          contextMenu={contextMenu}
          accentColor={accentColor}
          glow={glow}
          onTooltipShow={setTooltip}
        />
      )}

      {activeTab === 'logs' && (
        <div style={{ padding: 20, color: '#64748b', textAlign: 'center' }}>
          Logs tab - Coming soon
        </div>
      )}

      <Tooltip tooltip={tooltip} accentColor={accentColor} />
    </div>
  );
};

export default AmassTool;