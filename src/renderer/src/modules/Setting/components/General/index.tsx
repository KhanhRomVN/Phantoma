import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Code, Copy, Crosshair, Globe, Radio, Server, UserRound } from 'lucide-react';
import { useServerHealth } from '../../../../providers/ServerHealthProvider';
import { getRuntimePorts } from '@renderer/services/runtime-ports';
import { DEV_PORTS, serverBaseUrl, emulateBaseUrl } from '@renderer/config/ports';
import {
  Badge,
  Dot,
  INPUT_CLASS,
  PageHeader,
  Row,
  Section,
  Segmented,
  Select,
  Toggle,
} from '../shared';

const CopyValue: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <div className="flex items-center gap-1.5">
      <input readOnly value={value} className={`${INPUT_CLASS} w-52 font-mono`} />
      <button
        type="button"
        onClick={copy}
        title="Copy"
        className="flex h-8 w-8 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary outline-none transition-colors hover:text-text-primary"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
};

const General: React.FC = () => {
  const [serverPort, setServerPort] = useState<number>(DEV_PORTS.server);
  const [emulatePort, setEmulatePort] = useState<number>(DEV_PORTS.emulate);
  const { error, isValid } = useServerHealth();

  const [reconDepth, setReconDepth] = useState('standard');
  const [reconAutoSave, setReconAutoSave] = useState(true);
  const [reconMapTiles, setReconMapTiles] = useState('dark');
  const [reconTimeout, setReconTimeout] = useState('15');

  const [codeAutoSave, setCodeAutoSave] = useState(true);
  const [codeFormat, setCodeFormat] = useState(false);
  const [codeTab, setCodeTab] = useState('2');
  const [codeBranch, setCodeBranch] = useState('main');

  const [profileEngine, setProfileEngine] = useState('chrome');
  const [profileSync, setProfileSync] = useState(true);
  const [profileClose, setProfileClose] = useState('ask');

  const [proxyProtocol, setProxyProtocol] = useState('socks5');
  const [proxyRotate, setProxyRotate] = useState(false);
  const [proxyHealth, setProxyHealth] = useState('60');

  useEffect(() => {
    getRuntimePorts()
      .then((ports) => {
        setServerPort(ports.server);
        setEmulatePort(ports.emulate);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="General"
        description="Runtime services and per-module defaults for Phantoma."
        actions={
          <Badge tone={isValid ? 'success' : 'error'}>
            <Dot tone={isValid ? 'success' : 'error'} pulse={!isValid} />
            {isValid ? 'All systems online' : 'Server offline'}
          </Badge>
        }
      />

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-error/30 bg-error/10 p-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
          <div>
            <p className="m-0 text-[12.5px] font-medium text-error">Server connection error</p>
            <p className="m-0 mt-0.5 text-[11.5px] text-error/90">{error}</p>
          </div>
        </div>
      )}

      <Section
        title="Shell server"
        description="Main backend of the application"
        icon={<Server className="h-3.5 w-3.5" />}
        tone="blue"
        action={
          <Badge tone={isValid ? 'success' : 'error'}>{isValid ? 'Running' : 'Unreachable'}</Badge>
        }
      >
        <Row label="Port" description="Read-only. Assigned by the app on start.">
          <CopyValue value={new URL(serverBaseUrl(serverPort)).port} />
        </Row>
        <Row label="Base URL">
          <CopyValue value={serverBaseUrl(serverPort)} />
        </Row>
      </Section>

      <Section
        title="Emulate service"
        description="Device emulation backend, started on demand"
        icon={<Radio className="h-3.5 w-3.5" />}
        tone="teal"
      >
        <Row label="Port" description="Read-only. Assigned when the Emulate module opens.">
          <CopyValue value={new URL(emulateBaseUrl(emulatePort)).port} />
        </Row>
        <Row label="Base URL">
          <CopyValue value={emulateBaseUrl(emulatePort)} />
        </Row>
      </Section>

      <Section
        title="Recon"
        description="Target scanning defaults"
        icon={<Crosshair className="h-3.5 w-3.5" />}
        tone="purple"
        action={<Badge tone="purple">mock</Badge>}
      >
        <Row label="Scan depth" description="How deep a new target is crawled.">
          <Segmented
            tone="purple"
            value={reconDepth}
            onChange={setReconDepth}
            options={[
              { id: 'quick', label: 'Quick' },
              { id: 'standard', label: 'Standard' },
              { id: 'deep', label: 'Deep' },
            ]}
          />
        </Row>
        <Row label="Request timeout" description="Seconds before a probe is dropped.">
          <Select
            value={reconTimeout}
            onChange={setReconTimeout}
            options={[
              { value: '5', label: '5 seconds' },
              { value: '15', label: '15 seconds' },
              { value: '30', label: '30 seconds' },
            ]}
          />
        </Row>
        <Row label="Map tiles" description="Style of the Recon map.">
          <Select
            value={reconMapTiles}
            onChange={setReconMapTiles}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'satellite', label: 'Satellite' },
            ]}
          />
        </Row>
        <Row label="Auto-save results" description="Write findings to .recon files as they arrive.">
          <Toggle checked={reconAutoSave} onChange={setReconAutoSave} />
        </Row>
      </Section>

      <Section
        title="Code"
        description="Editor and project defaults"
        icon={<Code className="h-3.5 w-3.5" />}
        tone="info"
        action={<Badge tone="info">mock</Badge>}
      >
        <Row label="Default branch" description="Used when creating a new project.">
          <input
            value={codeBranch}
            onChange={(e) => setCodeBranch(e.target.value)}
            className={`${INPUT_CLASS} w-40 font-mono`}
          />
        </Row>
        <Row label="Tab size">
          <Segmented
            tone="info"
            value={codeTab}
            onChange={setCodeTab}
            options={[
              { id: '2', label: '2' },
              { id: '4', label: '4' },
              { id: '8', label: '8' },
            ]}
          />
        </Row>
        <Row label="Auto-save files" description="Save edited files after a short pause.">
          <Toggle checked={codeAutoSave} onChange={setCodeAutoSave} />
        </Row>
        <Row label="Format on save" description="Run the project formatter when saving.">
          <Toggle checked={codeFormat} onChange={setCodeFormat} />
        </Row>
      </Section>

      <Section
        title="Profile"
        description="Browser profile defaults"
        icon={<UserRound className="h-3.5 w-3.5" />}
        tone="pink"
        action={<Badge tone="pink">mock</Badge>}
      >
        <Row label="Default engine" description="Browser used when launching a profile.">
          <Segmented
            tone="pink"
            value={profileEngine}
            onChange={setProfileEngine}
            options={[
              { id: 'chrome', label: 'Chrome' },
              { id: 'chromium', label: 'Chromium' },
            ]}
          />
        </Row>
        <Row label="On browser close" description="What to do with a profile session when its window closes.">
          <Select
            value={profileClose}
            onChange={setProfileClose}
            options={[
              { value: 'ask', label: 'Ask every time' },
              { value: 'sync', label: 'Sync and close' },
              { value: 'keep', label: 'Keep as is' },
            ]}
          />
        </Row>
        <Row label="Auto-sync cookies" description="Keep cookies and history in sync after each launch.">
          <Toggle checked={profileSync} onChange={setProfileSync} />
        </Row>
      </Section>

      <Section
        title="Proxy"
        description="Proxy and VPN defaults"
        icon={<Globe className="h-3.5 w-3.5" />}
        tone="warn"
        action={<Badge tone="warn">mock</Badge>}
      >
        <Row label="Default protocol">
          <Segmented
            tone="warn"
            value={proxyProtocol}
            onChange={setProxyProtocol}
            options={[
              { id: 'http', label: 'HTTP' },
              { id: 'socks5', label: 'SOCKS5' },
            ]}
          />
        </Row>
        <Row label="Health check interval" description="Seconds between proxy liveness checks.">
          <Select
            value={proxyHealth}
            onChange={setProxyHealth}
            options={[
              { value: '30', label: '30 seconds' },
              { value: '60', label: '60 seconds' },
              { value: '300', label: '5 minutes' },
            ]}
          />
        </Row>
        <Row label="Rotate on failure" description="Switch to another proxy when one stops responding.">
          <Toggle checked={proxyRotate} onChange={setProxyRotate} />
        </Row>
      </Section>
    </div>
  );
};

export default General;