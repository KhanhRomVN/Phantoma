import { ipcMain, app, protocol } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { net } from 'electron';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import {
  designStorage,
  slugToProjectPath,
  type CreateDesignInput,
  type UpdateDesignInput,
} from '../storage/DesignStorage';
import { logger } from '../utils/logger';

const DESIGN_SCHEME = 'phantoma-design';
const MEDIA_SCHEME = 'media';

protocol.registerSchemesAsPrivileged([
  { scheme: DESIGN_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: MEDIA_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function registerMediaProtocol(): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      const raw = request.url.slice(`${MEDIA_SCHEME}://`.length).split(/[?#]/)[0];
      const filePath = decodeURIComponent(raw.startsWith('/') ? raw : `/${raw}`);
      if (!path.isAbsolute(filePath)) return new Response('Not found', { status: 404 });
      return await net.fetch(pathToFileURL(filePath).toString());
    } catch (e: any) {
      logger.error('[media protocol] Error:', e);
      return new Response('Not found', { status: 404 });
    }
  });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

function errorHtml(message: string): string {
  return `<!doctype html><html><body style="margin:0;padding:16px;background:#1a0f0f;color:#ff8080;font:12px ui-monospace,monospace;white-space:pre-wrap">${escapeHtml(message)}</body></html>`;
}

async function compilePage(
  projectPath: string,
  designId: string,
  pageFile: string,
): Promise<string> {
  const designRoot = designStorage.getDesignRoot(projectPath, designId);
  const pagePath = designStorage.getDesignFilePath(projectPath, designId, pageFile);

  const bundle = await build({
    stdin: {
      contents: [
        "import { createRoot } from 'react-dom/client';",
        `import Page from ${JSON.stringify(pagePath)};`,
        "createRoot(document.getElementById('root')!).render(<Page />);",
      ].join('\n'),
      loader: 'tsx',
      resolveDir: designRoot,
      sourcefile: 'entry.tsx',
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    jsx: 'automatic',
    nodePaths: [path.join(app.getAppPath(), 'node_modules')],
    define: { 'process.env.NODE_ENV': '"development"' },
    logLevel: 'silent',
  });
  const js = bundle.outputFiles[0].text;

  const css = (
    await postcss([
      tailwindcss({
        content: [{ raw: designStorage.readSources(projectPath, designId), extension: 'tsx' }],
      }),
    ]).process('@tailwind base;@tailwind components;@tailwind utilities;', {
      from: undefined,
    })
  ).css;

  const safeJs = js.split('</script').join('<\u005c/script');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><style>*{scrollbar-width:none}*::-webkit-scrollbar{display:none}</style></head><body><div id="root"></div><script>${safeJs}</script></body></html>`;
}

function registerDesignProtocol(): void {
  protocol.handle(DESIGN_SCHEME, async (request) => {
    const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' };
    try {
      const url = new URL(request.url);
      const [slug, designId, ...rest] = url.pathname
        .split('/')
        .filter(Boolean)
        .map(decodeURIComponent);
      const html = await compilePage(slugToProjectPath(slug), designId, rest.join('/'));
      return new Response(html, { headers });
    } catch (e: any) {
      logger.error('[design protocol] Error:', e);
      return new Response(errorHtml(e?.message || String(e)), { status: 500, headers });
    }
  });
}

export function setupDesignHandlers(): void {
  registerDesignProtocol();
  registerMediaProtocol();

  ipcMain.handle('design:list', async (_event, projectPath: string) => {
    try {
      return { success: true, data: designStorage.listDesigns(projectPath) };
    } catch (e: any) {
      logger.error('[design:list] Error:', e);
      return { success: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle(
    'design:create',
    async (_event, projectPath: string, input: CreateDesignInput) => {
      try {
        return { success: true, data: designStorage.createDesign(projectPath, input) };
      } catch (e: any) {
        logger.error('[design:create] Error:', e);
        return { success: false, error: e.message || String(e) };
      }
    },
  );

  ipcMain.handle(
    'design:update',
    async (_event, projectPath: string, designId: string, updates: UpdateDesignInput) => {
      try {
        const design = designStorage.updateDesign(projectPath, designId, updates);
        if (!design) return { success: false, error: 'Design not found' };
        return { success: true, data: design };
      } catch (e: any) {
        logger.error('[design:update] Error:', e);
        return { success: false, error: e.message || String(e) };
      }
    },
  );

  ipcMain.handle('design:list-files', async (_event, projectPath: string, designId: string) => {
    try {
      return { success: true, data: designStorage.listFiles(projectPath, designId) };
    } catch (e: any) {
      logger.error('[design:list-files] Error:', e);
      return { success: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle(
    'design:read-file',
    async (_event, projectPath: string, designId: string, fileName: string) => {
      try {
        return { success: true, data: designStorage.readFile(projectPath, designId, fileName) };
      } catch (e: any) {
        logger.error('[design:read-file] Error:', e);
        return { success: false, error: e.message || String(e) };
      }
    },
  );

  ipcMain.handle(
    'design:write-file',
    async (_event, projectPath: string, designId: string, fileName: string, content: string) => {
      try {
        const { created } = designStorage.writeFile(projectPath, designId, fileName, content);
        const isPage = created && /\.tsx$/.test(fileName) && /export\s+default/.test(content);
        const node = isPage ? designStorage.addPageNode(projectPath, designId, fileName) : undefined;
        return { success: true, data: { created, node } };
      } catch (e: any) {
        logger.error('[design:write-file] Error:', e);
        return { success: false, error: e.message || String(e) };
      }
    },
  );

  ipcMain.handle(
    'design:compile-page',
    async (_event, projectPath: string, designId: string, pageFile: string) => {
      try {
        return { success: true, data: await compilePage(projectPath, designId, pageFile) };
      } catch (e: any) {
        logger.error('[design:compile-page] Error:', e);
        return { success: false, error: e.message || String(e) };
      }
    },
  );

  ipcMain.handle('design:delete', async (_event, projectPath: string, designId: string) => {
    try {
      const deleted = designStorage.deleteDesign(projectPath, designId);
      if (!deleted) return { success: false, error: 'Design not found' };
      return { success: true };
    } catch (e: any) {
      logger.error('[design:delete] Error:', e);
      return { success: false, error: e.message || String(e) };
    }
  });
}