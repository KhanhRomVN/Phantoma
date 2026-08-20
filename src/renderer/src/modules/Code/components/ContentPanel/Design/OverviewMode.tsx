/**
 * ------------------------------------------------------------------
 * Overview Mode
 * ------------------------------------------------------------------
 * Sitemap view showing all pages as node cards with connections
 * Uses React Flow for interactive diagram
 * ------------------------------------------------------------------
 */

import { Suspense, lazy, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowRight } from 'lucide-react';
import type { DesignProject, PageNode } from './types';

interface OverviewModeProps {
  project: DesignProject;
  onOpenPage: (page: PageNode) => void;
}

export function OverviewMode({ project, onOpenPage }: OverviewModeProps) {
  // Convert project pages to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return project.pages.map((page) => ({
      id: page.id,
      type: 'pageNode',
      position: page.position || { x: 100, y: 60 },
      data: { page, project, onOpenPage },
      draggable: true,
    }));
  }, [project, onOpenPage]);

  // Convert page relationships to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    project.pages.forEach((page) => {
      if (page.children) {
        page.children.forEach((childId) => {
          edges.push({
            id: `${page.id}-${childId}`,
            source: page.id,
            target: childId,
            type: 'default',
            animated: false,
            style: {
              stroke: 'hsl(var(--border))',
              strokeWidth: 1.4,
              strokeDasharray: '3 4',
            },
          });
        });
      }
    });
    return edges;
  }, [project]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      pageNode: PageNodeComponent,
    }),
    [],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--border))" gap={22} size={1} />
        <Controls className="!bg-sidebar-background !border-border [&_button]:!bg-sidebar-item-hover [&_button]:!border-border [&_button]:!text-text-secondary hover:[&_button]:!bg-primary/10 hover:[&_button]:!text-primary" />
        <MiniMap
          className="!bg-sidebar-background !border-border"
          nodeColor="hsl(var(--border))"
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      </ReactFlow>
    </div>
  );
}

// Custom Page Node Component for React Flow
interface PageNodeComponentProps {
  data: {
    page: PageNode;
    project: DesignProject;
    onOpenPage: (page: PageNode) => void;
  };
}

function PageNodeComponent({ data }: PageNodeComponentProps) {
  const { page, onOpenPage } = data;

  // Dynamically load the page component
  // componentPath already includes full path (e.g., "luma-coffee/Home")
  const PageComponent = lazy(() => import(`./templates/${page.componentPath}`));

  return (
    <div
      className="w-[300px] bg-sidebar-background border border-border rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-[3px] hover:border-primary/50 hover:shadow-2xl group"
      onClick={() => onOpenPage(page)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-divider">
        <span className="font-mono text-[10px] text-text-secondary/60 bg-sidebar-item-hover border border-border px-1.5 py-0.5 rounded">
          {page.tag}
        </span>
        <span className="text-xs font-semibold text-text-secondary group-hover:text-text-primary">
          {page.name}
        </span>
        {page.isRoot && (
          <span className="ml-auto font-mono text-[9px] text-primary bg-primary/20 px-1.5 py-0.5 rounded">
            root
          </span>
        )}
      </div>

      {/* Preview Frame */}
      <div className="relative w-full aspect-[16/9] bg-background overflow-hidden">
        <div className="absolute top-0 left-0 w-[1280px] h-[720px] origin-top-left scale-[0.234375] pointer-events-none">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-background text-text-secondary/60 text-xs">
                Loading...
              </div>
            }
          >
            <PageComponent />
          </Suspense>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary/0 border-0 border-primary transition-all group-hover:bg-background/40 group-hover:border-2 flex items-center justify-center">
          <div className="opacity-0 translate-y-1 transition-all group-hover:opacity-100 group-hover:translate-y-0 bg-primary text-primary-foreground font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
            Open page
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
