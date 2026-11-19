import { useMemo, useState } from "react";
import {
  Smartphone, Monitor, Laptop, Server, Apple, Search, Plus, Play, Square, RotateCw, Power, X, Filter,
  LayoutGrid, List, Layers, FolderTree, ScrollText, CalendarClock, Globe, Activity, Cpu,
  MemoryStick, HardDrive, BatteryMedium, BatteryLow, PlugZap, Thermometer, Wifi, WifiOff, ShieldAlert, Lock, Wrench, Download, Terminal,
  CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, ArrowRightLeft, Zap, MoreHorizontal, Upload,
  Trash2, Copy, Radio, History, ChevronRight, Pause, Users, FileCode2, Gauge, MapPin, Tag,
} from "lucide-react";

/* ───────── Theme (khớp file theme của bạn) ───────── */
const T = {
  primary: "rgb(139,109,255)", success: "rgb(52,211,153)", error: "rgb(244,63,94)", warn: "rgb(251,191,36)",
  info: "rgb(34,211,238)", pink: "rgb(244,114,182)", blue: "rgb(96,165,250)", orange: "rgb(251,146,60)",
  bg: "rgb(7,7,13)", panel: "rgb(10,10,18)", card: "rgb(15,15,26)", hover: "rgb(23,23,40)",
  dropdown: "rgb(17,17,29)", dropHover: "rgb(26,26,45)", border: "rgb(38,38,58)",
  text: "rgb(244,244,251)", sub: "rgb(154,154,184)", gray: "rgb(106,106,140)",
};
const a = (c, o) => c.replace("rgb(", "rgba(").replace(")", `,${o})`);

/* ───────── StatusUI ───────── */
const STATUS = {
  online:      { label: "Online",      color: T.success, icon: Wifi,          pulse: true },
  busy:        { label: "Running",     color: T.primary, icon: Loader2,       spin: true },
  idle:        { label: "Idle",        color: T.info,    icon: Pause },
  updating:    { label: "Updating",    color: T.blue,    icon: Download,      spin: true },
  offline:     { label: "Offline",     color: T.gray,    icon: WifiOff },
  error:       { label: "Error",       color: T.error,   icon: AlertTriangle },
  locked:      { label: "Locked",      color: T.warn,    icon: Lock },
  maintenance: { label: "Maintenance", color: T.orange,  icon: Wrench },
};
const RUN = {
  running: { label: "Running", color: T.primary, icon: Loader2, spin: true },
  success: { label: "Success", color: T.success, icon: CheckCircle2 },
  failed:  { label: "Failed",  color: T.error,   icon: XCircle },
  queued:  { label: "Queued",  color: T.warn,    icon: Clock },
  stopped: { label: "Stopped", color: T.gray,    icon: Square },
};
const LEVEL = { info: T.info, warn: T.warn, error: T.error, debug: T.gray, success: T.success };
const TYPE = {
  android: { icon: Smartphone, label: "Android", color: T.success },
  ios: { icon: Apple, label: "iOS", color: T.pink },
  windows: { icon: Monitor, label: "Windows", color: T.blue },
  macos: { icon: Laptop, label: "macOS", color: T.primary },
  linux: { icon: Monitor, label: "Linux", color: T.orange },
  vps: { icon: Server, label: "VPS", color: T.info },
};

/* ───────── Mock data ───────── */
const GROUPS = [
  { id: "g1", name: "Ads Farm", color: T.primary, desc: "Chạy Ads Manager, nuôi tài khoản" },
  { id: "g2", name: "Shopee Ops", color: T.orange, desc: "Seller Centre, đơn hàng" },
  { id: "g3", name: "Crypto Watch", color: T.warn, desc: "Binance, Scan balance" },
  { id: "g4", name: "Servers", color: T.info, desc: "VPS worker & sync" },
  { id: "g5", name: "QA Lab", color: T.pink, desc: "Thiết bị test" },
];
const PROXIES = [
  { id: "p1", name: "FPT Residential JP", type: "Residential", host: "181.123.66.250:8000", country: "JP", ping: 42, status: "ok", used: 4 },
  { id: "p2", name: "Viettel 4G Pool", type: "4G/5G", host: "41.223.124.124:3128", country: "VN", ping: 68, status: "ok", used: 5 },
  { id: "p3", name: "NordVPN HN", type: "VPN", host: "53.2.62.18:1080", country: "VN", ping: 131, status: "slow", used: 2 },
  { id: "p4", name: "DC Singapore", type: "Datacenter", host: "103.9.1.77:8080", country: "SG", ping: 0, status: "down", used: 1 },
];
const mk = (id, name, type, os, group, status, cpu, ram, disk, batt, proxy, ip, loc, seen, tags = []) =>
  ({ id, name, type, os, group, status, cpu, ram, disk, batt, proxy, ip, loc, seen, tags });
const DEVICES0 = [
  mk("d1", "Pixel 7 · A01", "android", "Android 14", "g1", "busy", 78, 64, 41, 62, "p1", "181.123.66.250", "Tokyo, JP", "now", ["ads", "warm"]),
  mk("d2", "Galaxy S23 · A02", "android", "Android 14", "g1", "online", 22, 48, 55, 88, "p1", "181.123.66.250", "Tokyo, JP", "now", ["ads"]),
  mk("d3", "Redmi Note 12 · B01", "android", "Android 13", "g2", "idle", 6, 39, 72, 14, "p2", "41.223.124.124", "Ho Chi Minh, VN", "2m ago", ["shopee"]),
  mk("d4", "iPhone 13 · I01", "ios", "iOS 17.4", "g2", "online", 31, 52, 38, 71, "p2", "41.223.124.124", "Ho Chi Minh, VN", "now", ["shopee"]),
  mk("d5", "iPhone 12 · I02", "ios", "iOS 16.7", "g5", "updating", 54, 61, 80, 45, null, "—", "—", "1m ago", ["qa"]),
  mk("d6", "Pixel 6 · Q01", "android", "Android 12", "g5", "offline", 0, 0, 90, 0, null, "—", "—", "3d ago", ["qa"]),
  mk("d7", "Mini PC · W01", "windows", "Windows 11", "g1", "busy", 66, 71, 58, null, "p3", "53.2.62.18", "Hanoi, VN", "now", ["ads", "chrome"]),
  mk("d8", "Dell Latitude · W02", "windows", "Windows 10", "g3", "error", 94, 88, 91, 33, "p3", "53.2.62.18", "Hanoi, VN", "5m ago", ["binance"]),
  mk("d9", "MacBook Air · M01", "macos", "macOS 14.5", "g3", "online", 18, 44, 47, 92, "p1", "181.123.66.250", "Tokyo, JP", "now", ["binance"]),
  mk("d10", "Ubuntu Box · L01", "linux", "Ubuntu 22.04", "g4", "locked", 9, 27, 33, null, null, "10.0.0.14", "LAN", "12m ago", ["lan"]),
  mk("d11", "VPS-Singapore-01", "vps", "Debian 12", "g4", "online", 41, 57, 46, null, "p4", "103.9.1.77", "Singapore, SG", "now", ["worker", "sync"]),
  mk("d12", "VPS-Frankfurt-02", "vps", "Ubuntu 24.04", "g4", "maintenance", 3, 19, 22, null, null, "168.119.4.2", "Frankfurt, DE", "40m ago", ["worker"]),
  mk("d13", "VPS-Hanoi-03", "vps", "Ubuntu 22.04", "g4", "busy", 83, 76, 63, null, "p2", "103.7.40.9", "Hanoi, VN", "now", ["worker"]),
  mk("d14", "Galaxy A54 · A03", "android", "Android 13", "g1", "offline", 0, 0, 67, 5, null, "—", "—", "1d ago", ["ads"]),
];
const SCRIPTS0 = [
  { id: "s1", name: "Warm-up Facebook", desc: "Lướt feed, like, xem video ngẫu nhiên 20 phút", lang: "JS", targets: ["android", "ios"], dur: "20m", rate: 96, runs: 482, tags: ["facebook"] },
  { id: "s2", name: "Check Ads Manager", desc: "Kiểm tra trạng thái tài khoản & chi tiêu", lang: "Python", targets: ["windows", "macos", "android"], dur: "3m", rate: 91, runs: 1204, tags: ["ads"] },
  { id: "s3", name: "Shopee order sync", desc: "Kéo đơn mới từ Seller Centre về hệ thống", lang: "JS", targets: ["android", "ios"], dur: "6m", rate: 88, runs: 733, tags: ["shopee"] },
  { id: "s4", name: "Scan Binance balance", desc: "Đọc số dư và ghi log", lang: "Python", targets: ["windows", "macos"], dur: "1m", rate: 99, runs: 2210, tags: ["crypto"] },
  { id: "s5", name: "Clean cache & logs", desc: "Dọn bộ nhớ đệm, xoay log", lang: "Shell", targets: ["linux", "vps", "windows"], dur: "40s", rate: 100, runs: 3120, tags: ["maintenance"] },
  { id: "s6", name: "Sync profile to Chrome", desc: "Đồng bộ profile từ module Profile", lang: "JS", targets: ["windows", "macos", "vps"], dur: "2m", rate: 84, runs: 390, tags: ["profile"] },
];
const RUNS0 = [
  { id: "r1", script: "s1", dev: "d1", status: "running", at: "now", dur: "11m 20s", by: "Schedule" },
  { id: "r2", script: "s2", dev: "d7", status: "running", at: "now", dur: "1m 48s", by: "Hung" },
  { id: "r3", script: "s4", dev: "d9", status: "success", at: "9m ago", dur: "58s", by: "Schedule" },
  { id: "r4", script: "s4", dev: "d8", status: "failed", at: "14m ago", dur: "22s", by: "Schedule" },
  { id: "r5", script: "s5", dev: "d11", status: "success", at: "1h ago", dur: "37s", by: "Group g4" },
  { id: "r6", script: "s3", dev: "d4", status: "success", at: "2h ago", dur: "5m 51s", by: "Hung" },
  { id: "r7", script: "s3", dev: "d3", status: "stopped", at: "3h ago", dur: "2m 03s", by: "Hung" },
  { id: "r8", script: "s6", dev: "d13", status: "queued", at: "now", dur: "—", by: "Group g4" },
  { id: "r9", script: "s1", dev: "d2", status: "success", at: "5h ago", dur: "19m 40s", by: "Schedule" },
];
const SCHEDULES0 = [
  { id: "c1", name: "Warm-up buổi sáng", script: "s1", kind: "group", target: "g1", cron: "Hằng ngày · 08:00", next: "Mai 08:00", on: true, last: "success" },
  { id: "c2", name: "Scan Binance mỗi 15 phút", script: "s4", kind: "group", target: "g3", cron: "Mỗi 15 phút", next: "Sau 6 phút", on: true, last: "failed" },
  { id: "c3", name: "Dọn log VPS", script: "s5", kind: "group", target: "g4", cron: "Chủ nhật · 03:00", next: "CN 03:00", on: true, last: "success" },
  { id: "c4", name: "Sync đơn Shopee", script: "s3", kind: "device", target: "d4", cron: "Mỗi 2 giờ", next: "Sau 1h 12m", on: false, last: "success" },
];
const LOGS0 = [
  ["14:32:08", "info", "d1", "Script Warm-up Facebook bắt đầu (step 4/9)"],
  ["14:31:55", "success", "d9", "Scan Binance balance hoàn tất · 3 tài khoản"],
  ["14:31:12", "error", "d8", "ADB/Agent timeout sau 30s — CPU 94%, đang retry (1/3)"],
  ["14:30:40", "warn", "d11", "Proxy DC Singapore không phản hồi, chuyển sang direct"],
  ["14:29:02", "info", "d5", "Đang tải bản cập nhật iOS 17.5 (62%)"],
  ["14:28:31", "debug", "d13", "Heartbeat ok · rtt 38ms"],
  ["14:27:09", "warn", "d3", "Pin 14%, tạm hoãn script nặng"],
  ["14:25:44", "info", "d7", "Chrome profile Vũ Khoa mở thành công"],
  ["14:22:10", "error", "d6", "Mất kết nối — không có heartbeat 3 ngày"],
].map(([t, level, dev, msg]) => ({ t, level, dev, msg }));
const ACT0 = [
  { t: "14:32", icon: Play, color: T.primary, dev: "d1", text: "Hung chạy Warm-up Facebook" },
  { t: "14:31", icon: CheckCircle2, color: T.success, dev: "d9", text: "Scan Binance balance thành công" },
  { t: "14:31", icon: AlertTriangle, color: T.error, dev: "d8", text: "Thiết bị chuyển sang trạng thái Error" },
  { t: "14:30", icon: Globe, color: T.warn, dev: "d11", text: "Proxy DC Singapore mất kết nối, dùng direct" },
  { t: "14:15", icon: Download, color: T.blue, dev: "d5", text: "Bắt đầu cập nhật iOS 17.5" },
  { t: "13:50", icon: Wrench, color: T.orange, dev: "d12", text: "Bật chế độ bảo trì" },
  { t: "13:12", icon: Lock, color: T.warn, dev: "d10", text: "Khoá thiết bị bởi Hung" },
  { t: "12:40", icon: WifiOff, color: T.gray, dev: "d14", text: "Mất heartbeat" },
];

/* ───────── Helpers ───────── */
const series = (seed, n = 24, base = 50, amp = 30) =>
  Array.from({ length: n }, (_, i) => Math.max(2, Math.min(98, base + Math.sin(i * 0.7 + seed) * amp * 0.6 + Math.cos(i * 1.9 + seed * 2) * amp * 0.4)));
const seedOf = (id) => parseInt(id.replace(/\D/g, "") || "1", 10);
const heat = (v) => (v >= 85 ? T.error : v >= 65 ? T.warn : T.success);

/* ───────── Atoms ───────── */
function Badge({ ui, small }) {
  const I = ui.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md whitespace-nowrap" style={{ background: a(ui.color, 0.12), color: ui.color, padding: small ? "1px 6px" : "2px 8px", fontSize: 11 }}>
      {ui.pulse ? <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: ui.color }} /><span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: ui.color }} /></span>
        : <I size={11} className={ui.spin ? "animate-spin" : ""} />}
      {ui.label}
    </span>
  );
}
const Chip = ({ children, color = T.sub, ...p }) => (
  <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-px text-[11px]" style={{ background: a(color, 0.12), color }} {...p}>{children}</span>
);
function Bar({ v, w = 56, color }) {
  return <div className="h-1 rounded-full overflow-hidden" style={{ width: w, background: T.border }}><div className="h-full rounded-full" style={{ width: `${v}%`, background: color || heat(v) }} /></div>;
}
function Spark({ data, color = T.primary, h = 36, w = 160, fill = true }) {
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / 100) * h).toFixed(1)}`);
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height: h }}>
      {fill && <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={a(color, 0.14)} />}
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
const Btn = ({ icon: I, children, primary, danger, onClick, small, title }) => {
  const c = primary ? T.primary : danger ? T.error : T.text;
  return (
    <button title={title} onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg transition-colors cursor-pointer"
      style={{ height: small ? 28 : 32, padding: children ? "0 12px" : "0 8px", fontSize: 12, background: primary || danger ? a(c, 0.16) : T.hover, color: c }}>
      {I && <I size={14} />}{children}
    </button>
  );
};
const IconBtn = ({ icon: I, title, onClick, color = T.sub }) => (
  <button title={title} onClick={(e) => { e.stopPropagation(); onClick && onClick(); }} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors"
    style={{ background: a(color, 0.1), color }}><I size={14} /></button>
);
const Check = ({ on, onChange }) => (
  <button onClick={(e) => { e.stopPropagation(); onChange(); }} className="flex h-4 w-4 shrink-0 items-center justify-center rounded cursor-pointer"
    style={{ background: on ? T.primary : a(T.sub, 0.2) }}>
    {on && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.6" fill="none" /></svg>}
  </button>
);
const Toggle = ({ on, onChange }) => (
  <button onClick={onChange} className="relative h-5 w-9 rounded-full cursor-pointer transition-colors" style={{ background: on ? T.primary : T.border }}>
    <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: on ? 18 : 2 }} />
  </button>
);
const Card = ({ title, icon: I, right, children, pad = true }) => (
  <div className="rounded-xl" style={{ background: T.card }}>
    {title && <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
      <div className="flex items-center gap-2 text-[13px]" style={{ color: T.text }}>{I && <I size={15} style={{ color: T.primary }} />}{title}</div>{right}</div>}
    <div className={pad ? "px-4 pb-4" : ""}>{children}</div>
  </div>
);
const TypeIcon = ({ type, size = 34 }) => {
  const t = TYPE[type], I = t.icon;
  return <div className="flex shrink-0 items-center justify-center rounded-lg" style={{ width: size, height: size, background: a(t.color, 0.14), color: t.color }}><I size={size * 0.5} /></div>;
};
const Empty = ({ icon: I, text }) => (
  <div className="flex flex-col items-center gap-2 py-10" style={{ color: T.gray }}><I size={26} /><span className="text-[13px]">{text}</span></div>
);

/* ───────── Main ───────── */
export default function Fleet() {
  const [devices, setDevices] = useState(DEVICES0);
  const [scripts] = useState(SCRIPTS0);
  const [runs, setRuns] = useState(RUNS0);
  const [schedules, setSchedules] = useState(SCHEDULES0);
  const [logs, setLogs] = useState(LOGS0);
  const [acts, setActs] = useState(ACT0);
  const [q, setQ] = useState("");
  const [fs, setFs] = useState("all");
  const [fg, setFg] = useState("all");
  const [ft, setFt] = useState("all");
  const [sort, setSort] = useState("default");
  const [view, setView] = useState("table");
  const [sel, setSel] = useState([]);
  const [open, setOpen] = useState(null);
  const [dtab, setDtab] = useState("overview");
  const [logLevel, setLogLevel] = useState("all");

  const dev = (id) => devices.find((d) => d.id === id);
  const grp = (id) => GROUPS.find((g) => g.id === id);
  const scr = (id) => scripts.find((s) => s.id === id);
  const now = () => new Date().toTimeString().slice(0, 8);

  const counts = useMemo(() => {
    const c = {}; devices.forEach((d) => (c[d.status] = (c[d.status] || 0) + 1)); return c;
  }, [devices]);
  const online = devices.filter((d) => !["offline"].includes(d.status)).length;
  const KIND = { android: "mobile", ios: "mobile", windows: "desktop", macos: "desktop", linux: "desktop", vps: "vps" };
  const RANK = { error: 0, locked: 1, offline: 2, maintenance: 3, updating: 4 };
  const SORTS = { default: null, name: (x, y) => x.name.localeCompare(y.name), cpu: (x, y) => y.cpu - x.cpu, ram: (x, y) => y.ram - x.ram, issue: (x, y) => (RANK[x.status] ?? 5) - (RANK[y.status] ?? 5) };
  const matchStatus = (d) => fs === "all" || (fs === "active" ? d.status !== "offline" : fs === "attention" ? ["error", "locked"].includes(d.status) : d.status === fs);
  const list = devices.filter((d) =>
    matchStatus(d) && (fg === "all" || d.group === fg) && (ft === "all" || KIND[d.type] === ft) &&
    (!q || (d.name + d.ip + d.os + d.loc + d.tags.join(" ")).toLowerCase().includes(q.toLowerCase())))
    .sort(SORTS[sort] || (() => 0));

  const runScript = (sid, ids) => {
    const s = scr(sid);
    setRuns((r) => [...ids.map((id, i) => ({ id: `r${Date.now()}${i}`, script: sid, dev: id, status: "queued", at: "now", dur: "—", by: "Hung" })), ...r]);
    setLogs((l) => [...ids.map((id) => ({ t: now(), level: "info", dev: id, msg: `Xếp hàng script ${s.name}` })), ...l]);
    setActs((l) => [{ t: now().slice(0, 5), icon: Play, color: T.primary, dev: ids[0], text: `Hung chạy ${s.name} trên ${ids.length} thiết bị` }, ...l]);
  };
  const setStatus = (ids, status) => {
    setDevices((ds) => ds.map((d) => (ids.includes(d.id) ? { ...d, status } : d)));
    setActs((l) => [{ t: now().slice(0, 5), icon: STATUS[status].icon, color: STATUS[status].color, dev: ids[0], text: `${ids.length} thiết bị → ${STATUS[status].label}` }, ...l]);
  };
  const toggleSel = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const openDev = (id) => { setOpen(id); setDtab("overview"); };

  /* ── Derived device detail ── */
  const info = (d) => {
    const n = seedOf(d.id), off = d.status === "offline";
    const run = runs.find((r) => r.dev === d.id && r.status === "running");
    const last = runs.find((r) => r.dev === d.id && !["running", "queued"].includes(r.status));
    const sch = schedules.find((x) => x.on && (x.target === d.id || x.target === d.group));
    return { off, run, last, sch, px: PROXIES.find((p) => p.id === d.proxy), pct: run ? 20 + ((n * 17) % 70) : 0,
      temp: off ? null : 32 + Math.round(d.cpu * 0.35), ping: off ? null : 18 + ((n * 13) % 90),
      up: off ? "—" : `${((n * 7) % 29) + 1}d ${(n * 5) % 24}h`, dl: (1 + (n % 6) * 0.7).toFixed(1), ul: (0.2 + (n % 4) * 0.3).toFixed(1) };
  };
  const NOTE = { error: "CPU/RAM quá tải", locked: "Khoá bởi Hung", maintenance: "Bảo trì từ 13:50", updating: "Đang cập nhật hệ điều hành", offline: "Không có heartbeat" };
  const Meter = ({ l, v, off }) => (
    <div className="flex items-center gap-2">
      <span style={{ width: 28, fontSize: 11, color: T.gray }}>{l}</span>
      <div style={{ flex: 1, minWidth: 48 }}><Bar v={off ? 0 : v} w="100%" /></div>
      <span style={{ width: 32, fontSize: 11, color: off ? T.gray : T.sub, textAlign: "right" }}>{off ? "—" : `${v}%`}</span>
    </div>
  );
  const battery = (d) => d.batt == null
    ? <span className="inline-flex items-center gap-1.5" style={{ color: T.sub }}><PlugZap size={14} style={{ color: T.info }} />AC</span>
    : <span className="inline-flex items-center gap-1.5" style={{ color: d.batt < 20 ? T.error : T.sub }}>{d.batt < 20 ? <BatteryLow size={14} /> : <BatteryMedium size={14} style={{ color: T.success }} />}{d.batt}%</span>;
  const scriptCell = (i) => i.run ? (
    <div>
      <div className="truncate" style={{ fontSize: 12, color: T.primary }}>{scr(i.run.script).name}</div>
      <div className="mt-1 flex items-center gap-2"><Bar v={i.pct} w={90} color={T.primary} /><span style={{ fontSize: 11, color: T.sub }}>{i.pct}% · {i.run.dur}</span></div>
    </div>
  ) : i.last ? (() => { const u = RUN[i.last.status], I = u.icon; return (
    <div>
      <div className="flex items-center gap-1.5 truncate" style={{ fontSize: 12, color: T.text }}><I size={12} style={{ color: u.color }} />{scr(i.last.script).name}</div>
      <div style={{ fontSize: 11, color: T.sub }}>{u.label} · {i.last.at} · {i.last.dur}</div>
    </div>); })() : <span style={{ color: T.gray }}>Chưa chạy</span>;
  const actions = (d) => (
    <div className="flex items-center gap-1">
      <IconBtn icon={Play} title="Chạy kịch bản" color={T.primary} onClick={() => runScript("s2", [d.id])} />
      <IconBtn icon={RotateCw} title="Khởi động lại" onClick={() => setStatus([d.id], "updating")} />
      <IconBtn icon={Terminal} title="Shell" /><IconBtn icon={MoreHorizontal} title="Thêm" />
    </div>
  );

  const renderCard = (d) => {
    const i = info(d), g = grp(d.group);
    return (
      <div key={d.id} onClick={() => openDev(d.id)} className="cursor-pointer rounded-xl transition-colors"
        style={{ background: sel.includes(d.id) || open === d.id ? T.hover : T.card, padding: 14, opacity: i.off ? 0.7 : 1 }}>
        <div className="flex items-start gap-3">
          <TypeIcon type={d.type} size={38} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="truncate" style={{ fontSize: 13, color: T.text }}>{d.name}</div>
            <div className="truncate" style={{ fontSize: 11, color: T.sub }}>{d.os} · {d.loc}</div>
          </div>
          <Check on={sel.includes(d.id)} onChange={() => toggleSel(d.id)} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge ui={STATUS[d.status]} /><Chip color={g.color}>{g.name}</Chip>{d.tags.map((t) => <Chip key={t}>#{t}</Chip>)}
        </div>
        <div style={{ fontSize: 11, color: T.sub, marginTop: 6 }}>{NOTE[d.status] || `Uptime ${i.up}`}</div>
        <div className="mt-2"><Spark data={series(seedOf(d.id))} color={d.status === "error" ? T.error : T.primary} h={30} /></div>
        <div className="mt-2 flex flex-col gap-1.5"><Meter l="CPU" v={d.cpu} off={i.off} /><Meter l="RAM" v={d.ram} off={i.off} /><Meter l="Disk" v={d.disk} /></div>
        <div className="mt-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, fontSize: 12 }}>
          {[[battery(d)], [<span className="inline-flex items-center gap-1.5" style={{ color: T.sub }}><Thermometer size={14} style={{ color: T.orange }} />{i.temp ? `${i.temp}°C` : "—"}</span>],
            [<span className="inline-flex items-center gap-1.5" style={{ color: T.sub }}><Gauge size={14} style={{ color: T.info }} />{i.ping ? `${i.ping}ms` : "—"}</span>]].map(([n], k) => (
            <div key={k} style={{ background: T.panel, borderRadius: 8, padding: "6px 8px" }}>{n}</div>))}
        </div>
        <div className="mt-3 flex items-center gap-2 truncate" style={{ fontSize: 12, color: T.sub }}>
          <Globe size={13} style={{ color: i.px ? T.success : T.gray }} /><span className="truncate">{i.px ? i.px.name : "Direct"} · {d.ip}</span></div>
        <div className="mt-2 rounded-lg" style={{ background: i.run ? a(T.primary, 0.08) : T.panel, padding: "8px 10px" }}>{scriptCell(i)}</div>
        <div className="mt-2 flex items-center gap-1.5 truncate" style={{ fontSize: 11, color: T.sub }}>
          <CalendarClock size={12} />{i.sch ? `${i.sch.name} · ${i.sch.next}` : "Chưa có lịch"}</div>
        <div className="mt-3 flex items-center justify-between">
          <span style={{ fontSize: 11, color: T.gray }}>Heartbeat {d.seen}</span>{actions(d)}</div>
      </div>
    );
  };

  const TH = ["", "Thiết bị", "Trạng thái", "Hiệu năng", "Xu hướng CPU · mạng", "Pin · Nhiệt độ", "Mạng · Proxy", "Kịch bản", "Lịch kế tiếp", "Heartbeat", ""];
  const cnt = (f) => devices.filter(f).length;
  const stats = [
    [Layers, "Tổng thiết bị", devices.length, T.primary, `${cnt((d) => ["android", "ios"].includes(d.type))} mobile · ${cnt((d) => ["windows", "macos", "linux"].includes(d.type))} desktop · ${cnt((d) => d.type === "vps")} VPS`],
    [Wifi, "Đang hoạt động", online, T.success, `${Math.round((online / devices.length) * 100)}% thiết bị đang kết nối`],
    [Loader2, "Đang chạy", counts.busy || 0, T.info, `${runs.filter((r) => r.status === "running").length} kịch bản · ${runs.filter((r) => r.status === "queued").length} đang chờ`],
    [AlertTriangle, "Lỗi / khoá", (counts.error || 0) + (counts.locked || 0), T.error, `${counts.error || 0} lỗi · ${counts.locked || 0} bị khoá cần xử lý`],
    [WifiOff, "Offline", counts.offline || 0, T.gray, `${counts.maintenance || 0} bảo trì · mất heartbeat > 1 giờ`],
  ];

  /* ── Hero: một dải ngang gọn — tiêu đề + metric inline ── */
  const STAT_KEYS = ["all", "active", "busy", "attention", "offline"];
  const pickStat = (key) => { if (key === "all") { setFs("all"); setFg("all"); setFt("all"); setQ(""); } else setFs(fs === key ? "all" : key); };
  const pulse = (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(230px, 0.7fr) minmax(0, 2.3fr)", gap: 12, alignItems: "center" }}>
      <div className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: a(T.primary, 0.16), color: T.primary }}><Radio size={18} /></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, lineHeight: 1.2, color: T.text }}>Fleet</div>
          <div className="truncate" style={{ fontSize: 12, color: T.sub }}>Quản lý mobile, desktop/laptop và VPS từ xa</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 4 }}>
        {stats.map(([I, l, v, c, desc], k) => {
          const key = STAT_KEYS[k], on = fs === key;
          return (
            <button key={l} onClick={() => pickStat(key)} title={desc} aria-pressed={on} className="flex cursor-pointer items-center gap-2.5 rounded-lg text-left transition-colors"
              style={{ padding: "4px 8px", minWidth: 0, background: on ? a(c, 0.14) : "transparent" }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = a(c, 0.07); }} onMouseLeave={(e) => { e.currentTarget.style.background = on ? a(c, 0.14) : "transparent"; }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors" style={{ background: on ? c : a(c, 0.14), color: on ? T.bg : c }}><I size={15} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="flex items-baseline gap-1.5"><span style={{ fontSize: 17, lineHeight: 1.15, color: on ? c : T.text }}>{v}</span><span className="truncate" style={{ fontSize: 12, color: on ? T.text : T.sub }}>{l}</span></div>
                <div className="truncate" style={{ fontSize: 11, color: on ? a(c, 0.85) : T.gray }}>{desc}</div>
              </div>
            </button>);
        })}
      </div>
    </div>
  );

  const DevicesView = (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 10 }}>
      {pulse}

      <div className="flex items-center gap-2">
        <div className="flex h-8 flex-1 items-center gap-2 rounded-lg px-3" style={{ background: T.card, minWidth: 200 }}>
          <Search size={14} style={{ color: T.gray }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên, IP, OS, vị trí, tag…" className="w-full bg-transparent outline-none" style={{ color: T.text, fontSize: 12 }} />
          {q && <button className="cursor-pointer" onClick={() => setQ("")}><X size={13} style={{ color: T.gray }} /></button>}
        </div>
        <select value={fg} onChange={(e) => setFg(e.target.value)} className="h-8 rounded-lg px-2 outline-none" style={{ background: T.card, color: T.text, fontSize: 12 }}>
          <option value="all">Tất cả nhóm</option>{GROUPS.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 rounded-lg px-2 outline-none" style={{ background: T.card, color: T.text, fontSize: 12 }}>
          {[["default", "Sắp xếp: Mặc định"], ["name", "Tên A → Z"], ["cpu", "CPU cao nhất"], ["ram", "RAM cao nhất"], ["issue", "Cần xử lý trước"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: T.card }}>
          {[["table", List], ["grid", LayoutGrid]].map(([v, I]) => (
            <button key={v} onClick={() => setView(v)} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md" style={{ background: view === v ? a(T.primary, 0.18) : "transparent", color: view === v ? T.primary : T.sub }}><I size={15} /></button>))}
        </div>
        <Btn icon={Download} title="Xuất báo cáo">Xuất</Btn><Btn icon={Users} title="Agent">Agent</Btn><Btn icon={Plus} primary>Thêm thiết bị</Btn>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5 overflow-x-auto" style={{ minWidth: 0 }}>
          {[["all", "Tất cả", devices.length], ...Object.entries(STATUS).map(([k, v]) => [k, v.label, counts[k] || 0])].map(([k, l, n]) => {
            const c = k === "all" ? T.primary : STATUS[k].color, on = fs === k;
            return (
              <button key={k} onClick={() => setFs(k)} className="cursor-pointer whitespace-nowrap rounded-lg px-2.5" style={{ height: 28, fontSize: 12, background: on ? a(c, 0.18) : T.card, color: on ? c : T.sub }}>
                {l} <span style={{ opacity: 0.7 }}>{n}</span></button>);
          })}
        </div>
        {sel.length > 0 ? (
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg px-2" style={{ background: a(T.primary, 0.1), height: 32 }}>
            <span style={{ fontSize: 12, color: T.text }}>Đã chọn {sel.length}</span>
            <Btn small primary icon={Play} onClick={() => runScript("s2", sel)}>Chạy</Btn>
            <IconBtn icon={RotateCw} title="Khởi động lại" onClick={() => setStatus(sel, "updating")} />
            <IconBtn icon={Lock} title="Khoá" onClick={() => setStatus(sel, "locked")} />
            <IconBtn icon={Wrench} title="Bảo trì" onClick={() => setStatus(sel, "maintenance")} />
            <IconBtn icon={Globe} title="Gán proxy" /><IconBtn icon={FolderTree} title="Chuyển nhóm" />
            <button className="cursor-pointer" style={{ fontSize: 12, color: T.sub }} onClick={() => setSel([])}>Bỏ chọn</button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: T.card }}>
              {[["all", "Tất cả", Layers], ["mobile", "Mobile", Smartphone], ["desktop", "Desktop", Laptop], ["vps", "VPS", Server]].map(([k, l, I]) => (
                <button key={k} onClick={() => setFt(k)} className="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5" style={{ height: 28, fontSize: 12, background: ft === k ? a(T.primary, 0.18) : "transparent", color: ft === k ? T.primary : T.sub }}><I size={13} />{l}</button>))}
            </div>
            <span style={{ fontSize: 12, color: T.gray }}>{list.length}/{devices.length} thiết bị</span>
          </div>)}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", borderRadius: 12, background: view === "table" ? T.card : "transparent" }}>
        {list.length === 0 ? <Card><Empty icon={Filter} text="Không có thiết bị khớp bộ lọc" /></Card> :
          view === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, alignContent: "start" }}>{list.map(renderCard)}</div>
          ) : (
            <table className="w-full text-left" style={{ minWidth: 1480, fontSize: 12 }}>
              <thead><tr>{TH.map((h, k) => <th key={k} className="font-normal" style={{ position: "sticky", top: 0, zIndex: 1, background: T.card, color: T.gray, padding: "10px 12px" }}>{h}</th>)}</tr></thead>
              <tbody>{list.map((d) => {
                const i = info(d), g = grp(d.group), on = sel.includes(d.id) || open === d.id;
                return (
                  <tr key={d.id} onClick={() => openDev(d.id)} className="cursor-pointer" style={{ background: on ? a(T.primary, 0.08) : "transparent", opacity: i.off ? 0.65 : 1 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = on ? a(T.primary, 0.1) : T.hover)} onMouseLeave={(e) => (e.currentTarget.style.background = on ? a(T.primary, 0.08) : "transparent")}>
                    <td style={{ padding: "10px 12px" }}><Check on={sel.includes(d.id)} onChange={() => toggleSel(d.id)} /></td>
                    <td style={{ padding: "10px 12px", minWidth: 230 }}>
                      <div className="flex items-center gap-2.5"><TypeIcon type={d.type} size={38} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: T.text }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: T.sub }}>{d.os} · {d.loc}</div>
                          <div className="mt-1 flex flex-wrap gap-1"><Chip color={g.color}>{g.name}</Chip>{d.tags.map((t) => <Chip key={t}>#{t}</Chip>)}</div>
                        </div></div></td>
                    <td style={{ padding: "10px 12px", minWidth: 150 }}><Badge ui={STATUS[d.status]} /><div style={{ fontSize: 11, color: T.sub, marginTop: 5 }}>{NOTE[d.status] || `Uptime ${i.up}`}</div></td>
                    <td style={{ padding: "10px 12px", width: 190 }}><div className="flex flex-col gap-1.5"><Meter l="CPU" v={d.cpu} off={i.off} /><Meter l="RAM" v={d.ram} off={i.off} /><Meter l="Disk" v={d.disk} /></div></td>
                    <td style={{ padding: "10px 12px", width: 150 }}><Spark data={series(seedOf(d.id))} color={d.status === "error" ? T.error : T.primary} h={30} />
                      <div style={{ fontSize: 11, color: T.sub, marginTop: 4 }}>{i.off ? "—" : `↓ ${i.dl} · ↑ ${i.ul} MB/s`}</div></td>
                    <td style={{ padding: "10px 12px" }}><div className="flex flex-col gap-1.5">{battery(d)}
                      <span className="inline-flex items-center gap-1.5" style={{ color: T.sub }}><Thermometer size={14} style={{ color: T.orange }} />{i.temp ? `${i.temp}°C` : "—"}</span></div></td>
                    <td style={{ padding: "10px 12px", minWidth: 190 }}>
                      <div style={{ color: T.text }}>{i.px ? i.px.name : <span style={{ color: T.gray }}>Direct</span>}</div>
                      <div style={{ fontSize: 11, color: T.sub }}>{d.ip}</div>
                      <div className="mt-1 flex gap-1">{i.px && <Chip color={T.info}>{i.px.type}</Chip>}<Chip><Gauge size={10} />{i.ping ? `${i.ping}ms` : "—"}</Chip></div></td>
                    <td style={{ padding: "10px 12px", minWidth: 210 }}>{scriptCell(i)}</td>
                    <td style={{ padding: "10px 12px", minWidth: 170 }}>{i.sch ? <><div className="truncate" style={{ color: T.text }}>{i.sch.name}</div><div style={{ fontSize: 11, color: T.sub }}>{i.sch.cron} · {i.sch.next}</div></> : <span style={{ color: T.gray }}>Chưa có lịch</span>}</td>
                    <td style={{ padding: "10px 12px", color: T.sub, whiteSpace: "nowrap" }}>{d.seen}</td>
                    <td style={{ padding: "10px 12px" }}>{actions(d)}</td>
                  </tr>);
              })}</tbody>
            </table>)}
      </div>
    </div>
  );

  function RunRow({ r }) {
    const ui = RUN[r.status], I = ui.icon;
    return (
      <div className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[rgb(23,23,40)]">
        <I size={15} className={ui.spin ? "animate-spin" : ""} style={{ color: ui.color }} />
        <div className="min-w-0 flex-1"><div className="truncate text-[13px]" style={{ color: T.text }}>{scr(r.script).name}</div>
          <div className="truncate text-[12px]" style={{ color: T.sub }}>{dev(r.dev)?.name} · {r.by}</div></div>
        <div className="text-right"><div className="text-[12px]" style={{ color: ui.color }}>{ui.label}</div><div className="text-[11px]" style={{ color: T.gray }}>{r.dur} · {r.at}</div></div>
      </div>);
  }

  function LogList({ items, showDev }) {
    if (!items.length) return <Empty icon={ScrollText} text="Chưa có log" />;
    return (
      <div className="px-3 pb-3 font-mono text-[12px]" style={{ background: T.panel }}>
        {items.map((l, i) => (
          <div key={i} className="flex gap-3 py-1.5" style={{ borderBottom: `1px solid ${a(T.border, 0.5)}` }}>
            <span style={{ color: T.gray }}>{l.t}</span><span className="w-14" style={{ color: LEVEL[l.level] }}>{l.level}</span>
            {showDev && <span className="w-36 shrink-0 truncate" style={{ color: T.primary }}>{dev(l.dev)?.name}</span>}
            <span style={{ color: T.text }}>{l.msg}</span></div>))}
      </div>);
  }

  const Timeline = ({ items, showDev = true }) => (
    <div>{items.map((e, i) => { const I = e.icon; return (
      <div key={i} className="flex gap-3">
        <div className="flex flex-col items-center"><div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: a(e.color, 0.15), color: e.color }}><I size={13} /></div>{i < items.length - 1 && <div className="w-px flex-1" style={{ background: T.border }} />}</div>
        <div className="pb-4"><div className="text-[13px]" style={{ color: T.text }}>{e.text}</div>
          <div className="text-[12px]" style={{ color: T.sub }}>{e.t}{showDev && ` · ${dev(e.dev)?.name}`}</div></div>
      </div>); })}</div>
  );

  /* ── Drawer ── */
  const assignProxy = (id, pid) => {
    setDevices((ds) => ds.map((d) => (d.id === id ? { ...d, proxy: pid, ip: pid ? PROXIES.find((p) => p.id === pid).host.split(":")[0] : d.ip } : d)));
    setActs((l) => [{ t: now().slice(0, 5), icon: Globe, color: T.info, dev: id, text: pid ? `Gán proxy ${PROXIES.find((p) => p.id === pid).name}` : "Chuyển sang kết nối trực tiếp" }, ...l]);
  };
  const D = open && dev(open);
  const dScripts = D ? scripts.filter((x) => x.targets.includes(D.type)) : [];
  const dSched = D ? schedules.filter((x) => x.target === D.id || x.target === D.group) : [];
  const dLogs = D ? logs.filter((l) => l.dev === D.id) : [];
  const dRuns = D ? runs.filter((r) => r.dev === D.id) : [];
  const dTabs = [["overview", "Tổng quan", Gauge], ["group", "Nhóm", FolderTree], ["scripts", "Kịch bản", FileCode2, dScripts.length], ["schedules", "Lịch chạy", CalendarClock, dSched.length],
    ["proxy", "Proxy", Globe], ["logs", "Log", ScrollText, dLogs.length], ["activity", "Hoạt động", Activity]];
  const Drawer = D && (() => {
    const g = grp(D.group), mates = devices.filter((d) => d.group === g.id), curP = PROXIES.find((p) => p.id === D.proxy);
    return (
    <aside className="fixed right-0 top-0 z-20 flex h-full w-full flex-col overflow-hidden" style={{ maxWidth: 600, background: T.panel }}>
      <div className="flex items-center justify-between px-5 py-3 text-[12px]" style={{ color: T.sub }}>
        <span>Fleet <ChevronRight size={11} className="inline" /> {g.name} <ChevronRight size={11} className="inline" /> <span style={{ color: T.text }}>{D.name}</span></span>
        <button className="cursor-pointer" onClick={() => setOpen(null)}><X size={17} /></button></div>
      <div className="px-5">
        <div className="flex items-center gap-3"><TypeIcon type={D.type} size={44} />
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[16px]" style={{ color: T.text }}>{D.name}<Badge ui={STATUS[D.status]} /></div>
            <div className="text-[12px]" style={{ color: T.sub }}>{D.os} · {D.loc} · {D.ip}</div></div></div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn small primary icon={Play} onClick={() => runScript("s2", [D.id])}>Chạy kịch bản</Btn>
          <Btn small icon={RotateCw} onClick={() => setStatus([D.id], "updating")}>Khởi động lại</Btn>
          <Btn small icon={Terminal}>Shell</Btn><Btn small icon={Upload}>Đẩy file</Btn>
          <Btn small icon={D.status === "locked" ? Radio : Lock} onClick={() => setStatus([D.id], D.status === "locked" ? "online" : "locked")}>{D.status === "locked" ? "Mở khoá" : "Khoá"}</Btn>
          <Btn small danger icon={Power} onClick={() => setStatus([D.id], "offline")}>Tắt</Btn></div>
        <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl p-1" style={{ background: T.card }}>
          {dTabs.map(([k, l, I, n]) => (
            <button key={k} onClick={() => setDtab(k)} className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5" style={{ fontSize: 12, background: dtab === k ? a(T.primary, 0.16) : "transparent", color: dtab === k ? T.primary : T.sub }}>
              <I size={13} />{l}{n != null && <span className="rounded px-1" style={{ fontSize: 11, background: dtab === k ? a(T.primary, 0.2) : T.hover }}>{n}</span>}</button>))}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {dtab === "overview" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              {[["CPU", D.cpu, Cpu], ["RAM", D.ram, MemoryStick], ["Disk", D.disk, HardDrive]].map(([l, v, I]) => (
                <div key={l} className="rounded-xl p-3" style={{ background: T.card }}>
                  <div className="flex items-center gap-1.5 text-[12px]" style={{ color: T.sub }}><I size={13} />{l}</div>
                  <div className="mt-1 text-[20px]" style={{ color: heat(v) }}>{v}%</div><Bar v={v} w="100%" /></div>))}</div>
            <Card title="CPU 24 giờ gần nhất" icon={Cpu}><Spark data={series(seedOf(D.id))} h={64} color={heat(D.cpu)} /></Card>
            <Card title="Băng thông mạng" icon={Wifi}><Spark data={series(seedOf(D.id) + 3, 24, 40, 40)} h={64} color={T.info} />
              <div className="mt-2 flex justify-between text-[12px]" style={{ color: T.sub }}><span>↓ 4.2 MB/s</span><span>↑ 1.1 MB/s</span><span>rtt 38ms</span></div></Card>
            <Card title="Thông tin" icon={Tag}>
              <div className="grid grid-cols-2 gap-y-2 text-[13px]">
                {[["Loại", TYPE[D.type].label], ["Nhóm", g.name], ["Pin", D.batt == null ? "AC" : `${D.batt}%`], ["Heartbeat", D.seen]].map(([k, v]) => (<div key={k}><div style={{ color: T.gray }}>{k}</div><div style={{ color: T.text }}>{v}</div></div>))}</div>
              <div className="mt-3 flex flex-wrap gap-1">{D.tags.map((t) => <Chip key={t} color={T.primary}>#{t}</Chip>)}</div></Card>
          </div>)}
        {dtab === "group" && (
          <div className="flex flex-col gap-3">
            <Card title={g.name} icon={FolderTree} right={<Chip color={g.color}>{mates.length} thiết bị</Chip>}>
              <p className="mb-3 text-[13px]" style={{ color: T.sub }}>{g.desc}</p>
              <div className="mb-1 flex justify-between text-[12px]" style={{ color: T.sub }}><span>Online {mates.filter((d) => d.status !== "offline").length}/{mates.length}</span><span>{mates.filter((d) => d.status === "error").length} lỗi</span></div>
              <Bar v={(mates.filter((d) => d.status !== "offline").length / mates.length) * 100} w="100%" color={g.color} />
              <div className="mt-3 flex gap-2"><Btn small icon={Play} onClick={() => runScript("s2", mates.map((d) => d.id))}>Chạy cho cả nhóm</Btn><Btn small icon={ArrowRightLeft}>Chuyển nhóm</Btn></div></Card>
            <Card title="Thiết bị cùng nhóm" icon={Layers} pad={false}><div className="px-2 pb-2">{mates.map((d) => (
              <div key={d.id} onClick={() => openDev(d.id)} className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[rgb(23,23,40)]">
                <TypeIcon type={d.type} size={30} /><div className="min-w-0 flex-1 truncate text-[13px]" style={{ color: d.id === D.id ? T.primary : T.text }}>{d.name}</div><Badge small ui={STATUS[d.status]} /></div>))}</div></Card>
          </div>)}
        {dtab === "scripts" && (
          <div className="flex flex-col gap-3">
            <Card title="Kịch bản tương thích" icon={FileCode2} pad={false}><div className="px-2 pb-2">{dScripts.map((x) => (
              <div key={x.id} className="flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-[rgb(23,23,40)]"><div><div className="text-[13px]" style={{ color: T.text }}>{x.name}</div><div className="text-[12px]" style={{ color: T.sub }}>{x.desc} · ~{x.dur} · {x.rate}%</div></div>
                <Btn small icon={Play} onClick={() => runScript(x.id, [D.id])}>Chạy</Btn></div>))}</div></Card>
            <Card title="Lịch sử chạy" icon={History} pad={false}><div className="px-2 pb-2">{dRuns.length ? dRuns.map((r) => <RunRow key={r.id} r={r} />) : <Empty icon={History} text="Chưa có lần chạy nào" />}</div></Card>
          </div>)}
        {dtab === "schedules" && (
          <Card title="Lịch chạy của thiết bị và nhóm" icon={CalendarClock} right={<Btn small primary icon={Plus}>Tạo lịch</Btn>} pad={false}>
            <div className="px-2 pb-2">{dSched.length ? dSched.map((x) => (
              <div key={x.id} className="flex items-center gap-3 rounded-lg px-3 py-3" style={{ opacity: x.on ? 1 : 0.55 }}>
                <Toggle on={x.on} onChange={() => setSchedules((l) => l.map((y) => (y.id === x.id ? { ...y, on: !y.on } : y)))} />
                <div className="min-w-0 flex-1"><div className="text-[13px]" style={{ color: T.text }}>{x.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px]" style={{ color: T.sub }}>{scr(x.script).name}<Chip color={x.kind === "group" ? g.color : T.blue}>{x.kind === "group" ? "Theo nhóm" : "Theo thiết bị"}</Chip></div></div>
                <div className="text-right"><div className="text-[12px]" style={{ color: T.text }}>{x.cron}</div><div className="text-[12px]" style={{ color: T.sub }}>Kế tiếp: {x.next}</div></div>
              </div>)) : <Empty icon={CalendarClock} text="Chưa có lịch cho thiết bị này" />}</div></Card>)}
        {dtab === "proxy" && (
          <div className="flex flex-col gap-3">
            <Card title="Chọn proxy" icon={Globe} pad={false}><div className="px-2 pb-2">
              {[null, ...PROXIES].map((p) => {
                const on = (p ? p.id : null) === D.proxy, c = !p ? T.gray : p.status === "ok" ? T.success : p.status === "slow" ? T.warn : T.error;
                return (
                  <div key={p ? p.id : "direct"} className="flex items-center gap-3 rounded-lg px-2.5 py-2" style={{ background: on ? a(T.primary, 0.1) : "transparent" }}>
                    <Globe size={15} style={{ color: c }} />
                    <div className="min-w-0 flex-1"><div className="text-[13px]" style={{ color: T.text }}>{p ? p.name : "Kết nối trực tiếp"}</div>
                      <div className="text-[12px]" style={{ color: T.sub }}>{p ? `${p.host} · ${p.type} · ${p.ping || "—"}ms` : "Không qua proxy"}</div></div>
                    {on ? <Chip color={T.primary}>Đang dùng</Chip> : <Btn small onClick={() => assignProxy(D.id, p ? p.id : null)}>Gán</Btn>}
                  </div>);
              })}</div></Card>
            <Card title="Lịch sử IP" icon={MapPin}>{[[D.ip, D.loc, "Hiện tại", T.success], ["53.2.62.18", "Hanoi, VN", "1 ngày trước", T.warn], ["41.223.124.124", "Ho Chi Minh, VN", "5 ngày trước", T.info]].map(([ip, l, t, c], i) => (
              <div key={i} className="flex items-center gap-3 py-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} /><div className="flex-1 text-[13px]"><div style={{ color: T.text }}>{ip}</div><div style={{ color: T.sub }}>{l}</div></div><span className="text-[12px]" style={{ color: T.gray }}>{t}</span></div>))}</Card>
          </div>)}
        {dtab === "logs" && (
          <Card title="Log thiết bị" icon={Terminal} right={
            <div className="flex gap-1">{["all", "info", "success", "warn", "error", "debug"].map((l) => (
              <button key={l} onClick={() => setLogLevel(l)} className="cursor-pointer rounded-md px-2 py-0.5 text-[12px]" style={{ background: logLevel === l ? a(LEVEL[l] || T.primary, 0.18) : "transparent", color: logLevel === l ? LEVEL[l] || T.primary : T.sub }}>{l}</button>))}</div>} pad={false}>
            <LogList items={dLogs.filter((l) => logLevel === "all" || l.level === logLevel)} /></Card>)}
        {dtab === "activity" && <Card title="Timeline" icon={Activity}><Timeline items={acts.filter((e) => e.dev === D.id)} showDev={false} /></Card>}
      </div>
    </aside>);
  })();

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: T.bg, color: T.text, fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: 12, marginRight: D ? "min(600px,100%)" : 0, transition: "margin .2s" }}>
        {DevicesView}
      </div>
      {Drawer}
    </div>
  );
}
