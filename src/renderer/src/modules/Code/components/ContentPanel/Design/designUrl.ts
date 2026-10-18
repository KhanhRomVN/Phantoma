function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function getDesignPageUrl(
  projectPath: string,
  designId: string,
  file: string,
  stamp = 0,
): string {
  return `phantoma-design://page/${toBase64Url(projectPath)}/${designId}/${encodeURIComponent(file)}?t=${stamp}`;
}