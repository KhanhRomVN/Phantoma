import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Monitor, RefreshCw } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../../components/ui/Modal';
import { DiscoveredApp } from '../../../../../types/apps';
import { BaseModalProps } from './types';

export const PcModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingApps = [],
}) => {
  // [DEBUG] PcModal render
  console.log('[DEBUG] PcModal rendered', { isOpen, existingAppsCount: existingApps.length });
  
  const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [selectedPcApp, setSelectedPcApp] = useState<DiscoveredApp | null>(null);
  const [pcLoading, setPcLoading] = useState(false);
  const [pcSearch, setPcSearch] = useState('');
  const [duplicateError, setDuplicateError] = useState<{ name?: string; value?: string }>({});

  const loadPcApps = async () => {
    setPcLoading(true);
    try {
      const apps = await window.api.invoke('apps:scan-pc');
      setDiscoveredApps(apps);
    } catch (e) {
      console.error('[PcModal] Error loading apps:', e);
      setDiscoveredApps([]);
    } finally {
      setPcLoading(false);
    }
  };

  // Duplicate error detection
  useEffect(() => {
    if (selectedPcApp) {
      const error: { name?: string; value?: string } = {};
      const existingByName = existingApps.find(
        (app) => app.name?.toLowerCase() === selectedPcApp.name?.toLowerCase(),
      );
      const existingByPath = existingApps.find(
        (app) => app.executablePath?.toLowerCase() === (selectedPcApp as any).exec?.toLowerCase(),
      );
      if (existingByName) error.name = `Name "${existingByName.name}" already exists`;
      if (existingByPath) error.value = `Path "${existingByPath.executablePath}" already exists`;
      setDuplicateError(error);
    } else {
      setDuplicateError({});
    }
  }, [selectedPcApp, existingApps]);

  // Load apps on open
  useEffect(() => {
    if (!isOpen) return;
    setSelectedPcApp(null);
    setPcSearch('');
    loadPcApps();
  }, [isOpen]);

  // Auto-select first card when apps are discovered
  useEffect(() => {
    if (isOpen && discoveredApps.length > 0 && !selectedPcApp) {
      setSelectedPcApp(discoveredApps[0]);
    }
  }, [discoveredApps, isOpen]);

  const filteredPcApps = useMemo(() => {
    if (!pcSearch) return discoveredApps;
    const l = pcSearch.toLowerCase();
    return discoveredApps.filter(
      (a) => a.name.toLowerCase().includes(l) || a.description?.toLowerCase().includes(l),
    );
  }, [discoveredApps, pcSearch]);

  const handleSubmit = async () => {
    if (!selectedPcApp) return;
    try {
      await onAdd({
        name: selectedPcApp.name,
        executablePath: (selectedPcApp as any).exec,
        platform: 'pc',
        mode: 'intercept',
        icon: selectedPcApp.icon,
      });
      onClose();
    } catch (error) {
      console.error('[PcModal] Add target failed:', error);
    }
  };

  const canSubmit = !!selectedPcApp && !duplicateError.name && !duplicateError.value;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader title="Add App" description="Configure your app target" onClose={onClose} />
      <ModalBody>
        <div className="flex flex-row" style={{ height: '50vh' }}>
          {/* Left Panel - App List */}
          <div className="w-1/2 flex flex-col pr-3 border-r border-border">
            <div className="pb-3 flex gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search apps..."
                  value={pcSearch}
                  onChange={(e) => setPcSearch(e.target.value)}
                  className="w-full bg-input-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary outline-none focus:border-primary/50"
                />
              </div>
              <button
                onClick={loadPcApps}
                className="p-2 bg-dropdown-item-hover hover:bg-dropdown-item-hover border border-border rounded-lg shrink-0"
              >
                <RefreshCw
                  className={cn('w-4 h-4 text-text-secondary', pcLoading && 'animate-spin')}
                />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {pcLoading && !discoveredApps.length ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-sm text-text-secondary">Scanning installed apps...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {filteredPcApps.map((app) => {
                    const isSelected =
                      (selectedPcApp as any)?.exec === (app as any).exec &&
                      (selectedPcApp as any)?.name === app.name;
                    const isExisting = existingApps.some(
                      (existing) =>
                        existing.executablePath?.toLowerCase() ===
                          (app as any).exec?.toLowerCase() ||
                        existing.name?.toLowerCase() === app.name?.toLowerCase(),
                    );
                    return (
                      <button
                        key={`${app.name}-${(app as any).exec}`}
                        onClick={() => !isExisting && setSelectedPcApp(app)}
                        disabled={isExisting}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border text-left transition-all w-full',
                          isSelected && !isExisting
                            ? 'bg-primary/10 border-primary/40'
                            : isExisting
                              ? 'opacity-50 cursor-not-allowed bg-input-background/50 border-border/30'
                              : 'bg-input-background border-border/40 hover:bg-dropdown-item-hover/60',
                        )}
                      >
                        <div className="w-9 h-9 rounded-lg bg-dropdown-item-hover flex items-center justify-center shrink-0 overflow-hidden">
                          {app.icon ? (
                            <img
                              src={`media://${app.icon}`}
                              alt={app.name}
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Monitor className="w-4 h-4 text-text-secondary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-text-primary truncate">
                            {app.name}
                            {isExisting && (
                              <span className="ml-2 text-[9px] font-normal text-text-secondary">
                                (đã tồn tại)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-text-secondary truncate">
                            {app.description || 'System Application'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {duplicateError.name && (
              <p className="text-xs text-error mt-2 shrink-0">{duplicateError.name}</p>
            )}
            {duplicateError.value && (
              <p className="text-xs text-error mt-1 shrink-0">{duplicateError.value}</p>
            )}
          </div>

          {/* Right Panel - App Details */}
          <div className="w-1/2 pl-3 overflow-y-auto">
            {selectedPcApp ? (
              <div className="flex flex-col gap-4">
                {/* Header: Icon + Name */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-dropdown-item-hover flex items-center justify-center shrink-0 overflow-hidden border border-border">
                    {selectedPcApp.icon ? (
                      <img
                        src={`media://${selectedPcApp.icon}`}
                        alt={selectedPcApp.name}
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Monitor className="w-6 h-6 text-text-secondary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-text-primary truncate">
                      {selectedPcApp.name}
                    </h3>
                    <p className="text-[11px] text-text-secondary">
                      {selectedPcApp.platform || 'pc'}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {selectedPcApp.description && (
                  <div>
                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                      Description
                    </p>
                    <p className="text-xs text-text-primary leading-relaxed">
                      {selectedPcApp.description}
                    </p>
                  </div>
                )}

                {/* Executable Path */}
                <div>
                  <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                    Executable Path
                  </p>
                  <p className="text-xs text-text-primary font-mono bg-input-background rounded-md px-2 py-1.5 break-all border border-border/40">
                    {(selectedPcApp as any).exec || 'N/A'}
                  </p>
                </div>

                {/* Source */}
                <div>
                  <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                    Source
                  </p>
                  <p className="text-xs text-text-primary capitalize">{selectedPcApp.source}</p>
                </div>

                {/* Confidence */}
                {selectedPcApp.confidence !== undefined && (
                  <div>
                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                      Confidence
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-input-background rounded-full overflow-hidden border border-border/40">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.round(selectedPcApp.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-text-secondary font-medium">
                        {Math.round(selectedPcApp.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedPcApp.tags && selectedPcApp.tags.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPcApp.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discovered At */}
                {selectedPcApp.discoveredAt && (
                  <div>
                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                      Discovered
                    </p>
                    <p className="text-xs text-text-primary">
                      {new Date(selectedPcApp.discoveredAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-text-secondary">
                <Monitor className="w-8 h-8 opacity-30" />
                <p className="text-xs">Select an app to view details</p>
              </div>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          Add Target
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default PcModal;
