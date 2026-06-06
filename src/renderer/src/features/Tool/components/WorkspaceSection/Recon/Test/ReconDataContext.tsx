import { createContext, useContext, useState, ReactNode } from 'react';
import {
  dnsRecords as defaultDnsRecords,
  ports as defaultPorts,
  vulns as defaultVulns,
  subdomains as defaultSubdomains,
  techStack as defaultTechStack,
  riskScore as defaultRiskScore,
  whoisData as defaultWhoisData,
  breaches as defaultBreaches,
  harvestedEmails as defaultHarvestedEmails,
  cloudAssets as defaultCloudAssets,
  codeRepos as defaultCodeRepos,
  darkWebLeaks as defaultDarkWebLeaks,
  googleDorks as defaultGoogleDorks,
  waybackSnapshots as defaultWaybackSnapshots,
  threatIntel as defaultThreatIntel,
  socialIntel as defaultSocialIntel,
  certTransparency as defaultCertTransparency,
  httpHeaders as defaultHttpHeaders,
  infrastructure as defaultInfrastructure,
} from './mockData';

export interface ReconData {
  target: string;
  targetIp: string;
  scanTime: string;
  dnsRecords: typeof defaultDnsRecords;
  ports: typeof defaultPorts;
  vulns: typeof defaultVulns;
  subdomains: typeof defaultSubdomains;
  techStack: typeof defaultTechStack;
  riskScore: typeof defaultRiskScore;
  whoisData: typeof defaultWhoisData;
  breaches: typeof defaultBreaches;
  harvestedEmails: typeof defaultHarvestedEmails;
  cloudAssets: typeof defaultCloudAssets;
  codeRepos: typeof defaultCodeRepos;
  darkWebLeaks: typeof defaultDarkWebLeaks;
  googleDorks: typeof defaultGoogleDorks;
  waybackSnapshots: typeof defaultWaybackSnapshots;
  threatIntel: typeof defaultThreatIntel;
  socialIntel: typeof defaultSocialIntel;
  certTransparency: typeof defaultCertTransparency;
  httpHeaders: typeof defaultHttpHeaders;
  infrastructure: typeof defaultInfrastructure;
}

function generateMockDataForDomain(domain: string): ReconData {
  return {
    target: domain,
    targetIp: '198.51.100.78',
    scanTime: new Date().toISOString(),
    dnsRecords: { ...defaultDnsRecords, A: defaultDnsRecords.A.map((ip) => ip) },
    ports: [...defaultPorts],
    vulns: [...defaultVulns],
    subdomains: [...defaultSubdomains],
    techStack: { ...defaultTechStack },
    riskScore: { ...defaultRiskScore },
    whoisData: { ...defaultWhoisData, domain },
    breaches: [...defaultBreaches],
    harvestedEmails: [...defaultHarvestedEmails],
    cloudAssets: [...defaultCloudAssets],
    codeRepos: [...defaultCodeRepos],
    darkWebLeaks: [...defaultDarkWebLeaks],
    googleDorks: [...defaultGoogleDorks],
    waybackSnapshots: [...defaultWaybackSnapshots],
    threatIntel: [...defaultThreatIntel],
    socialIntel: [...defaultSocialIntel],
    certTransparency: [...defaultCertTransparency],
    httpHeaders: { ...defaultHttpHeaders },
    infrastructure: { ...defaultInfrastructure },
  };
}

interface ReconDataContextType {
  data: ReconData | null;
  fetchData: (domain: string) => Promise<void>;
  isLoading: boolean;
}

const ReconDataContext = createContext<ReconDataContextType | undefined>(undefined);

export function ReconDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ReconData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async (domain: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const mockData = generateMockDataForDomain(domain);
    setData(mockData);
    setIsLoading(false);
  };

  return (
    <ReconDataContext.Provider value={{ data, fetchData, isLoading }}>
      {children}
    </ReconDataContext.Provider>
  );
}

export function useReconData() {
  const context = useContext(ReconDataContext);
  if (!context) throw new Error('useReconData must be used within ReconDataProvider');
  return context;
}
