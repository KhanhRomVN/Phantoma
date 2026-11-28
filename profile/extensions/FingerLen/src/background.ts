import {
  SCAN_STATE_KEY,
  type PageStatus,
  type RawPages,
  type ScanCommand,
  type ScanState,
  type ScanTarget,
} from './types';
import { SCAN_TARGETS, TAB_LOAD_TIMEOUT_MS } from './scan/targets';
import { scrapePage } from './scan/scrape';
import { buildScanData } from './scan/build/index';

const NEWTAB_URL = chrome.runtime.getURL('fingerlen.html');
const RESCRAPE_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 5000;
const DEBOUNCE_MS = 1000;
const RECREATE_DELAY_MS = 3000;

interface Session {
  tabIds: Set<number>;
  cancelled: boolean;
}

let session: Session | null = null;

/* ───────────────────────── Trạng thái → storage.session ───────────────────────── */

let state: ScanState = { phase: 'idle', progress: 0, pages: {} };

async function publish(patch: Partial<ScanState>): Promise<void> {
  state = { ...state, ...patch };
  await chrome.storage.session.set({ [SCAN_STATE_KEY]: state });
}

/* ─────────────────────────────── Tiện ích tab ─────────────────────────────── */

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(msg)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function waitTabComplete(tabId: number, ms: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const done = (fn: () => void) => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      fn();
    };
    const onUpdated = (id: number, info: { status?: string }) => {
      if (id === tabId && info.status === 'complete') done(resolve);
    };
    const onRemoved = (id: number) => {
      if (id === tabId) done(() => reject(new Error('Tab bị đóng trước khi tải xong')));
    };
    const timer = setTimeout(() => done(() => reject(new Error('Tải trang quá thời gian'))), ms);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
    // Trường hợp tab đã complete trước khi gắn listener
    chrome.tabs.get(tabId).then(
      (t) => {
        if (t.status === 'complete') done(resolve);
      },
      () => {
        /* sẽ do onRemoved xử lý */
      },
    );
  });
}

const TABS_KEY = 'scanTabIds';

/** Lưu id tab đang mở để nếu service worker bị khởi động lại vẫn dọn được. */
const persistTabs = (s: Session) => chrome.storage.session.set({ [TABS_KEY]: [...s.tabIds] });

/** Đóng toàn bộ tab đã mở của lần quét. Không bao giờ throw. */
async function closeAllTabs(s: Session): Promise<void> {
  const ids = [...s.tabIds];
  s.tabIds.clear();
  await Promise.all(
    ids.map((id) =>
      chrome.tabs.remove(id).catch(() => {
        /* tab đã đóng */
      }),
    ),
  );
  await chrome.storage.session.remove(TABS_KEY).catch(() => {});
}

/* ─────────────────────── Theo dõi thay đổi DOM (MutationObserver) ─────────────────────── */

const dirty = new Set<string>();
const wakers = new Map<string, () => void>();

function sleepOrWake(id: string, ms: number): Promise<void> {
  if (dirty.has(id)) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(t);
      wakers.delete(id);
      resolve();
    };
    const t = setTimeout(done, ms);
    wakers.set(id, done);
  });
}

/** Chạy TRONG tab: báo về background mỗi khi DOM thay đổi (debounce 800ms). Phải tự chứa. */
function installObserver(pageId: string): void {
  const w = window as any;
  if (w.__ftcObserver) return;
  let timer: number | undefined;
  const notify = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      try {
        chrome.runtime.sendMessage({ type: 'scan:dirty', pageId }).catch(() => {});
      } catch {
        /* context invalidated */
      }
    }, 800);
  };
  w.__ftcObserver = new MutationObserver(notify);
  w.__ftcObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
  });
}

/* ───────────────────────────────── Quét liên tục ───────────────────────────────── */

async function startScan(): Promise<void> {
  if (session) return; // đang chạy
  const s: Session = { tabIds: new Set(), cancelled: false };
  session = s;

  const pages: ScanState['pages'] = {};
  SCAN_TARGETS.forEach((t) => {
    pages[t.id] = { status: 'pending' };
  });
  await publish({
    phase: 'running',
    progress: 0,
    pages,
    data: undefined,
    error: undefined,
    startedAt: Date.now(),
    finishedAt: undefined,
  });

  // Giữ service worker sống suốt thời gian theo dõi
  const keepAlive = setInterval(() => void chrome.runtime.getPlatformInfo(), 20000);
  const raw: RawPages = {};
  const sigs: Record<string, string> = {};

  const setPage = async (id: string, status: PageStatus, error?: string) => {
    if (s.cancelled) return;
    const cur = state.pages[id];
    if (cur && cur.status === status && cur.error === error) return;
    const next = { ...state.pages, [id]: { status, error } };
    const okCount = Object.values(next).filter((p) => p.status === 'ok').length;
    await publish({ pages: next, progress: Math.round((okCount / SCAN_TARGETS.length) * 100) });
  };

  const pushData = async () => {
    if (s.cancelled) return;
    try {
      await publish({ data: buildScanData(raw) });
    } catch (e) {
      console.error('buildScanData failed', e);
    }
  };

  const scrapeOnce = async (
    target: ScanTarget,
    tabId: number,
    timeoutMs: number,
  ): Promise<Record<string, any>> => {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: installObserver,
      args: [target.id],
    });
    const injected = await withTimeout(
      chrome.scripting.executeScript({
        target: { tabId },
        func: scrapePage,
        args: [target.id, timeoutMs],
      }),
      timeoutMs + 15000,
      'Đọc DOM quá thời gian',
    );
    const data = injected?.[0]?.result as Record<string, any> | undefined;
    if (!data) throw new Error('Không nhận được dữ liệu từ trang');
    if (data.__error) throw new Error(String(data.__error));
    if (!Object.keys(data).some((k) => !k.startsWith('__')))
      throw new Error('Trang chưa có dữ liệu (DOM chưa render?)');

    // ASSUMED: Lưu DOM snapshot vào folder dom-snapshots/ qua downloads API
    try {
      const tab = await chrome.tabs.get(tabId);
      const url = tab.url || target.url;
      const fileName = url.replace(/^https?:\/\//, '').replace(/[\/?#:*|"<>]/g, '_') + '.html';
      const domResult = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.documentElement.outerHTML,
      });
      const html = domResult?.[0]?.result as string | undefined;
      if (html) {
        const blob = new Blob([html], { type: 'text/html' });
        const dataUrl = URL.createObjectURL(blob);
        await chrome.downloads.download({
          url: dataUrl,
          filename: `dom-snapshots/${fileName}`,
          saveAs: false,
          conflictAction: 'overwrite',
        });
        URL.revokeObjectURL(dataUrl);
      }
    } catch (e) {
      console.warn(`[${target.id}] Failed to capture DOM:`, e);
    }

    return data;
  };

  const watch = async (target: ScanTarget) => {
    let hadData = false;
    while (!s.cancelled) {
      let tabId: number | undefined;
      try {
        await setPage(target.id, 'loading');
        const tab = await chrome.tabs.create({ url: target.url, active: false });
        if (tab.id === undefined) throw new Error('Không tạo được tab');
        tabId = tab.id;
        s.tabIds.add(tabId);
        await persistTabs(s);
        if (s.cancelled) return;

        await waitTabComplete(tabId, TAB_LOAD_TIMEOUT_MS);
        if (s.cancelled) return;
        await setPage(target.id, 'scraping');

        for (;;) {
          if (s.cancelled) return;
          dirty.delete(target.id);
          try {
            const data = await scrapeOnce(
              target,
              tabId,
              hadData ? RESCRAPE_TIMEOUT_MS : target.timeoutMs,
            );
            const stable: Record<string, any> = {};
            for (const k of Object.keys(data)) if (!k.startsWith('__')) stable[k] = data[k];
            const sig = JSON.stringify(stable);
            if (sig !== sigs[target.id]) {
              sigs[target.id] = sig;
              raw[target.id] = data;
              hadData = true;
              Object.entries(stable).forEach(([k, v]) => {
                const preview =
                  typeof v === 'string' && v.length > 100 ? v.slice(0, 100) + '...' : v;
              });
              await setPage(target.id, 'ok');
              await pushData();
            } else {
              await setPage(target.id, 'ok');
            }
          } catch (e: any) {
            if (s.cancelled) return;
            await chrome.tabs.get(tabId); // throw nếu tab đã đóng → tạo lại tab ở vòng ngoài
            console.error(`[${target.id}] ❌ Scrape failed:`, e?.message || e);
            if (!hadData) await setPage(target.id, 'error', String(e?.message || e));
          }
          await sleepOrWake(target.id, POLL_INTERVAL_MS);
          await pause(DEBOUNCE_MS);
        }
      } catch (e: any) {
        if (s.cancelled) return;
        console.error(`[${target.id}] ❌ Tab error:`, e?.message || e);
        if (!hadData) await setPage(target.id, 'error', String(e?.message || e));
      }
      if (tabId !== undefined) {
        s.tabIds.delete(tabId);
        await chrome.tabs.remove(tabId).catch(() => {
          /* tab đã đóng */
        });
        await persistTabs(s);
      }
      await pause(RECREATE_DELAY_MS);
    }
  };

  try {
    await Promise.all(SCAN_TARGETS.map((t) => watch(t)));
  } finally {
    clearInterval(keepAlive);
    // Log tổng kết: trang nào lấy được data, trang nào lỗi
    const summary: Record<string, string[]> = { ok: [], failed: [] };
    for (const [id, data] of Object.entries(raw)) {
      const keys = Object.keys(data).filter((k) => !k.startsWith('__'));
      if (keys.length) summary.ok.push(`${id} (${keys.length} fields)`);
    }
    for (const target of SCAN_TARGETS) {
      if (!raw[target.id])
        summary.failed.push(`${target.id} (${state.pages[target.id]?.error || 'no data'})`);
    }
    summary.ok.forEach((s) => console.log('  -', s));
    summary.failed.forEach((s) => console.log('  -', s));
  }
}

async function stopScan(): Promise<void> {
  const s = session;
  if (!s) return;
  s.cancelled = true;
  [...wakers.values()].forEach((w) => w());
  dirty.clear();
  await closeAllTabs(s);
  session = null;
  await publish({ phase: 'idle', progress: 0, pages: {}, data: undefined, error: undefined });
}

/* ───────────────────────────────── Messaging ───────────────────────────────── */

chrome.runtime.onMessage.addListener((msg: ScanCommand, _sender, sendResponse) => {
  if (msg?.type === 'scan:start') {
    void startScan();
    sendResponse({ ok: true });
  } else if (msg?.type === 'scan:stop') {
    void stopScan().then(() => sendResponse({ ok: true }));
    return true;
  } else if (msg?.type === 'scan:dirty') {
    dirty.add(msg.pageId);
    wakers.get(msg.pageId)?.();
  }
  return false;
});

/* ───────────────────────── Lúc cài đặt: chuyển tab New Tab cũ ───────────────────────── */

chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    const url = tab.url || tab.pendingUrl || '';
    if (tab.id !== undefined && /^chrome:\/\/newtab\/?$/.test(url))
      await chrome.tabs.update(tab.id, { url: NEWTAB_URL });
  }
});

/* Tab mồ côi từ lần quét trước (service worker bị tắt giữa chừng) → đóng hết. */
void chrome.storage.session.get(TABS_KEY).then(async (r) => {
  const ids = (r[TABS_KEY] as number[] | undefined) || [];
  if (ids.length && !session) {
    await Promise.all(ids.map((id) => chrome.tabs.remove(id).catch(() => {})));
    await chrome.storage.session.remove(TABS_KEY);
  }
});

/* Service worker khởi động lại giữa chừng (hiếm) → không còn tab nào được theo dõi: dọn trạng thái "running" treo. */
void chrome.storage.session.get(SCAN_STATE_KEY).then((r) => {
  const prev = r[SCAN_STATE_KEY] as ScanState | undefined;
  if (prev?.phase === 'running' && !session) {
    state = {
      ...prev,
      phase: 'error',
      error: 'Lần quét bị gián đoạn (service worker khởi động lại)',
      finishedAt: Date.now(),
    };
    void chrome.storage.session.set({ [SCAN_STATE_KEY]: state });
  } else if (prev) state = prev;
});
