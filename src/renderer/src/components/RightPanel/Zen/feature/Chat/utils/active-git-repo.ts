import { execSync } from "child_process";

/**
 * Checks if the given directory is inside a git repository.
 * Returns the absolute path to the root of the git repo, or null if not found.
 */
export function getActiveGitRepoRoot(dirPath: string): string | null {
  try {
    const result = execSync("git rev-parse --show-toplevel", {
      cwd: dirPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}