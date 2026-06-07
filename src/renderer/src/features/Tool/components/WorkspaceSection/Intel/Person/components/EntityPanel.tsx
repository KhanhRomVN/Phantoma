import React from 'react';
import type { ReconEntity } from '../types/entity';
import { EntityCard } from './shared/EntityCard';
import { Users, Filter, Search } from 'lucide-react';

interface EntityPanelProps {
  entities: ReconEntity[];
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string | null) => void;
  onViewAll: () => void;
  totalDataPoints: number;
  overallConfidence: number;
}

export function EntityPanel({
  entities,
  selectedEntityId,
  onSelectEntity,
  onViewAll,
  totalDataPoints,
  overallConfidence,
}: EntityPanelProps) {
  const [filter, setFilter] = React.useState<'all' | 'primary' | 'secondary' | 'noise'>('all');
  const [search, setSearch] = React.useState('');

  const filteredEntities = entities.filter(e => {
    if (filter !== 'all' && e.relevance !== filter) return false;
    if (search.trim()) {
      const lower = search.toLowerCase();
      return (
        e.displayName.toLowerCase().includes(lower) ||
        e.summary.toLowerCase().includes(lower) ||
        e.tags.some(t => t.toLowerCase().includes(lower))
      );
    }
    return true;
  });

  const primaryCount = entities.filter(e => e.relevance === 'primary').length;
  const secondaryCount = entities.filter(e => e.relevance === 'secondary').length;
  const noiseCount = entities.filter(e => e.relevance === 'noise').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-[#af52de]" />
          <span className="text-[13px] font-bold tracking-[0.12em] text-[#c8d6f0] font-mono">
            Entities
          </span>
          <span className="text-[10px] font-mono text-[#6a7a9a]">
            ({entities.length})
          </span>
        </div>
      </div>

      {/* Stats mini bar */}
      <div className="px-3 py-2 border-b border-[#1c2333] shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono text-[#6a7a9a] uppercase tracking-widest">
            {totalDataPoints} data points · {Math.round(overallConfidence * 100)}% confidence
          </span>
        </div>
        <div
          className="text-[10px] font-mono text-[#0af] cursor-pointer hover:text-[#64d2ff] transition-colors"
          onClick={onViewAll}
        >
          ← View all entities
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-2 py-1.5 border-b border-[#1c2333] shrink-0 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className="text-[9px] font-mono px-2 py-0.5 rounded transition-all"
          style={{
            color: filter === 'all' ? '#c8d6f0' : '#6a7a9a',
            backgroundColor: filter === 'all' ? '#1c2333' : 'transparent',
            border: `1px solid ${filter === 'all' ? '#2a3548' : 'transparent'}`,
          }}
        >
          ALL ({entities.length})
        </button>
        <button
          onClick={() => setFilter('primary')}
          className="text-[9px] font-mono px-2 py-0.5 rounded transition-all"
          style={{
            color: filter === 'primary' ? '#30d158' : '#6a7a9a',
            backgroundColor: filter === 'primary' ? '#30d15815' : 'transparent',
            border: `1px solid ${filter === 'primary' ? '#30d15830' : 'transparent'}`,
          }}
        >
          PRIMARY ({primaryCount})
        </button>
        <button
          onClick={() => setFilter('secondary')}
          className="text-[9px] font-mono px-2 py-0.5 rounded transition-all"
          style={{
            color: filter === 'secondary' ? '#f5a623' : '#6a7a9a',
            backgroundColor: filter === 'secondary' ? '#f5a62315' : 'transparent',
            border: `1px solid ${filter === 'secondary' ? '#f5a62330' : 'transparent'}`,
          }}
        >
          SECONDARY ({secondaryCount})
        </button>
        <button
          onClick={() => setFilter('noise')}
          className="text-[9px] font-mono px-2 py-0.5 rounded transition-all"
          style={{
            color: filter === 'noise' ? '#3a4558' : '#6a7a9a',
            backgroundColor: filter === 'noise' ? '#3a455815' : 'transparent',
            border: `1px solid ${filter === 'noise' ? '#3a455830' : 'transparent'}`,
          }}
        >
          NOISE ({noiseCount})
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-[#1c2333] shrink-0">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#3a4558]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter entities..."
            className="w-full h-6 bg-[#040608] border border-[#1c2333] rounded pl-6 pr-2 text-[11px] font-mono text-[#c8d6f0] outline-none placeholder:text-[#3a4558]"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Entity list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredEntities.length === 0 ? (
          <div className="flex items-center justify-center py-8 flex-col gap-2">
            <span className="text-[24px] opacity-15">👻</span>
            <span className="text-[11px] font-mono text-[#6a7a9a]">No entities match filter</span>
          </div>
        ) : (
          filteredEntities.map(entity => (
            <EntityCard
              key={entity.id}
              entity={entity}
              isSelected={entity.id === selectedEntityId}
              onClick={() => onSelectEntity(entity.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                // Context menu can be added later
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}