import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';

interface ParamItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface ParamTableProps {
  params: ParamItem[];
  onChange: (params: ParamItem[]) => void;
  placeholderKey?: string;
  placeholderValue?: string;
}

export function ParamTable({
  params,
  onChange,
  placeholderKey = 'Key',
  placeholderValue = 'Value',
}: ParamTableProps) {
  const [isFinalRowEditing, setIsFinalRowEditing] = useState(false);
  const [finalKey, setFinalKey] = useState('');
  const [finalValue, setFinalValue] = useState('');
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const measurerRef = useRef<HTMLDivElement>(null);

  // Resize all textareas after render
  useEffect(() => {
    textareaRefs.current.forEach((el) => {
      resizeTextarea(el);
    });
  }, [params]);

  // Function to resize a single textarea using hidden measurer
  const resizeTextarea = (el: HTMLTextAreaElement) => {
    if (!measurerRef.current) return;
    
    // Set measurer width to match textarea exactly
    const textareaWidth = el.offsetWidth;
    measurerRef.current.style.width = textareaWidth + 'px';
    
    // Copy the text to measurer div
    measurerRef.current.textContent = el.value || el.placeholder;
    
    // Get the actual rendered height
    const measuredHeight = measurerRef.current.offsetHeight;
    
    console.log('🔍 Measurer Debug:', {
      value: el.value.substring(0, 40) + (el.value.length > 40 ? '...' : ''),
      valueLength: el.value.length,
      textareaWidth,
      measuredHeight,
      oldHeight: el.style.height,
      measuredScrollHeight: measurerRef.current.scrollHeight
    });
    
    el.style.height = measuredHeight + 'px';
  };

  const handleAdd = (key: string, value: string) => {
    const newParam: ParamItem = {
      id: crypto.randomUUID(),
      key: key.trim(),
      value: value.trim(),
      enabled: true,
    };
    onChange([...params, newParam]);
  };

  const handleDelete = (id: string) => {
    onChange(params.filter((p) => p.id !== id));
  };

  const handleToggle = (id: string) => {
    onChange(params.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hidden measurer div - same styling as textarea */}
      <div
        ref={measurerRef}
        className="absolute invisible px-1.5 py-1.5 text-xs font-mono leading-relaxed break-words whitespace-pre-wrap pointer-events-none"
        style={{ 
          wordBreak: 'break-word',
          top: -9999,
          left: -9999
        }}
        aria-hidden="true"
      />
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full text-xs table-auto">
          <thead className="sticky top-0 bg-table-headerBg border-b border-border z-10">
            <tr>
              <th className="w-8 px-2 py-1.5 text-left text-text-secondary font-medium">#</th>
              <th className="px-2 py-1.5 text-left text-text-secondary font-medium">Key</th>
              <th className="px-2 py-1.5 text-left text-text-secondary font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {params.length === 0 ? null : (
              params.map((param) => {
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
                          const updated = params.map((p) =>
                            p.id === param.id ? { ...p, key: e.target.value } : p
                          );
                          onChange(updated);
                        }}
                        className="w-full bg-transparent px-1.5 py-1.5 text-xs text-text-primary outline-none font-mono"
                        placeholder={placeholderKey}
                      />
                    </td>
                    <td className="px-2 py-0">
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
                          const updated = params.map((p) =>
                            p.id === param.id ? { ...p, value: e.target.value } : p
                          );
                          onChange(updated);
                          // Resize after state update
                          requestAnimationFrame(() => {
                            const el = textareaRefs.current.get(param.id);
                            if (el) resizeTextarea(el);
                          });
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          resizeTextarea(target);
                        }}
                        className="w-full bg-transparent px-1.5 py-1.5 text-xs text-text-primary outline-none break-words resize-none font-mono leading-relaxed overflow-hidden"
                        placeholder={placeholderValue}
                      />
                    </td>
                  </tr>
                );
              })
            )}
            {/* Final row with placeholders - inline input style */}
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
                  className="w-full bg-transparent border-none outline-none text-xs text-text-primary placeholder:text-text-secondary italic py-1.5"
                  placeholder="Key"
                />
              </td>
              <td className="px-2 py-0">
                <input
                  type="text"
                  value={isFinalRowEditing ? finalValue : ''}
                  onChange={(e) => {
                    setFinalValue(e.target.value);
                    if (!isFinalRowEditing) setIsFinalRowEditing(true);
                  }}
                  onFocus={() => {
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
                  className="w-full bg-transparent border-none outline-none text-xs text-text-primary placeholder:text-text-secondary italic py-1.5 break-words"
                  placeholder="Value"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
