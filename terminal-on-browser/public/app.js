/* global Terminal, FitAddon */

// ============ Terminal ============
const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#d4d4d4'
  },
  scrollback: 10000,
  allowProposedApi: true
});

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
term.open(document.getElementById('terminal'));

function fitTerminal() {
  try { fitAddon.fit(); } catch (_) {}
}
fitTerminal();
window.addEventListener('resize', fitTerminal);

const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
const ptyWs = new WebSocket(`${proto}//${location.host}/pty`);
let ptyReady = false;

ptyWs.addEventListener('open', () => {
  ptyReady = true;
  fitTerminal();
  sendResize();
});

ptyWs.addEventListener('message', (ev) => {
  try {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'output') term.write(msg.data);
    else if (msg.type === 'exit') {
      term.write(`\r\n\x1b[33m[process exited with code ${msg.exitCode}]\x1b[0m\r\n`);
      ptyReady = false;
    }
  } catch (_) {}
});

ptyWs.addEventListener('close', () => {
  ptyReady = false;
  term.write('\r\n\x1b[31m[disconnected from server]\x1b[0m\r\n');
});

term.onData((data) => {
  if (ptyReady && ptyWs.readyState === WebSocket.OPEN) {
    ptyWs.send(JSON.stringify({ type: 'input', data }));
  }
});

function sendResize() {
  if (ptyReady && ptyWs.readyState === WebSocket.OPEN) {
    ptyWs.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
  }
}

if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => fitTerminal());
  ro.observe(document.getElementById('terminal'));
}
term.onResize(() => sendResize());

// ============ HTTPS panel ============
const panel = document.getElementById('panel');
const toggleBtn = document.getElementById('toggle-panel');
const closeBtn = document.getElementById('close-panel');
const listEl = document.getElementById('panel-list');
const statusEl = document.getElementById('panel-status');
const clearBtn = document.getElementById('clear-list');

toggleBtn.addEventListener('click', () => {
  panel.classList.toggle('open');
  setTimeout(fitTerminal, 250);
});
closeBtn.addEventListener('click', () => {
  panel.classList.remove('open');
  setTimeout(fitTerminal, 250);
});
clearBtn.addEventListener('click', () => { listEl.innerHTML = ''; });

const logWs = new WebSocket(`${proto}//${location.host}/log`);

function setStatus(text) { statusEl.textContent = text; }

/** Chuẩn hoá timestamp thành HH:MM:SS để hiển thị gọn. */
function fmtTime(ts) {
  const d = new Date(ts || Date.now());
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Escape HTML để nhét text vào innerHTML an toàn. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

/** Chọn class màu theo status HTTP. */
function statusClass(status) {
  if (!status) return 's0';
  if (status >= 500) return 's5';
  if (status >= 400) return 's4';
  if (status >= 300) return 's3';
  return 's2';
}

/** Render body (object { length, truncated, text }) thành chuỗi hiển thị. */
function fmtBody(body) {
  if (!body) return '(không có)';
  if (body.truncated) return `[truncated — tổng ${body.length} bytes]`;
  if (body.text == null) return `[binary — ${body.length} bytes]`;
  return body.text.length ? body.text : `(rỗng — ${body.length} bytes)`;
}

/** Render một object header thành text nhiều dòng. */
function fmtHeaders(h) {
  const keys = Object.keys(h || {});
  if (!keys.length) return '(không có)';
  return keys.map((k) => `${k}: ${h[k]}`).join('\n');
}

/** Thêm 1 dòng log text vào panel. */
function addLog(line) {
  const div = document.createElement('div');
  div.className = 'req log-line';
  const cls = line.type === 'warn' ? 's4' : line.type === 'error' ? 's5' : 's2';
  div.innerHTML = `
    <span class="req-status ${cls}">${esc(line.type || 'info')}</span>
    <span class="req-time">${fmtTime(line.ts)}</span>
    <span class="req-url"></span>
  `;
  div.querySelector('.req-url').textContent = line.message || '';
  listEl.prepend(div);
  trimList();
}

/** Thêm 1 entry request HTTPS vào panel (có thể expand). */
function addRequestEntry(entry) {
  const wrap = document.createElement('div');
  wrap.className = 'req request-entry';
  const stCls = statusClass(entry.status);
  const method = esc(entry.method || '?');
  const url = esc(entry.url || '');
  wrap.innerHTML = `
    <div class="req-row">
      <span class="req-method">${method}</span>
      <span class="req-status ${stCls}">${entry.status || '—'}</span>
      <span class="req-url" title="${url}">${url}</span>
      <span class="req-time">${fmtTime(entry.ts)}</span>
      <span class="req-dur">${entry.durationMs || 0}ms</span>
    </div>
    <div class="req-detail" hidden>
      <div class="detail-block">
        <div class="detail-title">Request headers</div>
        <pre>${esc(fmtHeaders(entry.requestHeaders))}</pre>
      </div>
      <div class="detail-block">
        <div class="detail-title">Request body</div>
        <pre>${esc(fmtBody(entry.requestBody))}</pre>
      </div>
      <div class="detail-block">
        <div class="detail-title">Response headers</div>
        <pre>${esc(fmtHeaders(entry.responseHeaders))}</pre>
      </div>
      <div class="detail-block">
        <div class="detail-title">Response body</div>
        <pre>${esc(fmtBody(entry.responseBody))}</pre>
      </div>
    </div>
  `;
  wrap.querySelector('.req-row').addEventListener('click', () => {
    const d = wrap.querySelector('.req-detail');
    d.hidden = !d.hidden;
  });
  listEl.prepend(wrap);
  trimList();
}

/** Giới hạn 500 entry để tránh phình DOM. */
function trimList() {
  while (listEl.childElementCount > 500) listEl.removeChild(listEl.lastChild);
}

logWs.addEventListener('open', () => setStatus('Đã kết nối kênh HTTPS.'));
logWs.addEventListener('close', () => setStatus('Mất kết nối kênh HTTPS.'));

logWs.addEventListener('message', (ev) => {
  let msg;
  try { msg = JSON.parse(ev.data); } catch (_) { return; }
  if (!msg) return;
  if (msg.type === 'request') addRequestEntry(msg);
  else if (msg.message) addLog(msg);
});

window.addEventListener('load', () => {
  fitTerminal();
  term.focus();
});