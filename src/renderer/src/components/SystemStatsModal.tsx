/**
 * ------------------------------------------------------------------
 * SystemStatsModal
 * ------------------------------------------------------------------
 * Modal hiển thị thhống kê hệ thống: CPU, RAM, Disk, Network,
 * và thông tin hệ thống. Hiện dùng dữ liệu mock, sẽ thay bằng
 * API thật sau này.
 *
 * Main features:
 * - Hiển thị gauge tròn cho CPU/RAM/Disk
 * - Hiển thị thông tin network và system info
 * - Hiển thị các mini stat (temp, power, disk I/O, latency)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── UI ──
import { Cpu, Activity, HardDrive, Wifi, Zap, Server, Thermometer } from 'lucide-react';

// ── Components ──
import { Modal, ModalHeader, ModalBody } from './ui/Modal';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface SystemStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Gauge Component ────────────────────────────────────────────────────
function Gauge({
  value,
  size = 116,
  strokeWidth = 9,
  color,
  track = '#171D27',
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  track?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold text-text-primary leading-none">
          {Math.round(clamped)}
          <span className="text-xs text-text-secondary">%</span>
        </span>
      </div>
    </div>
  );
}

// ─── GaugeCard Component ────────────────────────────────────────────────
function GaugeCard({
  icon,
  label,
  value,
  color,
  meta,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  meta: { k: string; v: string }[];
}) {
  return (
    <div className="bg-card-background border border-border rounded-lg p-4 flex items-center gap-4">
      <Gauge value={value} color={color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs font-medium text-text-secondary">{label}</span>
        </div>
        {meta.map((m) => (
          <div key={m.k} className="flex justify-between gap-4 mb-1">
            <span className="text-[11px] text-text-secondary">{m.k}</span>
            <span className="text-[11px] font-mono text-text-primary">{m.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MiniStat Component ─────────────────────────────────────────────────
function MiniStat({
  icon,
  label,
  value,
  note,
  noteColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  noteColor: string;
}) {
  return (
    <div className="bg-card-background border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <div className="font-mono text-xl font-bold text-text-primary mb-1">{value}</div>
      <div className="text-[10px]" style={{ color: noteColor }}>
        {note}
      </div>
    </div>
  );
}

// ─── InfoRow Component ──────────────────────────────────────────────────
function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border">
      <span className="text-[11px] text-text-secondary">{k}</span>
      <span className="text-[11px] font-mono text-text-primary">{v}</span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────
export function SystemStatsModal({ isOpen, onClose }: SystemStatsModalProps) {
  // ── Derived ──
  const systemStats = {
    cpu: {
      usage: 45,
      cores: 8,
      threads: 16,
      speed: '3.2 GHz',
      temperature: 62,
    },
    memory: {
      used: 12.4,
      total: 20,
      percentage: 62,
      available: 7.6,
    },
    disk: {
      used: 234,
      total: 500,
      percentage: 78,
      available: 266,
    },
    network: {
      upload: '1.2 MB/s',
      download: '5.4 MB/s',
      totalSent: '45.2 GB',
      totalReceived: '128.7 GB',
    },
    system: {
      uptime: '3d 12h 45m',
      platform: 'Linux',
      arch: 'x64',
      nodeVersion: 'v20.10.0',
    },
  };

  // ── Render ──
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[85vh]">
      <ModalHeader title="System Statistics" onClose={onClose} />

      <ModalBody className="overflow-y-auto">
        {/* Main gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <GaugeCard
            icon={<Cpu className="w-[13px] h-[13px]" style={{ color: '#5CE1E6' }} />}
            label="Processor"
            value={systemStats.cpu.usage}
            color="#5CE1E6"
            meta={[
              { k: 'Cores', v: '8' },
              { k: 'Threads', v: '16' },
              { k: 'Clock', v: '3.2 GHz' },
              { k: 'Temp', v: `${systemStats.cpu.temperature}°C` },
            ]}
          />
          <GaugeCard
            icon={<Activity className="w-[13px] h-[13px]" style={{ color: '#A78BFA' }} />}
            label="Memory"
            value={systemStats.memory.percentage}
            color="#A78BFA"
            meta={[
              { k: 'Used', v: `${systemStats.memory.used.toFixed(1)} GB` },
              { k: 'Total', v: `${systemStats.memory.total} GB` },
              { k: 'Available', v: `${systemStats.memory.available.toFixed(1)} GB` },
              { k: 'Swap', v: '1.1 GB' },
            ]}
          />
          <GaugeCard
            icon={<HardDrive className="w-[13px] h-[13px]" style={{ color: '#FBBF24' }} />}
            label="Disk"
            value={systemStats.disk.percentage}
            color="#FBBF24"
            meta={[
              { k: 'Used', v: `${systemStats.disk.used} GB` },
              { k: 'Total', v: `${systemStats.disk.total} GB` },
              { k: 'Free', v: `${systemStats.disk.available} GB` },
              { k: 'Type', v: 'NVMe SSD' },
            ]}
          />
        </div>

        {/* Network & System Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Network Card */}
          <div className="bg-card-background border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-text-primary">Network</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-text-secondary">Upload</span>
                <p className="text-lg font-mono font-semibold text-cyan-400">
                  {systemStats.network.upload}
                </p>
                <span className="text-[10px] text-text-secondary">
                  Total: {systemStats.network.totalSent}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-text-secondary">Download</span>
                <p className="text-lg font-mono font-semibold text-emerald-400">
                  {systemStats.network.download}
                </p>
                <span className="text-[10px] text-text-secondary">
                  Total: {systemStats.network.totalReceived}
                </span>
              </div>
            </div>
          </div>

          {/* System Info Card */}
          <div className="bg-card-background border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-text-secondary" />
              <h3 className="text-sm font-semibold text-text-primary">System Info</h3>
            </div>
            <InfoRow k="Uptime" v={systemStats.system.uptime} />
            <InfoRow k="Platform" v={systemStats.system.platform} />
            <InfoRow k="Architecture" v={systemStats.system.arch} />
            <InfoRow k="Node Version" v={systemStats.system.nodeVersion} />
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat
            icon={<Thermometer className="w-4 h-4 text-amber-400" />}
            label="Core Temp"
            value={`${systemStats.cpu.temperature}°C`}
            note="Nominal"
            noteColor="#34D399"
          />
          <MiniStat
            icon={<Zap className="w-4 h-4 text-purple-400" />}
            label="Power Draw"
            value="64 W"
            note="Balanced"
            noteColor="#8891A4"
          />
          <MiniStat
            icon={<HardDrive className="w-4 h-4 text-amber-400" />}
            label="Disk I/O"
            value="112 MB/s"
            note="Read-heavy"
            noteColor="#8891A4"
          />
          <MiniStat
            icon={<Wifi className="w-4 h-4 text-cyan-400" />}
            label="Latency"
            value="12 ms"
            note="Excellent"
            noteColor="#34D399"
          />
        </div>
      </ModalBody>
    </Modal>
  );
}