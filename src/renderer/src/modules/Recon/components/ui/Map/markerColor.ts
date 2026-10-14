export const getMarkerColor = (tone?: string) => {
  if (tone === 'danger') return '#ff5c7a';
  if (tone === 'warn') return '#f5c542';
  return '#ff9f43';
};