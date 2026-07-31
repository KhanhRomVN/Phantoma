import { useState } from "react";
import { X, Plus, Trash2, Edit2 } from "lucide-react";
import { useCodeStore, type ProjectInput } from "../../hooks/useCodeStore";
import { cn } from "../../../../shared/lib/utils";

const TEMPLATES = [
  { id: "website", label: "Website", icon: "🌐", color: "#4fc7da" },
  { id: "app", label: "App (Electron)", icon: "📱", color: "#b685e0" },
  { id: "device", label: "Device (Android)", icon: "📲", color: "#67cc8e" },
  { id: "database", label: "Database (Postgres)", icon: "🗄️", color: "#5b8def" },
  { id: "api", label: "API (REST)", icon: "🔌", color: "#e8c547" },
  { id: "design", label: "UI Design", icon: "🎨", color: "#e37fb0" },
  { id: "table", label: "Table (Airtable-style)", icon: "📊", color: "#4fd9b0" },
];

const COLORS = [
  "#f0a857", "#4fc7da", "#5b8def", "#67cc8e", "#e5594f",
  "#b685e0", "#e8c547", "#e37fb0", "#4fd9b0", "#8b7ee8",
];

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectManagerModal({ isOpen, onClose }: ProjectManagerModalProps) {
  const { projects, addProject, removeProject, updateProject } = useCodeStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  if (!isOpen) return null;

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    const project: ProjectInput = {
      name: newProjectName.trim(),
      color: selectedColor,
      template: selectedTemplate,
    };
    addProject(project);
    setNewProjectName("");
    setShowCreate(false);
    setSelectedTemplate(TEMPLATES[0].id);
    setSelectedColor(COLORS[0]);
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      updateProject(id, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName("");
  };

  const handleDeleteProject = (id: string) => {
    if (confirm("Xóa project này?")) {
      removeProject(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card-background border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-divider shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">Project Manager</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary/60 hover:text-text-secondary">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!showCreate ? (
            <button onClick={() => setShowCreate(true)} className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-text-secondary/60 hover:text-text-secondary">
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm">Create new project</span>
            </button>
          ) : (
            <div className="bg-sidebar-background border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">New Project</span>
                <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary/60 hover:text-text-secondary">
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
              <input type="text" placeholder="Project name..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary/40 outline-none focus:border-primary" autoFocus />
              <div>
                <label className="text-xs text-text-secondary/60 font-medium">Template</label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {TEMPLATES.map((tpl) => (
                    <button key={tpl.id} onClick={() => setSelectedTemplate(tpl.id)} className={cn("flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-colors text-xs", selectedTemplate === tpl.id ? "border-primary bg-primary/10 text-text-primary" : "border-border hover:border-border/60 text-text-secondary/60 hover:text-text-secondary")}>
                      <span className="text-base">{tpl.icon}</span>
                      <span className="text-[9px] leading-tight text-center">{tpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-text-secondary/60 font-medium">Color</label>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {COLORS.map((color) => (
                    <button key={color} onClick={() => setSelectedColor(color)} className={cn("w-6 h-6 rounded-full border-2 transition-all", selectedColor === color ? "border-white/80 scale-110" : "border-transparent hover:scale-105")} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <button onClick={handleAddProject} disabled={!newProjectName.trim()} className="w-full py-2 bg-primary rounded-lg text-sm font-medium text-text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/80">
                Create Project
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-text-secondary/40 text-sm">No projects yet. Create one above.</div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="flex items-center gap-3 px-3 py-2.5 bg-sidebar-background border border-border rounded-lg hover:border-border/60 transition-colors group">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: project.color }} />
                  {editingId === project.id ? (
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(project.id)} onBlur={() => handleSaveEdit(project.id)} className="flex-1 px-2 py-0.5 bg-input-background border border-border rounded text-sm text-text-primary outline-none focus:border-primary" autoFocus />
                  ) : (
                    <span className="flex-1 text-sm text-text-primary">{project.name}</span>
                  )}
                  <span className="text-[10px] text-text-secondary/40 px-2 py-0.5 bg-sidebar-item-hover rounded">{project.template}</span>
                  <span className="text-[10px] text-text-secondary/40">{project.services.length} services</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleStartEdit(project.id, project.name)} className="p-1 rounded hover:bg-sidebar-item-hover text-text-secondary/40 hover:text-text-secondary">
                      <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => handleDeleteProject(project.id)} className="p-1 rounded hover:bg-error/20 text-text-secondary/40 hover:text-error">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-divider flex items-center justify-between shrink-0">
          <span className="text-xs text-text-secondary/40">{projects.length} projects</span>
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-primary/10 text-text-primary text-sm font-medium hover:bg-primary/20">Done</button>
        </div>
      </div>
    </div>
  );
}