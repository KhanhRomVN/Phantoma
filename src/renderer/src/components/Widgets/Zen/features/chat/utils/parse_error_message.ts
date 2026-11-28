// Parse error message to extract meaningful information
export const parseErrorMessage = (msg: string): string => {
  // ENOENT: no such file or directory, open '/path/to/file'
  const enoentMatch = msg.match(/ENOENT: no such file or directory, open '([^']+)'/);
  if (enoentMatch) {
    const filePath = enoentMatch[1];
    const fileName = filePath.split('/').pop() || filePath;
    return `Error: ${fileName} does not exist`;
  }

  // EACCES: permission denied, open '/path/to/file'
  const eaccesMatch = msg.match(/EACCES: permission denied, open '([^']+)'/);
  if (eaccesMatch) {
    const filePath = eaccesMatch[1];
    const fileName = filePath.split('/').pop() || filePath;
    return `Error: Permission denied to access ${fileName}`;
  }

  // EISDIR: illegal operation on a directory, read '/path/to/dir'
  const eisdirMatch = msg.match(
    /EISDIR: illegal operation on a directory, (?:open|read) '([^']+)'/,
  );
  if (eisdirMatch) {
    const dirPath = eisdirMatch[1];
    const dirName = dirPath.split('/').pop() || dirPath;
    return `Error: ${dirName} is a directory, not a file`;
  }

  // ENOTDIR: not a directory, open '/path/to/file'
  const enotdirMatch = msg.match(/ENOTDIR: not a directory, open '([^']+)'/);
  if (enotdirMatch) {
    const filePath = enotdirMatch[1];
    const fileName = filePath.split('/').pop() || filePath;
    return `Error: ${fileName} is not a directory`;
  }

  // Generic: remove "Error - " prefix if present
  let cleaned = msg.replace(/^Error - /, '');
  // Remove full path if present (keep only filename)
  cleaned = cleaned.replace(/\/[^\s]+/g, (match) => {
    const parts = match.split('/');
    return parts.length > 1 ? parts[parts.length - 1] : match;
  });
  return cleaned;
};