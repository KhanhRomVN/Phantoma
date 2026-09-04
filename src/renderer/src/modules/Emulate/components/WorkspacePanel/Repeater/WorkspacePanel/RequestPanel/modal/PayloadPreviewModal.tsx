import { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';

// ── Components ──
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@renderer/components/ui/Modal';

// ── Types ──
import type { PayloadItem, ParamItem } from '../../../../../../types/repeater.types';

// ── Hooks ──
import { useAccentColors } from '@renderer/shared/hooks/useAccentColors';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

export type PayloadMode = 'sequential' | 'cartesian' | 'permutation';

interface PayloadPreviewModalProps {
  isOpen: boolean;
  enabledPayloads: PayloadItem[];
  params: ParamItem[];
  headers: ParamItem[];
  body: string;
  method: string;
  url: string;
  onStart: (mode: PayloadMode) => void;
  onClose: () => void;
}

export function PayloadPreviewModal({
  isOpen,
  enabledPayloads,
  params,
  headers,
  body,
  method,
  url,
  onStart,
  onClose,
}: PayloadPreviewModalProps) {
  const [payloadMode, setPayloadMode] = useState<PayloadMode>('cartesian');
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('params');
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const hideTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { getColorByIndex } = useAccentColors();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPayloadMode('cartesian');
      setActiveTab('params');
    }
  }, [isOpen]);

  const hasPayload = enabledPayloads.length > 0;

  // Helper: Substitute payload variables in a string
  const substitutePayloadVars = (text: string, substitutions: Record<string, string>): string => {
    let result = text;
    Object.entries(substitutions).forEach(([varName, value]) => {
      const regex = new RegExp(
        '\\$\\{' + varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\}',
        'g',
      );
      result = result.replace(regex, value);
    });
    return result;
  };

  // Generate payload combinations based on selected mode
  const generatePayloadCombinations = (): Array<Record<string, string>> => {
    if (enabledPayloads.length === 0) return [{}];
    if (enabledPayloads.length === 1) {
      return enabledPayloads[0].values.map((val) => ({ [enabledPayloads[0].name]: val }));
    }

    if (payloadMode === 'sequential') {
      // Sequential: each payload value one by one
      const result: Array<Record<string, string>> = [];
      enabledPayloads.forEach((payload) => {
        payload.values.forEach((val) => {
          result.push({ [payload.name]: val });
        });
      });
      return result;
    } else if (payloadMode === 'cartesian') {
      // Cartesian product: all combinations
      const result: Array<Record<string, string>> = [{}];
      enabledPayloads.forEach((payload) => {
        const newResult: Array<Record<string, string>> = [];
        result.forEach((combination) => {
          payload.values.forEach((val) => {
            newResult.push({ ...combination, [payload.name]: val });
          });
        });
        result.length = 0;
        result.push(...newResult);
      });
      return result;
    } else {
      // Permutation: all permutations (for now, same as cartesian - can enhance later)
      const result: Array<Record<string, string>> = [{}];
      enabledPayloads.forEach((payload) => {
        const newResult: Array<Record<string, string>> = [];
        result.forEach((combination) => {
          payload.values.forEach((val) => {
            newResult.push({ ...combination, [payload.name]: val });
          });
        });
        result.length = 0;
        result.push(...newResult);
      });
      return result;
    }
  };

  const payloadCombinations = generatePayloadCombinations();
  const actualTotalRequests = payloadCombinations.length;

  // Get substituted data for first combination
  const selectedCombination = payloadCombinations[0] || {};
  const substitutedParams = params
    .filter((p) => p.enabled && p.key)
    .map((p) => ({
      ...p,
      value: substitutePayloadVars(p.value, selectedCombination),
    }));
  const substitutedHeaders = headers
    .filter((h) => h.enabled && h.key)
    .map((h) => ({
      ...h,
      value: substitutePayloadVars(h.value, selectedCombination),
    }));
  const substitutedBody = substitutePayloadVars(body, selectedCombination);

  // Hash payload name to consistent accent color index (same pattern as ParamTab)
  const getPayloadColorByName = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return getColorByIndex(Math.abs(hash));
  };

  // Extract payload names from value
  const extractPayloadNames = (value: string): string[] => {
    const names = new Set<string>();
    const RE = /\$\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = RE.exec(value)) !== null) {
      names.add(match[1]);
    }
    return [...names];
  };

  // Get payload by name from enabledPayloads
  const getPayloadByName = (name: string): PayloadItem | undefined => {
    return enabledPayloads.find((p) => p.name === name && p.enabled);
  };

  const handleMouseEnter = (value: string, e: React.MouseEvent<HTMLElement>) => {
    if (hideTooltipTimeoutRef.current) {
      clearTimeout(hideTooltipTimeoutRef.current);
      hideTooltipTimeoutRef.current = null;
    }
    if (/\$\{[^}]+\}/.test(value)) {
      setHoveredValue(value);
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({ x: rect.left, y: rect.bottom + 5 });
    }
  };

  const handleMouseLeave = () => {
    hideTooltipTimeoutRef.current = setTimeout(() => {
      setHoveredValue(null);
      setTooltipPosition(null);
    }, 200);
  };

  const handleTooltipMouseEnter = () => {
    if (hideTooltipTimeoutRef.current) {
      clearTimeout(hideTooltipTimeoutRef.current);
      hideTooltipTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    setHoveredValue(null);
    setTooltipPosition(null);
  };

  // Highlight substituted payload values: split by ${...} and color the substituted value
  const renderHighlightedValue = (value: string, substitutions: Record<string, string>) => {
    if (!value) return null;
    const parts = value.split(/(\$\{[^}]+\})/g);
    return parts.map((part, i) => {
      const varMatch = part.match(/^\$\{([^}]+)\}$/);
      if (varMatch) {
        const varName = varMatch[1];
        const substitutedValue = substitutions[varName];
        const color = getPayloadColorByName(varName);
        if (substitutedValue !== undefined) {
          return (
            <span key={i} style={{ color }}>
              {substitutedValue}
            </span>
          );
        }
        // Unsubstituted variable — keep pattern with amber color
        return (
          <span key={i} className="text-amber-400">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-[40vw] h-[75vh] max-w-none">
      <ModalHeader
        title="Confirm Execution"
        description={`${actualTotalRequests} request${actualTotalRequests > 1 ? 's' : ''}${hasPayload ? ` with ${enabledPayloads.length} payload${enabledPayloads.length > 1 ? 's' : ''}` : ''}`}
        onClose={onClose}
      />
      <ModalBody className="min-h-0 overflow-hidden">
        <div className="flex gap-4 h-full">
          {/* RIGHT PANEL: Detail with Tabs */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
              <span className="text-xs font-bold text-primary">{method}</span>
              <span className="text-xs text-text-primary font-mono truncate">{url}</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-3 border-b border-border">
              <button
                onClick={() => setActiveTab('params')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors relative',
                  activeTab === 'params'
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                Params
                {substitutedParams.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary">
                    {substitutedParams.length}
                  </span>
                )}
                {activeTab === 'params' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('headers')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors relative',
                  activeTab === 'headers'
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                Headers
                {substitutedHeaders.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary">
                    {substitutedHeaders.length}
                  </span>
                )}
                {activeTab === 'headers' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('body')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors relative',
                  activeTab === 'body'
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                Body
                {activeTab === 'body' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Params Tab */}
              {activeTab === 'params' && (
                <>
                  {substitutedParams.length > 0 ? (
                    <div className="border border-border rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-table-headerBg border-b border-border">
                          <tr>
                            <th className="px-3 py-2 text-left text-text-secondary font-medium w-[40%]">
                              Key
                            </th>
                            <th className="px-3 py-2 text-left text-text-secondary font-medium">
                              Value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {params
                            .filter((p) => p.enabled && p.key)
                            .map((p, idx) => (
                              <tr
                                key={p.id}
                                className={cn(
                                  'border-b border-border/40 last:border-b-0',
                                  idx % 2 === 0 ? 'bg-background' : 'bg-muted/5',
                                )}
                              >
                                <td className="px-3 py-2 text-text-primary font-medium">{p.key}</td>
                                <td
                                  className="px-3 py-2 text-text-secondary font-mono break-all"
                                  onMouseEnter={(e) => handleMouseEnter(p.value, e)}
                                  onMouseLeave={handleMouseLeave}
                                >
                                  {renderHighlightedValue(p.value, selectedCombination)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-text-secondary">
                      No params configured
                    </div>
                  )}
                </>
              )}

              {/* Headers Tab */}
              {activeTab === 'headers' && (
                <>
                  {substitutedHeaders.length > 0 ? (
                    <div className="border border-border rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-table-headerBg border-b border-border">
                          <tr>
                            <th className="px-3 py-2 text-left text-text-secondary font-medium w-[40%]">
                              Key
                            </th>
                            <th className="px-3 py-2 text-left text-text-secondary font-medium">
                              Value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {headers
                            .filter((h) => h.enabled && h.key)
                            .map((h, idx) => (
                              <tr
                                key={h.id}
                                className={cn(
                                  'border-b border-border/40 last:border-b-0',
                                  idx % 2 === 0 ? 'bg-background' : 'bg-muted/5',
                                )}
                              >
                                <td className="px-3 py-2 text-text-primary font-medium">{h.key}</td>
                                <td
                                  className="px-3 py-2 text-text-secondary font-mono break-all"
                                  onMouseEnter={(e) => handleMouseEnter(h.value, e)}
                                  onMouseLeave={handleMouseLeave}
                                >
                                  {renderHighlightedValue(h.value, selectedCombination)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-text-secondary">
                      No headers configured
                    </div>
                  )}
                </>
              )}

              {/* Body Tab */}
              {activeTab === 'body' && (
                <>
                  {substitutedBody ? (
                    <div className="bg-muted/10 rounded-lg p-4 border border-border">
                      <div
                        className="text-xs text-text-primary whitespace-pre-wrap break-words font-mono"
                        onMouseEnter={(e) => handleMouseEnter(body, e)}
                        onMouseLeave={handleMouseLeave}
                      >
                        {renderHighlightedValue(body, selectedCombination)}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-text-secondary">
                      No body configured
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onStart(payloadMode)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >
          <Play className="w-3 h-3" />
          Start
        </button>
      </ModalFooter>

      {/* Tooltip for payload variables */}
      {hoveredValue &&
        tooltipPosition &&
        (() => {
          const names = extractPayloadNames(hoveredValue);
          return (
            <div
              className="fixed z-50 bg-background border border-border rounded-lg shadow-xl p-3 max-w-xs"
              style={{
                left: tooltipPosition.x,
                top: tooltipPosition.y,
              }}
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
            >
              {names.length === 0 ? (
                <div className="text-[10px] text-text-secondary italic">
                  No payload variables found
                </div>
              ) : (
                <div className="space-y-2">
                  {names.map((name) => {
                    const payload = getPayloadByName(name);
                    const color = getPayloadColorByName(name);
                    return (
                      <div
                        key={name}
                        className="border-t border-border/40 pt-2 first:border-t-0 first:pt-0"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono text-sm font-medium" style={{ color }}>
                            {name}
                          </span>
                          <span className="text-[11px] text-text-primary">
                            [{payload ? payload.values.length : 0}]
                          </span>
                        </div>
                        {payload && payload.values.length > 0 ? (
                          <div className="font-mono text-[10px] text-text-secondary bg-background/50 rounded p-1 mt-0.5 max-h-20 overflow-y-auto">
                            {payload.values.slice(0, 5).map((v, i) => (
                              <div key={i} className="truncate">
                                {v}
                              </div>
                            ))}
                            {payload.values.length > 5 && (
                              <div className="italic">...</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-text-secondary italic">
                            {'No values configured'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
    </Modal>
  );
}
