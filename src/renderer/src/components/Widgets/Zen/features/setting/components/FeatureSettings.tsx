/**
 * ------------------------------------------------------------------
 * FeatureSettings
 * ------------------------------------------------------------------
 * Tab Feature trong Settings Panel:
 * - Conversation: hiển thị MetadataBar
 * - Memory: bật/tắt và chỉnh sửa file memory.md (MemoryEditor)
 * ------------------------------------------------------------------
 */

import React from 'react';
import { MessageSquare, Brain } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import SettingsSection from './SettingsSection';
import MemoryEditor from './MemoryEditor';
import { $ } from '@renderer/utils/color';

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ title, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-semibold text-text-primary mb-0.5">{title}</div>
      <div className="text-[11.5px] text-text-secondary leading-snug">{description}</div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      aria-label={title}
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full border-none p-0 cursor-pointer relative shrink-0 transition-colors ${
        checked ? 'bg-blue-700' : 'bg-gray-500/30'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const FeatureSettings: React.FC = () => {
  const { showMetadataBar, setShowMetadataBar, memoryEnabled, setMemoryEnabled } = useSettings();

  return (
    <div className="flex flex-col gap-7">
      {/* Conversation */}
      <SettingsSection
        icon={<MessageSquare size={16} />}
        color={$('--teal')}
        title="Conversation"
        description="Response display in the chat."
      >
        <ToggleRow
          title="Show MetadataBar"
          description="Show token usage and response number below each AI response in the chat."
          checked={showMetadataBar}
          onChange={setShowMetadataBar}
        />
      </SettingsSection>

      {/* Memory */}
      <SettingsSection
        icon={<Brain size={16} />}
        color={$('--violet')}
        title="Memory"
        description="Persist general facts (preferences, coding style, priorities) across all projects and conversations."
      >
        <ToggleRow
          title="Enable global memory"
          description="When on, the full content of memory.md is injected into every system prompt. The agent can read/update it via read_memory / update_memory tools."
          checked={memoryEnabled}
          onChange={setMemoryEnabled}
        />
        <MemoryEditor enabled={memoryEnabled} />
      </SettingsSection>
    </div>
  );
};

export default FeatureSettings;
