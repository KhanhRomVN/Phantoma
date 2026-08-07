import { useEffect, useRef, useState } from 'react';
import { useCodeStore } from './hooks/useCodeStore';
import { ProjectTabBar } from './components/ProjectTabBar';
import { OpenProjectModal, scanDirectory } from './components/ProjectTabBar/OpenProjectModal';
import { NewProjectModal } from './components/ProjectTabBar/NewProjectModal';
import { ServiceTabBar } from './components/ServiceTabBar';
import { ContentPanel } from './components/ContentPanel';
import { ActivityPanel } from './components/ActivityPanel';
import { BottomPanel } from './components/BottomPanel';
import { ToastContainer } from './components/common/ToastContainer';
import { FooterBar } from './components/FooterBar';
import { useLSPNotifier } from './hooks/useLSPNotifier';
import { SaveConfirmModal } from './components/modal/SaveConfirmModal';
import { QuickOpenModal } from './components/modal/QuickOpenModal';

export function Code() {
  const {
    isProjectManagerOpen,
    setProjectManagerOpen,
    isNewProjectOpen,
    setNewProjectOpen,
    projects,
    hydrateProjectFiles,
    hasUnsavedChanges,
  } = useCodeStore();
  const hydratedRef = useRef(false);
  const [isQuickOpenOpen, setQuickOpenOpen] = useState(false);

  useLSPNotifier();

  // Prevent closing app with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Restore project files from localStorage on startup
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    projects.forEach((project) => {
      if (project.path && project.files.length === 0) {
        scanDirectory(project.path)
          .then((files) => {
            hydrateProjectFiles(project.id, files);
          })
          .catch(() => {
            // silently fail — directory may no longer exist
          });
      }
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl+O: Open project
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        setProjectManagerOpen(true);
        return;
      }
      // Ctrl+N: New project
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setNewProjectOpen(true);
        return;
      }
      // Ctrl+P: Quick Open file
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setQuickOpenOpen(true);
        return;
      }

      // Shortcuts that need active file
      const state = useCodeStore.getState();
      const project = state.projects.find((p) => p.id === state.currentProjectId);
      const activeFileId = project?.activeFileTabId;
      const fileNode = activeFileId ? project?.fileNodeMap[activeFileId] : null;

      // Ctrl+S: Save current file
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        if (!activeFileId || !fileNode) return;
        try {
          // Sync content from Monaco editor before saving
          const monaco = (window as any).monaco;
          if (monaco && fileNode.path) {
            const uri = monaco.Uri.parse('file://' + fileNode.path);
            const model = monaco.editor.getModel(uri);
            if (model) {
              const content = model.getValue();
              state.markFileAsUnsaved(activeFileId, content);
            }
          }
          await state.saveFile(activeFileId);
        } catch (err) {
          console.error('[Code] Ctrl+S save failed:', err);
        }
        return;
      }

      // Ctrl+Shift+S: Save as new file
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (!activeFileId || !fileNode) return;
        try {
          const monaco = (window as any).monaco;
          let content = fileNode.content || '';
          if (monaco && fileNode.path) {
            const uri = monaco.Uri.parse('file://' + fileNode.path);
            const model = monaco.editor.getModel(uri);
            if (model) {
              content = model.getValue();
            }
          }
          // Default path: same folder as current file, with name derived from current file
          const currentPath = fileNode.path || '';
          const dir = currentPath.includes('/')
            ? currentPath.substring(0, currentPath.lastIndexOf('/'))
            : '';
          const baseName = currentPath.includes('/')
            ? currentPath.substring(currentPath.lastIndexOf('/') + 1)
            : currentPath;
          const dotIdx = baseName.lastIndexOf('.');
          const stem = dotIdx > 0 ? baseName.substring(0, dotIdx) : baseName;
          const ext = dotIdx > 0 ? baseName.substring(dotIdx) : '';
          const defaultPath = dir ? dir + '/' + stem + '_copy' + ext : stem + '_copy' + ext;

          const result = await window.api.invoke('showSaveDialog', { defaultPath });
          if (!result || result.canceled || !result.filePath) return;
          await window.api.invoke('fs:write-file', result.filePath, content);
        } catch (err) {
          console.error('[Code] Ctrl+Shift+S save-as failed:', err);
        }
        return;
      }

      // Ctrl+W: Close active tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (activeFileId) {
          state.closeFile(activeFileId);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setProjectManagerOpen, setNewProjectOpen]);

  return (
    <div className="flex flex-col h-full w-full bg-background relative">
      <ProjectTabBar onOpenManager={() => setProjectManagerOpen(true)} />
      <ServiceTabBar />
      <div className="flex flex-1 min-h-0">
        <ActivityPanel />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <ContentPanel />
          <BottomPanel />
          <ToastContainer />
        </div>
      </div>
      <FooterBar />
      <OpenProjectModal
        isOpen={isProjectManagerOpen}
        onClose={() => setProjectManagerOpen(false)}
      />
      <NewProjectModal isOpen={isNewProjectOpen} onClose={() => setNewProjectOpen(false)} />
      <QuickOpenModal isOpen={isQuickOpenOpen} onClose={() => setQuickOpenOpen(false)} />
      <SaveConfirmModal />
    </div>
  );
}

export default Code;