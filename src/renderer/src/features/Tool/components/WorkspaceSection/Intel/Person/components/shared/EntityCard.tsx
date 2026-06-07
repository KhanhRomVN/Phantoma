import React from 'react';
import type { ReconEntity } from '../../types/entity';
import { ConfidenceBadge } from './ConfidenceBadge';

interface EntityCardProps {
  entity: ReconEntity;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const RELEVANCE_META: Record<string, { label: string; color: string }> = {
  primary: { label: 'PRIMARY', color: '#30d158' },
  secondary: { label: 'SECONDARY', color: '#f5a623' },
  noise: { label: 'NOISE', color: '#6a7a9a' },
  unknown: { label: 'UNKNOWN', color: '#3a4558' },
};

const TYPE_ICONS: Record<string, string> = {
  individual: '👤',
  organization: '🏢',
  group: '👥',
  brand: '™️',
  bot: '🤖',
  unknown: '❓',
};

export function EntityCard({ entity, isSelected, onClick, onContextMenu }: EntityCardProps) {
  const relevanceMeta = RELEVANCE_META[entity.relevance] || RELEVANCE_META.unknown;
  const icon = TYPE_ICONS[entity.type] || '❓';

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="p-2 rounded cursor-pointer transition-all relative group"
      style={{
        backgroundColor: isSelected ? '#0d1017' : '#0a0e14',
        border: isSelected ? '1px solid #2a3548' : '1px solid #1c2333',
      }}
    >
      {isSelected && (
        <div
          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
          style={{ backgroundColor: relevanceMeta.color }}
        />
      )}

      <div className="pl-2">
        {/* Header: icon + name + type */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[14px]">{icon}</span>
          <span
            className="text-[12px] font-mono font-bold truncate flex-1"
            style={{ color: isSelected ? '#c8d6f0' : '#6a7a9a' }}
          >
            {entity.displayName}
          </span>
          <span
            className="text-[8px] font-mono font-bold px-1 py-0.5 rounded tracking-widest shrink-0"
            style={{ color: relevanceMeta.color, backgroundColor: `${relevanceMeta.color}15` }}
          >
            {relevanceMeta.label}
          </span>
        </div>

        {/* Summary */}
        <div className="text-[10px] font-mono text-[#6a7a9a] leading-relaxed mb-1.5 line-clamp-2">
          {entity.summary}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ConfidenceBadge value={entity.confidence} />
            {entity.riskScore !== undefined && entity.riskScore > 0 && (
              <span
                className="text-[9px] font-mono px-1 py-0.5 rounded"
                style={{
                  color: entity.riskScore >= 75 ? '#ff2d55' : entity.riskScore >= 50 ? '#f5a623' : '#30d158',
                  backgroundColor: entity.riskScore >= 75 ? '#ff2d5515' : entity.riskScore >= 50 ? '#f5a62315' : '#30d15815',
                }}
              >
                RISK {entity.riskScore}
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono text-[#3a4558]">
            {entity.dataPointCount} pts
          </span>
        </div>

        {/* Tags */}
        {entity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {entity.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[8px] font-mono px-1 py-0.5 rounded bg-[#1c2333] text-[#6a7a9a]">
                {tag}
              </span>
            ))}
            {entity.tags.length > 3 && (
              <span className="text-[8px] font-mono text-[#3a4558]">+{entity.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}