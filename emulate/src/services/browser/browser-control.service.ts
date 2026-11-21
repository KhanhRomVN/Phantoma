/**
 * ------------------------------------------------------------------
 * Browser Control Service
 * ------------------------------------------------------------------
 * Thực thi các tool điều khiển browser (browser-control agent) qua CDP.
 * Browser chạy ở emulate nên mọi thao tác chạy tại đây; renderer chỉ gọi API.
 *
 * Main exports:
 * - executeBrowserTool(tool, targetId, params) : Chạy một tool, trả text output
 * ------------------------------------------------------------------
 */

import * as fs from 'fs';
import * as path from 'path';
import { cdpService } from './cdp.service';
import { processManager } from '../runtime/process-manager.service';

type Params = Record<string, any>;
type Handler = (targetId: string, p: Params) => Promise<string>;

const NL = '\n';
const NO_SESSION = 'No active browser session. Call launch_browser first.';
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const KEY_CODES: Record<string, number> = {
  Enter: 13,
  Tab: 9,
  Escape: 27,
  Backspace: 8,
  Delete: 46,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Home: 36,
  End: 35,
  PageUp: 33,
  PageDown: 34,
  Space: 32,
};

function getClient(targetId: string): any {
  const client = cdpService.getClient(targetId);
  if (!client) throw new Error(NO_SESSION);
  return client;
}

function getPort(targetId: string): number {
  const port = cdpService.getPort(targetId);
  if (!port) throw new Error(NO_SESSION);
  return port;
}

async function evaluate(client: any, expression: string, awaitPromise = false): Promise<any> {
  const res = await client.Runtime.evaluate({ expression, returnByValue: true, awaitPromise });
  if (res.exceptionDetails) {
    throw new Error(
      res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Script error',
    );
  }
  return res.result?.value;
}

const selectorOf = (ref: unknown) => `[data-phantoma-ref='${String(ref).replace(/'/g, '')}']`;

const onElement = (ref: unknown, body: string) =>
  `(() => { const el = document.querySelector(${JSON.stringify(selectorOf(ref))}); if (!el) return { error: 'not_found' }; ${body} })()`;

async function runOnElement(client: any, ref: unknown, body: string): Promise<any> {
  if (!ref) throw new Error('ref is required');
  const res = await evaluate(client, onElement(ref, body));
  if (res?.error === 'not_found') {
    throw new Error(`Element '${ref}' not found. Call list_elements to refresh refs.`);
  }
  if (res?.error) throw new Error(String(res.error));
  return res;
}

async function elementCenter(client: any, ref: unknown): Promise<{ x: number; y: number }> {
  return runOnElement(
    client,
    ref,
    `el.scrollIntoView({ block: 'center', inline: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };`,
  );
}

async function listPages(port: number): Promise<any[]> {
  const res = await fetch(`http://127.0.0.1:${port}/json/list`);
  const all = (await res.json()) as any[];
  return all.filter((t) => t.type === 'page' && !String(t.url).startsWith('devtools://'));
}

async function ensureTab(targetId: string, tabId?: string): Promise<void> {
  if (tabId && tabId !== cdpService.getPageId(targetId)) {
    await cdpService.attach(getPort(targetId), targetId, String(tabId));
  }
}

async function waitForLoad(client: any, timeoutMs = 30000): Promise<void> {
  await sleep(300);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await evaluate(client, 'document.readyState').catch(() => null);
    if (state === 'complete') return;
    await sleep(200);
  }
}

async function moveHistory(targetId: string, delta: number): Promise<string> {
  const client = getClient(targetId);
  const history = await client.Page.getNavigationHistory();
  const entry = history.entries[history.currentIndex + delta];
  if (!entry) throw new Error(delta < 0 ? 'No previous page in history' : 'No next page in history');
  await client.Page.navigateToHistoryEntry({ entryId: entry.id });
  await waitForLoad(client);
  return `Now at ${entry.url}`;
}

function flattenFrames(node: any, out: string[]): void {
  out.push(`- ${node.frame.id} | ${node.frame.url}`);
  for (const child of node.childFrames || []) flattenFrames(child, out);
}

const HANDLERS: Record<string, Handler> = {
  close_browser: async (t) =>
    (await processManager.terminate(t)) ? 'Browser closed' : 'No running browser for this target',

  list_tabs: async (t) => {
    const pages = await listPages(getPort(t));
    const current = cdpService.getPageId(t);
    const lines = pages.map(
      (x) => `- ${x.id} | ${x.title || '(untitled)'} | ${x.url}${x.id === current ? ' (active)' : ''}`,
    );
    return `Total: ${pages.length}${NL}${lines.join(NL)}`;
  },

  create_tab: async (t, p) => {
    const port = getPort(t);
    const url = p.url ? String(p.url) : 'about:blank';
    const res = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
      method: 'PUT',
    });
    const tab = (await res.json()) as any;
    await cdpService.attach(port, t, tab.id);
    return `Created tab ${tab.id} (${url})`;
  },

  close_tab: async (t, p) => {
    if (!p.tabId) throw new Error('tabId is required');
    const port = getPort(t);
    const wasCurrent = p.tabId === cdpService.getPageId(t);
    await fetch(`http://127.0.0.1:${port}/json/close/${p.tabId}`);
    if (wasCurrent) {
      await sleep(300);
      const rest = await listPages(port);
      if (rest.length > 0) await cdpService.attach(port, t, rest[0].id);
      else await cdpService.disconnect(t);
    }
    return `Closed tab ${p.tabId}`;
  },

  switch_tab: async (t, p) => {
    if (!p.tabId) throw new Error('tabId is required');
    const port = getPort(t);
    await fetch(`http://127.0.0.1:${port}/json/activate/${p.tabId}`);
    await cdpService.attach(port, t, String(p.tabId));
    return `Switched to tab ${p.tabId}`;
  },

  navigate: async (t, p) => {
    if (!p.url) throw new Error('url is required');
    await ensureTab(t, p.tabId);
    const client = getClient(t);
    await client.Page.navigate({ url: String(p.url) });
    await waitForLoad(client);
    // ASSUMED: networkidle = load complete + 1s settle time (no in-flight request tracking)
    if (p.waitUntil === 'networkidle') await sleep(1000);
    return `Navigated to ${await evaluate(client, 'location.href')}`;
  },

  back: async (t) => moveHistory(t, -1),

  forward: async (t) => moveHistory(t, 1),

  reload: async (t) => {
    const client = getClient(t);
    await client.Page.reload({});
    await waitForLoad(client);
    return 'Page reloaded';
  },

  get_page_content: async (t, p) => {
    const client = getClient(t);
    const maxChars = Number(p.maxChars) > 0 ? Number(p.maxChars) : 20000;
    // ASSUMED: plain visible text (innerText), not full markdown conversion
    const text: string = await evaluate(
      client,
      `document.title + String.fromCharCode(10) + location.href + String.fromCharCode(10, 10) + (document.body ? document.body.innerText : '')`,
    );
    return text.length > maxChars
      ? `${text.slice(0, maxChars)}${NL}...[truncated ${text.length - maxChars} chars]`
      : text;
  },

  list_elements: async (t) => {
    const client = getClient(t);
    const items: any[] = await evaluate(
      client,
      `(() => {
        document.querySelectorAll('[data-phantoma-ref]').forEach((e) => e.removeAttribute('data-phantoma-ref'));
        const sel = 'a[href],button,input,select,textarea,[role=button],[role=link],[onclick],[contenteditable=true]';
        const out = [];
        let i = 0;
        document.querySelectorAll(sel).forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          const ref = 'e' + (++i);
          el.setAttribute('data-phantoma-ref', ref);
          out.push({ ref, tag: el.tagName.toLowerCase(), type: el.type || '', text: el.innerText || el.value || el.getAttribute('aria-label') || el.placeholder || '', href: el.href || '' });
        });
        return out;
      })()`,
    );
    const lines = items.map((e) => {
      const text = String(e.text).replace(/\s+/g, ' ').trim().slice(0, 80);
      return `- ${e.ref} | ${e.tag}${e.type ? `[${e.type}]` : ''} | ${text}${e.href ? ` | ${e.href}` : ''}`;
    });
    return `Total: ${items.length}${NL}${lines.join(NL)}`;
  },

  list_frames: async (t) => {
    const client = getClient(t);
    const { frameTree } = await client.Page.getFrameTree();
    const lines: string[] = [];
    flattenFrames(frameTree, lines);
    return `Total: ${lines.length}${NL}${lines.join(NL)}`;
  },

  capture_screenshot: async (t, p) => {
    const client = getClient(t);
    const fullPage = p.fullPage === true || String(p.fullPage) === 'true';
    const options: Record<string, any> = { format: 'jpeg', quality: 60 };
    if (fullPage) {
      const metrics = await client.Page.getLayoutMetrics();
      options.captureBeyondViewport = true;
      options.clip = {
        x: 0,
        y: 0,
        width: metrics.cssContentSize.width,
        height: metrics.cssContentSize.height,
        scale: 1,
      };
    }
    const shot = await client.Page.captureScreenshot(options);
    return `data:image/jpeg;base64,${shot.data}`;
  },

  click_element: async (t, p) => {
    const client = getClient(t);
    const { x, y } = await elementCenter(client, p.ref);
    await client.Input.dispatchMouseEvent({ type: 'mouseMoved', x, y });
    await client.Input.dispatchMouseEvent({ type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await client.Input.dispatchMouseEvent({ type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    return `Clicked ${p.ref}`;
  },

  fill_input: async (t, p) => {
    const client = getClient(t);
    await runOnElement(
      client,
      p.ref,
      `el.scrollIntoView({ block: 'center' }); el.focus(); if (typeof el.select === 'function') el.select(); return { ok: true };`,
    );
    await client.Input.insertText({ text: String(p.value ?? '') });
    return `Filled ${p.ref}`;
  },

  clear_input: async (t, p) => {
    const client = getClient(t);
    await runOnElement(
      client,
      p.ref,
      `el.focus(); if ('value' in el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); } else { el.textContent = ''; } return { ok: true };`,
    );
    return `Cleared ${p.ref}`;
  },

  select_option: async (t, p) => {
    const client = getClient(t);
    const value = JSON.stringify(String(p.value ?? ''));
    await runOnElement(
      client,
      p.ref,
      `if (el.tagName !== 'SELECT') return { error: 'Element is not a select' }; const v = ${value}; const o = Array.from(el.options).find((x) => x.value === v || x.text.trim() === v); if (!o) return { error: 'Option not found: ' + v }; el.value = o.value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return { ok: true };`,
    );
    return `Selected '${p.value}' in ${p.ref}`;
  },

  hover: async (t, p) => {
    const client = getClient(t);
    const { x, y } = await elementCenter(client, p.ref);
    await client.Input.dispatchMouseEvent({ type: 'mouseMoved', x, y });
    return `Hovered ${p.ref}`;
  },

  upload_file: async (t, p) => {
    if (!p.ref) throw new Error('ref is required');
    if (!p.file_path) throw new Error('file_path is required');
    const client = getClient(t);
    // ASSUMED: relative file_path resolves against the emulate server working directory
    const abs = path.resolve(String(p.file_path));
    if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);
    await client.DOM.enable();
    const node = await client.Runtime.evaluate({
      expression: `document.querySelector(${JSON.stringify(selectorOf(p.ref))})`,
    });
    const objectId = node.result?.objectId;
    if (!objectId) throw new Error(`Element '${p.ref}' not found. Call list_elements to refresh refs.`);
    await client.DOM.setFileInputFiles({ files: [abs], objectId });
    return `Uploaded ${abs} to ${p.ref}`;
  },

  press_key: async (t, p) => {
    if (!p.key) throw new Error('key is required');
    const client = getClient(t);
    const name = String(p.key);
    const key = name === 'Space' ? ' ' : name;
    const vk = KEY_CODES[name] ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
    const text = key === 'Enter' ? String.fromCharCode(13) : key.length === 1 ? key : undefined;
    await client.Input.dispatchKeyEvent({
      type: text ? 'keyDown' : 'rawKeyDown',
      key,
      text,
      windowsVirtualKeyCode: vk,
    });
    await client.Input.dispatchKeyEvent({ type: 'keyUp', key, windowsVirtualKeyCode: vk });
    return `Pressed ${name}`;
  },

  scroll: async (t, p) => {
    const client = getClient(t);
    const amount = Number(p.amount) > 0 ? Number(p.amount) : 600;
    const direction = String(p.direction || 'down');
    const dx = direction === 'left' ? -amount : direction === 'right' ? amount : 0;
    const dy = direction === 'up' ? -amount : direction === 'down' ? amount : 0;
    const y = await evaluate(client, `(window.scrollBy(${dx}, ${dy}), Math.round(window.scrollY))`);
    return `Scrolled ${direction} ${amount}px (scrollY=${y})`;
  },

  scroll_to_element: async (t, p) => {
    const client = getClient(t);
    await runOnElement(
      client,
      p.ref,
      `el.scrollIntoView({ block: 'center', inline: 'center' }); return { ok: true };`,
    );
    return `Scrolled to ${p.ref}`;
  },

  wait_for: async (t, p) => {
    const client = getClient(t);
    const condition = String(p.condition || 'load');
    const timeoutMs = Number(p.timeoutMs) > 0 ? Number(p.timeoutMs) : 10000;
    if (condition === 'timeout') {
      await sleep(timeoutMs);
      return `Waited ${timeoutMs}ms`;
    }
    if (condition === 'load' || condition === 'networkidle') {
      await waitForLoad(client, timeoutMs);
      if (condition === 'networkidle') await sleep(800);
      return `Condition '${condition}' met`;
    }
    // ASSUMED: any other condition value is a CSS selector to wait for
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = await evaluate(client, `!!document.querySelector(${JSON.stringify(condition)})`);
      if (found) return `Selector '${condition}' found`;
      await sleep(250);
    }
    throw new Error(`Timeout after ${timeoutMs}ms waiting for '${condition}'`);
  },

  evaluate_js: async (t, p) => {
    if (!p.script) throw new Error('script is required');
    const client = getClient(t);
    const value = await evaluate(client, `(async () => { ${p.script} })()`, true);
    return value === undefined ? 'undefined' : JSON.stringify(value);
  },
};

export async function executeBrowserTool(
  tool: string,
  targetId: string,
  params: Params = {},
): Promise<string> {
  const handler = HANDLERS[tool];
  if (!handler) throw new Error(`Unknown browser tool: ${tool}`);
  return `[${tool}] ${await handler(targetId, params)}`;
}