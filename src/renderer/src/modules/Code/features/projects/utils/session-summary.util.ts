export const mkSum = (
  tokens: number,
  cost: number,
  added: number,
  removed: number,
  files: number,
  duration: string,
) => ({ tokens, cost, added, removed, files, duration });