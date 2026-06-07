// IP Intel Aggregate Type — INTEL Only (Passive)
import type { NetworkInfo } from './network';
import type { ShodanIntel } from './shodan';
import type { ReverseIPEntry } from './reverse-ip';

export type { NetworkInfo, ShodanIntel, ReverseIPEntry };

export interface IPIntelData {
  target: string;
  scanTime: string;
  networkInfo: NetworkInfo;
  shodanIntel: ShodanIntel;
  reverseIP: ReverseIPEntry[];
}