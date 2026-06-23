import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';

interface PayloadItem {
  id: string;
  name: string;
  description: string;
  values: string[];
  enabled: boolean;
}

interface PayloadTableProps {
  payloads: PayloadItem[];
  onChange: (payloads: PayloadItem[]) => void;
  onUpload?: (file: File) => void;
  onExport?: () => void;
}

export function PayloadTable({ payloads, onChange, onUpload, onExport }: PayloadTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editValues, setEditValues] = useState('');

  const handleAdd = () => {
    const newPayload: PayloadItem = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      values: [],
      enabled: true,
    };
    onChange([...payloads, newPayload]);
    setEditingId(newPayload.id);
    setEditName('');
    setEditDescription('');
    setEditValues('');
  };

  const handleDelete = (id: string) => {
    onChange(payloads.filter((p) => p.id !== id));
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

  const handleStartEdit = (payload: PayloadItem) => {
    setEditingId(payload.id);
    setEditName(payload.name);
    setEditDescription(payload.description);
    setEditValues(payload.values.join(', '));
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const valuesArray = editValues
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v);
    onChange(
      payloads.map((p) =>
        p.id === editingId
          ? {
              ...p,
              name: editName,
              description: editDescription,
              values: valuesArray,
            }
          : p,
      ),
    );
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    const editingPayload = payloads.find((p) => p.id === editingId);
    if (
      editingPayload &&
      !editingPayload.name &&
      !editingPayload.description &&
      editingPayload.values.length === 0
    ) {
      onChange(payloads.filter((p) => p.id !== editingId));
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const totalEnabled = payloads.filter((p) => p.enabled).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-table-headerBg border-b border-border z-10">
            <tr>
              <th className="w-8 px-2 py-1.5 text-left text-text-secondary font-medium">#</th>
              <th className="px-2 py-1.5 text-left text-text-secondary font-medium">Name</th>
              <th className="px-2 py-1.5 text-left text-text-secondary font-medium">Description</th>
              <th className="px-2 py-1.5 text-left text-text-secondary font-medium">Values</th>
            </tr>
          </thead>
          <tbody>
            {payloads.length === 0 ? null : (
              payloads.map((payload) => {
                const isEditing = editingId === payload.id;

                return (
                  <tr
                    key={payload.id}
                    className={cn(
                      'border-b border-border/40 hover:bg-dropdown-item-hover/30 transition-colors',
                      !payload.enabled && 'opacity-50',
                    )}
                  >
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => handleToggle(payload.id)}
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center transition-all',
                          payload.enabled
                            ? 'bg-primary border-primary text-text-foreground'
                            : 'border-border bg-background ',
                        )}
                      >
                        {payload.enabled && (
                          <Check className="w-2.5 h-2.5 stroke-[3] text-text-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="w-full bg-input-background border border-primary/50 rounded px-1.5 py-0.5 text-xs text-text-primary outline-none"
                          placeholder="Payload name..."
                          autoFocus
                        />
                      ) : (
                        <span className="text-text-primary font-medium">
                          {payload.name || (
                            <span className="text-text-secondary italic">(unnamed)</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="w-full bg-input-background border border-primary/50 rounded px-1.5 py-0.5 text-xs text-text-primary outline-none"
                          placeholder="Short description..."
                        />
                      ) : (
                        <span className="text-text-secondary text-[11px]">
                          {payload.description || (
                            <span className="text-text-secondary italic">(no description)</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues}
                          onChange={(e) => setEditValues(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="w-full bg-input-background border border-primary/50 rounded px-1.5 py-0.5 text-xs font-mono text-text-primary outline-none"
                          placeholder="value1, value2, value3..."
                        />
                      ) : (
                        <span
                          className="font-mono text-text-primary text-[11px] truncate block max-w-[200px]"
                          title={payload.values.join(', ')}
                        >
                          {payload.values.length > 0 ? (
                            payload.values.slice(0, 5).join(', ') +
                            (payload.values.length > 5
                              ? `... (+${payload.values.length - 5} more)`
                              : '')
                          ) : (
                            <span className="text-text-secondary italic">(no values)</span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
