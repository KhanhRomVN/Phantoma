import { Fragment, useEffect, useMemo, useState } from 'react';
import { Bell, Command } from 'lucide-react';
import { THEME } from '../constants/theme';
import { c } from '../utils/color';
import { Empty, IconBox } from './common/Primitives';

export interface Cmd {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: typeof Bell;
  run: () => void;
}

export function CommandPalette({ cmds, onClose }: { cmds: Cmd[]; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const list = useMemo(() => cmds.filter((x) => `${x.label} ${x.group} ${x.hint || ''}`.toLowerCase().includes(q.trim().toLowerCase())), [cmds, q]);
  useEffect(() => setIdx(0), [q]);
  const exec = (x: Cmd) => {
    onClose();
    x.run();
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(4,4,9,.55)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', paddingTop: '12vh' }} onClick={onClose}>
      <div
        className="card-pop"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(580px, 94vw)', alignSelf: 'flex-start', borderRadius: 16, overflow: 'hidden', background: 'rgba(17,17,29,.78)', backdropFilter: 'blur(18px)', border: `1px solid ${c('border')}`, boxShadow: `0 30px 80px -20px rgba(0,0,0,.8), 0 0 60px -20px ${c('primary', 0.5)}` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${c('border')}` }}>
          <Command size={16} color={`rgb(${THEME.primary})`} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command, view, tag or platform…"
            aria-label="Command palette"
            style={{ flex: 1, background: 'transparent', border: 0, fontSize: 14 }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(list.length - 1, i + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              else if (e.key === 'Enter' && list[idx]) exec(list[idx]);
              else if (e.key === 'Escape') onClose();
            }}
          />
          <kbd>esc</kbd>
        </div>
        <div className="scroll" style={{ maxHeight: 360, padding: 6 }}>
          {list.length === 0 && <Empty text="No matching commands — try a different keyword." />}
          {list.map((x, i) => (
            <Fragment key={x.id}>
              {(i === 0 || list[i - 1].group !== x.group) && <div className="sub" style={{ padding: '8px 10px 4px', fontWeight: 600 }}>{x.group}</div>}
              <button
                onMouseEnter={() => setIdx(i)}
                onClick={() => exec(x)}
                style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, textAlign: 'left', background: i === idx ? c('primary', 0.14) : 'transparent' }}
              >
                <IconBox icon={x.icon} tone={i === idx ? 'primary' : 'muted'} size={24} />
                <span style={{ flex: 1 }}>{x.label}</span>
                {x.hint && <kbd>{x.hint}</kbd>}
              </button>
            </Fragment>
          ))}
        </div>
        <div className="sub" style={{ display: 'flex', gap: 12, padding: '8px 16px', borderTop: `1px solid ${c('border')}` }}>
          <span><kbd>↑↓</kbd> select</span>
          <span><kbd>↵</kbd> run</span>
          <span><kbd>⌘K</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;