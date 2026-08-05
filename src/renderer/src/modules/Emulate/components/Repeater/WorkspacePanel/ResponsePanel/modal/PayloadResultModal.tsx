import { useState, useEffect, useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../../../../components/ui/Modal';
import { CodeBlock, CodeBlockRef } from '../../../../../../../components/common/CodeBlock';
import { cn } from '../../../../../../../shared/lib/utils';
import type { RunResult } from '../../RequestPanel/types';

interface PayloadResultModalProps {
  isOpen: boolean;
  results: RunResult[];
  onClose: () => void;
  onSave?: () => void;
}

function PayloadCard({
  result,
  index,
  isSelected,
  onClick,
}: {
  result: RunResult;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2 border-b border-border/40 transition-colors flex items-center gap-3',
        isSelected
          ? 'bg-primary/10 border-l-2 border-l-primary'
          : 'hover:bg-dropdown-item-hover/30 border-l-2 border-l-transparent',
      )}
    >
      <span className="text-sm text-text-secondary w-8 shrink-0">#{index + 1}</span>
      <span
        className={cn(
          'px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0',
          result.status >= 200 && result.status < 400
            ? 'bg-success/20 text-success'
            : 'bg-error/20 text-error',
        )}
      >
        {result.status || 'ERR'}
      </span>
      <span className="text-[11px] text-text-secondary ml-auto">{result.duration}ms</span>
    </button>
  );
}

export function PayloadResultModal({ isOpen, results, onClose, onSave }: PayloadResultModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeReqTab, setActiveReqTab] = useState<'params' | 'headers' | 'body'>('headers');
  const [activeResTab, setActiveResTab] = useState<'headers' | 'body'>('headers');
  const requestBodyRef = useRef<CodeBlockRef>(null);
  const responseBodyRef = useRef<CodeBlockRef>(null);

  console.log('[DEBUG] PayloadResultModal render, results:', results.length, 'isOpen:', isOpen);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Auto-format code when selected result changes
  useEffect(() => {
    const timer = setTimeout(() => {
      requestBodyRef.current?.format();
      responseBodyRef.current?.format();
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedIndex]);

  // Auto-format Monaco editor on mount (handles tab-switch where useEffect above doesn't retrigger)
  const handleEditorMounted = (editor: any) => {
    setTimeout(() => {
      editor.getAction('editor.action.formatDocument')?.run();
    }, 50);
  };

  const selected = results[selectedIndex];
  const requestHeaders = selected?.requestHeaders || {};
  const responseHeaders = selected?.responseHeaders || {};
  const urlParams = selected?.params || {};

  // Build a map of all payload names to values from results for substitution display
  const payloadValueMap: Record<string, string[]> = {};
  results.forEach((r) => {
    if (r.payloadName) {
      if (!payloadValueMap[r.payloadName]) payloadValueMap[r.payloadName] = [];
      if (!payloadValueMap[r.payloadName].includes(r.value)) {
        payloadValueMap[r.payloadName].push(r.value);
      }
    }
  });

  // Render a value with payload substitution hints
  const renderSubstitutedValue = (value: string): React.ReactNode => {
    if (!value) return <span className="italic text-text-secondary">(empty)</span>;
    const parts = value.split(/(\$\{[^}]+\})/g);
    return parts.map((part, i) => {
      const match = part.match(/^\$\{([^}]+)\}$/);
      if (match) {
        const varName = match[1];
        const allValues = payloadValueMap[varName];
        // If this variable matches the current selected payload, show its actual value
        if (selected && varName === selected.payloadName) {
          const tooltipText = 'Variable: ' + varName + ' | All values: ' + (allValues ? allValues.join(', ') : 'none');
          return (
            <span
              key={i}
              className="text-primary font-medium cursor-default"
              title={tooltipText}
            >
              {selected.value}
            </span>
          );
        }
        // Other variables: keep the pattern, amber color
        const tooltipText = allValues
          ? 'Variable: ' + varName + ' | All values: ' + allValues.join(', ')
          : 'Unsubstituted variable: ' + varName;
        return (
          <span
            key={i}
            className="text-amber-400 cursor-default"
            title={tooltipText}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const okCount = results.filter((r) => r.status >= 200 && r.status < 400).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl h-[83.33vh]">
      <ModalHeader
        title="Payload Results"
        description={`${results.length} requests — ${okCount} OK`}
        onClose={onClose}
      />
      <ModalBody className="p-0 flex">
        {/* ========== LEFT PANEL — Payload cards ========== */}
        <div className="w-52 shrink-0 border-r border-border overflow-y-auto bg-muted/5">
          {results.map((result, index) => (
            <PayloadCard
              key={`${result.payloadName}-${result.value}-${index}`}
              result={result}
              index={index}
              isSelected={index === selectedIndex}
              onClick={() => setSelectedIndex(index)}
            />
          ))}
        </div>

        {/* ========== RIGHT PANEL ========== */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selected && (
            <>
              {/* URL Bar */}
              <div className="flex items-center shrink-0 border-b border-border bg-muted/5">
                <span
                  className={cn(
                    'px-2 py-1 text-[11px] font-bold font-mono uppercase shrink-0',
                    selected.method === 'GET' && 'text-emerald-400',
                    selected.method === 'POST' && 'text-blue-400',
                    selected.method === 'PUT' && 'text-amber-400',
                    selected.method === 'DELETE' && 'text-red-400',
                  )}
                >
                  {selected.method || 'GET'}
                </span>
                <input
                  value={selected.url || ''}
                  readOnly
                  className="flex-1 bg-transparent px-2 py-1 text-sm font-mono text-text-primary outline-none"
                />
              </div>

              {/* REQUEST section */}
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center border-b border-border shrink-0 bg-table-headerBg/30">
                  {(['params', 'headers', 'body'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveReqTab(tab)}
                      className={cn(
                        'px-3 py-1 text-xs font-medium border-b-2 transition-all capitalize',
                        activeReqTab === tab
                          ? 'border-primary text-text-primary'
                          : 'border-transparent text-text-secondary hover:text-text-primary',
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                  {activeReqTab === 'params' && (
                    <table className="w-full text-xs">
                      <tbody>
                        {Object.entries(urlParams).length === 0 ? (
                          <tr>
                            <td className="px-3 py-4 text-text-secondary text-center italic">
                              No query params
                            </td>
                          </tr>
                        ) : (
                          Object.entries(urlParams).map(([k, v]) => (
                            <tr key={k} className="border-b border-border/30">
                              <td className="px-3 py-1.5 text-text-secondary font-medium w-1/3">
                                {k}
                              </td>
                              <td className="px-3 py-1.5 text-text-primary font-mono">{renderSubstitutedValue(v)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                  {activeReqTab === 'headers' && (
                    <table className="w-full text-xs">
                      <tbody>
                        {Object.entries(requestHeaders).length === 0 ? (
                          <tr>
                            <td className="px-3 py-4 text-text-secondary text-center italic">
                              No headers
                            </td>
                          </tr>
                        ) : (
                          Object.entries(requestHeaders).map(([k, v]) => (
                            <tr key={k} className="border-b border-border/30">
                              <td className="px-3 py-1.5 text-text-secondary font-medium w-1/3">
                                {k}
                              </td>
                              <td className="px-3 py-1.5 text-text-primary font-mono break-all">
                                {renderSubstitutedValue(v)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                  {activeReqTab === 'body' && (
                    <div className="p-2 h-full">
                      <CodeBlock
                        ref={requestBodyRef}
                        code={selected.requestBody || ''}
                        language="json"
                        className="h-full"
                        wordWrap="on"
                        onEditorMounted={handleEditorMounted}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* RESPONSE section */}
              <div className="flex-1 min-h-0 flex flex-col border-t border-border">
                <div className="flex items-center border-b border-border shrink-0 bg-table-headerBg/30">
                  {(['headers', 'body'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveResTab(tab)}
                      className={cn(
                        'px-3 py-1 text-xs font-medium border-b-2 transition-all capitalize',
                        activeResTab === tab
                          ? 'border-primary text-text-primary'
                          : 'border-transparent text-text-secondary hover:text-text-primary',
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                  {activeResTab === 'headers' && (
                    <table className="w-full text-xs">
                      <tbody>
                        {Object.entries(responseHeaders).length === 0 ? (
                          <tr>
                            <td className="px-3 py-4 text-text-secondary text-center italic">
                              No headers
                            </td>
                          </tr>
                        ) : (
                          Object.entries(responseHeaders).map(([k, v]) => (
                            <tr key={k} className="border-b border-border/30">
                              <td className="px-3 py-1.5 text-text-secondary font-medium w-1/3">
                                {k}
                              </td>
                              <td className="px-3 py-1.5 text-text-primary font-mono break-all">
                                {renderSubstitutedValue(v)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                  {activeResTab === 'body' && (
                    <div className="p-2 h-full">
                      <CodeBlock
                        ref={responseBodyRef}
                        code={selected.responseBody || ''}
                        language="json"
                        className="h-full"
                        wordWrap="on"
                        onEditorMounted={handleEditorMounted}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </ModalBody>

      {onSave && (
        <ModalFooter>
          <span className="text-xs text-text-secondary mr-auto self-center">
            Do you want to save this session?
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-secondary hover:bg-dropdown-item-hover/30 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              console.log('[DEBUG] Save button clicked in PayloadResultModal');
              onSave();
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Save to History
          </button>
        </ModalFooter>
      )}
    </Modal>
  );
}