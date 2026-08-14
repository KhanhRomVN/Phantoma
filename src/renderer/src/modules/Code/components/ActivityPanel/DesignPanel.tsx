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
import { Plus, Palette, Edit2, Trash2, Eye } from 'lucide-react';

// ── Hooks ──
import { useCodeStore } from '../../hooks/useCodeStore';

// ── Types ──
import type { Design } from '../../types/design';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

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

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', html: '' });

  // ── Handlers ──

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({ name: 'New Design', description: '', html: getDefaultHTML() });
  };

  const handleSelectTemplate = (template: 'default' | 'landing' | 'dashboard') => {
    const templates = {
      default: getDefaultHTML(),
      landing: getLandingPageTemplate(),
      dashboard: getDashboardTemplate(),
    };
    setFormData({ ...formData, html: templates[template] });
  };

  const handleSave = () => {
    if (!currentProjectId) return;

    if (editingId) {
      updateDesign(currentProjectId, editingId, formData);
      setEditingId(null);
    } else {
      addDesign(currentProjectId, formData);
      setIsCreating(false);
    }

    setFormData({ name: '', description: '', html: '' });
  };

  const handleCancel = () => {
    setIsCreating(false);
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

  if (isCreating || editingId) {
    return (
      <div className="flex-1 flex flex-col bg-sidebar-background p-4 gap-4 overflow-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">
            {editingId ? 'Edit Design' : 'Create Design'}
          </h3>
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

          {!editingId && (
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Choose Template</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('default')}
                  className="px-3 py-2 bg-background border border-border rounded text-xs text-text-primary hover:border-primary transition-colors"
                >
                  🎨 Default
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('landing')}
                  className="px-3 py-2 bg-background border border-border rounded text-xs text-text-primary hover:border-primary transition-colors"
                >
                  🚀 Landing
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('dashboard')}
                  className="px-3 py-2 bg-background border border-border rounded text-xs text-text-primary hover:border-primary transition-colors"
                >
                  📊 Dashboard
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-text-secondary mb-1 block">HTML Content</label>
            <textarea
              value={formData.html}
              onChange={(e) => setFormData({ ...formData, html: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-primary font-mono min-h-[200px]"
              placeholder="<div>Your HTML here</div>"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-auto pt-4">
          <button
            onClick={handleSave}
            disabled={!formData.name.trim() || !formData.html.trim()}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {editingId ? 'Update' : 'Create'}
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
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">Designs</h3>
        <button
          onClick={handleCreate}
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
            <button
              onClick={handleCreate}
              className="text-xs text-primary hover:underline"
            >
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

// ─── Design Card ────────────────────────────────────────────────────────

interface DesignCardProps {
  design: Design;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function DesignCard({ design, onOpen, onEdit, onDelete }: DesignCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative border border-border rounded-lg overflow-hidden bg-background hover:border-primary/50 transition-colors cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-sidebar-background flex items-center justify-center relative overflow-hidden">
        {design.thumbnail ? (
          <img src={design.thumbnail} alt={design.name} className="w-full h-full object-cover" />
        ) : (
          <Palette className="w-8 h-8 text-text-secondary/30" strokeWidth={1} />
        )}

        {/* Hover overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              className="p-2 rounded-full bg-primary/90 text-primary-foreground hover:bg-primary transition-colors"
              title="Open design"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 rounded-full bg-background/90 text-text-primary hover:bg-background transition-colors"
              title="Edit design"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 rounded-full bg-error/90 text-white hover:bg-error transition-colors"
              title="Delete design"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-text-primary mb-1">{design.name}</h4>
        {design.description && (
          <p className="text-xs text-text-secondary/60 line-clamp-2">{design.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary/40">
          <span>{new Date(design.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function getDefaultHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design Preview</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 1rem;
      padding: 3rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      text-align: center;
    }
    h1 {
      font-size: 2.5rem;
      color: #333;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.125rem;
      color: #666;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .button {
      display: inline-block;
      padding: 0.875rem 2rem;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 Welcome to Design</h1>
    <p>
      This is a sample design template. Edit the HTML content to create
      beautiful UI mockups, landing pages, or prototypes.
    </p>
    <a href="#" class="button">Get Started</a>
  </div>
</body>
</html>`;
}

// ─── Design Templates ───────────────────────────────────────────────────

export function getLandingPageTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Modern Landing Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f1e;
      color: white;
    }
    .nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 3rem;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
    }
    .logo { font-size: 1.5rem; font-weight: 700; }
    .hero {
      text-align: center;
      padding: 6rem 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .hero h1 {
      font-size: 4rem;
      margin-bottom: 1.5rem;
      line-height: 1.2;
    }
    .hero p {
      font-size: 1.5rem;
      opacity: 0.9;
      margin-bottom: 2rem;
    }
    .cta-button {
      display: inline-block;
      padding: 1rem 3rem;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 600;
      font-size: 1.125rem;
      transition: transform 0.2s;
    }
    .cta-button:hover { transform: translateY(-3px); }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      padding: 4rem 3rem;
    }
    .feature {
      background: rgba(255, 255, 255, 0.05);
      padding: 2rem;
      border-radius: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .feature h3 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #667eea;
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="logo">✨ YourBrand</div>
    <div>
      <a href="#" style="color: white; text-decoration: none; margin: 0 1rem;">Features</a>
      <a href="#" style="color: white; text-decoration: none; margin: 0 1rem;">Pricing</a>
      <a href="#" style="color: white; text-decoration: none; margin: 0 1rem;">Contact</a>
    </div>
  </nav>
  
  <section class="hero">
    <h1>Build Something Amazing</h1>
    <p>The modern platform for creative professionals</p>
    <a href="#" class="cta-button">Get Started Free</a>
  </section>
  
  <section class="features">
    <div class="feature">
      <h3>🚀 Lightning Fast</h3>
      <p>Optimized performance that scales with your needs</p>
    </div>
    <div class="feature">
      <h3>🎨 Beautiful Design</h3>
      <p>Stunning interfaces that users love</p>
    </div>
    <div class="feature">
      <h3>🔒 Secure & Private</h3>
      <p>Your data is protected with enterprise-grade security</p>
    </div>
  </section>
</body>
</html>`;
}

export function getDashboardTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f7fa;
    }
    .dashboard {
      display: grid;
      grid-template-columns: 250px 1fr;
      height: 100vh;
    }
    .sidebar {
      background: #1e293b;
      color: white;
      padding: 2rem 1rem;
    }
    .sidebar h2 {
      margin-bottom: 2rem;
      padding: 0 1rem;
    }
    .nav-item {
      padding: 0.75rem 1rem;
      margin: 0.5rem 0;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .nav-item:hover { background: rgba(255, 255, 255, 0.1); }
    .nav-item.active { background: #667eea; }
    .main {
      padding: 2rem;
      overflow-y: auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .stat-card h3 {
      color: #64748b;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
    .stat-card .value {
      font-size: 2rem;
      font-weight: 700;
      color: #1e293b;
    }
    .chart-card {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <div class="sidebar">
      <h2>📊 Dashboard</h2>
      <div class="nav-item active">🏠 Overview</div>
      <div class="nav-item">📈 Analytics</div>
      <div class="nav-item">👥 Users</div>
      <div class="nav-item">⚙️ Settings</div>
    </div>
    
    <div class="main">
      <div class="header">
        <h1 style="color: #1e293b;">Welcome back, User</h1>
      </div>
      
      <div class="stats">
        <div class="stat-card">
          <h3>Total Revenue</h3>
          <div class="value">$45,231</div>
          <div style="color: #10b981; font-size: 0.875rem; margin-top: 0.5rem;">+20.1% from last month</div>
        </div>
        <div class="stat-card">
          <h3>Active Users</h3>
          <div class="value">2,350</div>
          <div style="color: #10b981; font-size: 0.875rem; margin-top: 0.5rem;">+15.3% from last month</div>
        </div>
        <div class="stat-card">
          <h3>Conversion Rate</h3>
          <div class="value">3.24%</div>
          <div style="color: #ef4444; font-size: 0.875rem; margin-top: 0.5rem;">-2.4% from last month</div>
        </div>
      </div>
      
      <div class="chart-card">
        <h2 style="margin-bottom: 1rem; color: #1e293b;">Revenue Overview</h2>
        <div style="height: 200px; background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: #64748b;">
          Chart Placeholder
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
