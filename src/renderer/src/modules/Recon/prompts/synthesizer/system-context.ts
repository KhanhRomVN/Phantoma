import type { SystemInfo } from '../types';

export const buildSynthesizerSystemContext = (info: SystemInfo): string => `# SYSTEM ENVIRONMENT
OS: ${info.os}, CWD: ${info.cwd}, Language: ${info.language}
## Limits
- All .recon paths are relative to the recon workspace root (e.g. _index.recon, _kv.recon, files/ghi-chu/tong-quan.md).
- Use forward slashes (/) in every path.
- Never write outside the recon workspace. Never overwrite _index.recon or a tab file with create_file — use update_file after read_file.
- The renderer parses .recon strictly. Only documented ui kinds and attributes are accepted; a malformed file will not render.
`;