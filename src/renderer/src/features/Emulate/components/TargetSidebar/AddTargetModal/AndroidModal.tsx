import React, { useState, useEffect, useMemo } from 'react';
import { Search, Smartphone, Monitor, Loader2, RefreshCw, Check } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../../components/ui/Modal';
import { BaseModalProps } from './types';

interface Device {
  name: string;
  serial: string;
  type: 'physical' | 'vm' | 'running-vm';
}

export const AndroidModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingApps = [],
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

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
    } catch (e) {
      console.error('Failed to load devices:', e);
    } finally {
      setLoading(false);
    }
  };

  // Reset state khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      setDevices([]);
      setSearchQuery('');
      setSelectedDevice(null);
      setDuplicateError(null);
    }
  }, [isOpen]);

  // Load devices khi mở modal
  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  // Lọc danh sách device theo search
  const filteredDevices = useMemo(() => {
    if (!searchQuery) return devices;
    const q = searchQuery.toLowerCase();
    return devices.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.serial.toLowerCase().includes(q),
    );
  }, [devices, searchQuery]);

  // Kiểm tra trùng lặp device
  useEffect(() => {
    if (!selectedDevice) {
      setDuplicateError(null);
      return;
    }

    const existing = existingApps.find(
      (app) => app.emulatorSerial?.toLowerCase() === selectedDevice.serial?.toLowerCase(),
    );
    if (existing) {
      setDuplicateError(`Device "${existing.name}" (${existing.emulatorSerial}) đã tồn tại`);
    } else {
      setDuplicateError(null);
    }
  }, [selectedDevice, existingApps]);

  const handleSubmit = async () => {
    if (!selectedDevice) return;
    if (duplicateError) return;

    try {
      await onAdd({
        name: selectedDevice.name,
        platform: 'android',
        mode: 'intercept',
        emulatorSerial: selectedDevice.serial,
      });
      onClose();
    } catch (error) {
      console.error('[AndroidModal] Add target failed:', error);
    }
  };

  const canSubmit = !!selectedDevice && !duplicateError;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader
        title="Add Android Device"
        description="Chọn thiết bị Android từ danh sách scan được"
        onClose={onClose}
      />
      <ModalBody>
        <div className="flex flex-col" style={{ height: '50vh' }}>
          {/* Search + Refresh */}
          <div className="pb-3 flex gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input
                type="text"
                placeholder="Tìm device theo tên hoặc serial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-input-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary outline-none focus:border-primary/50"
              />
            </div>
            <button
              onClick={loadDevices}
              disabled={loading}
              className="p-2 bg-dropdown-item-hover hover:bg-dropdown-item-hover border border-border rounded-lg transition-all"
            >
              <RefreshCw className={cn('w-4 h-4 text-text-secondary', loading && 'animate-spin')} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && devices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-text-secondary">Đang quét thiết bị...</p>
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                <Smartphone className="w-12 h-12 text-text-secondary/30" />
                <p className="text-sm mt-2">Không tìm thấy thiết bị</p>
                <p className="text-xs text-text-secondary/60">
                  Hãy khởi động Genymotion VM hoặc kết nối thiết bị Android
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredDevices.map((device) => {
                  const isSelected = selectedDevice?.serial === device.serial;
                  const isExisting = existingApps.some(
                    (app) => app.emulatorSerial?.toLowerCase() === device.serial.toLowerCase(),
                  );
                  const Icon = device.type === 'physical' ? Smartphone : Monitor;

                  return (
                    <button
                      key={device.serial}
                      onClick={() => {
                        if (isExisting) return;
                        setSelectedDevice(device);
                      }}
                      disabled={isExisting}
                      className={cn(
                        'relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        isSelected
                          ? 'bg-primary/10 border-primary/40'
                          : isExisting
                            ? 'bg-dropdown-item-hover/40 border-border/40 opacity-50 cursor-not-allowed'
                            : 'bg-input-background border-border/40 hover:bg-dropdown-item-hover/60',
                      )}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          device.type === 'physical' ? 'bg-green/10' : 'bg-blue/10',
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-4 h-4',
                            device.type === 'physical' ? 'text-green' : 'text-blue',
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-text-primary truncate">
                          {device.name}
                        </div>
                        <div className="text-[10px] text-text-secondary truncate font-mono">
                          {device.serial}
                        </div>
                        <div className="text-[9px] text-text-secondary/60 mt-0.5">
                          {device.type === 'physical'
                            ? '📱 Physical'
                            : device.type === 'running-vm'
                              ? '⚡ Running VM'
                              : '⏸️ Stopped VM'}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      {isExisting && (
                        <span className="text-[9px] text-text-secondary shrink-0">Đã có</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Error message */}
          {duplicateError && (
            <div className="pt-3 shrink-0">
              <div className="bg-error/10 border border-error/20 rounded-lg p-2 text-sm text-error">
                {duplicateError}
              </div>
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