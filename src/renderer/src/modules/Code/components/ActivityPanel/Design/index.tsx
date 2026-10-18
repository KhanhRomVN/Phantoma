import { useEffect, useState } from 'react';
import { ArrowLeft, Palette, Plus } from 'lucide-react';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { useDesignStore } from '../../../hooks/useDesignStore';
import { CodeAgent } from '../../ContentPanel/Workspace/CodeAgent';
import { DesignModal } from './DesignModal';
import { DesignCard } from './DesignCard';
import { getTemplateFiles, getTemplateGraph } from './templateFiles';

export function Design() {
  const projectPath = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.path ?? '';
  });
  const setContentViewMode = useCodeStore((s) => s.setContentViewMode);

  const designs = useDesignStore((s) => s.designs);
  const activeDesignId = useDesignStore((s) => s.activeDesignId);
  const loadDesigns = useDesignStore((s) => s.loadDesigns);
  const createDesign = useDesignStore((s) => s.createDesign);
  const deleteDesign = useDesignStore((s) => s.deleteDesign);
  const openTab = useDesignStore((s) => s.openTab);
  const clearActive = useDesignStore((s) => s.clearActive);

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (projectPath) void loadDesigns(projectPath);
  }, [projectPath, loadDesigns]);

  const activeDesign = designs.find((d) => d.id === activeDesignId) ?? null;

  const handleOpen = (designId: string) => {
    openTab(designId);
    setContentViewMode('design');
  };

  const handleCreate = async (name: string, description: string) => {
    if (!projectPath) return;
    const design = await createDesign(projectPath, {
      name,
      description,
      ...getTemplateGraph(),
      files: getTemplateFiles(),
    });
    setModalOpen(false);
    if (design) setContentViewMode('design');
  };

  if (activeDesign) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-divider bg-sidebar-background px-2">
          <button
            onClick={clearActive}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
            aria-label="Back to designs"
            title="Back to designs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Palette className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text-primary">
            {activeDesign.name}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <CodeAgent />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-divider bg-sidebar-background px-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Design
        </span>
        <button
          onClick={() => setModalOpen(true)}
          disabled={!projectPath}
          className="relative flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          title="New design"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {designs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-text-secondary/60">
            <Palette className="h-8 w-8" strokeWidth={1} />
            <p className="text-xs">No designs yet</p>
          </div>
        ) : (
          designs.map((design) => (
            <DesignCard
              key={design.id}
              projectPath={projectPath}
              design={design}
              active={design.id === activeDesignId}
              onOpen={() => handleOpen(design.id)}
              onDelete={() => void deleteDesign(projectPath, design.id)}
            />
          ))
        )}
      </div>

      <DesignModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default Design;