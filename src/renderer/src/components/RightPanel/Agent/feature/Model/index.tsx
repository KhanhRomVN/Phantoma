import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { Provider } from '../../types';
import { getAgentAPI } from '../../services/api';
import { cn } from '@renderer/shared/lib/utils';
import { useAgentStore } from '../../components/store';
import { Drawer, DrawerHeader, DrawerBody } from '@renderer/components/ui/Drawer';

interface ModelsProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Models({ isOpen = true, onClose }: ModelsProps) {
  const { apiUrl, activeModelId, setActiveModelId } = useAgentStore();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('');

  useEffect(() => {
    const loadProviders = async () => {
      setLoading(true);
      setError(null);
      try {
        const api = getAgentAPI(apiUrl);
        const data = await api.getProviders();
        setProviders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load providers');
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, [apiUrl]);

  const selectModel = useCallback(
    (modelId: string) => {
      setActiveModelId(activeModelId === modelId ? null : modelId);
    },
    [activeModelId, setActiveModelId],
  );

  const filteredProviders = providers
    .filter((p) => p.is_enabled)
    .filter((p) => !providerFilter || p.provider_id === providerFilter)
    .map((p) => ({
      ...p,
      models: p.models.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
          m.id.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((p) => p.models.length > 0);

  const totalModels = filteredProviders.reduce((sum, p) => sum + p.models.length, 0);
  const uniqueProviders = providers.filter((p) => p.is_enabled);

  return (
    <Drawer isOpen={isOpen} onClose={onClose || (() => {})} height="100%" strategy="absolute">
      <DrawerHeader
        title="Model Selection"
        description="Select the active LLM model for your agent operations."
        onClose={onClose}
      />

      <DrawerBody>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-secondary gap-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-xs">Loading providers & models...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3 px-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-all"
            >
              Retry
            </button>
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-16 text-text-secondary text-xs">
            <p>No providers found.</p>
            <p className="mt-1 text-text-muted">Make sure your AIWeb2API server is running.</p>
          </div>
        ) : (
          <>
            {/* Search & Filter */}
            <div className="flex items-center gap-3 py-3 flex-wrap">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search models..."
                  className="w-full bg-card-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary outline-none focus:border-cyan-500/40 placeholder-text-secondary"
                />
              </div>

              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="bg-card-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none focus:border-cyan-500/40"
              >
                <option value="">All Providers</option>
                {uniqueProviders.map((p) => (
                  <option key={p.provider_id} value={p.provider_id}>
                    {p.provider_name}
                  </option>
                ))}
              </select>

              <span className="text-[10px] text-text-secondary whitespace-nowrap">
                {totalModels} models
              </span>
              {activeModelId && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  Active: {activeModelId}
                </span>
              )}
            </div>

            {/* Model Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
              {filteredProviders.map((provider) => (
                <div
                  key={provider.provider_id}
                  className="p-3 bg-card-background border border-border rounded-lg flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-divider">
                    {provider.website_url && (
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${new URL(provider.website_url).hostname}`}
                        alt=""
                        className="w-3.5 h-3.5 rounded-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span className="text-xs font-bold text-text-primary">
                      {provider.provider_name}
                    </span>
                    <span className="text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 rounded uppercase font-semibold">
                      Enabled
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {provider.models.map((model) => {
                      const isActive = activeModelId === model.id;
                      return (
                        <div
                          key={model.id}
                          onClick={() => selectModel(model.id)}
                          className={cn(
                            'p-2.5 rounded-md border text-xs cursor-pointer transition-all',
                            isActive
                              ? 'bg-cyan-500/5 border-cyan-500/40 text-text-primary font-medium'
                              : 'bg-background border-border hover:border-cyan-500/20 text-text-primary',
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">{model.name}</span>
                            {isActive && (
                              <span className="text-[9px] text-green-400 font-bold flex items-center gap-0.5">
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </span>
                            )}
                          </div>
                          {model.description && (
                            <p className="text-[10px] text-text-secondary mb-1.5 line-clamp-2">
                              {model.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </DrawerBody>
    </Drawer>
  );
}

export default Models;