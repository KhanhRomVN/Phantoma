import { useState, useRef } from 'react';
import { Check, Plus, Edit } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { PayloadValueModal } from './PayloadValueModal';

interface PayloadItem {
  id: string;
  name: string;
  description: string;
  values: string[];
  enabled: boolean;
}

interface PayloadTemplate {
  id: string;
  name: string;
  description: string;
  generator: () => string[];
}

const payloadTemplates: PayloadTemplate[] = [
  {
    id: 'integer-range',
    name: 'Integer Range',
    description: 'Generate integers from start to end',
    generator: () => {
      const start = parseInt(prompt('Start number:', '1') || '1');
      const end = parseInt(prompt('End number:', '100') || '100');
      return Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
    },
  },
  {
    id: 'odd-numbers',
    name: 'Odd Numbers',
    description: 'Generate odd numbers in range',
    generator: () => {
      const start = parseInt(prompt('Start number:', '1') || '1');
      const end = parseInt(prompt('End number:', '100') || '100');
      return Array.from({ length: Math.ceil((end - start + 1) / 2) }, (_, i) =>
        String(start + i * 2),
      ).filter((n) => parseInt(n) % 2 === 1);
    },
  },
  {
    id: 'even-numbers',
    name: 'Even Numbers',
    description: 'Generate even numbers in range',
    generator: () => {
      const start = parseInt(prompt('Start number:', '0') || '0');
      const end = parseInt(prompt('End number:', '100') || '100');
      return Array.from({ length: Math.ceil((end - start + 1) / 2) }, (_, i) =>
        String(start + i * 2),
      ).filter((n) => parseInt(n) % 2 === 0);
    },
  },
  {
    id: 'lowercase-az',
    name: 'Lowercase a-z',
    description: 'Generate lowercase letters',
    generator: () => Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)),
  },
  {
    id: 'uppercase-az',
    name: 'Uppercase A-Z',
    description: 'Generate uppercase letters',
    generator: () => Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
  },
  {
    id: 'digits-09',
    name: 'Digits 0-9',
    description: 'Generate single digits',
    generator: () => Array.from({ length: 10 }, (_, i) => String(i)),
  },
  {
    id: 'special-chars',
    name: 'Special Characters',
    description: 'Common special characters',
    generator: () => [
      '!',
      '@',
      '#',
      '$',
      '%',
      '^',
      '&',
      '*',
      '(',
      ')',
      '-',
      '_',
      '=',
      '+',
      '[',
      ']',
      '{',
      '}',
      ';',
      ':',
      "'",
      '"',
      ',',
      '.',
      '<',
      '>',
      '/',
      '?',
      '\\',
      '|',
      '`',
      '~',
    ],
  },
];

interface PayloadTableProps {
  payloads: PayloadItem[];
  onChange: (payloads: PayloadItem[]) => void;
  onUpload?: (file: File) => void;
  onExport?: () => void;
  targetId?: string | null;
}

export function PayloadTable({ payloads, onChange, targetId }: PayloadTableProps) {
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [modalPayload, setModalPayload] = useState<PayloadItem | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  // Debug log removed to prevent spam

  // Auto-resize textarea
  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  // Check for duplicate names
  const isDuplicateName = (name: string, currentId: string): boolean => {
    return payloads.some((p) => p.id !== currentId && p.name.toLowerCase() === name.toLowerCase());
  };

  const handleAdd = () => {
    const newPayload: PayloadItem = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      values: [],
      enabled: true,
    };
    onChange([...payloads, newPayload]);
  };

  const handleAddFromTemplate = (template: PayloadTemplate) => {
    const values = template.generator();
    const newPayload: PayloadItem = {
      id: crypto.randomUUID(),
      name: template.name,
      description: template.description,
      values,
      enabled: true,
    };
    onChange([...payloads, newPayload]);
    setShowTemplateMenu(false);
  };

  const handleDeleteAll = () => {
    if (payloads.length === 0) return;
    if (confirm('Delete all payloads?')) {
      onChange([]);
    }
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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0 bg-table-headerBg">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Custom
          </button>
          <div className="relative">
            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              Templates
            </button>
            {showTemplateMenu && (
              <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-background border border-border rounded-lg shadow-xl z-50 py-1">
                {payloadTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleAddFromTemplate(template)}
                    className="w-full text-left px-3 py-2 hover:bg-dropdown-item-hover transition-colors"
                  >
                    <div className="text-xs font-medium text-text-primary">{template.name}</div>
                    <div className="text-[10px] text-text-secondary mt-0.5">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleDeleteAll}
          disabled={payloads.length === 0}
          className="text-xs text-text-secondary hover:text-error transition-colors disabled:opacity-30"
        >
          Clear All
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs table-auto">
          <thead className="sticky top-0 bg-table-headerBg border-b border-border z-10">
            <tr>
              <th className="w-8 px-2 py-1.5 text-left text-text-secondary font-medium">#</th>
              <th className="min-w-[120px] px-2 py-1.5 text-left text-text-secondary font-medium">
                Name
              </th>
              <th className="min-w-[150px] px-2 py-1.5 text-left text-text-secondary font-medium">
                Description
              </th>
              <th className="px-2 py-1.5 text-left text-text-secondary font-medium">Values</th>
            </tr>
          </thead>
          <tbody>
            {payloads.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-2 py-8 text-center text-xs text-text-secondary italic"
                >
                  No payloads yet. Click "Add Custom" or choose a template.
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
                    <td className="px-2 py-0">
                      <textarea
                        ref={(el) => {
                          if (el) {
                            textareaRefs.current.set(`${payload.id}-desc`, el);
                            resizeTextarea(el);
                          }
                        }}
                        value={payload.description}
                        onChange={(e) => {
                          onChange(
                            payloads.map((p) =>
                              p.id === payload.id ? { ...p, description: e.target.value } : p,
                            ),
                          );
                          setTimeout(() => {
                            const el = textareaRefs.current.get(`${payload.id}-desc`);
                            if (el) resizeTextarea(el);
                          }, 0);
                        }}
                        className="w-full bg-transparent px-1.5 py-1.5 text-xs text-text-secondary outline-none resize-none overflow-hidden"
                        placeholder="Description..."
                        rows={1}
                      />
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
