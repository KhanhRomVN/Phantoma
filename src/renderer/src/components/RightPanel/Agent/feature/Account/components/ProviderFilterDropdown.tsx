import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@renderer/shared/lib/utils';
import { $ } from '@renderer/utils/color';

interface ProviderFilterDropdownProps {
  providerConfigs: any[];
  selectedProvider: string;
  onSelectProvider: (providerId: string) => void;
  getFaviconUrl: (website: string) => string;
}

const ProviderFilterDropdown: React.FC<ProviderFilterDropdownProps> = ({
  providerConfigs,
  selectedProvider,
  onSelectProvider,
  getFaviconUrl,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProviderObj = providerConfigs.find((p) => p.provider_id === selectedProvider);

  const filteredProviders = providerConfigs.filter(
    (p) =>
      p.provider_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.provider_id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelect = (providerId: string) => {
    onSelectProvider(providerId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelectProvider('');
    setIsOpen(false);
  };

  const isActive = (id: string) => selectedProvider === id;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-[34px] px-2.5 rounded-lg text-[13px] font-medium cursor-pointer whitespace-nowrap bg-input-background border border-border text-text-primary"
      >
        {selectedProvider && selectedProviderObj ? (
          <>
            <img
              src={getFaviconUrl(selectedProviderObj.website)}
              alt={selectedProviderObj.provider_name}
              className="w-4 h-4 rounded-[3px]"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
            <span>{selectedProviderObj.provider_name}</span>
          </>
        ) : (
          <span>All Providers</span>
        )}
        <ChevronDown size={13} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-[240px] max-h-[300px] rounded-[10px] z-[1000] overflow-hidden flex flex-col bg-card-background border border-border shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-[9px] top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                placeholder="Search provider..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-[7px] px-[28px] text-xs rounded-[7px] outline-none box-border bg-input-background border border-border text-text-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-[7px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0 flex items-center text-text-secondary"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {/* All Providers option */}
            <button
              onClick={handleClear}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-[9px] border-none text-xs cursor-pointer text-left text-text-primary',
                isActive('') ? 'bg-sidebar-item-hover' : 'bg-transparent',
              )}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = $('--hover-bg'))}
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = isActive('')
                  ? $('--sidebar-item-hover')
                  : 'transparent')
              }
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}
              >
                <span className="text-[9px] font-bold text-text-secondary">All</span>
              </div>
              <span>All Providers</span>
            </button>

            {filteredProviders.map((provider) => (
              <button
                key={provider.provider_id}
                onClick={() => handleSelect(provider.provider_id)}
                className="w-full flex items-center gap-2.5 px-3 py-[9px] border-none text-xs cursor-pointer text-left text-text-primary"
                style={{
                  backgroundColor: isActive(provider.provider_id)
                    ? $('--sidebar-item-hover')
                    : 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = $('--hover-bg'))}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = isActive(provider.provider_id)
                    ? $('--sidebar-item-hover')
                    : 'transparent')
                }
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: 'rgba(128,128,128,0.1)' }}
                >
                  <img
                    src={getFaviconUrl(provider.website)}
                    alt={provider.provider_name}
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        const fb = document.createElement('span');
                        fb.style.cssText = 'font-size:9px;font-weight:bold;';
                        fb.textContent = provider.provider_name.slice(0, 2).toUpperCase();
                        (e.target as HTMLImageElement).replaceWith(fb);
                      }
                    }}
                  />
                </div>
                <span>{provider.provider_name}</span>
              </button>
            ))}

            {filteredProviders.length === 0 && (
              <div className="p-4 text-center text-xs opacity-70 text-text-secondary">
                No providers found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderFilterDropdown;
