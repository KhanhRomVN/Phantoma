import type { NetworkInfo } from './network';
import type { PortService } from './port-service';
import type { OSDetection } from './os-detection';
import type { SecurityFinding } from './security-finding';
import type { InfrastructureExposure } from './infrastructure-exposure';

export type { NetworkInfo, PortService, OSDetection, SecurityFinding, InfrastructureExposure };

export interface IPServerData {
  target: string;
  scanTime: string;
  networkInfo: NetworkInfo;
  ports: PortService[];
  osDetection: OSDetection;
  securityFindings: SecurityFinding[];
  infrastructureExposure: InfrastructureExposure;
}