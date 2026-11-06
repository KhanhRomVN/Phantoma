/**
 * ------------------------------------------------------------------
 * ProjectContext
 * ------------------------------------------------------------------
 * Cung cấp thông tin workspace (rootPath, homedir, workspace, treeView)
 * trực tiếp từ useCodeStore thay vì qua IPC.
 *
 * Main features:
 * - ProjectProvider : Provider lấy project context từ useCodeStore
 * - useProject()    : Hook trả về thông tin workspace
 * ------------------------------------------------------------------
 */

import React, { createContext, useContext, useState } from 'react';

// Store
import { useCodeStore } from '@renderer/modules/Code/hooks/useCodeStore';

interface ProjectContextType {
  rootPath: string;
  homedir: string;
  workspace: string;
  treeView: string;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [homedir] = useState('');
  const [treeView] = useState('');
  const project = useCodeStore((s) => s.projects.find((p) => p.id === s.currentProjectId));
  const rootPath = project?.path || '';
  const workspace = project?.name || '';

  return (
    <ProjectContext.Provider value={{ rootPath, homedir, workspace, treeView }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
