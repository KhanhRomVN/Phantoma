/**
 * Mobile device & provisioning types.
 */

export interface ArmTranslationStatus {
  installed: boolean;
  zipAvailable: boolean;
}

export interface CertStatus {
  installed: boolean;
  hash: string;
  caAvailable: boolean;
}

export interface FridaStatus {
  running: boolean;
  started: boolean;
  pid: number | null;
  binary: string | null;
}

export interface StepResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export interface ProvisionResult {
  armTranslation: StepResult;
  cert: StepResult;
  frida: StepResult;
}

export interface RunningMobileDevice {
  name: string;
  serial: string;
  uuid: string;
  type: 'running-vm';
}

export interface TransparentProxyInfo {
  iface: string;
  httpPort: number;
  tlsPort: number;
  proxyPort: number;
}
