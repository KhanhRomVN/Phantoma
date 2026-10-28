import type { SystemInfo } from '../types';

export const buildLocalOperatorSystemContext = (info: SystemInfo): string => `# SYSTEM ENVIRONMENT
OS: ${info.os}, Shell: ${info.shell}, Home: ${info.homeDir}, CWD: ${info.cwd}, Language: ${info.language}
## Limits
- run_command runs in a PTY with a piped stdin (not a TTY). If a command needs interactive input, use "printf ... >&2; read x" — never plain "read -p".
- Commands are validated against a blocklist (sudo, su, doas, rm -rf /, dd to /dev, curl|bash, wget|bash, mkfs, fork bomb). Attempting one returns a validation error, it is not run.
- Use forward slashes (/) in every path.
- Throwaway scripts go under files/scripts/ in the recon workspace; never write a .recon file.
`;