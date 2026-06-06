import type { CompanyInfo } from './company-info';
import type { DigitalAsset } from './digital-assets';
import type { EmployeeIntel } from './employee-intel';
import type { ExternalExposure } from './external-exposure';

export type { CompanyInfo, DigitalAsset, EmployeeIntel, ExternalExposure };

export interface OrganizationData {
  target: string;
  scanTime: string;
  companyInfo: CompanyInfo;
  digitalAssets: DigitalAsset[];
  employeeIntel: EmployeeIntel[];
  externalExposure: ExternalExposure;
}