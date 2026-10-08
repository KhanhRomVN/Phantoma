import { useState, useEffect, useMemo } from 'react';
import { Globe, GitBranch, Clock, RefreshCw, Trash2, ChevronDown } from 'lucide-react';
import { getCloneHistory, removeCloneEntry, type CloneEntry } from '../../../utils/cloneHistory';

const GIT_URL_REGEX = /^(https?:\/\/|git@)\S+/i;

interface NewRepositoryFormProps {
  searchQuery: string;
  onCloneSuccess: (data: { url: string; dest: string; folderName: string }) => void;
}

export function NewRepositoryForm({ searchQuery, onCloneSuccess }: NewRepositoryFormProps) {
  const [cloneHistory, setCloneHistory] = useState<CloneEntry[]>([]);
  const [cloneFolderName, setCloneFolderName] = useState('');
  const [cloneDest, setCloneDest] = useState('/home/khanhromvn/projects');
  const [selectedBranch, setSelectedBranch] = useState('main');

  const isValidUrl = useMemo(() => GIT_URL_REGEX.test(searchQuery.trim()), [searchQuery]);

  useEffect(() => {
    setCloneHistory(getCloneHistory());
  }, []);

  useEffect(() => {
    if (isValidUrl) {
      const match = searchQuery.match(/\/([^/]+?)(\.git)?$/);
      if (match) setCloneFolderName(match[1]);
      setSelectedBranch('main');
    } else {
      setCloneFolderName('');
    }
  }, [searchQuery, isValidUrl]);

  const getDateGroup = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return 'Last Week';
    if (diffDays < 30) return 'Last Month';
    if (diffDays < 365) return 'Last Year';
    return 'Earlier';
  };

  const groupedClones = useMemo(() => {
    const groups: Record<string, CloneEntry[]> = {};
    cloneHistory.forEach(clone => {
      const label = getDateGroup(clone.timestamp);
      if (!groups[label]) groups[label] = [];
      groups[label].push(clone);
    });
    const order = ['Today', 'Yesterday', 'Last Week', 'Last Month', 'Last Year', 'Earlier'];
    return Object.entries(groups)
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([label, items]) => ({ label, items }));
  }, [cloneHistory]);

  const shortenPath = (path: string): string => {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 3) return path;
    const start = parts[0] === 'home' || parts[0] === 'Users' ? '~/' : '';
    const end = parts.slice(-2).join('/');
    return `${start}.../${end}`;
  };

  const handleRemoveClone = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeCloneEntry(id);
    setCloneHistory(prev => prev.filter(item => item.id !== id));
  };

  const renderCloneListContent = () => {
    if (groupedClones.length === 0) {
      return (
        <div className="py-8 flex flex-col items-center justify-center text-text-secondary/30 gap-2">
          <Globe className="w-6 h-6 opacity-20" />
          <span className="text-xs">No history yet</span>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {groupedClones.map(group => (
          <div key={group.label}>
            <h5 className="text-[9px] font-mono uppercase tracking-widest text-text-secondary/40 mb-1.5 pl-1">{group.label}</h5>
            <div className="space-y-1">
              {group.items.map((repo) => (
                <div key={repo.id} className="group flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all border border-transparent hover:bg-white/[0.03] hover:border-border">
                  <div className="w-7 h-7 rounded grid place-items-center shrink-0 bg-white/[0.05] border border-border text-text-secondary">
                    <GitBranch className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-medium text-xs text-text-primary truncate">{repo.name}</div>
                    <small className="block text-[10px] font-mono text-text-secondary/50 truncate">{shortenPath(repo.dest)}</small>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); /* Parent handles URL update via searchQuery prop */ }}
                      className="w-6 h-6 rounded grid place-items-center text-text-secondary/40 hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Reuse URL"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleRemoveClone(e, repo.id)}
                      className="w-6 h-6 rounded grid place-items-center text-text-secondary/40 hover:text-error hover:bg-error/10 transition-colors"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300 pb-6">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-text-secondary/50 mb-4">
          <GitBranch className="w-3 h-3" />
          New Repository
        </div>
        <div className="space-y-4">
          {/* Repo URL Input is handled by parent's TopBar, but we show validation state here if needed */}
          {isValidUrl && (
            <>
              <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-text-secondary text-left">Folder Name</label>
                  <input
                    type="text"
                    value={cloneFolderName}
                    onChange={(e) => setCloneFolderName(e.target.value)}
                    className="w-full bg-transparent border-b border-border px-0 py-2 text-sm font-mono outline-none focus:border-primary text-text-primary"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-text-secondary text-left">Branch</label>
                  <div className="relative">
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full appearance-none bg-transparent border-b border-border px-0 py-2 text-sm font-mono outline-none focus:border-primary text-text-primary cursor-pointer"
                    >
                      <option value="main">main</option>
                      <option value="master">master</option>
                      <option value="develop">develop</option>
                    </select>
                    <ChevronDown className="absolute right-0 top-2.5 w-3 h-3 text-text-secondary pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-text-secondary text-left">Destination Path</label>
                <input
                  type="text"
                  value={cloneDest}
                  onChange={(e) => setCloneDest(e.target.value)}
                  className="w-full bg-transparent border-b border-border px-0 py-2 text-sm font-mono outline-none focus:border-primary text-text-secondary"
                />
              </div>
              
              {/* Hidden submit trigger for the form logic if needed, or rely on parent footer */}
              <button 
                className="hidden" 
                id="trigger-clone-submit"
                onClick={() => onCloneSuccess({ url: searchQuery.trim(), dest: `${cloneDest}/${cloneFolderName}`, folderName: cloneFolderName })}
              />
            </>
          )}
        </div>
      </div>
      
      {/* History Section */}
      <div className="border-t border-border/30 pt-6">
         <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-text-secondary/50 mb-4">
           <Clock className="w-3 h-3" />
           Recent Clones
         </div>
         {renderCloneListContent()}
      </div>
    </div>
  );
}