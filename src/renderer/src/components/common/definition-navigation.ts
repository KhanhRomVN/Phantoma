import { useCodeStore } from '@renderer/modules/Code/hooks/useCodeStore';

interface Found {
  file: string;
  line: number;
  col: number;
  length: number;
}

interface PathConfig {
  baseDir: string;
  paths: Record<string, string[]>;
}

const MAX_TEMP_MODELS = 10;
const MAX_REEXPORT_HOPS = 4;
const MAX_PREVIEW_CHARS = 1_000_000;
const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.d.ts', '.json'];
const IMPORT_RE = /\b(?:import|export)\s+(?:type\s+)?([\w$\s,{}*]*?)\s*\bfrom\s*(['"])([^'"\n]+)\2/g;
const SIDE_IMPORT_RE = /(?:\bimport\s*\(?|\brequire\s*\()\s*(['"])([^'"\n]+)\1/g;

const modelFiles: Map<string, string> = ((window as any).__phantomaModelFiles ??= new Map<
  string,
  string
>());
const tempModels = new Map<string, any>();
let lastDefinition: { modelUri: string; uri: any; range: any } | null = null;
const configCache = new Map<string, Promise<PathConfig | null>>();

const invoke = (channel: string, ...args: any[]): Promise<any> =>
  (window as any).api.invoke(channel, ...args);

const dirname = (p: string) => p.slice(0, p.lastIndexOf('/'));

const normalize = (p: string) => {
  const out: string[] = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') out.pop();
    else out.push(seg);
  }
  return '/' + out.join('/');
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const posAt = (content: string, index: number) => {
  const before = content.slice(0, index);
  return { line: before.split('\n').length, col: index - before.lastIndexOf('\n') };
};

const stripJsonComments = (raw: string) =>
  raw
    .replace(/("(?:\\.|[^"\\])*")|\/\/.*$|\/\*[\s\S]*?\*\//gm, (_m, str) => str ?? '')
    .replace(/,(\s*[}\]])/g, '$1');

async function listDir(dir: string): Promise<Map<string, 'file' | 'folder'> | null> {
  try {
    const entries: { name: string; type: 'file' | 'folder' }[] = await invoke('fs:read-dir', dir);
    return new Map(entries.map((e) => [e.name, e.type]));
  } catch {
    return null;
  }
}

async function resolveFile(base: string): Promise<string | null> {
  const dir = dirname(base);
  const name = base.slice(dir.length + 1);
  const entries = await listDir(dir);
  if (!entries) return null;
  const stripped = name.replace(/\.(m|c)?jsx?$/, '');
  const names = [name, ...SOURCE_EXTS.map((ext) => name + ext)];
  if (stripped !== name) names.push(stripped + '.ts', stripped + '.tsx');
  for (const n of names) {
    if (entries.get(n) === 'file') return dir + '/' + n;
  }
  if (entries.get(name) === 'folder') {
    const inner = await listDir(base);
    if (inner) {
      for (const ext of SOURCE_EXTS) {
        if (inner.get('index' + ext) === 'file') return base + '/index' + ext;
      }
    }
  }
  return null;
}

async function findRoot(file: string): Promise<string | null> {
  let dir = dirname(file);
  while (dir) {
    if ((await listDir(dir))?.get('package.json') === 'file') return dir;
    dir = dirname(dir);
  }
  return null;
}

async function loadPathConfig(root: string): Promise<PathConfig | null> {
  const paths: Record<string, string[]> = {};
  let baseDir = root;
  const entries = await listDir(root);
  for (const name of ['tsconfig.web.json', 'tsconfig.json', 'tsconfig.app.json']) {
    if (entries?.get(name) !== 'file') continue;
    try {
      const json = JSON.parse(stripJsonComments(await invoke('fs:read-file', root + '/' + name)));
      const options = json.compilerOptions ?? {};
      if (!options.paths) continue;
      Object.assign(paths, options.paths);
      if (options.baseUrl) baseDir = normalize(root + '/' + options.baseUrl);
    } catch {
      continue;
    }
  }
  return Object.keys(paths).length ? { baseDir, paths } : null;
}

// ASSUMED: tsconfig không đổi trong phiên làm việc — upgrade path: invalidate cache khi tsconfig thay đổi
function getPathConfig(file: string): Promise<PathConfig | null> {
  const key = dirname(file);
  let cached = configCache.get(key);
  if (!cached) {
    cached = findRoot(file).then((root) => (root ? loadPathConfig(root) : null));
    configCache.set(key, cached);
  }
  return cached;
}

async function resolveSpecifier(spec: string, fromFile: string): Promise<string | null> {
  if (spec.startsWith('.')) return resolveFile(normalize(dirname(fromFile) + '/' + spec));
  const config = await getPathConfig(fromFile);
  if (!config) return null;
  for (const [pattern, targets] of Object.entries(config.paths)) {
    const star = pattern.indexOf('*');
    let rest: string | null = null;
    if (star === -1) {
      if (spec === pattern) rest = '';
    } else {
      const prefix = pattern.slice(0, star);
      const suffix = pattern.slice(star + 1);
      if (
        spec.startsWith(prefix) &&
        spec.endsWith(suffix) &&
        spec.length >= prefix.length + suffix.length
      ) {
        rest = spec.slice(prefix.length, spec.length - suffix.length);
      }
    }
    if (rest === null) continue;
    for (const target of targets) {
      const resolved = await resolveFile(
        normalize(config.baseDir + '/' + target.replace('*', rest)),
      );
      if (resolved) return resolved;
    }
  }
  return null;
}

function parseBindings(clause: string) {
  const bindings: { local: string; imported: string }[] = [];
  let namespace: string | undefined;
  const braceStart = clause.indexOf('{');
  const braceEnd = clause.indexOf('}');
  const head = braceStart === -1 ? clause : clause.slice(0, braceStart);
  head
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => {
      const ns = part.match(/^\*\s*as\s+([\w$]+)$/);
      if (ns) namespace = ns[1];
      else if (/^[\w$]+$/.test(part)) bindings.push({ local: part, imported: 'default' });
    });
  if (braceStart !== -1) {
    const inner = clause.slice(braceStart + 1, braceEnd === -1 ? undefined : braceEnd);
    inner.split(',').forEach((raw) => {
      const m = raw
        .trim()
        .replace(/^type\s+/, '')
        .match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
      if (m) bindings.push({ local: m[2] ?? m[1], imported: m[1] });
    });
  }
  return { bindings, namespace };
}

async function findDeclaration(file: string, name: string, hops = 0): Promise<Found | null> {
  if (hops > MAX_REEXPORT_HOPS) return null;
  let content: string;
  try {
    content = await invoke('fs:read-file', file);
  } catch {
    return null;
  }
  const at = (index: number, length: number): Found => ({
    file,
    ...posAt(content, index),
    length,
  });
  const findLocal = (id: string): Found | null => {
    const m = new RegExp(
      `\\b(?:(?:async\\s+)?function\\*?|const|let|var|class|interface|type|enum|namespace)\\s+${escapeRe(id)}(?![\\w$])`,
    ).exec(content);
    return m ? at(m.index + m[0].length - id.length, id.length) : null;
  };
  const exportEntries = (list: string) =>
    list
      .split(',')
      .map((raw) =>
        raw
          .trim()
          .replace(/^type\s+/, '')
          .match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/),
      )
      .filter((e): e is RegExpMatchArray => !!e);

  if (name === 'default') {
    const m =
      /\bexport\s+default\s+(?:abstract\s+)?(?:async\s+)?(function\*?\s+|class\s+)?([\w$]+)?/.exec(
        content,
      );
    if (!m) return null;
    const id = m[2];
    if (m[1] && id && id !== 'extends') return at(m.index + m[0].length - id.length, id.length);
    if (id && !m[1]) {
      const local = findLocal(id);
      if (local) return local;
    }
    return at(m.index, 'export default'.length);
  }

  const declaration = new RegExp(
    `\\bexport\\s+(?:declare\\s+)?(?:abstract\\s+)?(?:(?:async\\s+)?function\\*?|const|let|var|class|interface|type|enum|namespace)\\s+${escapeRe(name)}(?![\\w$])`,
  ).exec(content);
  if (declaration) {
    return at(declaration.index + declaration[0].length - name.length, name.length);
  }

  for (const m of content.matchAll(
    /\bexport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*(['"])([^'"\n]+)\2/g,
  )) {
    for (const entry of exportEntries(m[1])) {
      if ((entry[2] ?? entry[1]) !== name) continue;
      const target = await resolveSpecifier(m[3], file);
      if (!target) continue;
      const found = await findDeclaration(target, entry[1], hops + 1);
      if (found) return found;
    }
  }

  for (const m of content.matchAll(/\bexport\s+(?:type\s+)?\{([^}]*)\}(?!\s*from)/g)) {
    for (const entry of exportEntries(m[1])) {
      if ((entry[2] ?? entry[1]) !== name) continue;
      const local = findLocal(entry[1]);
      if (local) return local;
    }
  }

  for (const m of content.matchAll(/\bexport\s+\*\s+from\s*(['"])([^'"\n]+)\1/g)) {
    const target = await resolveSpecifier(m[2], file);
    if (!target) continue;
    const found = await findDeclaration(target, name, hops + 1);
    if (found) return found;
  }

  return null;
}

async function ensureModelUri(file: string, currentFile: string, currentModel: any) {
  if (file === currentFile) return currentModel.uri;
  const monaco = (window as any).monaco;
  const uri = monaco.Uri.file(file);
  const key = uri.toString();
  let content: string;
  try {
    content = await invoke('fs:read-file', file);
  } catch {
    return uri;
  }
  const existing = monaco.editor.getModel(uri);
  if (existing) {
    if (tempModels.has(key) && existing.getValue() !== content) existing.setValue(content);
    return uri;
  }
  if (content.length > MAX_PREVIEW_CHARS) return uri;
  tempModels.set(key, monaco.editor.createModel(content, undefined, uri));
  while (tempModels.size > MAX_TEMP_MODELS) {
    const [oldKey, oldModel] = tempModels.entries().next().value as [string, any];
    oldModel.dispose();
    tempModels.delete(oldKey);
  }
  return uri;
}

function disposeTempModels() {
  tempModels.forEach((model) => model.dispose());
  tempModels.clear();
}

async function provideDefinition(model: any, position: any) {
  const currentFile = modelFiles.get(model.uri.toString());
  if (!currentFile) return null;
  const monaco = (window as any).monaco;
  const text: string = model.getValue();
  const offset: number = model.getOffsetAt(position);
  const word: string | undefined = model.getWordAtPosition(position)?.word;

  const locate = async (target: string | null, name?: string) => {
    if (!target) return null;
    const found: Found = (name ? await findDeclaration(target, name) : null) ?? {
      file: target,
      line: 1,
      col: 1,
      length: 1,
    };
    const uri = await ensureModelUri(target, currentFile, model);
    return [
      { uri, range: new monaco.Range(found.line, found.col, found.line, found.col + found.length) },
    ];
  };

  for (const m of text.matchAll(IMPORT_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const specStart = end - m[3].length - 1;
    if (offset >= specStart && offset < end) {
      return locate(await resolveSpecifier(m[3], currentFile));
    }
    if (!word) continue;
    const inClause = offset >= start && offset < specStart;
    if (!inClause && !text.startsWith('import', start)) continue;
    const { bindings, namespace } = parseBindings(m[1]);
    const binding = bindings.find((b) => b.local === word || (inClause && b.imported === word));
    if (binding) return locate(await resolveSpecifier(m[3], currentFile), binding.imported);
    if (namespace === word) return locate(await resolveSpecifier(m[3], currentFile));
  }

  const line: string = model.getLineContent(position.lineNumber);
  const col = position.column - 1;
  for (const m of line.matchAll(SIDE_IMPORT_RE)) {
    const specStart = (m.index ?? 0) + m[0].length - m[2].length - 1;
    if (col >= specStart && col <= specStart + m[2].length) {
      return locate(await resolveSpecifier(m[2], currentFile));
    }
  }
  return null;
}

function openInApp(source: any, resource: any, selectionOrPosition: any): boolean {

  const sourceUri = source.getModel()?.uri;
  if (
    lastDefinition &&
    sourceUri &&
    lastDefinition.modelUri === sourceUri.toString() &&
    resource.toString() === sourceUri.toString()
  ) {
    resource = lastDefinition.uri;
    selectionOrPosition = lastDefinition.range;
  }
  if (resource.scheme !== 'file') return false;
  if (sourceUri && sourceUri.toString() === resource.toString()) return false;
  const state = useCodeStore.getState();
  const sessionId = state.activeWorkspaceSessionId;
  if (!sessionId) return false;
  const line = selectionOrPosition?.startLineNumber ?? selectionOrPosition?.lineNumber;
  const column = selectionOrPosition?.startColumn ?? selectionOrPosition?.column;
  const filePath: string = resource.path;
  state.requestOpenFile(
    sessionId,
    filePath,
    filePath.slice(filePath.lastIndexOf('/') + 1),
    line ? { line, column } : undefined,
  );
  setTimeout(disposeTempModels, 300);
  return true;
}

export function registerModelFile(model: any, filePath: string) {
  const key = model.uri.toString();
  modelFiles.set(key, filePath);
  model.onWillDispose(() => modelFiles.delete(key));
}

export function setupDefinitionNavigation() {
  const w = window as any;
  if (!w.monaco) return;
  // ASSUMED: HMR giữ nguyên window nên provider cũ còn sống — dispose rồi đăng ký lại bằng code mới
  w.__phantomaDefinitionNavDisposables?.forEach((d: any) => d?.dispose?.());

  w.__phantomaDefinitionNavDisposables = [
    w.monaco.languages.registerDefinitionProvider(['typescript', 'javascript'], {
      provideDefinition: (model: any, position: any) =>
        provideDefinition(model, position)
          .then((result) => {
            // ASSUMED: provider luôn chạy xong trước opener ở cùng lần click — upgrade path: gắn theo vị trí chuột
            lastDefinition = result?.[0]
              ? { modelUri: model.uri.toString(), uri: result[0].uri, range: result[0].range }
              : null;
            return result;
          })
          .catch(() => null),
    }),
    w.monaco.editor.registerEditorOpener?.({
      openCodeEditor: (source: any, resource: any, selectionOrPosition: any) =>
        openInApp(source, resource, selectionOrPosition),
    }),
  ];
}