/**
 * Source Tree Builder
 * Parse URLs into hierarchical tree structure like DevTools Sources tab
 * 
 * Example:
 * https://fe-static.deepseek.com/chat/static/87321.87453ce690.js
 * 
 * Becomes:
 * fe-static.deepseek.com/
 *   └─ chat/
 *       └─ static/
 *           └─ 87321.87453ce690.js
 */

export interface SourceNode {
  id: string;
  name: string;
  type: 'domain' | 'folder' | 'file';
  path: string;
  url?: string;
  children?: SourceNode[];
  size?: number;
  scriptId?: string;
  staticSource?: string;
  unpackedSource?: string;
  isDifferent?: boolean;
  compressionRatio?: string;
}

export interface SourceTreeData {
  roots: SourceNode[];
  flatMap: Map<string, SourceNode>;
}

/**
 * Parse URL into path segments
 */
export function parseUrl(url: string): { domain: string; path: string[]; filename: string } | null {
  try {
    // Handle blob URLs
    if (url.startsWith('blob:')) {
      const blobId = url.split('/').pop() || 'blob';
      return {
        domain: 'blob',
        path: [],
        filename: blobId,
      };
    }

    // Handle inline scripts
    if (url === 'https://chat.deepseek.com/' || url.endsWith('/')) {
      const urlObj = new URL(url);
      return {
        domain: urlObj.host,
        path: [],
        filename: '(inline)',
      };
    }

    const urlObj = new URL(url);
    const domain = urlObj.host;
    
    // Remove leading/trailing slashes and split
    const pathParts = urlObj.pathname.replace(/^\/|\/$/g, '').split('/');
    
    // Last part is filename, rest are folders
    const filename = pathParts.pop() || 'index.js';
    const path = pathParts;

    return { domain, path, filename };
  } catch (e) {
    console.warn('[SourceTree] Failed to parse URL:', url, e);
    return null;
  }
}

/**
 * Find or create node in tree
 */
function findOrCreateNode(
  parent: SourceNode | null,
  roots: SourceNode[],
  flatMap: Map<string, SourceNode>,
  name: string,
  type: 'domain' | 'folder' | 'file',
  fullPath: string,
): SourceNode {
  // Check if already exists
  const existing = flatMap.get(fullPath);
  if (existing) {
    return existing;
  }

  // Create new node
  const node: SourceNode = {
    id: fullPath,
    name,
    type,
    path: fullPath,
    children: type === 'file' ? undefined : [],
  };

  // Add to parent or roots
  if (parent) {
    if (!parent.children) parent.children = [];
    parent.children.push(node);
  } else {
    roots.push(node);
  }

  // Add to flat map
  flatMap.set(fullPath, node);

  return node;
}

/**
 * Build source tree from URLs
 */
export function buildSourceTree(sources: Array<{
  url: string;
  size?: number;
  scriptId?: string;
  staticSource?: string;
  unpackedSource?: string;
  isDifferent?: boolean;
  compressionRatio?: string;
}>): SourceTreeData {
  const roots: SourceNode[] = [];
  const flatMap = new Map<string, SourceNode>();

  for (const source of sources) {
    const parsed = parseUrl(source.url);
    if (!parsed) continue;

    const { domain, path, filename } = parsed;

    // Create domain node
    const domainPath = domain;
    const domainNode = findOrCreateNode(null, roots, flatMap, domain, 'domain', domainPath);

    // Create folder nodes
    let currentParent = domainNode;
    let currentPath = domainPath;

    for (const folder of path) {
      currentPath = `${currentPath}/${folder}`;
      currentParent = findOrCreateNode(
        currentParent,
        roots,
        flatMap,
        folder,
        'folder',
        currentPath,
      );
    }

    // Create file node
    const filePath = `${currentPath}/${filename}`;
    const fileNode = findOrCreateNode(
      currentParent,
      roots,
      flatMap,
      filename,
      'file',
      filePath,
    );

    // Add metadata to file node
    fileNode.url = source.url;
    fileNode.size = source.size;
    fileNode.scriptId = source.scriptId;
    fileNode.staticSource = source.staticSource;
    fileNode.unpackedSource = source.unpackedSource;
    fileNode.isDifferent = source.isDifferent;
    fileNode.compressionRatio = source.compressionRatio;
  }

  // Sort children alphabetically (folders first, then files)
  function sortChildren(node: SourceNode) {
    if (node.children) {
      node.children.sort((a, b) => {
        // Folders before files
        if (a.type !== b.type) {
          return a.type === 'file' ? 1 : -1;
        }
        // Alphabetical
        return a.name.localeCompare(b.name);
      });

      // Recursively sort children
      node.children.forEach(sortChildren);
    }
  }

  roots.forEach(sortChildren);

  return { roots, flatMap };
}

/**
 * Find node by URL
 */
export function findNodeByUrl(tree: SourceTreeData, url: string): SourceNode | undefined {
  const parsed = parseUrl(url);
  if (!parsed) return undefined;

  const { domain, path, filename } = parsed;
  const filePath = [domain, ...path, filename].join('/');
  
  return tree.flatMap.get(filePath);
}

/**
 * Get all files from tree (flatten)
 */
export function getAllFiles(tree: SourceTreeData): SourceNode[] {
  const files: SourceNode[] = [];

  function traverse(node: SourceNode) {
    if (node.type === 'file') {
      files.push(node);
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  tree.roots.forEach(traverse);
  return files;
}

/**
 * Search files by name or content
 */
export function searchFiles(
  tree: SourceTreeData,
  query: string,
  options?: {
    searchInContent?: boolean;
    caseSensitive?: boolean;
  },
): SourceNode[] {
  const { searchInContent = false, caseSensitive = false } = options || {};
  const files = getAllFiles(tree);

  const normalizedQuery = caseSensitive ? query : query.toLowerCase();

  return files.filter((file) => {
    const normalizedName = caseSensitive ? file.name : file.name.toLowerCase();

    // Search in filename
    if (normalizedName.includes(normalizedQuery)) {
      return true;
    }

    // Search in content
    if (searchInContent && file.unpackedSource) {
      const normalizedContent = caseSensitive
        ? file.unpackedSource
        : file.unpackedSource.toLowerCase();
      return normalizedContent.includes(normalizedQuery);
    }

    return false;
  });
}

/**
 * Get tree statistics
 */
export function getTreeStats(tree: SourceTreeData): {
  totalDomains: number;
  totalFolders: number;
  totalFiles: number;
  totalSize: number;
  differentFiles: number;
} {
  let totalDomains = 0;
  let totalFolders = 0;
  let totalFiles = 0;
  let totalSize = 0;
  let differentFiles = 0;

  function traverse(node: SourceNode) {
    if (node.type === 'domain') totalDomains++;
    if (node.type === 'folder') totalFolders++;
    if (node.type === 'file') {
      totalFiles++;
      if (node.size) totalSize += node.size;
      if (node.isDifferent) differentFiles++;
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  tree.roots.forEach(traverse);

  return {
    totalDomains,
    totalFolders,
    totalFiles,
    totalSize,
    differentFiles,
  };
}

/**
 * Export tree as JSON
 */
export function exportTreeAsJson(tree: SourceTreeData): string {
  return JSON.stringify(tree.roots, null, 2);
}

/**
 * Format file size
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
