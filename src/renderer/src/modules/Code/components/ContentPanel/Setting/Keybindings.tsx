import { memo, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  { key: 'Ctrl+P', description: 'Quick open', category: 'General' },
  { key: 'Ctrl+,', description: 'Open settings', category: 'General' },
  { key: 'Esc', description: 'Close dialog/overlay', category: 'General' },

  { key: 'Ctrl+Shift+`', description: 'Create new terminal tab', category: 'Workspace' },
  { key: 'Ctrl+N', description: 'Create new untitled markdown file', category: 'Workspace' },
  { key: 'Ctrl+O', description: 'Open file from dialog', category: 'Workspace' },
  { key: 'Ctrl+W', description: 'Close current panel/tab', category: 'Workspace' },
  { key: 'Ctrl+Tab', description: 'Switch to next tab', category: 'Workspace' },
  { key: 'Ctrl+Shift+Tab', description: 'Switch to previous tab', category: 'Workspace' },

  { key: 'Ctrl+Shift+E', description: 'Open File Explorer', category: 'Activity Panel' },
  { key: 'Ctrl+Shift+F', description: 'Open Search', category: 'Activity Panel' },
  { key: 'Ctrl+Shift+D', description: 'Open Run & Debug', category: 'Activity Panel' },
  { key: 'Ctrl+Shift+G', description: 'Open Git view', category: 'Activity Panel' },

  { key: 'Ctrl+C', description: 'Copy selected file/folder', category: 'File Explorer' },
  { key: 'Ctrl+X', description: 'Cut selected file/folder', category: 'File Explorer' },
  { key: 'Ctrl+V', description: 'Paste file/folder', category: 'File Explorer' },
  { key: 'Ctrl+Alt+C', description: 'Copy absolute path', category: 'File Explorer' },
  { key: 'F2', description: 'Rename file/folder', category: 'File Explorer' },
  { key: 'Delete', description: 'Delete file/folder', category: 'File Explorer' },

  { key: 'Ctrl+S', description: 'Save current file', category: 'Editor' },
  { key: 'Ctrl+Shift+S', description: 'Save as', category: 'Editor' },
  { key: 'Ctrl+K Ctrl+S', description: 'Save all files', category: 'Editor' },
  { key: 'Ctrl+F', description: 'Find in file', category: 'Editor' },
  { key: 'Ctrl+H', description: 'Find and replace', category: 'Editor' },

  { key: 'Ctrl+C', description: 'Stop running process', category: 'Terminal' },
  { key: 'Ctrl+Shift+C', description: 'Copy text from terminal', category: 'Terminal' },
  { key: 'Ctrl+Shift+V', description: 'Paste into terminal', category: 'Terminal' },
];

const CATEGORIES = ['General', 'Workspace', 'Activity Panel', 'File Explorer', 'Editor', 'Terminal'];

function splitKeys(combo: string): string[][] {
  return combo.split(' ').map((chord) => (chord === 'Ctrl+,' ? ['Ctrl', ','] : chord.split('+')));
}

function Keycap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md border border-border border-b-2 bg-card-hover text-[11px] font-mono font-medium text-text-primary">
      {children}
    </kbd>
  );
}

function KeyCombo({ combo }: { combo: string }) {
  const chords = splitKeys(combo);
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {chords.map((keys, ci) => (
        <div key={ci} className="flex items-center gap-1">
          {ci > 0 && <span className="text-[10px] text-text-secondary/60 px-0.5">then</span>}
          {keys.map((k, ki) => (
            <div key={ki} className="flex items-center gap-1">
              {ki > 0 && <span className="text-[10px] text-text-secondary/50">+</span>}
              <Keycap>{k}</Keycap>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export const KeybindingsSection = memo(function KeybindingsSection() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: SHORTCUTS.length };
    for (const s of SHORTCUTS) map[s.category] = (map[s.category] ?? 0) + 1;
    return map;
  }, []);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORIES.filter((c) => activeCategory === 'All' || c === activeCategory)
      .map((category) => ({
        category,
        items: SHORTCUTS.filter(
          (s) =>
            s.category === category &&
            (!q || s.description.toLowerCase().includes(q) || s.key.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [query, activeCategory]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shortcuts by name or key..."
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-card-background text-xs text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-primary/40 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 grid place-items-center rounded text-text-secondary hover:text-text-primary hover:bg-card-hover cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {['All', ...CATEGORIES].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveCategory(name)}
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium transition-colors cursor-pointer',
                activeCategory === name
                  ? 'bg-primary/12 text-text-primary border-primary/25'
                  : 'border-border text-text-secondary hover:bg-card-hover hover:text-text-primary',
              )}
            >
              {name}
              <span className="text-[10px] text-text-secondary/70">{counts[name] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 py-14 rounded-xl border border-dashed border-border text-text-secondary">
          <Search className="w-5 h-5 opacity-60" />
          <p className="text-xs">No shortcuts match your search.</p>
        </div>
      ) : (
        groups.map(({ category, items }) => (
          <section key={category}>
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2.5">
              {category}
              <span className="flex-1 h-px bg-border" />
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {items.map((shortcut, index) => (
                <div
                  key={`${category}-${shortcut.key}-${index}`}
                  className="flex items-center justify-between gap-4 px-3 py-2 rounded-lg border border-border bg-card-background hover:bg-card-hover transition-colors"
                >
                  <span className="text-xs text-text-primary truncate">{shortcut.description}</span>
                  <KeyCombo combo={shortcut.key} />
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
});