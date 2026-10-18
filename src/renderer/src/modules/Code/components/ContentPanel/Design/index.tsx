import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { useDesignStore, type DesignGraph } from '../../../hooks/useDesignStore';
import { DesignCanvas } from './DesignCanvas';
import { DesignViewer } from './DesignViewer';

export function DesignView() {
  const projectPath = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.path ?? '';
  });

  const designs = useDesignStore((s) => s.designs);
  const activeDesignId = useDesignStore((s) => s.activeDesignId);
  const loadDesigns = useDesignStore((s) => s.loadDesigns);
  const updateGraph = useDesignStore((s) => s.updateGraph);

  const [viewing, setViewing] = useState<{ designId: string; nodeId: string } | null>(null);

  useEffect(() => {
    if (projectPath) void loadDesigns(projectPath);
  }, [projectPath, loadDesigns]);

  const activeDesign = designs.find((d) => d.id === activeDesignId) ?? null;
  const viewingNode =
    activeDesign && viewing?.designId === activeDesign.id
      ? (activeDesign.nodes.find((n) => n.id === viewing.nodeId) ?? null)
      : null;

  const handleGraphChange = (graph: DesignGraph) => {
    if (activeDesign) void updateGraph(projectPath, activeDesign.id, graph);
  };

  if (!activeDesign) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-background text-text-secondary/40">
        <Palette className="h-12 w-12" strokeWidth={1} />
        <p className="text-sm">Select or create a design</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      {viewingNode ? (
        <DesignViewer
          projectPath={projectPath}
          design={activeDesign}
          node={viewingNode}
          onBack={() => setViewing(null)}
          onNavigate={(nodeId) => setViewing({ designId: activeDesign.id, nodeId })}
        />
      ) : (
        <DesignCanvas
          key={activeDesign.id}
          projectPath={projectPath}
          designId={activeDesign.id}
          nodes={activeDesign.nodes}
          edges={activeDesign.edges}
          onOpen={(nodeId) => setViewing({ designId: activeDesign.id, nodeId })}
          onGraphChange={handleGraphChange}
        />
      )}
    </div>
  );
}

export default DesignView;