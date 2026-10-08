/**
 * Lightweight client-side stack detector for UI preview purposes.
 * Maps common extensions and files to Language/Framework IDs compatible with favicon service.
 */

export interface ContributorInfo {
  username: string;
  avatarUrl?: string; // Fallback to GitHub favicon if not provided
}

export interface BranchInfo {
  name: string;
  lastCommitDate?: number; // Timestamp
  commitCount?: number;
}

export interface LanguageStat {
  id: string; // e.g., 'typescript'
  name: string; // Display Name
  percentage: number; // 0-100
}

export interface StackInfo {
  primaryLanguage?: string; // e.g., 'typescript', 'python'
  frameworks: string[]; // e.g., ['react', 'vite']

  // Extended Info for Detail Panel
  repoUrl?: string;
  author?: string;
  sizeBytes?: number;
  contributors?: ContributorInfo[];
  languages?: LanguageStat[];
  branches?: BranchInfo[];
}

// Simple mapping of extensions to language IDs (matching standard registry IDs)
const EXT_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  rb: 'ruby',
  php: 'php',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  swift: 'swift',
  kt: 'kotlin',
};

// Simple heuristic based on package.json dependencies or specific files
function detectFromManifest(files: string[], contentHints?: Record<string, string>): StackInfo {
  const langs = new Set<string>();
  const fwks = new Set<string>();

  // Detect languages by extension presence
  for (const f of files) {
    const ext = f.split('.').pop()?.toLowerCase();
    if (ext && EXT_MAP[ext]) langs.add(EXT_MAP[ext]);
  }

  // Detect frameworks via simple string matching in hypothetical package.json or known files
  // In a real scenario, we'd parse JSON. Here we rely on the caller providing hints or just checking filenames.
  if (files.includes('package.json')) {
    // If we had content, we'd check deps. For now, assume Node ecosystem if package.json exists
    // We'll defer detailed framework detection to the IPC call if available,
    // but for immediate UI feedback, we can guess based on other files.

    if (files.some((f) => f.startsWith('src/') || f.endsWith('.tsx'))) {
      // Likely React/Vue/Angular/Svelte depending on config files
      if (files.includes('next.config.js') || files.includes('next.config.ts')) fwks.add('nextjs');
      else if (files.includes('vite.config.ts') || files.includes('vite.config.js'))
        fwks.add('vite');
      else if (files.includes('angular.json')) fwks.add('angular');
      else if (files.includes('svelte.config.js')) fwks.add('svelte');
      else if (files.includes('nuxt.config.ts')) fwks.add('nuxt');

      // Default frontend guess if TSX/JSX present
      if (!fwks.size && files.some((f) => f.endsWith('.tsx'))) fwks.add('react');
    }
  }

  if (files.includes('requirements.txt') || files.includes('pyproject.toml')) {
    langs.add('python');
    if (files.includes('manage.py')) fwks.add('django');
    if (files.includes('app.py') || files.includes('main.py')) fwks.add('flask'); // weak signal
  }

  if (files.includes('go.mod')) {
    langs.add('go');
    if (files.some((f) => f.includes('gin-gonic'))) fwks.add('gin');
  }

  if (files.includes('Cargo.toml')) {
    langs.add('rust');
    if (files.some((f) => f.includes('tauri'))) fwks.add('tauri');
  }

  return {
    primaryLanguage: Array.from(langs)[0] || undefined,
    frameworks: Array.from(fwks),
  };
}

/**
 * Fetches a list of top-level files from the project path via IPC.
 * Falls back to empty array if IPC fails.
 */
async function getProjectFiles(path: string): Promise<string[]> {
  try {
    // Assuming there is an IPC handler 'fs:list-files-shallow' or similar.
    // Since none exists explicitly in the provided snippets, we might need to use 'fs:readdir' if available.
    // For safety, returning empty implies "unknown".
    // NOTE: This requires a corresponding main-process handler.
    // If not present, this will fail gracefully.
    const res = await window.api.invoke('fs:list-dir', path);
    if (Array.isArray(res)) return res.map((f: any) => f.name || f);
    return [];
  } catch {
    return [];
  }
}

export async function detectProjectStack(path: string): Promise<StackInfo> {
  const files = await getProjectFiles(path);
  if (!files.length) return { frameworks: [], languages: [], contributors: [], branches: [] };

  const baseInfo = detectFromManifest(files);

  // Calculate Size roughly based on file list length * avg size (placeholder until proper FS stat implemented)
  // In a real app, you'd call another IPC 'fs:get-directory-size'
  const estimatedSize = files.length * 1024 * 50;

  // Generate Languages breakdown from detected primary/frameworks
  const languageStats: LanguageStat[] = [];
  if (baseInfo.primaryLanguage) {
    languageStats.push({
      id: baseInfo.primaryLanguage,
      name: baseInfo.primaryLanguage.charAt(0).toUpperCase() + baseInfo.primaryLanguage.slice(1),
      percentage: 70,
    });
  }
  // Add secondary guesses if frameworks imply other langs (e.g. React implies JS/TS)
  if (baseInfo.frameworks.includes('react') && !languageStats.find((l) => l.id === 'javascript')) {
    languageStats.push({ id: 'javascript', name: 'JavaScript', percentage: 20 });
    languageStats.push({ id: 'css', name: 'CSS', percentage: 10 });
  }

  // FETCH REAL GIT INFO VIA IPC
  let gitInfo: any = null;
  try {
    // Assumes 'git:get-project-info' handler exists in Main Process
    gitInfo = await window.api.invoke('git:get-project-info', path);
  } catch (err) {
    console.error('[ERROR DetectStack] Failed to fetch git info via IPC:', err);
    // Fallback to empty/null values if IPC fails (not a git repo or handler missing)
  }

  return {
    ...baseInfo,
    sizeBytes: estimatedSize,
    languages: languageStats,

    // Merge Git Info
    repoUrl: gitInfo?.repoUrl,
    author: gitInfo?.author,
    contributors: gitInfo?.contributors || [],
    branches: gitInfo?.branches || [],
  };
}
