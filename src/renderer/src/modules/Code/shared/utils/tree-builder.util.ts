/**
 * ------------------------------------------------------------------
 * Tree Builder
 * ------------------------------------------------------------------
 * Build hierarchical tree structure từ flat list of file paths.
 * Dùng trong DeleteFileRenderer để hiển thị file tree.
 *
 * Main types:
 * - FileNode : Node trong tree structure (file hoặc folder)
 *
 * Main functions:
 * - buildTreeFromPaths() : Build tree structure từ flat list paths
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

// ─── Functions ──────────────────────────────────────────────────────────
/**
 * Build tree structure from flat list of paths
 */
export const buildTreeFromPaths = (paths: string[]): FileNode[] => {
  const root: FileNode = {
    name: '',
    type: 'folder',
    path: '',
    children: [],
  };

  for (const fullPath of paths) {
    const segments = fullPath.split('/').filter(Boolean);
    let currentNode = root;

    segments.forEach((segment, index) => {
      const isLastSegment = index === segments.length - 1;
      const hasExtension = segment.includes('.');
      const isFile = isLastSegment && hasExtension;

      if (!currentNode.children) {
        currentNode.children = [];
      }

      let childNode = currentNode.children.find((child) => child.name === segment);

      if (!childNode) {
        const pathSoFar = segments.slice(0, index + 1).join('/');
        childNode = {
          name: segment,
          type: isFile ? 'file' : 'folder',
          path: pathSoFar,
          children: isFile ? undefined : [],
        };
        currentNode.children.push(childNode);
      }

      if (!isFile) {
        currentNode = childNode;
      }
    });
  }

  return root.children || [];
};