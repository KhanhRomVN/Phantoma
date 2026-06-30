import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { Drawer, DrawerHeader, DrawerBody } from '@renderer/components/ui/Drawer';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const {
    apiUrl,
    setApiUrl,
    isSimpleMode,
    setIsSimpleMode,
  } = useSettings();

  const toggleSimpleMode = () => {
    setIsSimpleMode(!isSimpleMode);
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} height="100%" strategy="absolute">
      <DrawerHeader
        title="Settings"
        description="Configure your agent preferences"
        onClose={onClose}
      />

      {/* Content */}
      <DrawerBody className="p-5 flex flex-col gap-6">
        {/* API URL */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">
            Backend API URL
          </label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:8888"
            className="w-full px-3 py-2.5 rounded-md text-sm outline-none box-border bg-[rgb(var(--input-background))] border border-border text-text-primary"
          />
        </div>

        {/* Simple Mode Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold mb-[3px] text-text-primary">
              Simple Mode
            </div>
            <div className="text-[11px] opacity-70 text-text-secondary">
              Hide advanced options for a cleaner interface
            </div>
          </div>
          <button
            onClick={toggleSimpleMode}
            className="shrink-0 w-10 h-[22px] rounded-[11px] border-none cursor-pointer relative transition-colors duration-200"
            style={{
              backgroundColor: isSimpleMode
                ? 'var(--vscode-button-background, #0e639c)'
                : 'rgba(128,128,128,0.3)',
            }}
          >
            <span
              className="absolute top-[3px] w-4 h-4 rounded-full bg-white transition-[left] duration-200"
              style={{
                left: isSimpleMode ? '21px' : '3px',
              }}
            />
          </button>
        </div>
      </DrawerBody>
    </Drawer>
  );
};

export default SettingsPanel;