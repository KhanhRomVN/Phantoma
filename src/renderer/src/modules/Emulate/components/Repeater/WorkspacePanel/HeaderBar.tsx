import { Zap, X } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import { NetworkRequest } from '../../Home/Filter';

interface HeaderBarProps {
  selectedRequest: NetworkRequest | null;
  lastRunTimestamp: number | null;
  saveToHistory: boolean;
  onSaveToggle: () => void;
  onClose?: () => void;
}

export function HeaderBar({
  selectedRequest,
  lastRunTimestamp,
  saveToHistory,
  onSaveToggle,
  onClose,
}: HeaderBarProps) {
  return (
    <div className="px-4 h-[45px] border-b border-border shrink-0 flex items-center justify-between bg-muted/5">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-text-primary">Payload Configuration</span>
        {selectedRequest && (
          <span className="text-xs text-text-secondary ml-2 truncate max-w-[200px]">
            {selectedRequest.path || selectedRequest.url}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {lastRunTimestamp && (
          <button
            onClick={onSaveToggle}
            className={cn(
              'text-[10px] font-medium transition-colors',
              saveToHistory
                ? 'text-text-secondary hover:text-primary'
                : 'text-text-secondary hover:text-primary',
            )}
            title={saveToHistory ? 'Save to history' : "Don't save to history"}
          >
            Do you want to save this session{' '}
            <span className="text-primary">
              {new Date(lastRunTimestamp).toLocaleTimeString()}
            </span>
            ? Click to save!
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}