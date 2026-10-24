/**
 * ------------------------------------------------------------------
 * ProjectContext
 * ------------------------------------------------------------------
 * Cung cấp thông tin workspace (rootPath, homedir, workspace, treeView)
 * trực tiếp từ CodeController (Renderer-side singleton) thay vì qua IPC.
 *
 * Main features:
 * - ProjectProvider : Provider lấy project context qua CodeController
 * - useProject()    : Hook trả về thông tin workspace
 * ------------------------------------------------------------------
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

// Controller
import { CodeController } from '@renderer/modules/Code/CodeController';

interface ProjectContextType {
  rootPath: string;
  homedir: string;
  workspace: string;
  treeView: string;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rootPath, setRootPath] = useState('');
  const [homedir] = useState(''); // Not available from local controller yet
  const [workspace, setWorkspace] = useState('');
  const [treeView] = useState(''); // Not available from local controller yet

  useEffect(() => {
    // Subscribe to results from CodeController
    const unsubscribe = CodeController.getInstance().onResult((result) => {
      if (result.command === 'projectContext') {
        const projectData = result.project;
        if (projectData) {
          setRootPath(projectData.path || '');
          setWorkspace(projectData.name || '');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
