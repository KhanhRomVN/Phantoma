import { useState, useEffect, useMemo } from 'react';
import { detectWasmModules } from '../../../../utils/detectors';
import { NetworkRequest } from '../Intruder/Filter';
import { ResourceItem, ResourceType, getFileType, formatSize, TYPE_LABELS } from './types';
import { ResourceList } from './ResourceList';
import { ResourcePreview } from './ResourcePreview';

interface ResourcesPanelProps {
  requests?: NetworkRequest[];
  onClose?: () => void;
  onCountChange?: (count: number) => void;
}

export function ResourcesPanel({ requests = [], onClose, onCountChange }: ResourcesPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<ResourceType>>(
    new Set(['image', 'video', 'audio', 'wasm', 'font', 'document']),
  );
  const [cacheManifest, setCacheManifest] = useState<Record<string, { size?: number }>>({});

  // Fetch cache manifest
  useEffect(() => {
    const fetchManifest = async () => {
      try {
        const manifest = await (window as any).api.invoke('media:get-cache-manifest');
        setCacheManifest(manifest);
      } catch (e) {
        // Ignore if not available
      }
    };
    fetchManifest();
    const interval = setInterval(fetchManifest, 3000);
    return () => clearInterval(interval);
  }, []);

  // Detect WASM modules
  const wasmItems = useMemo(() => detectWasmModules(requests), [requests]);

  // Build resource items from requests
  const resourceItems = useMemo(() => {
    const items: ResourceItem[] = [];
    const seen = new Set<string>();

    // Add WASM items
    wasmItems.forEach((wasm) => {
      const request = requests.find((r) => r.id === wasm.id);
      if (request) {
        const key = request.url;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            id: wasm.id,
            filename: wasm.filename,
            url: request.url,
            path: request.path,
            type: 'wasm',
            contentType: 'application/wasm',
            size: request.size || 'Unknown',
            timestamp: request.timestamp || Date.now(),
            source: request.url.split('?')[0],
            responseBody: request.responseBody,
            isWasm: true,
            wasmItem: wasm,
          });
        }
      }
    });

    // Add media resources from requests
    requests.forEach((req) => {
      const type = getFileType(
        req.responseHeaders?.['content-type'] || req.responseHeaders?.['Content-Type'] || '',
        req.path,
      );

      if (type === 'other' || type === 'wasm') return;

      const key = req.url;
      if (seen.has(key)) return;
      seen.add(key);

      const cachedEntry = cacheManifest[req.id];
      const size = cachedEntry?.size ? formatSize(cachedEntry.size) : req.size || 'Unknown';

      items.push({
        id: req.id,
        filename: req.path.split('/').pop()?.split('?')[0] || 'unknown',
        url: req.url,
        path: req.path,
        type,
        contentType:
          req.responseHeaders?.['content-type'] ||
          req.responseHeaders?.['Content-Type'] ||
          'unknown',
        size: size === '0 B' ? 'Unknown' : size,
        timestamp: req.timestamp || Date.now(),
        source: req.url.split('?')[0].substring(0, req.url.split('?')[0].lastIndexOf('/') + 1),
        responseBody: req.responseBody,
      });
    });

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [requests, wasmItems, cacheManifest]);

  // Notify parent of count change
  useEffect(() => {
    if (onCountChange) {
      onCountChange(resourceItems.length);
    }
  }, [resourceItems.length, onCountChange]);

  // Group items by type
  const groupedItems = useMemo(() => {
    const groups: Record<ResourceType, ResourceItem[]> = {
      image: [],
      video: [],
      audio: [],
      wasm: [],
      font: [],
      document: [],
      other: [],
    };

    resourceItems.forEach((item) => {
      if (groups[item.type]) {
        groups[item.type].push(item);
      } else {
        groups.other.push(item);
      }
    });

    // Sort each group by filename
    Object.keys(groups).forEach((key) => {
      groups[key as ResourceType].sort((a, b) => a.filename.localeCompare(b.filename));
    });

    return groups;
  }, [resourceItems]);

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedItems;

    const term = searchTerm.toLowerCase();
    const filtered: Record<ResourceType, ResourceItem[]> = {
      image: [],
      video: [],
      audio: [],
      wasm: [],
      font: [],
      document: [],
      other: [],
    };

    Object.entries(groupedItems).forEach(([type, items]) => {
      filtered[type as ResourceType] = items.filter(
        (item) =>
          item.filename.toLowerCase().includes(term) ||
          item.contentType.toLowerCase().includes(term) ||
          item.path.toLowerCase().includes(term),
      );
    });

    return filtered;
  }, [groupedItems, searchTerm]);

  // Get selected item
  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return resourceItems.find((item) => item.id === selectedId) || null;
  }, [resourceItems, selectedId]);

  // Auto-select first item when resources load or when selected item is removed
  useEffect(() => {
    if (resourceItems.length === 0) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }

    const isSelectedIdValid = selectedId !== null && resourceItems.some((item) => item.id === selectedId);
    
    if (!isSelectedIdValid) {
      setSelectedId(resourceItems[0].id);
    }
  }, [resourceItems, selectedId]);

  const toggleGroup = (type: ResourceType) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const totalCount = resourceItems.length;

  return (
    <div className="flex h-full overflow-hidden">
      <ResourceList
        groupedItems={filteredGroups}
        expandedGroups={expandedGroups}
        onToggleGroup={toggleGroup}
        selectedId={selectedId}
        onSelectItem={setSelectedId}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        totalCount={totalCount}
      />
      <ResourcePreview item={selectedItem} />
    </div>
  );
}

export default ResourcesPanel;