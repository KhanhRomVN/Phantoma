import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useServerHealth } from '../../../../providers/ServerHealthProvider';
import { getRuntimePorts } from '@renderer/services/runtime-ports';
import { DEV_PORTS, serverBaseUrl, emulateBaseUrl } from '@renderer/config/ports';

const General: React.FC = () => {
  const [serverPort, setServerPort] = useState<number>(DEV_PORTS.server);
  const [emulatePort, setEmulatePort] = useState<number>(DEV_PORTS.emulate);
  const { error, isValid } = useServerHealth();

  useEffect(() => {
    getRuntimePorts()
      .then((ports) => {
        setServerPort(ports.server);
        setEmulatePort(ports.emulate);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-base text-primary m-0 mb-4">General Settings</h3>

        {import.meta.env.DEV && (
        <>
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary tracking-wide mb-1.5">
            Server Port
          </label>
          <input
            type="text"
            readOnly
            value={new URL(serverBaseUrl(serverPort)).port}
            className="w-full max-w-md px-4 py-3 bg-input-background border border-border rounded-md text-text-primary text-[13px] font-mono outline-none"
          />
          <p className="text-[10px] text-text-secondary mt-2 mb-0">
            Cổng do ứng dụng tự chọn khi khởi động (không cố định).
          </p>

          {!isValid && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
              <span className="text-error text-xs">Server is not reachable</span>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-md bg-error/20 border border-error/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-error">Server Connection Error</p>
                  <p className="text-xs text-error/90 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <label className="block text-sm font-medium text-text-primary tracking-wide mb-1.5">
            Emulate Service Port
          </label>
          <input
            type="text"
            readOnly
            value={new URL(emulateBaseUrl(emulatePort)).port}
            className="w-full max-w-md px-4 py-3 bg-input-background border border-border rounded-md text-text-primary text-[13px] font-mono outline-none"
          />
          <p className="text-[10px] text-text-secondary mt-2 mb-0">
            Cổng do ứng dụng tự chọn khi khởi động (không cố định).
          </p>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default General;