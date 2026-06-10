import React from 'react';
import { Search, Wifi, Globe, Bug, Eye, Shield, Server } from 'lucide-react';
import { TOOLS_LIST } from './data/toolsList';
import { CATEGORY_META, SPEED_META, STATUS_META } from './constants';
import { ToolIcon } from './utils/iconHelpers';
import { useToolManager } from './hooks/useToolManager';

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

  // Scanline CSS baked inline để không cần external styles
  const scanlineStyle: React.CSSProperties = {
    background:
      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.015) 2px, rgba(0,229,255,0.015) 4px)',
    pointerEvents: 'none',
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#07090e',
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
          background: '#0f1319',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 0px 10px 0px', borderBottom: '1px solid #111827' }}>
          {/* Tools Header with Badge */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              paddingLeft: 14,
              paddingRight: 14,
            }}
          >
            <span
              style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.15em' }}
            >
              Tools
            </span>
            <span
              style={{
                fontSize: 10,
                background: '#0d1117',
                padding: '2px 8px',
                borderRadius: 4,
                color: '#94a3b8',
                border: '1px solid #1a2236',
              }}
            >
              {TOOLS_LIST.length}
            </span>
          </div>
          {/* Search */}
          <div style={{ position: 'relative', paddingLeft: 14, paddingRight: 14 }}>
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

        {/* Category Pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: '10px 10px',
            borderBottom: '1px solid #111827',
          }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const meta = cat !== 'All' ? CATEGORY_META[cat] : null;
            const count =
              cat === 'All'
                ? TOOLS_LIST.length
                : TOOLS_LIST.filter((t) => t.category === cat).length;
            
            // Map category to icon
            let CategoryIcon = null;
            if (cat === 'All') {
              CategoryIcon = Server;
            } else if (cat === 'Network') {
              CategoryIcon = Wifi;
            } else if (cat === 'Web') {
              CategoryIcon = Globe;
            } else if (cat === 'Exploit') {
              CategoryIcon = Bug;
            } else if (cat === 'OSINT') {
              CategoryIcon = Eye;
            } else if (cat === 'Vuln') {
              CategoryIcon = Shield;
            }
            
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: isActive ? 'none' : `1px solid #1a2236`,
                  background: isActive ? meta?.bg || 'rgba(0,229,255,0.06)' : 'transparent',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {CategoryIcon && (
                  <CategoryIcon
                    size={12}
                    style={{ color: isActive ? meta?.color || '#00e5ff' : '#475569' }}
                  />
                )}
                <span>{cat === 'All' ? 'ALL' : CATEGORY_META[cat].label}</span>
                <span
                  style={{
                    opacity: isActive ? 0.8 : 0.5,
                    color: isActive ? meta?.color || '#00e5ff' : '#475569',
                    fontSize: 10,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
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
                    {tool.status !== 'stable' && (
                      <span
                        style={{
                          fontSize: 8,
                          padding: '1px 4px',
                          background: STATUS_META[tool.status].color + '20',
                          color: STATUS_META[tool.status].color,
                          borderRadius: 2,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                        }}
                      >
                        {STATUS_META[tool.status].label}
                      </span>
                    )}
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
        {currentTool && catMeta ? (
          <>
            {/* Tool Header */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: `1px solid ${catMeta.color}30`,
                background: catMeta.bg,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                flexShrink: 0,
              }}
            >
              {/* Big icon */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#080b10',
                  border: `1px solid ${catMeta.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: catMeta.color,
                  flexShrink: 0,
                  boxShadow: `0 0 20px ${catMeta.glow}`,
                }}
              >
                <ToolIcon tool={currentTool} color={catMeta.color} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: catMeta.color,
                      letterSpacing: '0.1em',
                      fontFamily: 'inherit',
                      textShadow: `0 0 20px ${catMeta.glow}`,
                    }}
                  >
                    {currentTool.name.toUpperCase()}
                  </h2>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: catMeta.bg,
                      border: `1px solid ${catMeta.color}50`,
                      color: catMeta.color,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                    }}
                  >
                    {currentTool.category.toUpperCase()}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: SPEED_META[currentTool.speed].color + '15',
                      border: `1px solid ${SPEED_META[currentTool.speed].color}40`,
                      color: SPEED_META[currentTool.speed].color,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                    }}
                  >
                    {SPEED_META[currentTool.speed].label}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: STATUS_META[currentTool.status].color + '15',
                      border: `1px solid ${STATUS_META[currentTool.status].color}40`,
                      color: STATUS_META[currentTool.status].color,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                    }}
                  >
                    {STATUS_META[currentTool.status].label}
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
                        color: '#475569',
                        fontSize: 9,
                        letterSpacing: '0.06em',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                  {currentTool.testCommand && (
                    <span
                      style={{
                        marginLeft: 4,
                        padding: '2px 8px',
                        borderRadius: 3,
                        background: '#0d1117',
                        border: '1px solid #1a2236',
                        color: '#334155',
                        fontSize: 9,
                        fontFamily: 'inherit',
                      }}
                    >
                      $ {currentTool.testCommand}
                    </span>
                  )}
                </div>
              </div>

              {/* Endpoint badge removed */}
            </div>

            {/* Tool Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                background: '#0f1319',
              }}
            >
              {ToolComponent ? (
                <ToolComponent accentColor={catMeta.color} />
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
