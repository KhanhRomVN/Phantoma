import { useState } from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { $ } from '@renderer/utils/color';

interface AddTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { identifier: string; type: string }) => void;
}

export default function AddTargetModal({ isOpen, onClose, onSubmit }: AddTargetModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [type, setType] = useState<'email' | 'domain' | 'username'>('email');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    onSubmit({ identifier: identifier.trim(), type });
    setIdentifier('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ 
          backgroundColor: $('--modal-background'), 
          borderColor: $('--border') 
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: $('--border') }}>
          <h2 className="text-lg font-semibold text-text-primary">Thêm Target Mới</h2>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-md hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              Loại dữ liệu
            </label>
            <div className="flex gap-2">
              {(['email', 'domain', 'username'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                    type === t 
                      ? "bg-primary/10 border-primary text-primary shadow-[0_0_10px_rgba(255,106,31,0.2)]" 
                      : "bg-transparent border-border text-text-secondary hover:border-text-secondary/50 hover:text-text-primary"
                  )}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="target-id" className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              Giá trị ({type})
            </label>
            <input
              id="target-id"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={type === 'email' ? 'user@example.com' : type === 'domain' ? 'example.com' : 'username'}
              className="w-full px-4 py-3 rounded-lg bg-input-background border border-focus-ring/20 focus:border-primary outline-none text-text-primary placeholder:text-text-secondary/50 transition-colors font-mono text-sm"
              autoFocus
            />
            <p className="text-xs text-text-secondary/60">
              Hệ thống sẽ tự động quét các nguồn OSINT liên quan đến giá trị này.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-white/5 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!identifier.trim()}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg",
                identifier.trim() 
                  ? "bg-button-solid-background text-button-solid-text hover:brightness-110 hover:shadow-primary/20" 
                  : "bg-muted text-text-secondary cursor-not-allowed opacity-50"
              )}
            >
              Bắt đầu Recon
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}