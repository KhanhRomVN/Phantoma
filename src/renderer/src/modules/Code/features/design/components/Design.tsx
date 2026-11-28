// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useEffect, useState } from 'react';

// ── UI ──
import { Palette, Plus } from 'lucide-react';

// ── Components ──
import { DesignModal } from './modals/DesignModal';
import { DesignCard } from './DesignCard';

// ── Stores ──
import { useCodeStore } from '../../../shared/stores/code.store';
import { useDesignStore } from '../stores/design.store';

// ── Utils ──
import { getTemplateFiles, getTemplateGraph } from '../utils/template-files.util';

// ─── Component ───────────────────────────────────────────────────────────────
export function Design() {
  // ── Store ──
  const projectPath = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.path ?? '';
  });
  const setContentViewMode = useCodeStore((s) => s.setContentViewMode);

  const designs = useDesignStore((s) => s.designs);
  const loadDesigns = useDesignStore((s) => s.loadDesigns);
  const createDesign = useDesignStore((s) => s.createDesign);
  const deleteDesign = useDesignStore((s) => s.deleteDesign);
  const openTab = useDesignStore((s) => s.openTab);

  // ── State ──
  const [modalOpen, setModalOpen] = useState(false);

  // ── Effects ──
  useEffect(() => {
    if (projectPath) void loadDesigns(projectPath);
  }, [projectPath, loadDesigns]);

  // ── Handlers ──
  const handleOpen = (designId: string) => {
    openTab(designId);
    // ASSUMED: Mở Design tab trong Workspace thay vì contentViewMode
    setContentViewMode('workspace');
    // Dispatch event để Workspace mở Design panel
    window.dispatchEvent(
      new CustomEvent('workspace:open-design', {
        detail: { designId },
      }),
    );
  };

  const handleCreate = async (
    name: string,
    description: string,
    platform: 'website' | 'mobile',
  ) => {
    if (!projectPath) return;
    const design = await createDesign(projectPath, {
      name,
      description,
      ...getTemplateGraph(platform),
      files: getTemplateFiles(platform),
    });
    setModalOpen(false);
    if (design) {
      setContentViewMode('workspace');
      window.dispatchEvent(
        new CustomEvent('workspace:open-design', {
          detail: { designId: design.id },
        }),
      );
    }
  };

  // ── Render ──
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-panel-background px-3">
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
              active={false}
              onOpen={() => handleOpen(design.id)}
              onDelete={() => void deleteDesign(projectPath, design.id)}
            />
          ))
        )}
      </div>

      <DesignModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreate} />
    </div>
  );
}

export default Design;
