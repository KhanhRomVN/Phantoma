export interface OSDetection {
  operatingSystem: string;
  kernelVersion?: string;
  architecture?: string;
  hostname?: string;
  uptime?: number;
}