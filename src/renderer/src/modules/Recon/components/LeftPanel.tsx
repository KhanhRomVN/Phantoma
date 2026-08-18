import React from 'react';
import { ReconTarget } from '../../../controller/ReconController';
import { cn } from '@renderer/shared/utils/cn';
import { $ } from '@renderer/utils/color';

interface LeftPanelProps {
  targets: ReconTarget[];
  activeTargetId: string | null;
  onTargetSelect: (targetId: string) => void;
  onLaunchBrowser: (targetId: string) => void;
  onCloseBrowser: (targetId: string) => void;
}

export default function LeftPanel({
  targets,
  activeTargetId,
  onTargetSelect,
  onLaunchBrowser,
  onCloseBrowser,
}: LeftPanelProps) {
  return (
    <div
      className="w-64 border-r flex flex-col overflow-hidden"
      style={{ borderColor: $('--border') }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: $('--border') }}
      >
        <span className="text-sm font-semibold text-text-primary">Targets</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-secondary">{targets.length}</span>
        </div>
      </div>

      {/* Target List */}
      <div className="flex-1 overflow-y-auto">
        {targets.length === 0 ? (
          <div className="p-4 text-center text-xs text-text-secondary">No targets</div>
        ) : (
          <div className="py-2">
            {targets.map((target) => (
              <TargetItem
                key={target.id}
                target={target}
                isActive={target.id === activeTargetId}
                onSelect={() => onTargetSelect(target.id)}
                onLaunch={() => onLaunchBrowser(target.id)}
                onClose={() => onCloseBrowser(target.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TargetItemProps {
  target: ReconTarget;
  isActive: boolean;
  onSelect: () => void;
  onLaunch: () => void;
  onClose: () => void;
}

function TargetItem({ target, isActive, onSelect, onLaunch, onClose }: TargetItemProps) {
  return (
    <div
      className={cn(
        'mx-2 mb-1 rounded-lg transition-all duration-200 cursor-pointer',
        isActive ? 'bg-accent/10' : 'hover:bg-card-background',
      )}
      onClick={onSelect}
    >
      <div className="p-3">
        {/* Email */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: target.isActive ? $('--success') : $('--text-secondary'),
              opacity: target.isActive ? 1 : 0.3,
            }}
          />
          <span className="text-sm font-medium text-text-primary truncate">{target.email}</span>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">
            {target.isActive ? 'Browser Active' : 'Not Running'}
          </span>

          <button
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-all duration-200',
              target.isActive
                ? 'bg-error/10 text-error hover:bg-error/20'
                : 'bg-success/10 text-success hover:bg-success/20',
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (target.isActive) {
                onClose();
              } else {
                onLaunch();
              }
            }}
          >
            {target.isActive ? 'Stop' : 'Launch'}
          </button>
        </div>
      </div>
    </div>
  );
}
