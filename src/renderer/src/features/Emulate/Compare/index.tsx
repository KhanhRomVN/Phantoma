import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowRightLeft,
  Search,
  X,
  Plus,
  Save,
  FolderOpen,
  Trash2,
  ChevronDown,
  GitCompare,
} from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { NetworkRequest } from '../../../types/inspector';

interface SavedCompare {
  id: string;
  name: string;
  desc?: string;
  url1: string;
  url2: string;
  createdAt: number;
}

const STORAGE_KEY = 'systema-compares-global';
const loadSavedCompares = (): SavedCompare[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};
const saveSavedCompares = (compares: SavedCompare[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(compares));

interface ComparePanelProps {
  requests?: NetworkRequest[];
  compareRequest1?: NetworkRequest | null;
  compareRequest2?: NetworkRequest | null;
  onClearComparison?: () => void;
  onCompareRequests?: (req1: NetworkRequest, req2: NetworkRequest) => void;
  initialDiffTab?: string;
  initialDiffSearch?: string;
}

// Simplified DiffView for horizontal layout
function DiffView({
  request1,
  request2,
  onClose,
}: {
  request1: NetworkRequest | null;
  request2: NetworkRequest | null;
  onClose: () => void;
}) {
  if (!request1 || !request2) return null;

  const compareFields = [
    { name: 'Method', left: request1.method, right: request2.method },
    {
      name: 'Status',
      left: request1.status?.toString() || 'N/A',
      right: request2.status?.toString() || 'N/A',
    },
    {
      name: 'URL',
      left: `${request1.host}${request1.path}`,
      right: `${request2.host}${request2.path}`,
    },
    { name: 'Size', left: request1.size || 'N/A', right: request2.size || 'N/A' },
    { name: 'Time', left: request1.time || 'N/A', right: request2.time || 'N/A' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-divider flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium">
            Comparing: {request1.method} {request1.path} vs {request2.method} {request2.path}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {compareFields.map((field, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-4 p-2 border-b border-divider/50 text-sm"
            >
              <div className="col-span-2 font-medium text-text-secondary">{field.name}</div>
              <div
                className={cn(
                  'col-span-5 font-mono',
                  field.left !== field.right ? 'text-red-400' : 'text-green-400',
                )}
              >
                {field.left}
              </div>
              <div
                className={cn(
                  'col-span-5 font-mono',
                  field.left !== field.right ? 'text-red-400' : 'text-green-400',
                )}
              >
                {field.right}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Combobox({
  items,
  value,
  onChange,
  placeholder,
}: {
  items: Array<{ url: string; method: string; host: string; path: string; status: number }>;
  value: string;
  onChange: (url: string) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (item) => item.url.toLowerCase().includes(term) || item.method.toLowerCase().includes(term),
    );
  }, [items, searchTerm]);

  const selectedItem = items.find((item) => item.url === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node))
        setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={
            searchTerm ||
            (selectedItem
              ? `[${selectedItem.method}] ${selectedItem.host}${selectedItem.path}`
              : '')
          }
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2 pr-8 text-sm text-text-primary outline-none focus:border-purple-500/50 font-mono"
        />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
        >
          <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
        </button>
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-dialog-background border border-divider rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-secondary">No matching requests</div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.url}
                onClick={() => {
                  onChange(item.url);
                  setSearchTerm('');
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-sidebar-itemHover transition-colors border-b border-divider/50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded',
                      item.method === 'GET' && 'text-blue-400 bg-blue-500/10',
                      item.method === 'POST' && 'text-green-400 bg-green-500/10',
                      item.method === 'PUT' && 'text-orange-400 bg-orange-500/10',
                      item.method === 'DELETE' && 'text-red-400 bg-red-500/10',
                    )}
                  >
                    {item.method}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-mono',
                      item.status >= 200 && item.status < 300
                        ? 'text-green-400'
                        : item.status >= 400
                          ? 'text-red-400'
                          : 'text-yellow-400',
                    )}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="text-xs font-mono text-text-primary truncate mt-1">
                  {item.host}
                  {item.path}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function ComparePanel({
  requests = [],
  compareRequest1,
  compareRequest2,
  onClearComparison,
  onCompareRequests,
}: ComparePanelProps) {
  const [savedCompares, setSavedCompares] = useState<SavedCompare[]>(loadSavedCompares);
  const [savedSearchTerm, setSavedSearchTerm] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newCompareName, setNewCompareName] = useState('');
  const [newCompareDesc, setNewCompareDesc] = useState('');
  const [selectedUrl1, setSelectedUrl1] = useState('');
  const [selectedUrl2, setSelectedUrl2] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const uniqueUrls = useMemo(() => {
    const urlMap = new Map<
      string,
      { url: string; method: string; host: string; path: string; status: number }
    >();
    requests.forEach((req) => {
      const url = `${req.host}${req.path}`;
      if (!urlMap.has(url))
        urlMap.set(url, {
          url,
          method: req.method,
          host: req.host,
          path: req.path,
          status: req.status || 0,
        });
    });
    return Array.from(urlMap.values());
  }, [requests]);

  const filteredSavedCompares = useMemo(() => {
    if (!savedSearchTerm.trim()) return savedCompares;
    const term = savedSearchTerm.toLowerCase();
    return savedCompares.filter((c) => c.name.toLowerCase().includes(term));
  }, [savedCompares, savedSearchTerm]);

  const handleCreateCompare = () => {
    if (!newCompareName.trim() || !selectedUrl1 || !selectedUrl2) return;
    const newCompare: SavedCompare = {
      id: crypto.randomUUID(),
      name: newCompareName.trim(),
      desc: newCompareDesc.trim() || undefined,
      url1: selectedUrl1,
      url2: selectedUrl2,
      createdAt: Date.now(),
    };
    const updated = [...savedCompares, newCompare];
    setSavedCompares(updated);
    saveSavedCompares(updated);
    setNewCompareName('');
    setNewCompareDesc('');
    setSelectedUrl1('');
    setSelectedUrl2('');
    setDrawerOpen(false);
  };

  const handleDeleteCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedCompares.filter((c) => c.id !== id);
    setSavedCompares(updated);
    saveSavedCompares(updated);
  };

  const handleLoadCompare = (compare: SavedCompare) => {
    const req1 = requests.find((r) => `${r.host}${r.path}` === compare.url1);
    const req2 = requests.find((r) => `${r.host}${r.path}` === compare.url2);
    if (req1 && req2) onCompareRequests?.(req1, req2);
  };

  useEffect(() => {
    if (drawerOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [drawerOpen]);

  // If comparing two requests, show diff view
  if (compareRequest1 && compareRequest2) {
    return (
      <DiffView
        request1={compareRequest1}
        request2={compareRequest2}
        onClose={() => onClearComparison?.()}
      />
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-purple-500/15 border border-purple-500/25 shrink-0">
          <ArrowRightLeft className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-text-primary">Compare</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Compare two requests or saved comparisons
          </p>
        </div>
      </div>

      {/* Search and Add */}
      <div className="px-3 py-2 border-b border-divider shrink-0 flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search saved comparisons..."
            value={savedSearchTerm}
            onChange={(e) => setSavedSearchTerm(e.target.value)}
            className="w-full h-11 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-purple-500/50 outline-none"
          />
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          disabled={requests.length === 0}
          className={cn(
            'flex items-center justify-center w-11 h-11 rounded-lg border transition-all shrink-0',
            requests.length > 0
              ? 'bg-secondary hover:bg-purple-500/20 hover:text-purple-400 text-text-secondary border-divider hover:border-purple-500/30'
              : 'bg-zinc-800/50 text-zinc-600 border-zinc-800/80 cursor-not-allowed opacity-50',
          )}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Saved compares list - horizontal cards */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredSavedCompares.length > 0 ? (
          <div className="space-y-2">
            {filteredSavedCompares.map((compare) => (
              <div
                key={compare.id}
                onClick={() => handleLoadCompare(compare)}
                className="group rounded-xl border border-divider bg-muted/10 p-3 flex items-center gap-3 cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/5 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{compare.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-text-secondary truncate">
                      {compare.url1}
                    </span>
                    <ArrowRightLeft className="w-3 h-3 text-text-secondary/50" />
                    <span className="text-[10px] font-mono text-text-secondary truncate">
                      {compare.url2}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteCompare(compare.id, e)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3">
            <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <ArrowRightLeft className="w-7 h-7 text-purple-400/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">No saved comparisons</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Click + to create a new comparison
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Comparison Drawer */}
      {drawerOpen && (
        <>
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setDrawerOpen(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ height: '60%' }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-purple-500/15 border border-purple-500/25 shrink-0">
                <Save className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-primary">Save Comparison</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Name and select two requests to compare
                </p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-secondary text-text-secondary hover:text-red-400 hover:bg-red-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">Name</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={newCompareName}
                  onChange={(e) => setNewCompareName(e.target.value)}
                  placeholder="My comparison"
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={newCompareDesc}
                  onChange={(e) => setNewCompareDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm outline-none focus:border-purple-500/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Request A
                </label>
                <Combobox
                  items={uniqueUrls}
                  value={selectedUrl1}
                  onChange={setSelectedUrl1}
                  placeholder="Select first request"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Request B
                </label>
                <Combobox
                  items={uniqueUrls}
                  value={selectedUrl2}
                  onChange={setSelectedUrl2}
                  placeholder="Select second request"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCompare}
                disabled={!newCompareName.trim() || !selectedUrl1 || !selectedUrl2}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ComparePanel;
