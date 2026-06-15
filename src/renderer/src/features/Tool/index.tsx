import React, { useState } from 'react';
import { Search, Wifi, Globe, Bug, Eye, Shield, Server, Home, ChevronRight } from 'lucide-react';
import { TOOLS_LIST } from './data/toolsList';
import { CATEGORY_META } from './constants';
import { ToolIcon } from './utils/iconHelpers';
import { useToolManager } from './hooks/useToolManager';
import { ServerConfigProvider } from './context/ServerConfigContext';

interface ToolManagerProps {
  activeToolId?: string;
  onToolChange?: (toolId: string) => void;
}

const ToolManager: React.FC<ToolManagerProps> = ({ activeToolId = 'nmap', onToolChange }) => {
  const {
    selectedTool,
    activeCategory,
    searchQuery,
    currentTool,
    ToolComponent,
    catMeta,
    categories,
    filteredTools,
    handleToolSelect,
    setActiveCategory,
    setSearchQuery,
  } = useToolManager(activeToolId, onToolChange);

  const [toolActiveTab, setToolActiveTab] = useState<'information' | 'execution' | 'history'>(
    'information',
  );

  // Unified accent color from Tailwind theme (--primary: 54 134 255)
  const UNIFIED_ACCENT = '#3686ff';

  // Scanline CSS baked inline để không cần external styles
  const scanlineStyle: React.CSSProperties = {
    background:
      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(54,134,255,0.015) 2px, rgba(54,134,255,0.015) 4px)',
    pointerEvents: 'none',
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        position: 'relative',
      }}
    >
      {/* Scanline overlay */}
      <div style={{ ...scanlineStyle, position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* ─── LEFT PANEL ─── */}
      <div
        style={{
          width: 390,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1e2535',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Topbar */}
        <div className="h-[37px] shrink-0 px-5 flex items-center border-b border-border">
          <span className="text-text-secondary text-sm">Tools</span>
        </div>
        {/* Search */}
        <div style={{ padding: '12px 14px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 22,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search tools..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: '#080b10',
                border: '1px solid #1e2535',
                borderRadius: 6,
                color: '#e2e8f0',
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Tool Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {filteredTools.map((tool) => {
            const isSelected = selectedTool === tool.id;
            const meta = CATEGORY_META[tool.category];
            return (
              <button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: isSelected ? meta.bg : 'transparent',
                  border: '1px solid transparent',
                  borderLeft: `2px solid ${isSelected ? meta.color : 'transparent'}`,
                  borderRadius: '0 4px 4px 0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  boxShadow: 'none',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.background = meta.bg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }
                }}
              >
                {/* Icon with favicon support */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    background: isSelected ? meta.bg : '#0d1117',
                    border: '1px solid #1a2236',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    color: meta.color,
                    flexShrink: 0,
                    boxShadow: 'none',
                    overflow: 'hidden',
                  }}
                >
                  <ToolIcon tool={tool} color={meta.color} />
                </div>

                {/* Name + short description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isSelected ? meta.color : '#c5cfe0',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {tool.name}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 10,
                        color: '#6b7a96',
                        letterSpacing: '0.03em',
                        lineHeight: 1.3,
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
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
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1 }}
      >
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

        {currentTool && catMeta ? (
          <>
            {/* Tool Header - Thống nhất màu nền */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid #1e2535',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                flexShrink: 0,
                position: 'relative',
              }}
            >
              {/* Big icon - màu accent thống nhất */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#080b10',
                  border: `1px solid ${UNIFIED_ACCENT}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: UNIFIED_ACCENT,
                  flexShrink: 0,
                  alignSelf: 'center',
                }}
              >
                <ToolIcon tool={currentTool} color={UNIFIED_ACCENT} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: '#e2e8f0',
                      letterSpacing: '0.1em',
                      fontFamily: 'inherit',
                    }}
                  >
                    {currentTool.name.toUpperCase()}
                  </h2>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: 4,
                      background: '#1a2236',
                      border: '1px solid #2a3346',
                      color: '#94a3b8',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                    }}
                  >
                    {currentTool.category.toUpperCase()}
                  </span>
                </div>

                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: 11,
                    color: '#64748b',
                    lineHeight: 1.5,
                    fontFamily: 'inherit',
                  }}
                >
                  {currentTool.description}
                </p>

                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {currentTool.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '2px 7px',
                        borderRadius: 3,
                        background: '#0d1117',
                        border: '1px solid #1a2236',
                        color: '#64748b',
                        fontSize: 9,
                        letterSpacing: '0.06em',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                  {currentTool.websiteUrl && (
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: 3,
                        background: '#0d1117',
                        border: '1px solid #1a2236',
                        color: '#64748b',
                        fontSize: 9,
                        letterSpacing: '0.06em',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onClick={() => window.open(currentTool.websiteUrl, '_blank')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#1a2236';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#0d1117';
                      }}
                      title={`Open ${currentTool.name} website`}
                    >
                      {currentTool.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Bar - Thống nhất màu sắc */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #1e2535',
                padding: '0 20px',
                gap: 4,
              }}
            >
              {[
                { id: 'information', label: 'INFORMATION' },
                { id: 'execution', label: 'EXECUTION' },
                { id: 'history', label: 'HISTORY' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setToolActiveTab(tab.id as typeof toolActiveTab)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${toolActiveTab === tab.id ? 'rgb(var(--primary))' : 'transparent'}`,
                    color: toolActiveTab === tab.id ? 'rgb(var(--primary))' : 'rgb(var(--text-secondary))',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tool Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
              }}
            >
              {ToolComponent ? (
                <ServerConfigProvider>
                  <ToolComponent
                    accentColor={UNIFIED_ACCENT}
                    activeTab={toolActiveTab}
                    onTabChange={setToolActiveTab}
                  />
                </ServerConfigProvider>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <p style={{ fontSize: 12, color: '#1e293b' }}>NO COMPONENT LOADED</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 12, color: '#1e293b', letterSpacing: '0.15em' }}>
              // SELECT A TOOL
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolManager;
