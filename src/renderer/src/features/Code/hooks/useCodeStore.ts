import { create } from 'zustand';

export interface Project {
  id: string;
  name: string;
  color: string;
  template: string;
  services: Service[];
  files: FileNode[];
}

export type ProjectInput = Omit<Project, 'id' | 'services' | 'files'>;

export interface Service {
  id: string;
  name: string;
  type: 'website' | 'app' | 'device' | 'database' | 'api' | 'design' | 'table';
  status: 'running' | 'stopped' | 'building' | 'error';
  meta: string;
  tabId?: string;
}

export type ServiceInput = Omit<Service, 'id' | 'status'>;

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  language?: string;
  path?: string;
}

interface CodeState {
  projects: Project[];
  currentProjectId: string | null;
  currentServiceId: string | null;
  currentFileId: string | null;
  openFiles: string[];
  activeFileTabId: string | null;
  bottomPanelTab: 'terminal' | 'problems' | 'output' | 'debug';
  activityPanelTab: 'explore' | 'search' | 'source' | 'extension';
  isBottomPanelOpen: boolean;
  isProjectManagerOpen: boolean;
  activityPanelWidth: number;

  // Actions
  addProject: (project: ProjectInput) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  setCurrentProject: (id: string) => void;
  addService: (projectId: string, service: ServiceInput) => void;
  removeService: (projectId: string, serviceId: string) => void;
  updateServiceStatus: (projectId: string, serviceId: string, status: Service['status']) => void;
  setCurrentService: (serviceId: string) => void;
  openFile: (projectId: string, fileId: string) => void;
  closeFile: (fileId: string) => void;
  setActiveFileTab: (fileId: string) => void;
  setBottomPanelTab: (tab: CodeState['bottomPanelTab']) => void;
  toggleBottomPanel: () => void;
  setActivityPanelTab: (tab: CodeState['activityPanelTab']) => void;
  setProjectManagerOpen: (open: boolean) => void;
  setActivityPanelWidth: (width: number) => void;
}

export const useCodeStore = create<CodeState>()((set, get) => ({
  projects: [],
  currentProjectId: null,
  currentServiceId: null,
  currentFileId: null,
  openFiles: [],
  activeFileTabId: null,
  bottomPanelTab: 'terminal',
  activityPanelTab: 'explore',
  isBottomPanelOpen: true,
  isProjectManagerOpen: false,
  activityPanelWidth: 280,

  addProject: (project) => {
    const newProject: Project = {
      ...project,
      id: `project_${Date.now()}`,
      services: [],
      files: [],
    };
    set((state) => ({
      projects: [...state.projects, newProject],
      currentProjectId: newProject.id,
    }));
  },

  removeProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProjectId: state.currentProjectId === id ? state.projects[0]?.id || null : state.currentProjectId,
    }));
  },

  updateProject: (id, data) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
  },

  setCurrentProject: (id) => {
    set({ currentProjectId: id });
  },

  addService: (projectId, service) => {
    const newService: Service = {
      ...service,
      id: `service_${Date.now()}`,
      status: 'stopped',
    };
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, services: [...p.services, newService] } : p
      ),
    }));
  },

  removeService: (projectId, serviceId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, services: p.services.filter((s) => s.id !== serviceId) } : p
      ),
      currentServiceId: state.currentServiceId === serviceId ? null : state.currentServiceId,
    }));
  },

  updateServiceStatus: (projectId, serviceId, status) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              services: p.services.map((s) => (s.id === serviceId ? { ...s, status } : s)),
            }
          : p
      ),
    }));
  },

  setCurrentService: (serviceId) => {
    set({ currentServiceId: serviceId });
  },

  openFile: (_projectId, fileId) => {
    const state = get();
    if (!state.openFiles.includes(fileId)) {
      set((state) => ({
        openFiles: [...state.openFiles, fileId],
        activeFileTabId: fileId,
      }));
    } else {
      set({ activeFileTabId: fileId });
    }
  },

  closeFile: (fileId) => {
    const state = get();
    const newOpenFiles = state.openFiles.filter((id) => id !== fileId);
    set({
      openFiles: newOpenFiles,
      activeFileTabId: newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null,
    });
  },

  setActiveFileTab: (fileId) => {
    set({ activeFileTabId: fileId });
  },

  setBottomPanelTab: (tab) => {
    set({ bottomPanelTab: tab });
  },

  toggleBottomPanel: () => {
    set((state) => ({ isBottomPanelOpen: !state.isBottomPanelOpen }));
  },

  setActivityPanelTab: (tab) => {
    set({ activityPanelTab: tab });
  },

  setProjectManagerOpen: (open) => {
    set({ isProjectManagerOpen: open });
  },

  setActivityPanelWidth: (width) => {
    set({ activityPanelWidth: width });
  },
}));