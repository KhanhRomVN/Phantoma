import { useState, useEffect } from 'react';
import { Trash2, Plus, Search, Bookmark, X, GitBranch } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { NetworkRequest } from '../../../../types/inspector';
import {
  getOrCreateDefaultCollection,
  deleteRequestFromCollection,
  RequestCollection,
  COLLECTIONS_UPDATED_EVENT,
} from '../../../../utils/collections';
import { MethodBadge } from '../common/MethodBadge';

interface ComposerPanelProps {
  requests?: NetworkRequest[];
  appId?: string;
  onSelectRequest?: (request: NetworkRequest) => void;
  onClose?: () => void;
}

// Simplified Diagram View component for Composer
function DiagramView({
  onClose,
  composerName,
  composerDescription,
}: {
  onClose: () => void;
  composerName: string;
  composerDescription: string;
}) {
  return (
    <div className="absolute inset-0 z-50 bg-dialog-background flex flex-col">
      <div className="px-4 py-3 border-b border-divider flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold">{composerName || 'Diagram'}</span>
          {composerDescription && (
            <span className="text-xs text-text-secondary">{composerDescription}</span>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Diagram view would render here</p>
          <p className="text-xs mt-2">This is a placeholder for the visual request flow diagram</p>
        </div>
      </div>
    </div>
  );
}

export function ComposerPanel({ appId = '', onSelectRequest, onClose }: ComposerPanelProps) {
  const [collection, setCollection] = useState<RequestCollection | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [isDiagramDrawerOpen, setIsDiagramDrawerOpen] = useState(false);
  const [diagramName, setDiagramName] = useState('');
  const [diagramDescription, setDiagramDescription] = useState('');
  const [tempDiagramOpen, setTempDiagramOpen] = useState(false);

  useEffect(() => {
    const loadData = () => setCollection(getOrCreateDefaultCollection(appId || 'default'));
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener(COLLECTIONS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COLLECTIONS_UPDATED_EVENT, handleUpdate);
  }, [appId]);

  const handleDeleteRequest = (requestId: string) => {
    if (!collection || !appId) return;
    deleteRequestFromCollection(appId, collection.id, requestId);
    setCollection(getOrCreateDefaultCollection(appId));
  };

  const handleCreateCollection = () => {
    setIsDrawerOpen(false);
    setNewCollectionName('');
    setNewCollectionDescription('');
  };

  const filteredRequests =
    collection?.requests.filter((r: NetworkRequest) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        r.method?.toLowerCase().includes(searchLower) ||
        r.host?.toLowerCase().includes(searchLower) ||
        r.path?.toLowerCase().includes(searchLower)
      );
    }) || [];

  if (!collection) return null;

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-orange-500/15 border border-orange-500/25 shrink-0">
          <Bookmark className="w-4 h-4 text-orange-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-text-primary">Composer</h2>
          <p className="text-xs text-text-secondary mt-0.5">Saved requests and collections</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search and Add Bar */}
      <div className="px-3 py-2 border-b border-divider flex gap-2 items-center shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search saved requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-orange-500/50 outline-none"
          />
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          disabled={!appId}
          className={cn(
            'flex items-center justify-center w-11 h-11 rounded-lg border transition-all shrink-0',
            appId
              ? 'bg-secondary hover:bg-orange-500/20 hover:text-orange-400 text-text-secondary border-divider hover:border-orange-500/30'
              : 'bg-zinc-800/50 text-zinc-600 border-zinc-800/80 cursor-not-allowed opacity-50',
          )}
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsDiagramDrawerOpen(true)}
          disabled={!appId}
          className={cn(
            'flex items-center justify-center w-11 h-11 rounded-lg border transition-all shrink-0',
            appId
              ? 'bg-secondary hover:bg-blue-500/20 hover:text-blue-400 text-text-secondary border-divider hover:border-blue-500/30'
              : 'bg-zinc-800/50 text-zinc-600 border-zinc-800/80 cursor-not-allowed opacity-50',
          )}
        >
          <GitBranch className="w-4 h-4" />
        </button>
      </div>

      {/* Request List - horizontal cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3">
            <div className="w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Bookmark className="w-7 h-7 text-orange-400/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">No saved requests</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Click + to add requests to collection
              </p>
            </div>
          </div>
        ) : (
          filteredRequests.map((request: NetworkRequest) => (
            <div
              key={request.id}
              onClick={() => {
                setSelectedId(request.id);
                onSelectRequest?.(request);
              }}
              className={cn(
                'group rounded-xl border border-divider bg-muted/10 p-3 flex items-center gap-3 cursor-pointer transition-all',
                selectedId === request.id
                  ? 'border-orange-500/40 bg-orange-500/5'
                  : 'hover:border-orange-500/30',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <MethodBadge method={request.method} size="sm" />
                  <span className="text-[10px] font-mono text-text-secondary">
                    {request.status || '?'}
                  </span>
                </div>
                <div className="text-xs font-mono truncate text-text-primary mt-1">
                  {request.protocol}://{request.host}
                  {request.path}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRequest(request.id);
                }}
                className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add to Collection Drawer */}
      {isDrawerOpen && (
        <>
          <div
            className="absolute inset-0 bg-black/40 z-40"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ height: '60%' }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-orange-500/15 border border-orange-500/25">
                <Plus className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-primary">Add to Collection</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Save current request to your collection
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-secondary text-text-secondary hover:text-red-400 hover:bg-red-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">Name</label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="My Request"
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe this request..."
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-500/50 resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}

      {/* Diagram Composer Drawer */}
      {isDiagramDrawerOpen && (
        <>
          <div
            className="absolute inset-0 bg-black/40 z-40"
            onClick={() => setIsDiagramDrawerOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ height: '45%' }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/25">
                <GitBranch className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-primary">New Diagram</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Create a visual request flow diagram
                </p>
              </div>
              <button
                onClick={() => setIsDiagramDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-secondary text-text-secondary hover:text-red-400 hover:bg-red-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">Name</label>
                <input
                  type="text"
                  value={diagramName}
                  onChange={(e) => setDiagramName(e.target.value)}
                  placeholder="My Diagram"
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Description
                </label>
                <textarea
                  value={diagramDescription}
                  onChange={(e) => setDiagramDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the flow..."
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500/50 resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsDiagramDrawerOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsDiagramDrawerOpen(false);
                  setTempDiagramOpen(true);
                }}
                disabled={!diagramName.trim()}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Open Diagram
              </button>
            </div>
          </div>
        </>
      )}

      {/* Temp DiagramView overlay */}
      {tempDiagramOpen && (
        <DiagramView
          onClose={() => {
            setTempDiagramOpen(false);
            setDiagramName('');
            setDiagramDescription('');
          }}
          composerName={diagramName}
          composerDescription={diagramDescription}
        />
      )}
    </div>
  );
}

export default ComposerPanel;
