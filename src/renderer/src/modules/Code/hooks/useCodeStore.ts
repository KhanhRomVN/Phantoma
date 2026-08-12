/**
 * ------------------------------------------------------------------
 * Code Store
 * ------------------------------------------------------------------
 * Zustand store with localStorage persistence for the Code editor module.
 * Manages projects, services, open files, unsaved changes tracking,
 * bottom panel state, activity panel state, folder expansion, and
 * file watcher directory invalidation.
 *
 * Main actions:
 * - addProject / removeProject / updateProject : Project CRUD
 * - addService / removeService / updateServiceStatus : Service management
 * - openFile / closeFile / setActiveFileTab : File tab management
 * - saveFile / saveAllFiles / markFileAsUnsaved / markFileAsSaved : Save workflow
 * - toggleBottomPanel / setBottomPanelTab / setActivityPanelTab : Panel control
 * - toggleFolderExpand / collapseAllFolders : File tree navigation
 * - invalidateDir / hydrateProjectFiles : File tree sync
 * - executeWithSaveCheck : Guard action with unsaved-changes prompt
 *
 * Main types:
 * - Project, Service, FileNode : Core data models
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Store ──
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  path: string;
  color: string;
  template: string;
  services: Service[];
  files: FileNode[];
  // ── Per-project state ──
  expandedFolderIds: string[];
  openFiles: string[];
  fileDisplayNames: Record<string, string>;
  fileNodeMap: Record<string, FileNode>;
  activeFileTabId: string | null;
  currentServiceId: string | null;
  currentFileId: string | null;
  // ── Bottom panel per-project ──
  bottomPanelTab: 'output' | 'terminal' | 'port' | 'performance' | 'problems';
  isBottomPanelOpen: boolean;
  // ── Activity panel per-project ──
  activityPanelTab: 'explore' | 'search' | 'source' | 'extension' | 'lsp';
  // ── Unsaved changes tracking ──
  unsavedFiles: Set<string>;
  originalContents: Record<string, string>;
  // ── File watcher invalidation ──
  dirVersions: Record<string, number>;
}

export type ProjectInput = Omit<
  Project,
  | 'id'
  | 'services'
  | 'files'
  | 'expandedFolderIds'
  | 'openFiles'
  | 'fileDisplayNames'
  | 'fileNodeMap'
  | 'activeFileTabId'
  | 'currentServiceId'
  | 'currentFileId'
  | 'bottomPanelTab'
  | 'isBottomPanelOpen'
  | 'activityPanelTab'
  | 'unsavedFiles'
  | 'originalContents'
  | 'dirVersions'
>;

export interface Service {
  id: string;
  name: string;
  type: 'website' | 'app' | 'device' | 'database' | 'api' | 'design' | 'table' | 'extension';
  status: 'running' | 'stopped' | 'building' | 'error';
  meta: string;
  tabId?: string;
  extensionId?: string;
}

export type ServiceInput = Omit<Service, 'status'> | Omit<Service, 'id' | 'status'>;

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  language?: string;
  path?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function createDefaultPerProject() {
  return {
    expandedFolderIds: [] as string[],
    openFiles: [] as string[],
    fileDisplayNames: {} as Record<string, string>,
    fileNodeMap: {} as Record<string, FileNode>,
    activeFileTabId: null as string | null,
    currentServiceId: null as string | null,
    currentFileId: null as string | null,
    bottomPanelTab: 'output' as const,
    isBottomPanelOpen: true,
    activityPanelTab: 'explore' as const,
    unsavedFiles: new Set<string>(),
    originalContents: {} as Record<string, string>,
    dirVersions: {} as Record<string, number>,
  };
}

// ─── Store Interface ────────────────────────────────────────────────────

interface CodeState {
  projects: Project[];
  currentProjectId: string | null;
  isProjectManagerOpen: boolean;
  isNewProjectOpen: boolean;
  activityPanelWidth: number;
  forceShowLSPOverlay: boolean;
  pendingAction: (() => void) | null;
  isSaveConfirmModalOpen: boolean;

  // Actions
  addProject: (project: ProjectInput) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  setCurrentProject: (id: string) => void;
  addService: (projectId: string, service: ServiceInput) => void;
  removeService: (projectId: string, serviceId: string) => void;
  updateServiceStatus: (projectId: string, serviceId: string, status: Service['status']) => void;
  setCurrentService: (serviceId: string) => void;
  openFile: (projectId: string, fileId: string, displayName?: string, fileNode?: FileNode) => void;
  closeFile: (fileId: string) => void;
  setActiveFileTab: (fileId: string) => void;
  setBottomPanelTab: (tab: 'output' | 'terminal' | 'port' | 'performance' | 'problems') => void;
  toggleBottomPanel: () => void;
  setActivityPanelTab: (tab: 'explore' | 'search' | 'source' | 'extension' | 'lsp') => void;
  setProjectManagerOpen: (open: boolean) => void;
  setNewProjectOpen: (open: boolean) => void;
  setProjectFiles: (projectId: string, files: FileNode[]) => void;
  setActivityPanelWidth: (width: number) => void;
  setForceShowLSPOverlay: (show: boolean) => void;
  toggleFolderExpand: (projectId: string, folderId: string) => void;
  collapseAllFolders: (projectId: string) => void;
  invalidateDir: (projectId: string, dirPath: string) => void;
  hydrateProjectFiles: (projectId: string, files: FileNode[]) => void;
  markFileAsUnsaved: (fileId: string, content: string) => void;
  markFileAsSaved: (fileId: string) => void;
  setOriginalContent: (fileId: string, content: string) => void;
  hasUnsavedChanges: () => boolean;
  getUnsavedFiles: () => string[];
  saveAllFiles: () => Promise<void>;
  saveFile: (fileId: string) => Promise<void>;
  setPendingAction: (action: (() => void) | null) => void;
  setSaveConfirmModalOpen: (open: boolean) => void;
  executeWithSaveCheck: (action: () => void) => void;
}

// ─── Store ──────────────────────────────────────────────────────────────

export const useCodeStore = create<CodeState>()(
  persist(
    (set, get) => {
      const getCurrentProject = (): Project | undefined => {
        const state = get();
        return state.projects.find((p) => p.id === state.currentProjectId);
      };

      const updateCurrentProject = (updater: (p: Project) => Project) => {
        const state = get();
        if (!state.currentProjectId) return;
        set({
          projects: state.projects.map((p) => (p.id === state.currentProjectId ? updater(p) : p)),
        });
      };

      // Migration: Remove old extension services without extensionId
      const migrateOldExtensionServices = () => {
        const state = get();
        const migratedProjects = state.projects.map((project) => {
          const validServices = project.services.filter((service) => {
            if (service.type === 'extension' && !service.extensionId) {
              return false;
            }
            return true;
          });

          return {
            ...project,
            services: validServices,
            currentServiceId: validServices.find((s) => s.id === project.currentServiceId)
              ? project.currentServiceId
              : null,
          };
        });

        set({ projects: migratedProjects });
      };

      // Migration: Add per-project panel state to old projects
      const migratePerProjectPanelState = () => {
        const state = get();
        const migratedProjects = state.projects.map((project) => {
          if (project.bottomPanelTab === undefined) {
            return {
              ...project,
              bottomPanelTab: 'output' as const,
              isBottomPanelOpen: true,
              activityPanelTab: 'explore' as const,
            };
          }
          return project;
        });

        if (migratedProjects.some((p, i) => p !== state.projects[i])) {
          set({ projects: migratedProjects });
        }
      };

      setTimeout(() => {
        migrateOldExtensionServices();
        migratePerProjectPanelState();
      }, 100);

      return {
        projects: [],
        currentProjectId: null,
        isProjectManagerOpen: false,
        isNewProjectOpen: false,
        activityPanelWidth: 320,
        forceShowLSPOverlay: false,
        pendingAction: null,
        isSaveConfirmModalOpen: false,

        // ── Project Actions ──

        addProject: (project) => {
          const newProject: Project = {
            ...project,
            id: `project_${Date.now()}`,
            services: [],
            files: [],
            ...createDefaultPerProject(),
          };
          set((state) => ({
            projects: [...state.projects, newProject],
            currentProjectId: newProject.id,
          }));
        },

        removeProject: (id) => {
          set((state) => {
            const filtered = state.projects.filter((p) => p.id !== id);
            return {
              projects: filtered,
              currentProjectId:
                state.currentProjectId === id ? filtered[0]?.id || null : state.currentProjectId,
            };
          });
        },

        updateProject: (id, data) => {
          set((state) => ({
            projects: state.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
          }));
        },

        setCurrentProject: (id) => {
          set({ currentProjectId: id });
        },

        // ── Service Actions ──

        addService: (projectId, service) => {
          const newService: Service = {
            ...service,
            id: 'id' in service ? service.id : `service_${Date.now()}`,
            status: 'stopped',
          };
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === projectId ? { ...p, services: [...p.services, newService] } : p,
            ),
          }));
        },

        removeService: (projectId, serviceId) => {
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === projectId
                ? {
                    ...p,
                    services: p.services.filter((s) => s.id !== serviceId),
                    currentServiceId: p.currentServiceId === serviceId ? null : p.currentServiceId,
                  }
                : p,
            ),
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
                : p,
            ),
          }));
        },

        setCurrentService: (serviceId) => {
          updateCurrentProject((p) => ({
            ...p,
            currentServiceId: serviceId,
            activeFileTabId: null,
          }));
        },

        // ── File Tab Actions ──

        openFile: (_projectId, fileId, displayName, fileNode) => {
          const project = getCurrentProject();
          if (!project) return;

          if (!project.openFiles.includes(fileId)) {
            updateCurrentProject((p) => {
              const names = displayName
                ? { ...p.fileDisplayNames, [fileId]: displayName }
                : p.fileDisplayNames;
              const nodeMap = fileNode ? { ...p.fileNodeMap, [fileId]: fileNode } : p.fileNodeMap;
              return {
                ...p,
                openFiles: [...p.openFiles, fileId],
                fileDisplayNames: names,
                fileNodeMap: nodeMap,
                activeFileTabId: fileId,
              };
            });
          } else {
            updateCurrentProject((p) => {
              if (fileNode) {
                return {
                  ...p,
                  activeFileTabId: fileId,
                  fileNodeMap: { ...p.fileNodeMap, [fileId]: fileNode },
                };
              }
              return { ...p, activeFileTabId: fileId };
            });
          }
        },

        closeFile: (fileId) => {
          updateCurrentProject((p) => {
            const newOpenFiles = p.openFiles.filter((id) => id !== fileId);
            return {
              ...p,
              openFiles: newOpenFiles,
              activeFileTabId:
                newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null,
            };
          });
        },

        setActiveFileTab: (fileId) => {
          updateCurrentProject((p) => ({
            ...p,
            activeFileTabId: fileId,
            currentServiceId: null,
          }));
        },

        // ── Panel Actions ──

        setBottomPanelTab: (tab) => {
          updateCurrentProject((p) => ({ ...p, bottomPanelTab: tab }));
        },

        toggleBottomPanel: () => {
          updateCurrentProject((p) => ({ ...p, isBottomPanelOpen: !p.isBottomPanelOpen }));
        },

        setActivityPanelTab: (tab) => {
          updateCurrentProject((p) => ({ ...p, activityPanelTab: tab }));
        },

        // ── Modal Actions ──

        setProjectManagerOpen: (open) => {
          set({ isProjectManagerOpen: open });
        },

        setNewProjectOpen: (open) => {
          set({ isNewProjectOpen: open });
        },

        // ── File Tree Actions ──

        setProjectFiles: (projectId, files) => {
          set((state) => ({
            projects: state.projects.map((p) => (p.id === projectId ? { ...p, files } : p)),
          }));
        },

        setActivityPanelWidth: (width) => {
          set({ activityPanelWidth: width });
        },

        setForceShowLSPOverlay: (show) => {
          set({ forceShowLSPOverlay: show });
        },

        toggleFolderExpand: (projectId: string, folderId: string) => {
          set((state) => ({
            projects: state.projects.map((p) => {
              if (p.id !== projectId) return p;
              const isExpanded = p.expandedFolderIds.includes(folderId);
              return {
                ...p,
                expandedFolderIds: isExpanded
                  ? p.expandedFolderIds.filter((id) => id !== folderId)
                  : [...p.expandedFolderIds, folderId],
              };
            }),
          }));
        },

        collapseAllFolders: (projectId: string) => {
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === projectId ? { ...p, expandedFolderIds: [] } : p,
            ),
          }));
        },

        invalidateDir: (projectId: string, dirPath: string) => {
          set((state) => ({
            projects: state.projects.map((p) => {
              if (p.id !== projectId) return p;
              return {
                ...p,
                dirVersions: {
                  ...p.dirVersions,
                  [dirPath]: (p.dirVersions[dirPath] || 0) + 1,
                },
              };
            }),
          }));
        },

        hydrateProjectFiles: (projectId, files) => {
          set((state) => ({
            projects: state.projects.map((p) => (p.id === projectId ? { ...p, files } : p)),
          }));
        },

        // ── Save Actions ──

        markFileAsUnsaved: (fileId: string, content: string) => {
          const project = getCurrentProject();
          if (!project) return;

          updateCurrentProject((p) => {
            const node = p.fileNodeMap[fileId];
            const updatedNodeMap = node
              ? { ...p.fileNodeMap, [fileId]: { ...node, content } }
              : p.fileNodeMap;
            const original = p.originalContents[fileId];
            let unsavedFiles = p.unsavedFiles;
            if (original !== undefined && original !== content) {
              unsavedFiles = new Set([...p.unsavedFiles, fileId]);
            } else if (original === content) {
              unsavedFiles = new Set(p.unsavedFiles);
              unsavedFiles.delete(fileId);
            }
            return { ...p, fileNodeMap: updatedNodeMap, unsavedFiles };
          });
        },

        markFileAsSaved: (fileId: string) => {
          updateCurrentProject((p) => {
            const newUnsaved = new Set(p.unsavedFiles);
            newUnsaved.delete(fileId);
            return { ...p, unsavedFiles: newUnsaved };
          });
        },

        setOriginalContent: (fileId: string, content: string) => {
          updateCurrentProject((p) => ({
            ...p,
            originalContents: { ...p.originalContents, [fileId]: content },
          }));
        },

        hasUnsavedChanges: () => {
          const project = getCurrentProject();
          return project ? project.unsavedFiles.size > 0 : false;
        },

        getUnsavedFiles: () => {
          const project = getCurrentProject();
          return project ? Array.from(project.unsavedFiles) : [];
        },

        saveAllFiles: async () => {
          const project = getCurrentProject();
          if (!project) return;

          const unsavedFileIds = Array.from(project.unsavedFiles);

          for (const fileId of unsavedFileIds) {
            await get().saveFile(fileId);
          }
        },

        saveFile: async (fileId: string) => {
          const project = getCurrentProject();
          if (!project) return;

          const fileNode = project.fileNodeMap[fileId];
          if (!fileNode || !fileNode.path || fileNode.content === undefined) return;

          try {
            await window.api.invoke('fs:write-file', fileNode.path, fileNode.content);
            get().setOriginalContent(fileId, fileNode.content);
            get().markFileAsSaved(fileId);
          } catch (err) {
            console.error('[CodeStore] Failed to save file ' + fileNode.path + ':', err);
            throw err;
          }
        },

        // ── Save-Check Guard ──

        setPendingAction: (action: (() => void) | null) => {
          set({ pendingAction: action });
        },

        setSaveConfirmModalOpen: (open: boolean) => {
          set({ isSaveConfirmModalOpen: open });
        },

        executeWithSaveCheck: (action: () => void) => {
          const hasUnsaved = get().hasUnsavedChanges();
          if (hasUnsaved) {
            set({ pendingAction: action, isSaveConfirmModalOpen: true });
          } else {
            action();
          }
        },
      };
    },
    {
      name: 'code-store',
      partialize: (state) => ({
        ...state,
        projects: state.projects.map((p) => ({
          ...p,
          files: [],
          unsavedFiles: Array.from(p.unsavedFiles),
          currentFileId: null,
        })),
        isProjectManagerOpen: false,
        isNewProjectOpen: false,
        pendingAction: null,
        isSaveConfirmModalOpen: false,
      }),
      merge: (persistedState: any, currentState: CodeState) => {
        const merged = { ...currentState, ...persistedState };
        if (merged.projects) {
          merged.projects = merged.projects.map((p: any) => ({
            ...p,
            unsavedFiles: new Set(p.unsavedFiles || []),
          }));
        }
        return merged;
      },
    },
  ),
);

// [DEBUG] — log mỗi khi projects thay đổi, kèm danh sách field bị thay đổi
// Xóa sau khi xác định được nguyên nhân
useCodeStore.subscribe((state, prevState) => {
  if (state.projects === prevState.projects) return;

  const prevProj = prevState.projects.find((p) => p.id === prevState.currentProjectId);
  const currProj = state.projects.find((p) => p.id === state.currentProjectId);
  if (!prevProj || !currProj) return;

  const changedFields: string[] = [];
  for (const key of Object.keys(currProj) as (keyof typeof currProj)[]) {
    if (prevProj[key] !== currProj[key]) {
      changedFields.push(key);
    }
  }
});