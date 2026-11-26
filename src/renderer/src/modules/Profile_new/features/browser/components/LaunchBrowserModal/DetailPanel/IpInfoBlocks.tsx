import { useMemo } from 'react';
import { Network, MapPin, ShieldAlert, Clock, Coins } from 'lucide-react';
import ReconMap from '@renderer/modules/Recon/components/ui/Map/Map';
import type { MapLocation } from '@renderer/modules/Recon/components/ui/types';
import type { IpInfo } from '@renderer/services/ip-lookup.service';
import { DetailCard, KV } from './DetailBits';

const yn = (v: boolean | null): string => (v === null ? '' : v ? 'Yes' : 'No');
const withCode = (name: string, code: string): string => (name && code ? `${name} (${code})` : name || code);

export function IpInfoBlocks({ info }: { info: IpInfo }) {
  const locations = useMemo<MapLocation[]>(
    () => [{ name: [info.city, info.countryCode].filter(Boolean).join(', ') || info.ip, latitude: info.lat, longitude: info.lon }],
    [info],
  );
  const hasCurrency = Boolean(info.currencyName || info.currencyCode || info.currencySymbol);

  return (
    <>
      <div className='flex h-[240px] flex-col overflow-hidden rounded-xl bg-card-background'>
        <ReconMap key={`${info.lat},${info.lon}`} locations={locations} />
      </div>

      <DetailCard title='IP address' icon={Network} tone='info'>
        <KV label='IP' value={info.ip} mono copy />
        <KV label='Type' value={info.type} />
        <KV label='ISP' value={info.isp} />
        <KV label='Organization' value={info.org} />
        <KV label='Domain' value={info.domain} mono copy />
        <KV label='ASN' value={info.asn} mono copy />
        <KV label='AS name' value={info.asName} />
        <KV label='Route' value={info.route} mono copy />
        <KV label='Registry' value={withCode(info.registry, info.registryCountry)} />
      </DetailCard>

      <DetailCard title='Geolocation' icon={MapPin} tone='success'>
        <KV label='Continent' value={withCode(info.continent, info.continentCode)} />
        <KV label='Country' value={withCode(info.country, info.countryCode)} />
        <KV label='Region' value={info.region} />
        <KV label='City' value={info.city} />
        <KV label='ZIP' value={info.zip} mono />
        <KV label='Capital' value={info.capital} />
        <KV label='Borders' value={info.borders} mono />
        <KV label='Calling code' value={info.callingCode ? `+${info.callingCode}` : ''} mono />
        <KV label='EU member' value={yn(info.isEu)} />
        <KV label='Coordinates' value={`${info.lat}, ${info.lon}`} mono copy />
      </DetailCard>

      <DetailCard title='Time zone' icon={Clock} tone='primary'>
        <KV label='Timezone' value={info.timezone} />
        <KV label='Abbreviation' value={info.tzAbbr} mono />
        <KV label='UTC offset' value={info.tzUtc} mono />
        <KV label='DST' value={yn(info.isDst)} />
      </DetailCard>

      {hasCurrency && (
        <DetailCard title='Currency' icon={Coins} tone='warn'>
          <KV label='Name' value={info.currencyName} />
          <KV label='Code' value={info.currencyCode} mono />
          <KV label='Symbol' value={info.currencySymbol} />
        </DetailCard>
      )}

      <DetailCard title='Reputation' icon={ShieldAlert} tone='warn'>
        <KV label='Proxy' value={yn(info.proxy)} />
        <KV label='VPN' value={yn(info.vpn)} />
        <KV label='Tor' value={yn(info.tor)} />
        <KV label='Anonymous' value={yn(info.anonymous)} />
        <KV label='Hosting' value={yn(info.hosting)} />
        <KV label='Mobile' value={yn(info.mobile)} />
      </DetailCard>
    </>
  );
}

export default IpInfoBlocks;