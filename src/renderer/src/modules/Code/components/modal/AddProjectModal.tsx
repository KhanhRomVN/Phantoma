/**
 * ------------------------------------------------------------------
 * AddProjectModal — Multi-view modal for adding a project
 * ------------------------------------------------------------------
 * View 1 ("select"): Choose between Browse Folder or Clone from URL
 * View 2 ("clone"): Form with Git URL + Parent folder fields
 * ------------------------------------------------------------------
 */

import { useState } from 'react';
import { FolderOpen, Globe, ArrowLeft } from 'lucide-react';
import { Modal, ModalHeader, ModalBody } from '@renderer/components/ui/Modal';
import { cn } from '@renderer/shared/utils/cn';
import { logger } from '@renderer/utils/logger';

type View = 'select' | 'clone';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddProjectModal({ isOpen, onClose }: AddProjectModalProps) {
  const [view, setView] = useState<View>('select');
  const [gitUrl, setGitUrl] = useState('');
  const [parentFolder, setParentFolder] = useState('');

  const handleClose = () => {
    // Reset state on close
    setView('select');
    setGitUrl('');
    setParentFolder('');
    onClose();
  };

  const handleBrowseFolder = () => {
    logger.info('[AddProjectModal] Browse folder clicked (stub)');
    handleClose();
  };

  const handleCloneSubmit = () => {
    if (!gitUrl.trim()) return;
    logger.info('[AddProjectModal] Clone submitted', { gitUrl, parentFolder });
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {view === 'select' ? (
        <>
          <ModalHeader title="Add a project" onClose={handleClose} />
          <ModalBody className="pb-5">
            {/* Option 1: Browse Folder */}
            <button
              onClick={handleBrowseFolder}
              className="w-full flex items-start gap-3 p-4 rounded-lg border border-border hover:border-[rgba(255,106,31,0.4)] hover:bg-sidebar-item-hover transition-colors text-left cursor-pointer group"
            >
              <span className="shrink-0 w-9 h-9 rounded-lg bg-sidebar-item-hover flex items-center justify-center text-text-secondary group-hover:text-[#ff6a1f] transition-colors">
                <FolderOpen className="w-4.5 h-4.5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-text-primary">
                  Browse folder
                </span>
                <span className="block text-xs text-text-secondary mt-0.5">
                  Local project, Git repo or folder with many repos
                </span>
              </span>
            </button>

            {/* Divider label */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-divider" />
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-text-secondary/50">
                Other
              </span>
              <div className="flex-1 h-px bg-divider" />
            </div>

            {/* Option 2: Clone from URL */}
            <button
              onClick={() => setView('clone')}
              className="w-full flex items-start gap-3 p-4 rounded-lg border border-border hover:border-[rgba(255,106,31,0.4)] hover:bg-sidebar-item-hover transition-colors text-left cursor-pointer group"
            >
              <span className="shrink-0 w-9 h-9 rounded-lg bg-sidebar-item-hover flex items-center justify-center text-text-secondary group-hover:text-[#ff6a1f] transition-colors">
                <Globe className="w-4.5 h-4.5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-text-primary">
                  Clone from URL
                </span>
                <span className="block text-xs text-text-secondary mt-0.5">
                  Paste a Git repository URL to clone locally
                </span>
              </span>
            </button>
          </ModalBody>
        </>
      ) : (
        <>
          <ModalHeader title="Clone from URL" onClose={handleClose} />
          <ModalBody className="pb-5">
            {/* Back button */}
            <button
              onClick={() => setView('select')}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            {/* Git URL field */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Git URL
              </label>
              <input
                type="text"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg outline-none text-text-primary placeholder:text-text-tertiary focus:border-[rgba(255,106,31,0.5)] transition-colors"
                autoFocus
              />
            </div>

            {/* Parent folder field */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Parent folder
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={parentFolder}
                  onChange={(e) => setParentFolder(e.target.value)}
                  placeholder="/home/user/projects"
                  className="flex-1 px-3 py-2 text-sm bg-input-background border border-border rounded-lg outline-none text-text-primary placeholder:text-text-tertiary focus:border-[rgba(255,106,31,0.5)] transition-colors"
                />
                <button
                  onClick={() => logger.info('[AddProjectModal] Pick folder (stub)')}
                  className="shrink-0 px-3 py-2 text-sm bg-sidebar-item-hover border border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-border/40 transition-colors cursor-pointer"
                  title="Pick folder"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              disabled={!gitUrl.trim()}
              onClick={handleCloneSubmit}
              className={cn(
                'w-full py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer',
                gitUrl.trim()
                  ? 'bg-[#ff6a1f] text-white hover:bg-[#e55d18]'
                  : 'bg-sidebar-item-hover text-text-secondary/50 cursor-not-allowed',
              )}
            >
              Clone repository
            </button>
          </ModalBody>
        </>
      )}
    </Modal>
  );
}

export default AddProjectModal;