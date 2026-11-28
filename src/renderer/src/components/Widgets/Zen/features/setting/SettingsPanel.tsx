/**
 * ------------------------------------------------------------------
 * SettingsPanel
 * ------------------------------------------------------------------
 * Panel cài đặt của Zen extension: Drawer + tab navigation.
 *
 * Main features:
 * - Tab General: Backend URL, Chromium profile, ngôn ngữ AI/commit
 * - Tab Feature: MetadataBar, global Memory
 * - Tab About: thông tin dự án
 * ------------------------------------------------------------------
 */

import React, { useRef, useState } from 'react';
import { SlidersHorizontal, Sparkles, Info } from 'lucide-react';
import { Drawer, DrawerBody } from '@renderer/components/ui/Drawer';
import { $ } from '@renderer/utils/color';
import GeneralSettings from './components/GeneralSettings';
import FeatureSettings from './components/FeatureSettings';
import AboutSettings from './components/AboutSettings';
import { NavTarget } from '../../shared/components/AgentNavBadge';
import NavPanelHeader from '../../shared/components/NavPanelHeader';

const TABS = [
  { id: 'General', label: 'General', icon: SlidersHorizontal, colorVar: '--blue' },
  { id: 'Feature', label: 'Feature', icon: Sparkles, colorVar: '--yellow' },
  { id: 'About', label: 'About', icon: Info, colorVar: '--purple' },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  icon: React.ElementType;
  colorVar: string;
}>;

type TabId = (typeof TABS)[number]['id'];

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (target: NavTarget) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<TabId>('General');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (!isOpen) return null;

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;

    e.preventDefault();
    const nextId = TABS[next].id;
    setActiveTab(nextId);
    tabRefs.current[nextId]?.focus();
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} height="100%" strategy="absolute" showHandle={false}>
      <NavPanelHeader
        title="Zen Settings"
        description="Configure Zen extension settings"
        maxWidth={680}
        current="setting"
        onNavigate={onNavigate}
        onClose={onClose}
      />

      {/* Tabbar */}
      <div
        role="tablist"
        aria-label="Settings"
        className="flex items-center gap-1 px-[max(8px,calc((100%-680px)/2+8px))] border-b border-border bg-background shrink-0 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map(({ id, label, icon: Icon, colorVar }, index) => {
          const isActive = activeTab === id;
          const color = $(colorVar);
          return (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
              type="button"
              role="tab"
              id={`settings-tab-${id}`}
              aria-selected={isActive}
              aria-controls={`settings-panel-${id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 py-2.5 px-3 text-sm bg-transparent border-none cursor-pointer select-none transition-all ${
                isActive ? 'font-semibold text-text-primary' : 'text-text-secondary'
              }`}
              style={{
                borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
              }}
            >
              <Icon size={14} style={{ color, opacity: isActive ? 1 : 0.7 }} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <DrawerBody className="py-5 px-[max(16px,calc((100%-680px)/2+20px))] min-w-0 flex flex-col gap-5 overflow-y-auto">
        <div
          role="tabpanel"
          id={`settings-panel-${activeTab}`}
          aria-labelledby={`settings-tab-${activeTab}`}
          className="flex flex-col gap-5 min-w-0"
        >
          {activeTab === 'General' && <GeneralSettings />}
          {activeTab === 'Feature' && <FeatureSettings />}
          {activeTab === 'About' && <AboutSettings />}
        </div>
      </DrawerBody>
    </Drawer>
  );
};

export default SettingsPanel;
