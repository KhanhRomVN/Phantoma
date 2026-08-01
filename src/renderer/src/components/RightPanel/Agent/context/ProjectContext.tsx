/**
 * ProjectContext — cung cấp thông tin workspace (rootPath, homedir, workspace, treeView) từ extension.
 *
 *    ProjectProvider : Provider bọc ngoài, lấy project context qua postMessage.
 *    useProject()    : Hook trả về { rootPath, homedir, workspace, treeView }.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

// SERVICES
import { extensionService } from '../services/ExtensionService';

interface ProjectContextType {
  rootPath: string;
  homedir: string;
  workspace: string;
  treeView: string;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rootPath, setRootPath] = useState('');
  const [homedir, setHomedir] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [treeView, setTreeView] = useState('');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'projectContextResult' && message.data) {
        setRootPath(message.data.rootPath || '');
        setHomedir(message.data.homedir || '');
        setWorkspace(message.data.workspace || '');
        setTreeView(message.data.treeView || '');
      }
    };

    window.addEventListener('message', handleMessage);
    extensionService.postMessage({ command: 'getProjectContext', requestId: 'init' });

    return () => window.removeEventListener('message', handleMessage);
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
