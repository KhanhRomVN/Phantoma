import { useState, useMemo } from 'react';
import { ResizableSplit } from '@renderer/components/ui/ResizableSplit/ResizableSplit';

import type { SourceNode } from '../../../utils/source-tree.util';
import type { CdpScriptUnpackedData } from '../../../hooks/network/useNetworkEvents';
import { buildSourceTree } from '../../../utils/source-tree.util';
import { useNetworkStore } from '../../../stores/networkStore';

import { FileExplorePanel } from './FileExplorePanel';
import { FileContentSection, SelectedSourceContent } from './FileContentSection';

interface SourcesPanelProps {
  unpackedScripts?: Map<string, CdpScriptUnpackedData>;
  onClose?: () => void;
}

export function SourcesPanel({ unpackedScripts }: SourcesPanelProps) {
  const requests = useNetworkStore((s) => s.requests);
  const [selectedContent, setSelectedContent] = useState<SelectedSourceContent | null>(null);

  const sourceTree = useMemo(() => {
    const sources: Array<{
      url: string;
      size?: number;
      scriptId?: string;
      staticSource?: string;
      unpackedSource?: string;
      isDifferent?: boolean;
      compressionRatio?: string;
    }> = [];
    if (unpackedScripts) {
      for (const [, script] of unpackedScripts) {
        sources.push({
          url: script.url,
          size: script.unpackedSource.length,
          scriptId: script.scriptId,
          staticSource: script.staticSource || undefined,
          unpackedSource: script.unpackedSource,
          isDifferent: script.isDifferent,
          compressionRatio: script.compressionRatio,
        });
      }
    }
    requests.forEach((req) => {
      const isSource =
        req.type?.toUpperCase() === 'JS' ||
        req.type?.toUpperCase() === 'CSS' ||
        req.type?.toUpperCase() === 'HTML';
      if (isSource && req.responseBody) {
        if (!sources.some((s) => s.url === req.url)) {
          const bodyContent =
            typeof req.responseBody === 'string'
              ? req.responseBody
              : JSON.stringify(req.responseBody);
          sources.push({ url: req.url, size: bodyContent.length, unpackedSource: bodyContent });
        }
      }
    });
    return buildSourceTree(sources);
  }, [requests, unpackedScripts]);

  const handleSelectNode = (node: SourceNode) => {
    if (node.type !== 'file') return;
    setSelectedContent({
      content: node.unpackedSource || node.staticSource || '',
      fileName: node.name,
      language: 'javascript',
      isDifferent: node.isDifferent,
      compressionRatio: node.compressionRatio,
    });
  };

  const stats = useMemo(() => {
    let totalFiles = 0,
      obfuscatedFiles = 0;
    function count(nodes: SourceNode[]) {
      for (const node of nodes) {
        if (node.type === 'file') {
          totalFiles++;
          if (node.isDifferent) obfuscatedFiles++;
        }
        if (node.children) count(node.children);
      }
    }
    count(sourceTree.roots);
    return { totalFiles, obfuscatedFiles };
  }, [sourceTree]);

  return (
    <div className="flex h-full w-full flex-col">
      <ResizableSplit direction="horizontal" initialSize={30} minSize={15} maxSize={50}>
        <FileExplorePanel tree={sourceTree} stats={stats} onSelectNode={handleSelectNode} />
        <FileContentSection selectedContent={selectedContent} />
      </ResizableSplit>
    </div>
  );
}

export default SourcesPanel;
