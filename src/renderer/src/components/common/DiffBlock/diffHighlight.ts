import { useEffect, useState } from 'react';

interface HighlightLine {
  type: 'add' | 'del' | 'ctx' | 'meta';
  text: string;
}

interface HighlightHunk {
  lines: HighlightLine[];
}

const THEME_NAME = 'systema-active-theme';

const MONACO_LANGUAGE: Record<string, string> = {
  typescriptreact: 'typescript',
  javascriptreact: 'javascript',
};

let monacoPromise: Promise<any> | null = null;

function loadLoader(): Promise<void> {
  const w = window as any;
  if (!w.monacoLoadingPromise) {
    w.monacoLoadingPromise = new Promise<void>((resolve) => {
      if (document.querySelector('script[src*="vscode/loader.js"]') || w.require) {
        const timer = setInterval(() => {
          if (w.require) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
        return;
      }
      const script = document.createElement('script');
      script.src = new URL('monaco/vs/loader.js', document.baseURI).href;
      script.async = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }
  return w.monacoLoadingPromise;
}

function ensureMonaco(): Promise<any> {
  const w = window as any;
  if (w.monaco?.editor) return Promise.resolve(w.monaco);
  if (!monacoPromise) {
    monacoPromise = loadLoader().then(
      () =>
        new Promise<any>((resolve) => {
          if (w.monaco?.editor) {
            resolve(w.monaco);
            return;
          }
          w.require.config({ paths: { vs: new URL('monaco/vs', document.baseURI).href } });
          w.require(
            ['vs/editor/editor.main'],
            () => resolve(w.monaco),
            () => resolve(null),
          );
        }),
    );
  }
  return monacoPromise;
}

// ASSUMED: khi chưa có editor nào, dùng vs-dark giống theme mặc định của CodeBlock
function ensureTheme(monaco: any): void {
  if (monaco.editor.getEditors().length > 0) return;
  monaco.editor.defineTheme(THEME_NAME, { base: 'vs-dark', inherit: true, rules: [], colors: {} });
  monaco.editor.setTheme(THEME_NAME);
}

async function colorizeLines(monaco: any, texts: string[], languageId: string): Promise<string[]> {
  if (texts.length === 0) return [];
  const html: string = await monaco.editor.colorize(
    texts.join('\n'),
    MONACO_LANGUAGE[languageId] ?? languageId,
    { tabSize: 4 },
  );
  const parts = html.split('<br/>');
  if (parts.length === texts.length + 1 && parts[parts.length - 1] === '') parts.pop();
  return parts;
}

export function useDiffHighlight(
  hunks: HighlightHunk[],
  languageId: string,
  enabled: boolean,
): Map<object, string> {
  const [map, setMap] = useState<Map<object, string>>(() => new Map());

  useEffect(() => {
    if (!enabled || languageId === 'plaintext') {
      setMap(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const monaco = await ensureMonaco();
        if (!monaco || cancelled) return;
        ensureTheme(monaco);
        const next = new Map<object, string>();
        for (const h of hunks) {
          for (const side of ['old', 'new'] as const) {
            const changed = side === 'old' ? 'del' : 'add';
            const lines = h.lines.filter((l) => l.type === 'ctx' || l.type === changed);
            const out = await colorizeLines(
              monaco,
              lines.map((l) => l.text),
              languageId,
            );
            if (out.length !== lines.length) {
              continue;
            }
            lines.forEach((l, i) => next.set(l, out[i]));
          }
        }
        if (!cancelled) setMap(next);
      } catch (e) {
        console.error('[DEBUG] diffHighlight error:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hunks, languageId, enabled]);

  return map;
}