/**
 * ------------------------------------------------------------------
 * SettingsPanel
 * ------------------------------------------------------------------
 * Panel cài đặt — backend URL, ngôn ngữ AI, ngôn ngữ commit message,
 * max files per session, và cấu hình Universal AI Provider.
 *
 * Main features:
 * - Cấu hình Backend API URL
 * - Chọn ngôn ngữ AI và ngôn ngữ commit message
 * - Giới hạn số files mỗi phiên
 * - Cấu hình Universal AI Provider
 * ------------------------------------------------------------------
 */

import React, { useState } from 'react';
import { SlidersHorizontal, Sparkles, Info } from 'lucide-react';
import { Drawer, DrawerBody } from '@renderer/components/ui/Drawer';
import { $ } from '@renderer/utils/color';
import GeneralSettings from './components/general/General';

import FeatureSettings from './components/feature/Feature';
import AboutSettings from './components/about/About';
import type { NavTarget } from '../../components/AgentNavBadge';
import NavPanelHeader from '../../components/NavPanelHeader';

const TABS: Array<{
  id: string;
  label: string;
  icon: React.ElementType;
  colorVar: string;
}> = [
  { id: 'General', label: 'General', icon: SlidersHorizontal, colorVar: '--blue' },

  { id: 'Feature', label: 'Feature', icon: Sparkles, colorVar: '--yellow' },
  { id: 'About', label: 'About', icon: Info, colorVar: '--purple' },
];

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (target: NavTarget) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('General');

  if (!isOpen) return null;

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
      <div className="flex items-center gap-1 px-[max(8px,calc((100%-680px)/2+8px))] border-b border-border bg-background shrink-0 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ id, label, icon: Icon, colorVar }) => {
          const isActive = activeTab === id;
          const color = $(colorVar);
          return (
            <span
              key={id}
              onClick={() => setActiveTab(id)}
              className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 py-2.5 px-3 text-sm cursor-pointer select-none transition-all ${
                isActive ? 'font-semibold text-text-primary' : 'text-text-secondary'
              }`}
              style={{
                borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
              }}
            >
              <Icon size={14} style={{ color, opacity: isActive ? 1 : 0.7 }} />
              {label}
            </span>
          );
        })}
      </div>

      {/* Content */}
      <DrawerBody className="py-5 px-[max(16px,calc((100%-680px)/2+20px))] min-w-0 flex flex-col gap-5 overflow-y-auto">
        {activeTab === 'General' && <GeneralSettings />}

        {activeTab === 'Feature' && <FeatureSettings />}
        {activeTab === 'About' && <AboutSettings />}
      </DrawerBody>
    </Drawer>
  );
};

export default SettingsPanel;