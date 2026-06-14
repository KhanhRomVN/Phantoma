import React from 'react';
import { X, AlertTriangle, Trash2, Globe } from 'lucide-react';

interface ConfirmLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAndLaunch: () => void;
  onKeepAndLaunch: () => void;
  appName: string;
}

export const ConfirmLaunchModal: React.FC<ConfirmLaunchModalProps> = ({ isOpen, onClose, onClearAndLaunch, onKeepAndLaunch, appName }) => {
  if (!isOpen) return null;

  const handleClearAndLaunch = () => {
    onClearAndLaunch();
    onClose();
  };

  const handleKeepAndLaunch = () => {
    onKeepAndLaunch();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-[#1a1f2a] border border-[#1e2535] rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-5 pt-5 pb-3 border-b border-[#1e2535] flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/25 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-text-primary">Active Session Detected</h3>
            <p className="text-xs text-text-secondary mt-0.5">You're about to launch {appName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-[#252a3a] text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <p className="text-sm text-text-primary mb-3">
              There is already an active tracking session for another target. Launching <span className="font-bold text-amber-400">{appName}</span> will:
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400">Clear current session data</span> and start fresh
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Keep current session data</span> and launch alongside
              </li>
            </ul>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#1e2535] flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-[#252a3a] transition-colors">Cancel</button>
          <button onClick={handleClearAndLaunch} className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-all flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5" />
            Clear & Launch
          </button>
          <button onClick={handleKeepAndLaunch} className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            Keep & Launch
          </button>
        </div>
      </div>
    </div>
  );
};