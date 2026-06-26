// ─── History Component ──────────────────────────────────────────────────────

import React from 'react';
import { Clock, Search } from 'lucide-react';

interface HistoryItem {
  id: string;
  title: string;
  timestamp: string;
  preview: string;
}

const MOCK_HISTORY: HistoryItem[] = [
  {
    id: '1',
    title: 'Network traffic analysis',
    timestamp: '2024-01-15 14:32',
    preview: 'Analyzed 245 requests from example.com...',
  },
  {
    id: '2',
    title: 'Payload inspection',
    timestamp: '2024-01-15 13:15',
    preview: 'Inspected JWT token from auth endpoint...',
  },
  {
    id: '3',
    title: 'Request filtering',
    timestamp: '2024-01-15 11:48',
    preview: 'Filtered requests containing "admin"...',
  },
  {
    id: '4',
    title: 'SSL/TLS analysis',
    timestamp: '2024-01-14 22:10',
    preview: 'Analyzed certificate chain for api.phantoma.com...',
  },
];

export function History() {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filtered = MOCK_HISTORY.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.preview.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 border-b border-divider bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-bold text-text-primary">History</span>
          <span className="text-xs text-text-secondary">({filtered.length})</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-divider bg-background shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 bg-input-background border border-input-border-default rounded-md pl-8 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary/50 outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center text-text-secondary text-sm py-8">No history found</div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-card-background border border-border rounded-lg hover:border-primary/20 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{item.title}</p>
                  <p className="text-xs text-text-secondary truncate">{item.preview}</p>
                </div>
                <span className="text-[10px] text-text-secondary whitespace-nowrap">
                  {item.timestamp}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}