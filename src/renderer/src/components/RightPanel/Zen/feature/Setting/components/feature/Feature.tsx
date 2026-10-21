/**
 * ------------------------------------------------------------------
 * FeatureSettings
 * ------------------------------------------------------------------
 * Tab Feature trong Settings Panel. Được chia thành các GroupSection:
 * - Agent Permission: quyền của agent (approval / fullAccess)
 * - Conversation: hiển thị MetadataBar
 * - Memory: Bật/tắt và chỉnh sửa file memory.md
 * ------------------------------------------------------------------
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquare, Brain, RefreshCw } from 'lucide-react';
import { useSettings } from '../../../../context/SettingsContext';
import GroupSection from '../shared/GroupSection';
import { extensionService } from '../../../../services/ExtensionService';
import { $ } from '@renderer/utils/color';
const ACCENT = $('--primary');


interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  title,
  description,
  checked,
  onChange,
}) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-semibold text-text-primary mb-0.5">
        {title}
      </div>
      <div className="text-[11.5px] text-text-secondary leading-snug">
        {description}
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
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

const MemoryViewer: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debounce state for auto-save
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      // Assuming extensionService has getMemorySnapshot method similar to Zen
      // If not, this might need adjustment based on actual Phantoma IPC channels
      const snapshot = await (extensionService as any).getMemorySnapshot?.() || '';
      setContent(snapshot);
      isDirtyRef.current = false;
      setStatus('idle');
    } catch (e: any) {
      setError(e?.message || "Failed to load memory file.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleChange = (newValue: string) => {
    setContent(newValue);
    isDirtyRef.current = true;
    setStatus('idle'); // Reset status khi đang gõ

    // Debounce save: Chờ 1s sau khi user dừng gõ mới gửi request
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    
    debounceTimerRef.current = setTimeout(async () => {
      if (!isDirtyRef.current) return;
      
      setStatus('saving');
      try {
        // Assuming extensionService has saveMemory method
        const result = await (extensionService as any).saveMemory?.(newValue);
        if (result && !result.success) {
          throw new Error(result.error || "Failed to save memory file.");
        }
        isDirtyRef.current = false;
        setStatus('saved');
        // Ẩn thông báo "Saved" sau 2s
        setTimeout(() => {
          setStatus((prev) => prev === 'saved' ? 'idle' : prev);
        }, 2000);
      } catch (e: any) {
        setStatus('error');
        console.error("[MemoryViewer] Save failed:", e);
      }
    }, 1000);
  };

  if (!enabled) {
    return (
      <div
        className="text-[11.5px] text-text-secondary italic py-2"
      >
        Bật Memory để xem và chỉnh sửa nội dung file memory.md.
      </div>
    );
  }

  const getStatusColor = () => {
    if (status === 'saving') return $('--warn');
    if (status === 'saved') return $('--success');
    if (status === 'error') return $('--error');
    return $('--text-secondary');
  };

  const getStatusText = () => {
    if (status === 'saving') return "Saving...";
    if (status === 'saved') return "Saved";
    if (status === 'error') return "Save Error";
    return "";
  };

  const placeholderText = "# Global Memory\n\n- User prefers dark mode.\n- Prefers TypeScript and concise code.";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wide">
          memory.md
        </span>
        
        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <span 
            style={{ 
              fontSize: "10px", 
              fontWeight: 600, 
              color: getStatusColor(),
              opacity: status !== 'idle' ? 1 : 0,
              transition: "opacity 0.2s"
            }}
          >
            {getStatusText()}
          </span>
          
          <button
            type="button"
            onClick={load}
            disabled={loading || status === 'saving'}
            title="Reload from disk"
            className="inline-flex items-center gap-1 bg-transparent border-none cursor-pointer text-text-secondary text-[11px] px-1.5 py-0.5 rounded hover:bg-gray-500/10 transition-colors disabled:cursor-wait"
          >
            <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : undefined }} />
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[11.5px] text-red-500">
          {error}
        </div>
      )}
      
      {/* Single Editable Textarea - Always visible when enabled */}
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        placeholder={placeholderText}
        className="w-full min-h-[150px] max-h-[300px] resize-y p-2.5 text-[11.5px] leading-normal font-mono text-text-primary bg-input-background border border-border rounded-md outline-none box-border transition-colors focus:border-blue-500"
      />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const FeatureSettings: React.FC = () => {
  const {
    showMetadataBar,
    setShowMetadataBar,
    memoryEnabled,
    setMemoryEnabled,
  } = useSettings();

  return (
    <div
      className="flex flex-col gap-7"
    >
      {/* Conversation */}
      <GroupSection
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
      </GroupSection>

      {/* Memory */}
      <GroupSection
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
        <MemoryViewer enabled={memoryEnabled} />
      </GroupSection>
    </div>
  );
};

export default FeatureSettings;