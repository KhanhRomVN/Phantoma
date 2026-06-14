import React from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  appName: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm, appName }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-[#1a1f2a] border border-[#1e2535] rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-5 pt-5 pb-3 border-b border-[#1e2535] flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/25 shrink-0">
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-text-primary">Delete Target</h3>
            <p className="text-xs text-text-secondary mt-0.5">This action cannot be undone</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-[#252a3a] text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <p className="text-sm text-text-primary mb-3">
              Are you sure you want to delete <span className="font-bold text-red-400">{appName}</span>?
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                This target will be permanently removed
              </li>
            </ul>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#1e2535] flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-[#252a3a] transition-colors">Cancel</button>
          <button onClick={handleConfirm} className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-all flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};