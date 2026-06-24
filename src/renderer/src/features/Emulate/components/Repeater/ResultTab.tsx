import { useState, useEffect } from 'react';
import { cn } from '../../../../shared/lib/utils';

interface PayloadItem {
  id: string;
  name: string;
  values: string[];
  enabled: boolean;
}

interface ResultTabProps {
  payloads: PayloadItem[];
  className?: string;
}

interface Combination {
  id: string;
  label: string;
  values: Record<string, string>;
}

export function ResultTab({ payloads, className }: ResultTabProps) {
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCombinations, setExpandedCombinations] = useState<Set<string>>(new Set());

  // Generate all combinations of payload values
  useEffect(() => {
    const enabledPayloads = payloads.filter(p => p.enabled && p.values.length > 0);
    
    if (enabledPayloads.length === 0) {
      setCombinations([]);
      return;
    }

    // Generate all combinations using cartesian product
    const generateCombinations = (
      payloads: PayloadItem[],
      index: number,
      current: Record<string, string>
    ): Combination[] => {
      if (index >= payloads.length) {
        const label = Object.entries(current)
          .map(([key, value]) => `${key}=${value}`)
          .join(', ');
        return [{
          id: crypto.randomUUID(),
          label,
          values: { ...current }
        }];
      }

      const payload = payloads[index];
      const results: Combination[] = [];
      
      for (const value of payload.values) {
        const next = { ...current, [payload.name]: value };
        results.push(...generateCombinations(payloads, index + 1, next));
      }
      
      return results;
    };

    const allCombinations = generateCombinations(enabledPayloads, 0, {});
    setCombinations(allCombinations);
  }, [payloads]);

  // Toggle expand all combinations
  const toggleExpandAll = () => {
    if (expandedCombinations.size === combinations.length && combinations.length > 0) {
      setExpandedCombinations(new Set());
    } else {
      setExpandedCombinations(new Set(combinations.map(c => c.id)));
    }
  };

  // Toggle single combination
  const toggleCombination = (id: string) => {
    const newSet = new Set(expandedCombinations);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedCombinations(newSet);
  };

  // Filter combinations by search term
  const filteredCombinations = combinations.filter(c => 
    c.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (combinations.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-text-secondary text-sm', className)}>
        <div className="text-center">
          <div className="text-4xl mb-2">📦</div>
          <p>No enabled payloads with values</p>
          <p className="text-xs mt-1">Enable payloads and add values to generate combinations</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 bg-table-headerBg">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-text-secondary">
            Total Combinations: <span className="text-text-primary font-bold">{combinations.length.toLocaleString()}</span>
          </span>
          <button
            onClick={toggleExpandAll}
            className="text-[10px] text-text-secondary hover:text-text-primary transition-colors"
          >
            {expandedCombinations.size === combinations.length ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search combinations..."
            className="px-2 py-1 text-xs rounded border border-border bg-background text-text-primary outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* List of combinations */}
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-1">
          {filteredCombinations.map((combination) => {
            const isExpanded = expandedCombinations.has(combination.id);
            const payloadKeys = Object.keys(combination.values);
            
            return (
              <div
                key={combination.id}
                className="border border-border rounded hover:bg-dropdown-item-hover/30 transition-colors"
              >
                <button
                  onClick={() => toggleCombination(combination.id)}
                  className="w-full text-left px-3 py-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-text-secondary shrink-0">
                      #{filteredCombinations.indexOf(combination) + 1}
                    </span>
                    <span className="text-xs text-text-primary truncate font-mono">
                      {combination.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-text-secondary">
                      {payloadKeys.length} variables
                    </span>
                    <svg
                      className={cn(
                        'w-4 h-4 text-text-secondary transition-transform',
                        isExpanded ? 'rotate-180' : ''
                      )}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="px-3 pb-2 pt-1 border-t border-border/40">
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      {payloadKeys.map((key) => (
                        <div key={key} className="flex items-center gap-1">
                          <span className="text-text-secondary">{key}:</span>
                          <span className="text-text-primary font-mono">{combination.values[key]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredCombinations.length === 0 && (
            <div className="text-center py-8 text-text-secondary text-sm">
              No combinations found matching "{searchTerm}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}