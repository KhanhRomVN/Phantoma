import { useState, useRef } from 'react';
import { Check, Edit, Trash2, Navigation } from 'lucide-react';
import { cn } from '../../../../../../../shared/lib/utils';
import { PayloadValueModal } from '../modal/PayloadValueModal';
import type { PayloadItem } from '../types';

interface PayloadTabProps {
  payloads: PayloadItem[];
  onChange: (payloads: PayloadItem[]) => void;
  onUpload?: (file: File) => void;
  onExport?: () => void;
  targetId?: string | null;
  onNavigateToVariable?: (payloadName: string) => void;
}

export function PayloadTab({
  payloads,
  onChange,
  targetId,
  onNavigateToVariable,
}: PayloadTabProps) {
  const [modalPayload, setModalPayload] = useState<PayloadItem | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  // Auto-resize textarea
  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  // Check for duplicate names
  const isDuplicateName = (name: string, currentId: string): boolean => {
    return payloads.some((p) => p.id !== currentId && p.name.toLowerCase() === name.toLowerCase());
  };

  const handleDelete = (id: string) => {
    onChange(payloads.filter((p) => p.id !== id));
  };

  const handleToggle = (id: string) => {
    onChange(payloads.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  const handleOpenModal = (payload: PayloadItem) => {
    setModalPayload(payload);
  };

  const handleSaveModalValues = (values: string[]) => {
    if (!modalPayload) return;
    onChange(payloads.map((p) => (p.id === modalPayload.id ? { ...p, values } : p)));
    setModalPayload(null);
  };

  const handleNavigate = (payloadName: string) => {
    if (onNavigateToVariable && payloadName) {
      onNavigateToVariable(payloadName);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs table-auto">
          <thead className="sticky top-0 bg-table-headerBg border-b border-border z-10">
            <tr>
              <th className="w-8 px-2 py-1.5 text-left text-text-secondary font-medium">#</th>
              <th className="min-w-[120px] px-2 py-1.5 text-left text-text-secondary font-medium">
                Name
              </th>
              <th className="px-2 py-1.5 text-left text-text-secondary font-medium">Values</th>
              <th className="w-16 px-2 py-1.5 text-center text-text-secondary font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {payloads.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-2 py-8 text-center text-xs text-text-secondary italic"
                >
                  No payloads yet. Use <code className="bg-background px-1 rounded">{'${name}'}</code>{' '}
                  in Params/Headers/Body to auto-create payloads.
                </td>
              </tr>
            ) : (
              payloads.map((payload) => {
                const hasDuplicateName = isDuplicateName(payload.name, payload.id);

                return (
                  <tr
                    key={payload.id}
                    className={cn(
                      'border-b border-border/40 hover:bg-dropdown-item-hover/30 transition-colors',
                      !payload.enabled && 'opacity-50',
                    )}
                  >
                    <td className="px-2 py-1.5 align-top">
                      <button
                        onClick={() => handleToggle(payload.id)}
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center transition-all',
                          payload.enabled
                            ? 'bg-primary border-primary text-text-foreground'
                            : 'border-border bg-background',
                        )}
                      >
                        {payload.enabled && (
                          <Check className="w-2.5 h-2.5 stroke-[3] text-text-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-0">
                      <div className="relative">
                        <textarea
                          ref={(el) => {
                            if (el) {
                              textareaRefs.current.set(`${payload.id}-name`, el);
                              resizeTextarea(el);
                            }
                          }}
                          value={payload.name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            onChange(
                              payloads.map((p) =>
                                p.id === payload.id ? { ...p, name: newName } : p,
                              ),
                            );
                            setTimeout(() => {
                              const el = textareaRefs.current.get(`${payload.id}-name`);
                              if (el) resizeTextarea(el);
                            }, 0);
                          }}
                          className={cn(
                            'w-full bg-transparent px-1.5 py-1.5 text-xs outline-none resize-none font-medium overflow-hidden',
                            hasDuplicateName ? 'text-error' : 'text-text-primary',
                          )}
                          placeholder="Payload name..."
                          rows={1}
                        />
                        {hasDuplicateName && (
                          <div className="absolute -bottom-4 left-0 text-[10px] text-error">
                            ⚠️ Duplicate name
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => handleOpenModal(payload)}
                        className="w-full text-left px-1.5 py-1 rounded hover:bg-dropdown-item-hover/50 transition-colors group flex items-center justify-between"
                      >
                        <span className="font-mono text-[11px] text-text-primary truncate flex-1">
                          {payload.values.length > 0 ? (
                            `${payload.values.slice(0, 3).join(', ')}${payload.values.length > 3 ? '...' : ''}`
                          ) : (
                            <span className="text-text-secondary italic">Click to add values</span>
                          )}
                        </span>
                        <Edit className="w-3 h-3 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                      </button>
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleNavigate(payload.name)}
                          disabled={!payload.name}
                          className="p-1 rounded hover:bg-dropdown-item-hover transition-colors disabled:opacity-30"
                          title={
                            payload.name
                              ? `Go to \${${payload.name}} in request`
                              : 'Name is empty'
                          }
                        >
                          <Navigation className="w-3.5 h-3.5 text-text-secondary hover:text-primary" />
                        </button>
                        <button
                          onClick={() => handleDelete(payload.id)}
                          className="p-1 rounded hover:bg-error/10 transition-colors"
                          title="Delete payload"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-text-secondary hover:text-error" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Payload Value Modal */}
      {modalPayload && (
        <PayloadValueModal
          isOpen={true}
          onClose={() => setModalPayload(null)}
          payloadName={modalPayload.name || 'Unnamed Payload'}
          currentValues={modalPayload.values}
          onSave={handleSaveModalValues}
          targetId={targetId}
        />
      )}
    </div>
  );
}