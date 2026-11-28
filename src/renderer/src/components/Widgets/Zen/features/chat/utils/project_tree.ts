export const getShallowTree = (tree: string): string => {
  const lines = tree.split('\n');
  const result: string[] = [];
  let currentFolder: string | null = null;
  let fileCount = 0;

  const flush = () => {
    if (currentFolder !== null) {
      result.push(`${currentFolder} (${fileCount} files)`);
      currentFolder = null;
      fileCount = 0;
    }
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    const isTopLevel = !/^ /.test(line);
    if (isTopLevel) {
      flush();
      if (line.trimEnd().endsWith('/')) {
        currentFolder = line.trimEnd();
      } else {
        result.push(line);
      }
    } else if (currentFolder !== null) {
      if (!line.trimEnd().endsWith('/')) fileCount++;
    }
  }
  flush();
  return result.join('\n');
};
