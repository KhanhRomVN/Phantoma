import { X, Zap } from 'lucide-react';
import type { MonitorItem, Post, Priority } from '../types/monitor.types';
import { PRI_LABEL } from '../constants/meta';
import { NOISE } from '../constants/styles';
import { c } from '../utils/color';
import { Section } from './common/Primitives';

interface ContextSidebarProps {
  priority: 'all' | Priority;
  setPriority: (p: 'all' | Priority) => void;
  monitors: MonitorItem[];
  posts: Post[];
  open: boolean;
  onClose: () => void;
}

export function ContextSidebar({ priority, setPriority, open, onClose }: ContextSidebarProps) {
  return (
    <aside className={`rr scroll ${open ? 'open' : ''}`} style={{ width: 320, flexShrink: 0, padding: 12, borderLeft: `1px solid ${c('border')}`, backgroundColor: c('panel'), backgroundImage: NOISE }}>
      {open && (
        <button className="ico" aria-label="Close" style={{ marginBottom: 8 }} onClick={onClose}>
          <X size={14} />
        </button>
      )}

      <Section title="Priority" icon={Zap} tone="warn">
        {(['all', 'high', 'medium', 'low'] as const).map((p) => (
          <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
            <input type="radio" name="mn-priority" checked={priority === p} onChange={() => setPriority(p)} />
            {p === 'all' ? 'All' : PRI_LABEL[p]}
          </label>
        ))}
      </Section>
      <div className="sub" style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', opacity: 0.8, paddingBottom: 8 }}>
        <span><kbd>⌘K</kbd> commands</span>
        <span><kbd>F</kbd> focus</span>
        <span><kbd>/</kbd> search</span>
      </div>
    </aside>
  );
}

export default ContextSidebar;