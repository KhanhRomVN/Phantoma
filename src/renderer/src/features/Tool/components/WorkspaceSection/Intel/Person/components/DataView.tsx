import React from 'react';
import type { DataPoint } from '../types/data-point';
import type { SmartCategoryGroup } from '../types/smart-category';
import { DataPointRow } from './shared/DataPointRow';
import { SectionHeader } from './shared/SectionHeader';
import { StatBox } from './shared/StatBox';

interface DataViewProps {
  dataPoints: DataPoint[];
  activeGroup: SmartCategoryGroup;
  entityName?: string;
}

export function DataView({ dataPoints, activeGroup, entityName }: DataViewProps) {
  // Group data points by sub-category
  const grouped = dataPoints.reduce((acc, dp) => {
    const key = dp.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(dp);
    return acc;
  }, {} as Record<string, DataPoint[]>);

  const categoryEntries = Object.entries(grouped);

  // Count stats
  const verifiedCount = dataPoints.filter(dp => dp.verificationStatus === 'verified').length;
  const highConfCount = dataPoints.filter(dp => dp.confidence >= 0.7).length;
  const noiseCount = dataPoints.filter(dp => dp.isNoise).length;

  const categoryLabels: Record<string, string> = {
    email: 'Email',
    phone: 'Phone',
    full_name: 'Names',
    username: 'Usernames',
    alias: 'Aliases',
    nickname: 'Nicknames',
    avatar: 'Avatars',
    gender: 'Gender',
    age: 'Age',
    nationality: 'Nationality',
    language: 'Languages',
    bio: 'Bio',
    location: 'Location',
    address: 'Address',
    messenger: 'Messenger',
    social_profile: 'Social Profiles',
    social_post: 'Social Posts',
    social_mention: 'Social Mentions',
    job_title: 'Job Titles',
    company: 'Companies',
    education: 'Education',
    skill: 'Skills',
    certification: 'Certifications',
    domain: 'Domains',
    ip_address: 'IP Addresses',
    hosting: 'Hosting',
    technology: 'Technologies',
    repository: 'Repositories',
    public_key: 'Public Keys',
    ssh_key: 'SSH Keys',
    pgp_key: 'PGP Keys',
    api_key: 'API Keys',
    crypto_address: 'Crypto',
    password_leak: 'Password Leaks',
    credential_leak: 'Credential Leaks',
    breach_entry: 'Breach Entries',
    pastebin_entry: 'Pastebin',
    darkweb_mention: 'Dark Web',
    stealer_log: 'Stealer Logs',
    image: 'Images',
    video: 'Videos',
    document: 'Documents',
    audio: 'Audio',
    url: 'URLs',
    domain_registration: 'Domain Registrations',
    ssl_certificate: 'SSL Certificates',
    port: 'Ports',
    service: 'Services',
    credit_card: 'Credit Cards',
    bank_account: 'Bank Accounts',
    crypto_wallet: 'Crypto Wallets',
    court_record: 'Court Records',
    criminal_record: 'Criminal Records',
    sanction_list: 'Sanctions',
    other: 'Other',
    unclassified: 'Unclassified',
  };

  if (dataPoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-2 p-3">
        <span className="text-[24px] opacity-15">📭</span>
        <span className="text-[12px] font-mono text-[#6a7a9a]">No data in this category</span>
        <span className="text-[10px] font-mono text-[#3a4558]">{activeGroup.description}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* Mini stats */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatBox label="Total" value={dataPoints.length} sub="data points" accent="#0af" />
        <StatBox label="High Conf" value={highConfCount} sub="≥70%" accent="#30d158" />
        <StatBox label="Verified" value={verifiedCount} sub="confirmed" accent="#0a84ff" />
        <StatBox label="Noise" value={noiseCount} sub="flagged" accent="#f5a623" />
      </div>

      {/* Entity context */}
      {entityName && (
        <div className="text-[10px] font-mono text-[#6a7a9a] mb-2 bg-[#0d1017] border border-[#1c2333] rounded px-2 py-1">
          Showing data for: <span className="text-[#0af]">{entityName}</span>
        </div>
      )}

      {/* Grouped data points */}
      <div className="space-y-3">
        {categoryEntries.map(([category, dps]) => (
          <div key={category}>
            <SectionHeader accent="#0af">
              {categoryLabels[category] || category.replace(/_/g, ' ')}
              <span className="text-[10px] font-normal text-[#6a7a9a] ml-1">({dps.length})</span>
            </SectionHeader>
            <div className="space-y-1">
              {dps.slice(0, 50).map(dp => (
                <DataPointRow key={dp.id} dataPoint={dp} />
              ))}
              {dps.length > 50 && (
                <div className="text-[11px] font-mono text-[#6a7a9a] text-center py-2">
                  +{dps.length - 50} more items (use search to find specific data)
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}