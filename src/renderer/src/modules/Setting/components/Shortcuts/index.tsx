import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { MOCK_SHORTCUTS } from '../../mock/mockData';
import { INPUT_CLASS, Key, PageHeader, Row, Section } from '../shared';

const Shortcuts: React.FC = () => {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = MOCK_SHORTCUTS.filter(
      (s) => !q || s.label.toLowerCase().includes(q) || s.keys.join(' ').toLowerCase().includes(q),
    );
    return list.reduce<Record<string, typeof list>>((acc, s) => {
      (acc[s.scope] ||= []).push(s);
      return acc;
    }, {});
  }, [query]);

  const scopes = Object.keys(grouped);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Shortcuts"
        description="Keyboard shortcuts for faster navigation."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className={`${INPUT_CLASS} w-56 pl-8`}
            />
          </div>
        }
      />

      {scopes.length === 0 && (
        <div className="py-12 text-center text-[12.5px] text-text-secondary">No shortcuts match.</div>
      )}

      {scopes.map((scope) => (
        <Section key={scope} title={scope}>
          {grouped[scope].map((s) => (
            <Row key={s.id} label={s.label}>
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <React.Fragment key={`${k}-${i}`}>
                    {i > 0 && <span className="text-[10px] text-text-secondary">+</span>}
                    <Key>{k}</Key>
                  </React.Fragment>
                ))}
              </div>
            </Row>
          ))}
        </Section>
      ))}
    </div>
  );
};

export default Shortcuts;