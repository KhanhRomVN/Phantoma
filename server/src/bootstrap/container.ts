/**
 * ------------------------------------------------------------------
 * DI Container
 * ------------------------------------------------------------------
 * Nơi duy nhất khởi tạo và nối dependency cho toàn bộ service.
 * Controller/route nhận `AppContainer` thay vì import singleton trực tiếp.
 * ------------------------------------------------------------------
 */

import { config } from '../config';
import { PreferencesStore } from '../startup/preferences.store';
import { BrowserForkService } from '../services/browser/browser-fork.service';
import { BrowserUpdateService } from '../services/browser/browser-update.service';
import { AlertService } from '../services/system/alert.service';
import { DeviceFingerprintService } from '../services/system/device-fingerprint.service';
import { DockerService } from '../services/system/docker.service';
import { GpuService } from '../services/system/gpu.service';
import { LogService } from '../services/system/log.service';
import { NetworkService } from '../services/system/network.service';
import { PortService } from '../services/system/port.service';
import { ProcessService } from '../services/system/process.service';
import { SecurityService } from '../services/system/security.service';
import { SensorService } from '../services/system/sensor.service';
import { ServiceManagerService } from '../services/system/service-manager.service';
import { StorageService } from '../services/system/storage.service';
import { SystemInfoService } from '../services/system/system-info.service';
import { SystemMonitorService } from '../services/system/system-monitor.service';
import { SystemProbeService } from '../services/system/system-probe.service';

export interface AppContainer {
  preferences: PreferencesStore;
  browserFork: BrowserForkService;
  browserUpdate: BrowserUpdateService;
  deviceFingerprint: DeviceFingerprintService;
  systemMonitor: SystemMonitorService;
  systemInfo: SystemInfoService;
  gpu: GpuService;
  storage: StorageService;
  network: NetworkService;
  sensors: SensorService;
  processes: ProcessService;
  serviceManager: ServiceManagerService;
  docker: DockerService;
  ports: PortService;
  logs: LogService;
  alerts: AlertService;
  security: SecurityService;
  /** Dừng các tác vụ nền (gọi khi shutdown). */
  dispose(): void;
}

export function createContainer(): AppContainer {
  const preferences = new PreferencesStore(config.paths.preferencesFile);

  // ── Browser ──
  const browserFork = new BrowserForkService(config.paths.dataDir);
  const browserUpdate = new BrowserUpdateService(browserFork);

  // ── System ──
  const probe = new SystemProbeService(config.system);
  const systemMonitor = new SystemMonitorService(probe, config.system);
  const storage = new StorageService(probe);
  const ports = new PortService(probe);
  const serviceManager = new ServiceManagerService(config.system.controlEnabled);

  return {
    preferences,
    browserFork,
    browserUpdate,
    deviceFingerprint: new DeviceFingerprintService(),
    systemMonitor,
    systemInfo: new SystemInfoService(probe),
    gpu: new GpuService(probe),
    storage,
    network: new NetworkService(probe, systemMonitor, config.system),
    sensors: new SensorService(probe),
    processes: new ProcessService(probe),
    serviceManager,
    docker: new DockerService(),
    ports,
    logs: new LogService(),
    alerts: new AlertService(systemMonitor, storage, serviceManager, preferences),
    security: new SecurityService(ports, serviceManager, storage),
    dispose: () => systemMonitor.stop(),
  };
}
