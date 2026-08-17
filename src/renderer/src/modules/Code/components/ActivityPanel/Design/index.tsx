/**
 * ------------------------------------------------------------------
 * Design Panel
 * ------------------------------------------------------------------
 * Design management panel within the Activity Panel sidebar.
 * Displays a list of design cards with options to create, edit,
 * delete, and preview designs. Clicking a design card opens it
 * as a service tab in the ContentPanel.
 *
 * Main features:
 * - Design card grid view with thumbnails
 * - Create new design button
 * - Edit and delete actions per card
 * - Click to open design in ContentPanel
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useState } from 'react';

// ── UI ──
import { Plus, Palette } from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../../../hooks/useCodeStore';

// ── Types ──
import type { Design } from '../../../types/design';

// (unused template imports removed)

// ── Components ──
import { CreateDesignModal, type DesignPlatform } from './CreateDesignModal';
import type { DesignProject } from '../../ContentPanel/Design/types';
import { getTemplateSources } from '../../ContentPanel/Design/templateSources';
import { DesignCard } from './DesignCard';

// ─── Component ──────────────────────────────────────────────────────────

export function DesignPanel() {
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const designs = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === currentProjectId);
    return project?.designs ?? [];
  });

  const addDesign = useCodeStore((s) => s.addDesign);
  const updateDesign = useCodeStore((s) => s.updateDesign);
  const removeDesign = useCodeStore((s) => s.removeDesign);
  const openDesign = useCodeStore((s) => s.openDesign);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', html: '' });

  // ── Handlers ──

  const handleCreateClick = () => {
    setIsModalOpen(true);
  };

  const handleModalConfirm = (name: string, platform: DesignPlatform) => {
    if (!currentProjectId) return;

    const now = Date.now();
    const pagesByPlatform: Record<DesignPlatform, DesignProject['pages']> = {
      website: [
        {
          id: 'home',
          name: 'Home',
          tag: 'P01',
          route: '/',
          componentPath: 'website/home/Home',
          isRoot: true,
          position: { x: 0, y: 0 },
        },
        {
          id: 'about',
          name: 'About',
          tag: 'P02',
          route: '/about',
          componentPath: 'website/about/About',
          position: { x: 120, y: 0 },
        },
      ],
      desktop: [
        {
          id: 'dashboard',
          name: 'Dashboard',
          tag: 'P01',
          route: '/',
          componentPath: 'desktop/dashboard/Dashboard',
          isRoot: true,
          position: { x: 0, y: 0 },
        },
        {
          id: 'settings',
          name: 'Settings',
          tag: 'P02',
          route: '/settings',
          componentPath: 'desktop/settings/Settings',
          position: { x: 120, y: 0 },
        },
      ],
      mobile: [
        {
          id: 'home',
          name: 'Home',
          tag: 'P01',
          route: '/',
          componentPath: 'mobile/home/HomePage',
          isRoot: true,
          position: { x: 0, y: 0 },
        },
        {
          id: 'profile',
          name: 'Profile',
          tag: 'P02',
          route: '/profile',
          componentPath: 'mobile/profile/ProfilePage',
          position: { x: 120, y: 0 },
        },
      ],
    };

    const designProject: DesignProject = {
      id: `design-${Date.now()}`,
      name,
      domain: 'preview.local',
      pages: pagesByPlatform[platform],
      files: getTemplateSources(platform),
      createdAt: now,
      updatedAt: now,
    };

    const designData = {
      name,
      description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Template`,
      html: JSON.stringify(designProject),
    };

    addDesign(currentProjectId, designData);
    setIsModalOpen(false);
  };

  const handleSave = () => {
    if (!currentProjectId) return;

    if (editingId) {
      updateDesign(currentProjectId, editingId, formData);
      setEditingId(null);
    }

    setFormData({ name: '', description: '', html: '' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', html: '' });
  };

  const handleEdit = (design: Design) => {
    setEditingId(design.id);
    setFormData({ name: design.name, description: design.description || '', html: design.html });
  };

  const handleDelete = (designId: string) => {
    if (!currentProjectId) return;
    if (confirm('Are you sure you want to delete this design?')) {
      removeDesign(currentProjectId, designId);
    }
  };

  const handleOpen = (designId: string) => {
    if (!currentProjectId) return;
    openDesign(currentProjectId, designId);
  };

  // ── Render ──

  if (editingId) {
    return (
      <div className="flex-1 flex flex-col bg-sidebar-background p-4 gap-4 overflow-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">Edit Design</h3>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
              placeholder="Design name"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Content</label>
            <textarea
              value={formData.html}
              onChange={(e) => setFormData({ ...formData, html: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary font-mono min-h-[200px]"
              placeholder="Design content data"
              readOnly
            />
          </div>
        </div>

        <div className="flex gap-2 mt-auto pt-4">
          <button
            onClick={handleSave}
            disabled={!formData.name.trim()}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Update
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-sidebar-item-hover text-text-secondary rounded text-sm hover:bg-sidebar-item-hover/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-sidebar-background">
      {/* Modal */}
      <CreateDesignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleModalConfirm}
      />

      {/* Header - Same height as FileExplore */}
      <div className="flex items-center justify-between px-3 py-[11px] border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">Designs</h3>
        <button
          onClick={handleCreateClick}
          className="p-1.5 rounded hover:bg-sidebar-item-hover text-text-secondary hover:text-primary transition-colors"
          title="Create new design"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Design List */}
      <div className="flex-1 overflow-auto p-3">
        {designs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary/40 gap-3">
            <Palette className="w-8 h-8" strokeWidth={1} />
            <div className="text-sm">No designs yet</div>
            <button onClick={handleCreateClick} className="text-xs text-primary hover:underline">
              Create your first design
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {designs.map((design) => (
              <DesignCard
                key={design.id}
                design={design}
                onOpen={() => handleOpen(design.id)}
                onEdit={() => handleEdit(design)}
                onDelete={() => handleDelete(design.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
