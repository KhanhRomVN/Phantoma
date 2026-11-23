/**
 * ------------------------------------------------------------------
 * Storage Service
 * ------------------------------------------------------------------
 * Dung lượng volume (đã lọc filesystem ảo), thông tin ổ vật lý kèm SMART
 * và tốc độ đọc/ghi hiện tại. `volumes()` cũng được AlertService dùng.
 * ------------------------------------------------------------------
 */

import path from 'path';
import { PSEUDO_FS_TYPES, PSEUDO_MOUNT_PREFIXES } from '../../constants';
import type {
  SmartState,
  StorageDetails,
  StorageDisk,
  StorageVolume,
} from '../../types/system.type';
import { round } from '../../utils/number.util';
import type { SystemProbeService } from './system-probe.service';

type BlockDevice = Awaited<ReturnType<SystemProbeService['blockDevices']['get']>>[number];
type FsEntry = Awaited<ReturnType<SystemProbeService['fsSize']['get']>>[number];

const MAC_DATA_VOLUME = '/System/Volumes/Data';

function isRealVolume(fs: FsEntry): boolean {
  if (fs.size <= 0 || PSEUDO_FS_TYPES.has(fs.type)) return false;
  if (PSEUDO_MOUNT_PREFIXES.some((p) => fs.mount.startsWith(p))) return false;
  // macOS: APFS tạo nhiều volume hệ thống nhỏ — chỉ giữ volume Data
  if (fs.mount.startsWith('/System/Volumes/') && fs.mount !== MAC_DATA_VOLUME) return false;
  return true;
}

function physicalType(block: BlockDevice | undefined): string | null {
  if (!block) return null;
  if (/nvme/i.test(block.protocol)) return 'NVMe SSD';
  return block.physical || null;
}

function smartState(status: string): SmartState {
  if (/^ok$/i.test(status)) return 'healthy';
  if (/fail|warn|bad/i.test(status)) return 'warning';
  return 'unknown';
}

export class StorageService {
  constructor(private readonly probe: SystemProbeService) {}

  async volumes(): Promise<StorageVolume[]> {
    const [fsList, blocks] = await Promise.all([
      this.probe.fsSize.get(),
      this.probe.blockDevices.get().catch((): BlockDevice[] => []),
    ]);

    // Một thiết bị có thể mount nhiều nơi (bind mount, btrfs subvolume) → giữ mount ngắn nhất.
    const byDevice = new Map<string, FsEntry>();
    for (const fs of fsList.filter(isRealVolume)) {
      const existing = byDevice.get(fs.fs);
      if (!existing || fs.mount.length < existing.mount.length) byDevice.set(fs.fs, fs);
    }

    return [...byDevice.values()]
      .map((fs): StorageVolume => {
        const block = blocks.find(
          (b) => b.device === fs.fs || b.name === path.basename(fs.fs) || b.mount === fs.mount,
        );
        return {
          device: fs.fs,
          mount: fs.mount,
          fsType: fs.type,
          physicalType: physicalType(block),
          totalBytes: fs.size,
          usedBytes: fs.used,
          usePct: round(fs.use),
          readOnly: fs.rw === null ? null : !fs.rw,
        };
      })
      .sort((a, b) => a.mount.length - b.mount.length || a.mount.localeCompare(b.mount));
  }

  async disks(): Promise<StorageDisk[]> {
    const layout = await this.probe.diskLayout.get().catch(() => []);
    return layout.map((d): StorageDisk => ({
      device: d.device,
      name: d.name,
      vendor: d.vendor,
      type: d.type,
      interfaceType: d.interfaceType,
      sizeBytes: d.size,
      smart: smartState(d.smartStatus),
      temperatureC: d.temperature ?? null,
    }));
  }

  async details(): Promise<StorageDetails> {
    const [volumes, disks, io] = await Promise.all([
      this.volumes(),
      this.disks(),
      this.probe.diskThroughput.getStale(),
    ]);
    return { volumes, disks, io };
  }
}
