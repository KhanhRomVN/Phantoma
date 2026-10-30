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
  isCurrent?: boolean;
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
function detectFromManifest(files: string[]): StackInfo {
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

export interface RemoteLogoCandidate {
  path: string;
  name: string;
  width: number;
  height: number;
  src: string;
}

export async function detectRemoteLogos(url: string): Promise<RemoteLogoCandidate[]> {
  const m = url.trim().match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  if (!m) return [];
  const [, owner, repo] = m;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`);
  if (!res.ok) return [];
  const data = await res.json();
  const tree: { path: string; type: string }[] = Array.isArray(data?.tree) ? data.tree : [];
  return tree
    .filter(
      (n) =>
        n.type === 'blob' &&
        /\.(png|jpe?g|svg|webp|ico)$/i.test(n.path) &&
        /(logo|icon|favicon|brand|avatar)/i.test(n.path) &&
        !/(^|\/)(node_modules|dist|build)\//.test(n.path),
    )
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length)
    .slice(0, 8)
    .map((n) => ({
      path: n.path,
      name: n.path.split('/').pop() ?? n.path,
      width: 0,
      height: 0,
      src: `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${n.path}`,
    }));
}

export async function detectRemoteStack(url: string): Promise<StackInfo> {
  const empty: StackInfo = { frameworks: [], languages: [], contributors: [], branches: [] };
  const m = url.trim().match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  if (!m) return empty;
  const [, owner, repo] = m;
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const get = async (suffix: string) => {
    const res = await fetch(`${base}${suffix}`);
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  };
  const [info, langs, contribs, branches] = await Promise.allSettled([
    get(''),
    get('/languages'),
    get('/contributors?per_page=6'),
    get('/branches?per_page=6'),
  ]);

  const langBytes: Record<string, number> =
    langs.status === 'fulfilled' && langs.value ? langs.value : {};
  const total = Object.values(langBytes).reduce((a, b) => a + b, 0);
  const languages: LanguageStat[] = total
    ? Object.entries(langBytes)
        .sort((a, b) => b[1] - a[1])
        .map(([name, bytes]) => ({
          id: name.toLowerCase(),
          name,
          percentage: Math.round((bytes / total) * 1000) / 10,
        }))
    : [];

  const infoValue = info.status === 'fulfilled' ? info.value : undefined;

  return {
    primaryLanguage: languages[0]?.id,
    frameworks: [],
    repoUrl: infoValue?.html_url ?? url.trim(),
    author: infoValue?.owner?.login ?? owner,
    sizeBytes: infoValue?.size ? infoValue.size * 1024 : undefined,
    languages,
    contributors:
      contribs.status === 'fulfilled' && Array.isArray(contribs.value)
        ? contribs.value.map((c: any) => ({ username: c.login, avatarUrl: c.avatar_url }))
        : [],
    branches:
      branches.status === 'fulfilled' && Array.isArray(branches.value)
        ? branches.value
            .map((b: any) => ({ name: b.name, isCurrent: b.name === infoValue?.default_branch }))
            .sort((a: BranchInfo, b: BranchInfo) => Number(!!b.isCurrent) - Number(!!a.isCurrent))
        : [],
  };
}

export async function detectProjectStack(path: string): Promise<StackInfo> {
  const files = await getProjectFiles(path);
  if (!files.length) return { frameworks: [], languages: [], contributors: [], branches: [] };

  const baseInfo = detectFromManifest(files);

  // Calculate Size roughly based on file list length * avg size (placeholder until proper FS stat implemented)
  // In a real app, you'd call another IPC 'fs:get-directory-size'
  const estimatedSize = files.length * 1024 * 50;

  let languageStats: LanguageStat[] = [];
  try {
    const res = await window.api.invoke('git:get-language-stats', path);
    if (Array.isArray(res)) languageStats = res;
  } catch (err) {
    console.error('[ERROR DetectStack] Failed to fetch language stats via IPC:', err);
  }

  // FETCH REAL GIT INFO VIA IPC
  let gitInfo: any = null;
  try {
    // Assumes 'git:get-repo-info' handler exists in Main Process
    gitInfo = await window.api.invoke('git:get-repo-info', path);
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
