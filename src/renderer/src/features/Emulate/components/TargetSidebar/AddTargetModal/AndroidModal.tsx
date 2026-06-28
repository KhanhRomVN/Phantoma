import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Loader2,
  Monitor,
  RefreshCw,
  Smartphone,
  Wifi,
  Zap,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../../components/ui/Modal';
import { BaseModalProps } from './types';

export const AndroidModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingApps = [],
}) => {
  const [deviceList, setDeviceList] = useState<
    { name: string; type: 'vm' | 'physical' | 'running-vm'; serial?: string }[]
  >([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [androidLoading, setAndroidLoading] = useState(false);
  const [androidSearch, setAndroidSearch] = useState('');
  const [androidView, setAndroidView] = useState<'list' | 'connect'>('list');
  const [wirelessIp, setWirelessIp] = useState('');
  const [wirelessPort, setWirelessPort] = useState('5555');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectStatus, setConnectStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [enablingWireless, setEnablingWireless] = useState<Record<string, boolean>>({});
  const [wirelessStatus, setWirelessStatus] = useState<
    Record<string, { ip?: string; message?: string }>
  >({});
  const [duplicateError, setDuplicateError] = useState<{ name?: string; value?: string }>({});

  const loadAndroidDevices = async () => {
    setAndroidLoading(true);
    try {
      const [vms, connected] = await Promise.all([
        window.api.invoke('mobile:list-genymotion-vms'),
        window.api.invoke('mobile:detect-emulators'),
      ]);
      const list: typeof deviceList = [];
      connected.forEach((dev: any) =>
        list.push({
          name: dev.name || dev.serial,
          type: dev.type === 'physical' ? 'physical' : 'running-vm',
          serial: dev.serial,
        }),
      );
      vms.forEach((vm: string) => {
        if (!connected.some((d: any) => d.name === vm || d.id === vm))
          list.push({ name: vm, type: 'vm', serial: vm });
      });
      setDeviceList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setAndroidLoading(false);
    }
  };

  const handleEnableWireless = async (device: { name: string; serial?: string }) => {
    const serial = device.serial || device.name;
    setEnablingWireless((p) => ({ ...p, [serial]: true }));
    try {
      const result = await window.api.invoke('mobile:enable-wireless-adb', serial);
      setWirelessStatus((p) => ({
        ...p,
        [serial]: result.success
          ? { ip: result.ip, message: result.message }
          : { message: result.error || 'Failed' },
      }));
      if (result.success) await loadAndroidDevices();
    } catch (e: any) {
      setWirelessStatus((p) => ({ ...p, [serial]: { message: e.message } }));
    } finally {
      setEnablingWireless((p) => ({ ...p, [serial]: false }));
    }
  };

  const handleWirelessConnect = async () => {
    if (!wirelessIp) {
      setConnectStatus({ type: 'error', message: 'Enter an IP address' });
      return;
    }
    setIsConnecting(true);
    setConnectStatus({ type: null, message: '' });
    try {
      const result = await window.api.invoke('mobile:connect-wireless', wirelessIp, wirelessPort);
      if (result.success) {
        setConnectStatus({ type: 'success', message: result.message || 'Connected!' });
        setTimeout(() => {
          loadAndroidDevices();
          setAndroidView('list');
        }, 1500);
      } else setConnectStatus({ type: 'error', message: result.error || 'Failed' });
    } catch (e: any) {
      setConnectStatus({ type: 'error', message: e.message });
    } finally {
      setIsConnecting(false);
    }
  };

  // Duplicate error detection
  useEffect(() => {
    if (selectedDevice) {
      const device = deviceList.find((d) => (d.serial || d.name) === selectedDevice);
      if (device) {
        const error: { name?: string; value?: string } = {};
        const existingByName = existingApps.find(
          (app) => app.name?.toLowerCase() === device.name.toLowerCase(),
        );
        const existingBySerial = existingApps.find(
          (app) =>
            app.emulatorSerial?.toLowerCase() === (device.serial || device.name).toLowerCase(),
        );
        if (existingByName) error.name = `Name "${existingByName.name}" already exists`;
        if (existingBySerial)
          error.value = `Device "${existingBySerial.emulatorSerial}" already exists`;
        setDuplicateError(error);
      }
    } else {
      setDuplicateError({});
    }
  }, [selectedDevice, deviceList, existingApps]);

  // Load devices on open
  useEffect(() => {
    if (!isOpen) return;
    setSelectedDevice(null);
    setAndroidSearch('');
    setAndroidView('list');
    loadAndroidDevices();
  }, [isOpen]);

  const filteredDevices = useMemo(() => {
    const existingSerials = new Set(existingApps.map((a) => a.emulatorSerial).filter(Boolean));
    return deviceList.filter(
      (d) =>
        d.serial &&
        !existingSerials.has(d.serial) &&
        (!androidSearch || d.name.toLowerCase().includes(androidSearch.toLowerCase())),
    );
  }, [deviceList, androidSearch, existingApps]);

  const handleSubmit = () => {
    if (!selectedDevice) return;
    const device = deviceList.find((d) => (d.serial || d.name) === selectedDevice);
    if (!device) return;
    onAdd({
      name: device.name,
      platform: 'android',
      mode: 'intercept',
      emulatorSerial: device.serial || device.name,
    });
    onClose();
  };

  const canSubmit = !!selectedDevice && !duplicateError.name && !duplicateError.value;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader
        title="Add Mobile"
        description="Configure your mobile target"
        onClose={onClose}
      />
      <ModalBody>
        <div className="flex flex-col" style={{ height: '50vh' }}>
          {androidView === 'list' ? (
            <>
              <div className="pb-3 flex gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search devices..."
                    value={androidSearch}
                    onChange={(e) => setAndroidSearch(e.target.value)}
                    className="w-full bg-input-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary outline-none focus:border-primary/50"
                  />
                </div>
                <button
                  onClick={() => setAndroidView('connect')}
                  className="p-2 bg-dropdown-item-hover hover:bg-dropdown-item-hover border border-border rounded-lg"
                  title="Wireless ADB"
                >
                  <Wifi className="w-4 h-4 text-text-secondary" />
                </button>
                <button
                  onClick={loadAndroidDevices}
                  className="p-2 bg-dropdown-item-hover hover:bg-dropdown-item-hover border border-border rounded-lg"
                >
                  <RefreshCw
                    className={cn(
                      'w-4 h-4 text-text-secondary',
                      androidLoading && 'animate-spin',
                    )}
                  />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {androidLoading && !deviceList.length ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-sm text-text-secondary">Scanning devices...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredDevices.map((device) => {
                      const serial = device.serial || device.name;
                      const isSelected = selectedDevice === serial;
                      const isWireless = serial.includes(':5555');
                      const isEnabling = enablingWireless[serial];
                      const status = wirelessStatus[serial];
                      const showWifi =
                        device.type === 'physical' &&
                        !isWireless &&
                        !deviceList.some(
                          (d) => d.name === device.name && d.serial?.includes(':5555'),
                        );
                      return (
                        <button
                          key={serial}
                          onClick={() => setSelectedDevice(serial)}
                          className={cn(
                            'relative flex flex-col p-3 rounded-xl border text-left transition-all',
                            isSelected
                              ? 'bg-primary/10 border-primary/40'
                              : 'bg-input-background border-border/40 hover:bg-dropdown-item-hover/60',
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center',
                                device.type === 'physical'
                                  ? 'bg-green/10 text-green'
                                  : device.type === 'running-vm'
                                    ? 'bg-blue/10 text-blue'
                                    : 'bg-dropdown-item-hover text-text-secondary',
                              )}
                            >
                              {device.type === 'physical' ? (
                                <Smartphone className="w-4 h-4" />
                              ) : device.type === 'running-vm' ? (
                                <Zap className="w-4 h-4" />
                              ) : (
                                <Monitor className="w-4 h-4" />
                              )}
                            </div>
                            {showWifi && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEnableWireless(device);
                                }}
                                disabled={isEnabling}
                                className="p-1.5 rounded-lg bg-dropdown-item-hover hover:bg-blue/20 hover:text-blue text-text-secondary transition-all"
                              >
                                {isEnabling ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Wifi className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-text-primary truncate">
                            {device.name}
                          </div>
                          <div className="text-[10px] text-text-secondary mt-0.5">
                            {isWireless
                              ? 'Wireless'
                              : device.type === 'physical'
                                ? 'USB'
                                : device.type === 'running-vm'
                                  ? 'Running VM'
                                  : 'Stopped VM'}
                          </div>
                          {status?.message && !status?.ip && (
                            <div className="mt-1.5 px-2 py-1 bg-warn/10 border border-warn/20 rounded text-[9px] text-warn">
                              {status.message}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setAndroidView('list')}
                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
                Back to list
              </button>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Device IP
                </label>
                <input
                  type="text"
                  value={wirelessIp}
                  onChange={(e) => setWirelessIp(e.target.value)}
                  placeholder="192.168.1.x"
                  className="w-full bg-input-background border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Port
                </label>
                <input
                  type="text"
                  value={wirelessPort}
                  onChange={(e) => setWirelessPort(e.target.value)}
                  placeholder="5555"
                  className="w-full bg-input-background border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary outline-none focus:border-primary"
                />
              </div>
              {connectStatus.type && (
                <div
                  className={cn(
                    'rounded-lg p-3 flex items-start gap-2 text-sm',
                    connectStatus.type === 'success'
                      ? 'bg-success/10 border border-success/20 text-success'
                      : 'bg-error/10 border border-error/20 text-error',
                  )}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {connectStatus.message}
                </div>
              )}
              <button
                onClick={handleWirelessConnect}
                disabled={isConnecting || !wirelessIp}
                className="w-full py-2.5 rounded-lg font-bold text-sm bg-primary hover:bg-primary/90 text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Connect
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          Add Target
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default AndroidModal;