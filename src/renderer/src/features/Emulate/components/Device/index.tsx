import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Loader2, Shield, Syringe, Play, Square, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';

interface Device {
  name: string;
  serial: string;
  type: 'physical' | 'vm' | 'running-vm';
}

interface DeviceStatus {
  frida: 'not_installed' | 'installed' | 'running' | 'error';
  proxy: 'stopped' | 'running' | 'error';
  ssl_unpinned: boolean;
}

export function DevicePanel() {
  // [DEBUG] DevicePanel render
  console.log('[DEBUG] DevicePanel rendered');
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, DeviceStatus>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, string[]>>({});

  const loadDevices = async () => {
    setLoading(true);
    try {
      const [vms, connected] = await Promise.all([
        window.api.invoke('mobile:list-genymotion-vms'),
        window.api.invoke('mobile:detect-emulators'),
      ]);
      
      const list: Device[] = [];
      connected.forEach((dev: any) => {
        list.push({
          name: dev.name || dev.serial,
          serial: dev.serial,
          type: dev.type === 'physical' ? 'physical' : 'running-vm',
        });
      });
      vms.forEach((vm: string) => {
        if (!connected.some((d: any) => d.name === vm || d.id === vm)) {
          list.push({ name: vm, serial: vm, type: 'vm' });
        }
      });
      setDevices(list);
      
      // Check status for each device
      for (const device of list) {
        await checkDeviceStatus(device.serial);
      }
    } catch (e) {
      console.error('Failed to load devices:', e);
    } finally {
      setLoading(false);
    }
  };

  const checkDeviceStatus = async (serial: string) => {
    try {
      const fridaStatus = await window.api.invoke('mobile:check-frida', serial);
      setStatusMap((prev) => ({
        ...prev,
        [serial]: {
          ...prev[serial],
          frida: fridaStatus,
        },
      }));
    } catch (e) {
      console.error('Failed to check device status:', e);
    }
  };

  const handleDeployFrida = async (device: Device) => {
    const serial = device.serial;
    setActionLoading((prev) => ({
      ...prev,
      [serial]: { ...prev[serial], deployFrida: true },
    }));
    
    try {
      const installed = await window.api.invoke('mobile:install-frida', serial);
      if (installed) {
        const started = await window.api.invoke('mobile:start-frida', serial);
        if (started) {
          await checkDeviceStatus(serial);
          addLog(serial, '✅ Frida deployed and started successfully');
        }
      }
    } catch (e: any) {
      addLog(serial, `❌ Failed to deploy Frida: ${e.message}`);
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [serial]: { ...prev[serial], deployFrida: false },
      }));
    }
  };

  const handleToggleProxy = async (device: Device) => {
    const serial = device.serial;
    const isRunning = statusMap[serial]?.proxy === 'running';
    setActionLoading((prev) => ({
      ...prev,
      [serial]: { ...prev[serial], toggleProxy: true },
    }));
    
    try {
      if (isRunning) {
        await window.api.invoke('proxy:destroy-session', 'default');
        setStatusMap((prev) => ({
          ...prev,
          [serial]: { ...prev[serial], proxy: 'stopped' },
        }));
        addLog(serial, '⏹️ Proxy stopped');
      } else {
        await window.api.invoke('proxy:create-session', 'default');
        setStatusMap((prev) => ({
          ...prev,
          [serial]: { ...prev[serial], proxy: 'running' },
        }));
        addLog(serial, '▶️ Proxy started');
      }
    } catch (e: any) {
      addLog(serial, `❌ Failed to toggle proxy: ${e.message}`);
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [serial]: { ...prev[serial], toggleProxy: false },
      }));
    }
  };

  const handleSSLUnpin = async (device: Device) => {
    const serial = device.serial;
    setActionLoading((prev) => ({
      ...prev,
      [serial]: { ...prev[serial], sslUnpin: true },
    }));
    
    try {
      // Get package name from user or use default
      const packageName = prompt('Enter package name to unpin (e.g., com.facebook.katana):');
      if (!packageName) return;

      addLog(serial, `🔓 Unpinning SSL for ${packageName}...`);
      const result = await window.api.invoke('mobile:inject-ssl-bypass', serial, packageName);
      if (result) {
        setStatusMap((prev) => ({
          ...prev,
          [serial]: { ...prev[serial], ssl_unpinned: true },
        }));
        addLog(serial, `✅ SSL unpinned successfully for ${packageName}`);
      } else {
        addLog(serial, `❌ Failed to unpin SSL for ${packageName}`);
      }
    } catch (e: any) {
      addLog(serial, `❌ SSL unpin error: ${e.message}`);
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [serial]: { ...prev[serial], sslUnpin: false },
      }));
    }
  };

  const addLog = (serial: string, message: string) => {
    setLogs((prev) => ({
      ...prev,
      [serial]: [...(prev[serial] || []), `[${new Date().toLocaleTimeString()}] ${message}`],
    }));
  };

  useEffect(() => {
    loadDevices();
    // Refresh every 30 seconds
    const interval = setInterval(loadDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Running</span>;
      case 'installed':
        return <span className="text-xs text-blue-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Installed</span>;
      case 'not_installed':
        return <span className="text-xs text-text-secondary flex items-center gap-1"><XCircle className="w-3 h-3" /> Not installed</span>;
      case 'error':
        return <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Error</span>;
      default:
        return <span className="text-xs text-text-secondary">Unknown</span>;
    }
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Device Management</h2>
          <p className="text-xs text-text-secondary">Manage Android devices, Frida, and SSL unpinning</p>
        </div>
        <button
          onClick={loadDevices}
          disabled={loading}
          className="p-2 rounded-lg bg-dropdown-item-hover hover:bg-dropdown-item-hover border border-border transition-all"
        >
          <RefreshCw className={cn('w-4 h-4 text-text-secondary', loading && 'animate-spin')} />
        </button>
      </div>

      {loading && devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-text-secondary">Scanning devices...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Smartphone className="w-12 h-12 text-text-secondary/30" />
          <p className="text-sm text-text-secondary mt-2">No devices found</p>
          <p className="text-xs text-text-secondary/60">Start a Genymotion VM or connect an Android device</p>
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => {
            const status = statusMap[device.serial] || { frida: 'not_installed', proxy: 'stopped', ssl_unpinned: false };
            const isLoading = actionLoading[device.serial] || {};
            const deviceLogs = logs[device.serial] || [];
            const isSelected = selectedDevice === device.serial;

            return (
              <div
                key={device.serial}
                className={cn(
                  'bg-input-background border border-border rounded-xl overflow-hidden transition-all',
                  isSelected && 'border-primary/40'
                )}
              >
                {/* Device header */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-dropdown-item-hover/30"
                  onClick={() => setSelectedDevice(isSelected ? null : device.serial)}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    device.type === 'physical' ? 'bg-green/10' : 'bg-blue/10'
                  )}>
                    {device.type === 'physical' ? (
                      <Smartphone className="w-5 h-5 text-green-400" />
                    ) : (
                      <Monitor className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">{device.name}</div>
                    <div className="text-xs text-text-secondary truncate font-mono">{device.serial}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(status.frida)}
                      <span className={cn(
                        'text-xs',
                        status.proxy === 'running' ? 'text-green-400' : 'text-text-secondary'
                      )}>
                        {status.proxy === 'running' ? '🟢 Proxy' : '⚪ Proxy'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Device actions */}
                {isSelected && (
                  <div className="px-3 pb-3 space-y-3">
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                      <button
                        onClick={() => handleDeployFrida(device)}
                        disabled={isLoading.deployFrida}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                          status.frida === 'running'
                            ? 'bg-green/10 text-green border border-green/20'
                            : 'bg-blue/10 text-blue border border-blue/20 hover:bg-blue/20'
                        )}
                      >
                        {isLoading.deployFrida ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Syringe className="w-3 h-3" />
                        )}
                        {status.frida === 'running' ? 'Frida Running' : 'Deploy Frida'}
                      </button>

                      <button
                        onClick={() => handleToggleProxy(device)}
                        disabled={isLoading.toggleProxy}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                          status.proxy === 'running'
                            ? 'bg-red/10 text-red border border-red/20 hover:bg-red/20'
                            : 'bg-amber/10 text-amber border border-amber/20 hover:bg-amber/20'
                        )}
                      >
                        {isLoading.toggleProxy ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : status.proxy === 'running' ? (
                          <Square className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        {status.proxy === 'running' ? 'Stop Proxy' : 'Start Proxy'}
                      </button>

                      <button
                        onClick={() => handleSSLUnpin(device)}
                        disabled={isLoading.sslUnpin}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                          status.ssl_unpinned
                            ? 'bg-green/10 text-green border border-green/20'
                            : 'bg-purple/10 text-purple border border-purple/20 hover:bg-purple/20'
                        )}
                      >
                        {isLoading.sslUnpin ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Shield className="w-3 h-3" />
                        )}
                        {status.ssl_unpinned ? 'SSL Unpinned' : 'SSL Unpin'}
                      </button>
                    </div>

                    {/* Logs */}
                    {deviceLogs.length > 0 && (
                      <div className="bg-background/50 rounded-lg p-2 max-h-32 overflow-y-auto">
                        <div className="text-[10px] font-mono text-text-secondary space-y-0.5">
                          {deviceLogs.slice(-10).map((log, i) => (
                            <div key={i}>{log}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DevicePanel;