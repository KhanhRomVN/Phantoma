import React, { useState, useMemo, Suspense } from 'react';
import { Home, ChevronRight } from 'lucide-react';
import { TOOLS_LIST } from './data/toolsList';
import { ToolIcon } from './utils/iconHelpers';
import { useToolManager } from './hooks/useToolManager';
import { ServerConfigProvider } from './context/ServerConfigContext';
import { useTheme } from '../../theme/ThemeProvider';
import { useAccentColors } from '../../shared/hooks/useAccentColors';

interface ToolManagerProps {
  activeToolId?: string;
  onToolChange?: (toolId: string) => void;
}

const ToolManager: React.FC<ToolManagerProps> = ({ activeToolId = 'nmap', onToolChange }) => {
  const {
    selectedTool,
    searchQuery,
    currentTool,
    ToolComponent,
    filteredTools,
    handleToolSelect,
    setSearchQuery,
    activeTab: toolActiveTab,
    setActiveTab: setToolActiveTab,
  } = useToolManager(activeToolId, onToolChange);

  // Get accent colors from shared hook
  const { UNIFIED_ACCENT, PRIMARY_RGB, getColorByIndex } = useAccentColors();

  // Get color for a tool based on its index in the full list
  const getToolColor = (toolId: string) => {
    const index = TOOLS_LIST.findIndex((t) => t.id === toolId);
    return getColorByIndex(index >= 0 ? index : 0);
  };

  // Scanline CSS baked inline để không cần external styles
  const scanlineStyle: React.CSSProperties = {
    background:
      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(54,134,255,0.015) 2px, rgba(54,134,255,0.015) 4px)',
    pointerEvents: 'none',
  };

  return (
    <div className="flex w-full h-full overflow-hidden relative">
      {/* Scanline overlay */}
      <div style={{ ...scanlineStyle, position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* ─── LEFT PANEL ─── */}
      <div className="w-[390px] shrink-0 flex flex-col border-r border-border z-10 overflow-hidden">
        {/* Topbar */}
        <div className="h-[37px] shrink-0 px-5 flex items-center border-b border-border">
          <span className="text-text-secondary text-sm">Tools</span>
        </div>
        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools..."
              className="w-full pl-3 pr-3 py-2.5 text-xs font-mono border rounded-md outline-none bg-input-background text-text-primary border-border"
            />
          </div>
        </div>

        {/* Tool Grid */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-[3px]">
          {filteredTools.map((tool) => {
            const isSelected = selectedTool === tool.id;
            // Get accent color based on tool index in full list
            const accentColor = getToolColor(tool.id);
            return (
              <button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id)}
                className={`flex items-center gap-2.5 px-2.5 py-2 border border-transparent rounded-r-[4px] cursor-pointer text-left transition-all duration-150 shadow-none font-inherit ${
                  isSelected
                    ? 'bg-sidebar-item-hover'
                    : 'bg-transparent hover:bg-sidebar-item-hover'
                }`}
                style={{
                  borderLeft: `2px solid ${isSelected ? accentColor : 'transparent'}`,
                }}
              >
                {/* Icon with favicon support */}
                <div
                  className={`w-7 h-7 rounded-[4px] flex items-center justify-center text-[13px] shrink-0 shadow-none overflow-hidden border border-border ${
                    isSelected ? 'bg-sidebar-item-hover' : 'bg-card-background'
                  }`}
                  style={{ color: accentColor }}
                >
                  <Suspense fallback={<div className="w-5 h-5" />}>
                    <ToolIcon tool={tool} color={accentColor} />
                  </Suspense>
                </div>

                {/* Name + short description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.25 mb-0.5">
                    <span
                      className={`text-[13px] font-bold tracking-[0.05em] ${
                        isSelected ? '' : 'text-text-primary'
                      }`}
                      style={{ color: isSelected ? accentColor : 'var(--text-primary)' }}
                    >
                      {tool.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary tracking-[0.03em] leading-1.3 block whitespace-nowrap overflow-hidden text-ellipsis">
                      {tool.shortDescription}
                    </span>
                  </div>
                </div>

                {/* No speed dot - removed */}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="flex-1 flex flex-col overflow-hidden z-10">
        {/* Breadcrumb Topbar - same height as ModuleBar (37px) */}
        <div className="h-[37px] shrink-0 border-b border-border px-5 flex items-center gap-2">
          <Home className="w-4 h-4 text-text-secondary -mt-0.5" />
          <ChevronRight className="w-3 h-3 text-text-secondary" />
          <span className="text-text-secondary text-sm">Tools</span>
          <ChevronRight className="w-3 h-3 text-text-secondary" />
          <div className="flex items-center gap-1">
            <span className="text-text-primary text-sm font-medium">
              {currentTool?.name || 'Select a tool'}
            </span>
          </div>
        </div>

        {currentTool ? (
          <>
            {/* Tool Header - Thống nhất màu nền */}
            <div className="px-5 py-3 border-b border-divider flex items-start gap-4 shrink-0 relative">
              {/* Big icon - màu accent based on tool index */}
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center text-[19px] shrink-0 self-center"
                style={{
                  background: (() => {
                    const color = getToolColor(currentTool.id);
                    const rgbMatch = color.match(/\d+/g);
                    if (rgbMatch) {
                      const r = parseInt(rgbMatch[0]);
                      const g = parseInt(rgbMatch[1]);
                      const b = parseInt(rgbMatch[2]);
                      return `rgba(${r}, ${g}, ${b}, 0.15)`;
                    }
                    return 'var(--card-background)';
                  })(),
                  border: `1px solid ${getToolColor(currentTool.id)}40`,
                  color: getToolColor(currentTool.id),
                }}
              >
                <Suspense fallback={<div className="w-7 h-7" />}>
                  <ToolIcon tool={currentTool} color={getToolColor(currentTool.id)} />
                </Suspense>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <h2 className="m-0 text-[18px] font-extrabold text-text-primary tracking-[0.1em] font-inherit">
                    {currentTool.name.toUpperCase()}
                  </h2>
                  <div className="flex gap-2 flex-wrap items-center">
                    {currentTool.tags.map((tag, index) => {
                      // Use theme accentColors or fallback to primary
                      const color = getColorByIndex(index);
                      // Parse RGB values from color string
                      const rgbMatch = color.match(/\d+/g);
                      if (rgbMatch) {
                        const r = parseInt(rgbMatch[0]);
                        const g = parseInt(rgbMatch[1]);
                        const b = parseInt(rgbMatch[2]);
                        return (
                          <span
                            key={tag}
                            className="px-[7px] py-0.5 rounded-[3px] text-[9px] tracking-[0.06em]"
                            style={{
                              background: `rgba(${r}, ${g}, ${b}, 0.2)`,
                              border: `1px solid rgba(${r}, ${g}, ${b}, 0.4)`,
                              color: `rgb(${r}, ${g}, ${b})`,
                            }}
                          >
                            #{tag}
                          </span>
                        );
                      }
                      // Fallback if color parsing fails
                      return (
                        <span
                          key={tag}
                          className="px-[7px] py-0.5 rounded-[3px] text-[9px] tracking-[0.06em]"
                          style={{
                            background: `rgba(${PRIMARY_RGB}, 0.2)`,
                            border: `1px solid rgba(${PRIMARY_RGB}, 0.4)`,
                            color: UNIFIED_ACCENT,
                          }}
                        >
                          #{tag}
                        </span>
                      );
                    })}
                    {currentTool.websiteUrl && (
                      <span
                        className="px-[7px] py-0.5 rounded-[3px] text-[9px] tracking-[0.06em] cursor-pointer transition-all duration-150 bg-card-background border border-border text-text-secondary hover:bg-sidebar-item-hover"
                        onClick={() => window.open(currentTool.websiteUrl, '_blank')}
                        title={`Open ${currentTool.name} website`}
                      >
                        {currentTool.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </span>
                    )}
                  </div>
                </div>

                <p className="m-0 text-[12px] text-[#64748b] leading-1.5 font-inherit">
                  {currentTool.description}
                </p>
              </div>
            </div>

            {/* Tab Bar - Thống nhất màu sắc */}
            <div className="flex border-b border-divider px-5 gap-1">
              {[
                { id: 'information', label: 'INFORMATION' },
                { id: 'execution', label: 'EXECUTION' },
                { id: 'history', label: 'HISTORY' },
                { id: 'profiles', label: 'PROFILES' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setToolActiveTab(tab.id as typeof toolActiveTab)}
                  className={`px-4 py-2.5 cursor-pointer font-inherit bg-transparent border-none text-[11px] font-bold tracking-[0.12em] transition-all duration-150 ${
                    toolActiveTab === tab.id
                      ? 'text-[rgb(var(--primary))] border-b-2 border-[rgb(var(--primary))]'
                      : 'text-[rgb(var(--text-secondary))] border-b-2 border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tool Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {ToolComponent ? (
                <ServerConfigProvider>
                  <ToolComponent
                    accentColor={UNIFIED_ACCENT}
                    activeTab={toolActiveTab}
                    onTabChange={setToolActiveTab}
                  />
                </ServerConfigProvider>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[12px] text-[#1e293b]">NO COMPONENT LOADED</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[12px] text-[#1e293b] tracking-[0.15em]">// SELECT A TOOL</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolManager;
