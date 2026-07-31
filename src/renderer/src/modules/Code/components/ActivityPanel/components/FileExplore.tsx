import { useCodeStore } from "../../../hooks/useCodeStore";
import type { Project, FileNode } from "../../../hooks/useCodeStore";

export function FileExplore() {
  const { projects, currentProjectId, openFile } = useCodeStore();
  const project = projects.find((p: Project) => p.id === currentProjectId);

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="text-xs font-medium text-text-secondary/60 px-2 py-1.5">Files</div>
      {project && project.files.length > 0 ? (
        <div className="space-y-0.5">
          {project.files.map((file: FileNode) => (
            <button
              key={file.id}
              onClick={() => openFile(project.id, file.id)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-text-secondary hover:bg-sidebar-item-hover transition-colors text-left"
            >
              <span>{file.type === "folder" ? "📁" : "📄"}</span>
              {file.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-text-secondary/40 px-2 py-4">No files</div>
      )}
    </div>
  );
}