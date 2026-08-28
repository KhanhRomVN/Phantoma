import { Check, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// ── Components ──
import CodeBlock, { CodeBlockRef } from '@renderer/components/common/CodeBlock';

// ── Types ──
import type { ParamItem, PayloadItem } from '../../../../../../types/repeater.types';

// ── Hooks ──
import { useAccentColors } from '@renderer/shared/hooks/useAccentColors';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

interface ParamTabProps {
  params: ParamItem[];
  onChange: (params: ParamItem[]) => void;
  placeholderKey?: string;
  placeholderValue?: string;
  payloads?: PayloadItem[];
  onSwitchToPayload?: () => void;
  readOnly?: boolean;
  isRawView?: boolean;
  targetId?: string | null;
  codeBlockRef?: React.RefObject<CodeBlockRef | null>;
}

export function ParamTab({
  params,
  onChange,
  placeholderKey = 'Key',
  payloads = [],
  onSwitchToPayload,
  readOnly = false,
  isRawView = false,
  targetId = null,
  codeBlockRef,
}: ParamTabProps) {
  const [isFinalRowEditing, setIsFinalRowEditing] = useState(false);
  const [finalKey, setFinalKey] = useState('');
  const [finalValue, setFinalValue] = useState('');
  const { getColorByIndex } = useAccentColors();
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const hideTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store raw JSON text loaded directly from DB
  const [rawJsonText, setRawJsonText] = useState<string>('[]');
  const [isLoadingRawJson, setIsLoadingRawJson] = useState(false);
  
  // Load raw JSON from DB when entering raw view or when repeater-updated event fires
  const loadRawJson = () => {
    console.log('[ParamTab] loadRawJson() called, targetId:', targetId);
    if (targetId) {
      setIsLoadingRawJson(true);
      import('../../../../../../services/emulate-api.service').then(({ emulateApi }) => {
        console.log('[ParamTab] loadRawJson - emulateApi imported, fetching...');
        emulateApi.listRequests(targetId).then((res) => {
          console.log('[ParamTab] loadRawJson - listRequests response:', res);
          if (res.success && res.data && res.data.length > 0) {
            const req = res.data[0];
            const rawJson = req.params || '[]';
            console.log('[ParamTab] loadRawJson - Loaded raw JSON from DB:', rawJson);
            setRawJsonText(rawJson);
          }
          setIsLoadingRawJson(false);
        }).catch((err) => {
          console.error('[ParamTab] loadRawJson - Failed to load raw JSON:', err);
          setIsLoadingRawJson(false);
        });
      });
    } else {
      console.warn('[ParamTab] loadRawJson - No targetId, skipping');
    }
  };

  useEffect(() => {
    if (isRawView && targetId) {
      loadRawJson();
    }
  }, [isRawView, targetId]);
  
  // Load params from DB when entering table view or when repeater-updated event fires
  const loadParams = () => {
    console.log('[ParamTab] loadParams() called, targetId:', targetId);
    if (targetId) {
      console.log('[ParamTab] loadParams - Reloading params from DB...');
      import('../../../../../../services/emulate-api.service').then(({ emulateApi }) => {
        console.log('[ParamTab] loadParams - emulateApi imported, fetching...');
        emulateApi.listRequests(targetId).then((res) => {
          console.log('[ParamTab] loadParams - listRequests response:', res);
          if (res.success && res.data && res.data.length > 0) {
            const req = res.data[0];
            const rawJson = req.params || '[]';
            console.log('[ParamTab] loadParams - Loaded params JSON from DB:', rawJson);
            
            try {
              const parsed = JSON.parse(rawJson);
              console.log('[ParamTab] loadParams - Parsed JSON:', parsed);
              if (Array.isArray(parsed)) {
                const newParams = parsed.map((item) => ({
                  id: item.id || crypto.randomUUID(),
                  key: item.key || '',
                  value: item.value || '',
                  enabled: item.enabled !== undefined ? item.enabled : true,
                }));
                console.log('[ParamTab] loadParams - Converted to ParamItem[]:', newParams);
                console.log('[ParamTab] loadParams - Calling onChange...');
                onChange(newParams);
                console.log('[ParamTab] loadParams - ✅ onChange called successfully');
              }
            } catch (err) {
              console.error('[ParamTab] loadParams - Failed to parse params from DB:', err);
            }
          }
        }).catch((err) => {
          console.error('[ParamTab] loadParams - Failed to load params from DB:', err);
        });
      });
    } else {
      console.warn('[ParamTab] loadParams - No targetId, skipping');
    }
  };

  useEffect(() => {
    if (!isRawView && targetId) {
      console.log('[ParamTab] Entering table view, reloading params from DB...');
      loadParams();
    }
  }, [isRawView, targetId]);

  // Listen for repeater-updated event to reload data from DB
  useEffect(() => {
    console.log('[ParamTab] Setting up repeater-updated listener, isRawView:', isRawView, 'targetId:', targetId);
    
    const handleRepeaterUpdated = () => {
      console.log('[ParamTab] ✅ Received repeater-updated event!');
      console.log('[ParamTab] Current state - isRawView:', isRawView, 'targetId:', targetId);
      
      if (isRawView) {
        console.log('[ParamTab] Calling loadRawJson()...');
        loadRawJson();
      } else {
        console.log('[ParamTab] Calling loadParams()...');
        loadParams();
      }
    };

    window.addEventListener('repeater-updated', handleRepeaterUpdated);
    console.log('[ParamTab] Event listener added for repeater-updated');
    
    return () => {
      window.removeEventListener('repeater-updated', handleRepeaterUpdated);
      console.log('[ParamTab] Event listener removed for repeater-updated');
    };
  }, [isRawView, targetId]);

  // Polling mechanism to check for database changes (fallback if event doesn't work)
  useEffect(() => {
    if (!targetId) return;

    console.log('[ParamTab] Setting up polling mechanism, targetId:', targetId);
    
    let lastKnownContent = '';
    
    const checkForChanges = async () => {
      if (!targetId) return;
      
      try {
        const { emulateApi } = await import('../../../../../../services/emulate-api.service');
        const res = await emulateApi.listRequests(targetId);
        
        if (res.success && res.data && res.data.length > 0) {
          const req = res.data[0];
          const currentContent = req.params || '[]';
          
          // Only reload if content actually changed
          if (currentContent !== lastKnownContent && lastKnownContent !== '') {
            console.log('[ParamTab] 🔄 Database content changed, reloading...');
            console.log('[ParamTab] Old:', lastKnownContent);
            console.log('[ParamTab] New:', currentContent);
            
            if (isRawView) {
              loadRawJson();
            } else {
              loadParams();
            }
          }
          
          lastKnownContent = currentContent;
        }
      } catch (err) {
        console.error('[ParamTab] Polling error:', err);
      }
    };
    
    // Initial content snapshot
    (async () => {
      try {
        const { emulateApi } = await import('../../../../../../services/emulate-api.service');
        const res = await emulateApi.listRequests(targetId);
        if (res.success && res.data && res.data.length > 0) {
          lastKnownContent = res.data[0].params || '[]';
          console.log('[ParamTab] Initial content snapshot:', lastKnownContent);
        }
      } catch (err) {
        console.error('[ParamTab] Error getting initial snapshot:', err);
      }
    })();
    
    // Poll every 2 seconds
    const intervalId = setInterval(checkForChanges, 2000);
    
    return () => {
      clearInterval(intervalId);
      console.log('[ParamTab] Polling stopped');
    };
  }, [targetId, isRawView]);

  const hasPayloadVariable = (value: string): boolean => {
    return /\$\{[^}]+\}/.test(value);
  };

  // Hash payload name to consistent accent color index
  const getPayloadColorByName = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return getColorByIndex(Math.abs(hash));
  };

  // Extract all unique payload names from a value string
  const extractPayloadNames = (value: string): string[] => {
    const names = new Set<string>();
    const RE = /\$\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = RE.exec(value)) !== null) {
      names.add(match[1]);
    }
    return [...names];
  };

  // Get payload by name
  const getPayloadByName = (name: string) => {
    return payloads.find((p) => p.name === name && p.enabled);
  };

  // Highlight text: split by ${...} and color each variable by its name
  const RE_PAYLOAD_VAR = /\$\{[^}]+\}/;
  const highlightText = (value: string, getColor: (name: string) => string): React.ReactNode => {
    if (!value) return null;
    const parts = value.split(/(\$\{[^}]+\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('${') && part.endsWith('}') && RE_PAYLOAD_VAR.test(part)) {
        const name = part.slice(2, -1);
        return (
          <span key={i} style={{ color: getColor(name) }}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleMouseEnter = (value: string, e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (hideTooltipTimeoutRef.current) {
      clearTimeout(hideTooltipTimeoutRef.current);
      hideTooltipTimeoutRef.current = null;
    }
    if (hasPayloadVariable(value)) {
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

  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const overlayRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const measurerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    textareaRefs.current.forEach((el) => {
      resizeTextarea(el);
    });
  }, [params]);

  const resizeTextarea = (el: HTMLTextAreaElement) => {
    if (!measurerRef.current) return;

    const computed = window.getComputedStyle(el);
    const textareaWidth = el.clientWidth;

    measurerRef.current.style.width = textareaWidth + 'px';
    measurerRef.current.style.paddingLeft = computed.paddingLeft;
    measurerRef.current.style.paddingRight = computed.paddingRight;
    measurerRef.current.style.paddingTop = computed.paddingTop;
    measurerRef.current.style.paddingBottom = computed.paddingBottom;
    measurerRef.current.style.lineHeight = computed.lineHeight;
    measurerRef.current.style.fontSize = computed.fontSize;
    measurerRef.current.style.fontFamily = computed.fontFamily;
    measurerRef.current.style.wordBreak = computed.wordBreak;
    measurerRef.current.style.overflowWrap = computed.overflowWrap;
    measurerRef.current.style.whiteSpace = computed.whiteSpace;
    measurerRef.current.style.boxSizing = 'border-box';

    measurerRef.current.textContent = el.value || '';

    const measuredHeight = measurerRef.current.offsetHeight;
    el.style.height = measuredHeight + 'px';
  };

  const handleAdd = (key: string, value: string) => {
    const newParam: ParamItem = {
      id: crypto.randomUUID(),
      key: key.trim(),
      value: value.trim(),
      enabled: true,
    };
    const newParams = [...params, newParam];
    console.log('[ParamTab] handleAdd called, newParams:', newParams);
    onChange(newParams);
  };

  const handleToggle = (id: string) => {
    if (readOnly) return;
    onChange(params.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  const handleDelete = (id: string) => {
    if (readOnly) return;
    onChange(params.filter((p) => p.id !== id));
  };

  const fallbackAccentColor = getColorByIndex(0);
  
  // Detect duplicate keys
  const getDuplicateKeys = (): Set<string> => {
    const keyCount = new Map<string, number>();
    params.forEach((param) => {
      if (param.key?.trim()) {
        keyCount.set(param.key, (keyCount.get(param.key) || 0) + 1);
      }
    });
    
    const duplicates = new Set<string>();
    keyCount.forEach((count, key) => {
      if (count > 1) {
        duplicates.add(key);
      }
    });
    
    return duplicates;
  };
  
  const duplicateKeys = getDuplicateKeys();

  // Convert params to/from JSON string - remove 'id' field and auto-format to match file content
  const paramsToJson = (items: ParamItem[]): string => {
    // Remove 'id' field before displaying (matching save logic)
    const itemsWithoutId = items.map(({ id, ...rest }) => rest);
    // Auto-format with 2-space indent to match file content
    return JSON.stringify(itemsWithoutId, null, 2);
  };

  const jsonToParams = (jsonStr: string): ParamItem[] => {
    console.log('[ParamTab] jsonToParams called');
    console.log('[ParamTab] jsonStr:', jsonStr);
    
    try {
      const parsed = JSON.parse(jsonStr);
      console.log('[ParamTab] JSON.parse succeeded, parsed:', parsed);
      
      // Handle array format (correct format)
      if (Array.isArray(parsed)) {
        console.log('[ParamTab] Parsed is array, converting to ParamItem[]');
        const result = parsed.map((item) => ({
          id: item.id || crypto.randomUUID(),
          key: item.key || '',
          value: item.value || '',
          enabled: item.enabled !== undefined ? item.enabled : true,
        }));
        console.log('[ParamTab] Converted result:', result);
        return result;
      }
      
      // Handle object format (legacy) - convert to array
      if (typeof parsed === 'object' && parsed !== null) {
        console.log('[ParamTab] Parsed is object, converting to ParamItem[]');
        const result = Object.entries(parsed).map(([key, value]) => ({
          id: crypto.randomUUID(),
          key,
          value: String(value),
          enabled: true,
        }));
        console.log('[ParamTab] Converted result:', result);
        return result;
      }
      
      console.warn('[ParamTab] Parsed value is neither array nor object, returning original params');
      return params; // Keep original if invalid
    } catch (err) {
      console.error('[ParamTab] JSON.parse failed:', err);
      console.log('[ParamTab] Returning original params (length:', params.length, ')');
      return params; // Keep original if parse error
    }
  };

  const handleRawChange = (newJson: string) => {
    console.log('[ParamTab] handleRawChange called');
    console.log('[ParamTab] newJson:', newJson);
    console.log('[ParamTab] targetId:', targetId);
    
    // Update local state immediately for responsive UI
    setRawJsonText(newJson);
    
    // Save raw JSON directly to database
    if (targetId) {
      console.log('[ParamTab] targetId exists, attempting to save raw JSON...');
      
      import('../../../../../../services/emulate-api.service').then(({ emulateApi }) => {
        console.log('[ParamTab] emulateApi imported, fetching requests...');
        
        emulateApi.listRequests(targetId).then((res) => {
          console.log('[ParamTab] listRequests response:', res);
          
          if (res.success && res.data && res.data.length > 0) {
            const req = res.data[0];
            console.log('[ParamTab] Found request:', req.id);
            console.log('[ParamTab] Calling updateRequest with raw JSON...');
            
            emulateApi.updateRequest(targetId, req.id, { params: newJson }).then((updateRes) => {
              console.log('[ParamTab] updateRequest response:', updateRes);
              
              if (updateRes.success) {
                console.log('[ParamTab] ✅ Raw JSON saved successfully');
                
                // Also try to parse and update params for table view
                // This is optional - table view will reload from DB when switched to
                try {
                  const parsed = JSON.parse(newJson);
                  if (Array.isArray(parsed)) {
                    const newParams = parsed.map((item) => ({
                      id: item.id || crypto.randomUUID(),
                      key: item.key || '',
                      value: item.value || '',
                      enabled: item.enabled !== undefined ? item.enabled : true,
                    }));
                    onChange(newParams);
                  }
                } catch {
                  // Ignore parse errors - table view will handle it
                  console.log('[ParamTab] JSON parse failed, table view will reload from DB');
                }
              } else {
                console.error('[ParamTab] ❌ Failed to save raw JSON:', updateRes.error);
              }
            }).catch((err) => {
              console.error('[ParamTab] ❌ updateRequest exception:', err);
            });
          } else {
            console.warn('[ParamTab] ⚠️ No requests found or response failed');
          }
        }).catch((err) => {
          console.error('[ParamTab] ❌ listRequests exception:', err);
        });
      }).catch((err) => {
        console.error('[ParamTab] ❌ Failed to import emulateApi:', err);
      });
    } else {
      console.log('[ParamTab] ⚠️ No targetId, skipping raw JSON save');
    }
  };

  // If raw view, render CodeBlock instead of table
  if (isRawView) {
    console.log('[ParamTab] Raw view - rawJsonText:', rawJsonText);
    console.log('[ParamTab] Raw view - isLoadingRawJson:', isLoadingRawJson);
    
    if (isLoadingRawJson) {
      return (
        <div key="raw-view" className="h-full w-full relative flex items-center justify-center">
          <div className="text-text-secondary">Loading...</div>
        </div>
      );
    }
    
    return (
      <div key="raw-view" className="h-full w-full relative">
        <div className="absolute inset-0">
          <CodeBlock
            ref={codeBlockRef}
            code={rawJsonText}
            onChange={readOnly ? undefined : handleRawChange}
            language="json"
            className="w-full h-full"
            showLineNumbers={false}
            wordWrap="on"
          />
        </div>
      </div>
    );
  }

  return (
    <div key="table-view" className="flex flex-col h-full relative">
      <div
        ref={measurerRef}
        className="absolute pointer-events-none"
        style={{
          visibility: 'hidden',
          top: -9999,
          left: -9999,
          whiteSpace: 'pre-wrap',
        }}
        aria-hidden="true"
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-60">
        <table className="w-full text-xs table-auto">
          <thead className="sticky top-0 bg-table-headerBg border-b border-border z-10">
            <tr>
              <th className="w-8 px-2 py-1.5 text-left text-text-secondary font-medium">#</th>
              <th className="w-[180px] px-2 py-1.5 text-left text-text-secondary font-medium">
                Key
              </th>
              <th className="px-2 py-1.5 text-left text-text-secondary font-medium">Value</th>
              <th className="w-16 px-2 py-1.5 text-center text-text-secondary font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {params.length === 0
              ? null
              : params.map((param) => {
                  const hasVar = hasPayloadVariable(param.value);
                  const match = hasVar ? param.value.match(/\$\{([^}]+)\}/) : null;
                  const firstPayloadName = match ? match[1] : null;
                  const varColor = firstPayloadName
                    ? getPayloadColorByName(firstPayloadName)
                    : hasVar
                      ? fallbackAccentColor
                      : undefined;

                  return (
                    <tr
                      key={param.id}
                      className={cn(
                        'border-b border-border/40 hover:bg-dropdown-item-hover/30 transition-colors',
                        !param.enabled && 'opacity-50',
                      )}
                    >
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => handleToggle(param.id)}
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-all',
                            readOnly && 'cursor-default',
                            param.enabled
                              ? 'bg-primary border-primary '
                              : 'border-border bg-background',
                          )}
                        >
                          {param.enabled && (
                            <Check className="w-2.5 h-2.5 stroke-[3] text-text-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="px-2 py-0">
                        <input
                          type="text"
                          value={param.key}
                          onChange={(e) => {
                            if (readOnly) return;
                            const updated = params.map((p) =>
                              p.id === param.id ? { ...p, key: e.target.value } : p,
                            );
                            onChange(updated);
                          }}
                          readOnly={readOnly}
                          className={cn(
                            "w-full bg-transparent px-1.5 py-1.5 text-sm text-text-primary outline-none font-mono",
                            duplicateKeys.has(param.key) && param.key.trim() && "outline outline-2 outline-dashed outline-warning"
                          )}
                          placeholder={placeholderKey}
                        />
                      </td>
                      <td className="px-2 py-0">
                        <div className="relative">
                          <div
                            ref={(el) => {
                              if (el) overlayRefs.current.set(param.id, el);
                              else overlayRefs.current.delete(param.id);
                            }}
                            className="absolute inset-0 px-1.5 py-1.5 text-sm font-mono leading-relaxed break-words whitespace-pre-wrap pointer-events-none overflow-hidden"
                            aria-hidden="true"
                          >
                            {highlightText(param.value, getPayloadColorByName)}
                          </div>
                          <textarea
                            ref={(el) => {
                              if (el) {
                                textareaRefs.current.set(param.id, el);
                                resizeTextarea(el);
                              } else {
                                textareaRefs.current.delete(param.id);
                              }
                            }}
                            value={param.value}
                            onChange={(e) => {
                              if (readOnly) return;
                              const newValue = e.target.value;
                              const updated = params.map((p) =>
                                p.id === param.id ? { ...p, value: newValue } : p,
                              );
                              onChange(updated);
                              requestAnimationFrame(() => {
                                const el = textareaRefs.current.get(param.id);
                                if (el) resizeTextarea(el);
                              });
                            }}
                            onInput={(e) => {
                              if (readOnly) return;
                              const target = e.target as HTMLTextAreaElement;
                              resizeTextarea(target);
                            }}
                            onScroll={(e) => {
                              const overlay = overlayRefs.current.get(param.id);
                              if (overlay) {
                                overlay.scrollTop = e.currentTarget.scrollTop;
                                overlay.scrollLeft = e.currentTarget.scrollLeft;
                              }
                            }}
                            onMouseEnter={(e) => handleMouseEnter(param.value, e)}
                            onMouseLeave={handleMouseLeave}
                            readOnly={readOnly}
                            className="w-full bg-transparent px-1.5 py-1.5 text-sm outline-none break-words resize-none font-mono leading-relaxed overflow-hidden relative"
                            style={{
                              color: 'transparent',
                              caretColor: varColor || 'var(--text-primary)',
                            }}
                            placeholder=""
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleDelete(param.id)}
                            disabled={readOnly}
                            className="p-1 rounded hover:bg-error/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete parameter"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-text-secondary hover:text-error" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            {!readOnly && (
              <tr className="border-b border-border/40 hover:bg-dropdown-item-hover/30 transition-colors">
                <td className="px-2 py-1.5"></td>
                <td className="px-2 py-0">
                  <input
                    type="text"
                    value={isFinalRowEditing ? finalKey : ''}
                    onChange={(e) => {
                      setFinalKey(e.target.value);
                      if (!isFinalRowEditing) setIsFinalRowEditing(true);
                    }}
                    onFocus={() => {
                      if (!isFinalRowEditing) setIsFinalRowEditing(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (finalKey.trim() || finalValue.trim())) {
                        handleAdd(finalKey, finalValue);
                        setFinalKey('');
                        setFinalValue('');
                        setIsFinalRowEditing(false);
                      } else if (e.key === 'Escape') {
                        setIsFinalRowEditing(false);
                        setFinalKey('');
                        setFinalValue('');
                      }
                    }}
                    onBlur={() => {
                      if (finalKey.trim() || finalValue.trim()) {
                        handleAdd(finalKey, finalValue);
                      }
                      setFinalKey('');
                      setFinalValue('');
                      setIsFinalRowEditing(false);
                    }}
                    className="w-full bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-secondary italic py-1.5 px-1.5"
                    placeholder="Key"
                  />
                </td>
                <td className="px-2 py-0">
                  <input
                    type="text"
                    value={isFinalRowEditing ? finalValue : ''}
                    onChange={(e) => {
                      if (!finalKey.trim()) return; // Ngăn chặn nhập nếu chưa có key
                      setFinalValue(e.target.value);
                      if (!isFinalRowEditing) setIsFinalRowEditing(true);
                    }}
                    onFocus={(e) => {
                      if (!finalKey.trim()) {
                        e.target.blur(); // Blur ngay nếu chưa có key
                        return;
                      }
                      if (!isFinalRowEditing) setIsFinalRowEditing(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && finalKey.trim() && finalValue.trim()) {
                        handleAdd(finalKey, finalValue);
                        setFinalKey('');
                        setFinalValue('');
                        setIsFinalRowEditing(false);
                      } else if (e.key === 'Escape') {
                        setIsFinalRowEditing(false);
                        setFinalKey('');
                        setFinalValue('');
                      }
                    }}
                    onBlur={() => {
                      if (finalKey.trim() && finalValue.trim()) {
                        handleAdd(finalKey, finalValue);
                      }
                      setFinalKey('');
                      setFinalValue('');
                      setIsFinalRowEditing(false);
                    }}
                    className="w-full bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-secondary italic py-1.5 px-1.5 break-words disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Value"
                    disabled={!finalKey.trim()}
                  />
                </td>
                <td className="px-2 py-1.5"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tooltip showing all payloads found in hovered value */}
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
              <div className="text-xs font-medium text-text-primary mb-2">
                Payloads in this value:
              </div>
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
                          <span className="font-mono text-[11px] font-medium" style={{ color }}>
                            {'${' + name + '}'}
                          </span>
                        </div>
                        {payload && payload.values.length > 0 ? (
                          <div className="text-[10px] text-text-secondary">
                            <span className="font-medium">{payload.values.length} values</span>
                            <div className="font-mono bg-background/50 rounded p-1 mt-0.5 max-h-20 overflow-y-auto">
                              {payload.values.slice(0, 5).map((v, i) => (
                                <div key={i} className="truncate">
                                  {v}
                                </div>
                              ))}
                              {payload.values.length > 5 && (
                                <div className="text-text-secondary italic">
                                  ... and {payload.values.length - 5} more
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-warning">
                            {'No values. '}
                            <button
                              onClick={onSwitchToPayload}
                              className="text-primary hover:underline"
                            >
                              Click to configure
                            </button>
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
    </div>
  );
}
