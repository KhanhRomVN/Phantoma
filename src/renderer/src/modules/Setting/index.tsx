import React, { useState } from 'react';
import { Settings, Palette, ChevronRight, Home, CloudUpload } from 'lucide-react';
import General from './components/General';
import Interface from './components/Interface';
import Backup from './components/Backup';

type SettingTab = 'general' | 'interface' | 'backup' | 'database' | 'performance';

const Setting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingTab>('general');

  const getTabTitle = () => {
    switch (activeTab) {
      case 'general':
        return 'General';
      case 'interface':
        return 'Interface';
      case 'backup':
        return 'Backup';
      default:
        return '';
    }
  };

  return (
    <div className="w-full h-full flex-1 flex flex-col overflow-hidden">
      <div className="h-[37px] shrink-0 border-b border-border px-5 flex items-center gap-2">
        <Home className="w-4 h-4 text-text-secondary -mt-0.5" />
        <ChevronRight className="w-3 h-3 text-text-secondary" />
        <span className="text-text-secondary text-sm">Settings</span>
        <ChevronRight className="w-3 h-3 text-text-secondary" />
        <div className="flex items-center gap-1">
          <span className="text-text-primary text-sm font-medium">{getTabTitle()}</span>
        </div>
      </div>

      {/* Main content area with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - wider with icons */}
        <div className="w-64 shrink-0 border-r border-border p-2 overflow-y-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              activeTab === 'general'
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-card-hover'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveTab('interface')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              activeTab === 'interface'
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-card-hover'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Interface</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              activeTab === 'backup'
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-card-hover'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            <span>Backup</span>
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'general' && (
            <div className="overflow-auto p-5 h-full">
              <General />
            </div>
          )}
          {activeTab === 'interface' && (
            <div className="overflow-auto p-5 h-full">
              <Interface />
            </div>
          )}
          {activeTab === 'backup' && (
            <div className="overflow-auto p-5 h-full">
              <Backup />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setting;
