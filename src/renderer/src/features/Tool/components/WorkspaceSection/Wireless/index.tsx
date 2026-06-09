// src/renderer/src/features/Tool/components/WorkspaceSection/Wireless/index.tsx
// ============================================================================
// PHANTOMA WIRELESS — Signal Intelligence & Wi-Fi Exploitation Platform
// Aesthetic: Deep-space terminal / RF spectrum dashboard
// Full featured: Scan · WEP · WPA/WPA2 · WPS · PMKID · Evil Twin · MAC Spoof
//               WPA3 · WPA-Enterprise · KRACK · Live Log · Report Export
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

type Encryption = 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3' | 'enterprise';
type AttackType =
  | 'handshake_capture'
  | 'deauth'
  | 'wps_pixie'
  | 'wps_bruteforce'
  | 'dictionary_crack'
  | 'pmkid'
  | 'evil_twin'
  | 'wpa3_sae'
  | 'enterprise_rogue'
  | 'krack'
  | 'mac_spoof';
type AttackStatus = 'queued' | 'running' | 'completed' | 'failed' | 'stopped';
type TabType = 'scan' | 'attacks' | 'evil_twin' | 'crack' | 'wpa3_ent' | 'mac' | 'log' | 'report';

interface WiFiNetwork {
  id: string;
  ssid: string;
  bssid: string;
  channel: number;
  band: '2.4GHz' | '5GHz' | '6GHz';
  encryption: Encryption;
  signal: number;
  noise: number;
  quality: number;
  wps: boolean;
  wpsLocked: boolean;
  wpsVulnerable: boolean;
  wpsPin?: string;
  mfpEnabled: boolean;
  transitionMode: boolean;
  hidden: boolean;
  vendor: string;
  clients: WiFiClient[];
  handshakeCaptured: boolean;
  handshakeFile?: string;
  pmkidCaptured: boolean;
  pmkidFile?: string;
  crackedPassword?: string;
  crackAttempts?: number;
  crackTimeElapsed?: number;
  crackProbability: number;
  eapType?: string;
  krackVulnerable?: boolean;
  lastSeen: string;
  firstSeen: string;
  beaconCount: number;
}

interface WiFiClient {
  mac: string;
  vendor: string;
  signal: number;
  packets: number;
  probes: string[];
}

interface ActiveAttack {
  id: string;
  type: AttackType;
  targetSSID: string;
  targetBSSID: string;
  progress: number;
  status: AttackStatus;
  result?: string;
  startedAt: string;
  elapsedSeconds: number;
  logLines: string[];
  ivsCollected?: number;
  handshakeFile?: string;
  crackedPassword?: string;
  wpsPin?: string;
}

interface EvilTwinSession {
  id: string;
  ssid: string;
  fakeBSSID: string;
  channel: number;
  targetBSSID: string;
  clientsConnected: number;
  credentials: HarvestedCred[];
  uptimeSeconds: number;
  deauthSent: number;
  handshakesCollected: number;
  status: 'active' | 'stopped';
  portalType: 'generic' | 'isp' | 'router_admin' | 'corporate';
}

interface HarvestedCred {
  username: string;
  password: string;
  clientMac: string;
  clientVendor: string;
  timestamp: string;
  ipAddress: string;
}

interface CrackJob {
  id: string;
  targetSSID: string;
  targetBSSID: string;
  mode: 'dictionary' | 'bruteforce' | 'pmkid' | 'wep' | 'sae' | 'ntlm';
  status: AttackStatus;
  progress: number;
  wordlist?: string;
  attempts: number;
  speed: number;
  eta?: string;
  result?: string;
  hashFile?: string;
  startedAt: string;
  elapsedSeconds: number;
}

interface WPA3Result {
  ssid: string;
  bssid: string;
  wpa3Supported: boolean;
  transitionMode: boolean;
  mfpEnabled: boolean;
  vulnerableToDowngrade: boolean;
  saeHandshakeCaptured: boolean;
  notes: string[];
}

interface EnterpriseCapture {
  id: string;
  ssid: string;
  bssid: string;
  username: string;
  domain?: string;
  mschapv2Hash: string;
  crackedPassword?: string;
  clientMac: string;
  eapMethod: string;
  timestamp: string;
}

interface MacEntry {
  id: string;
  interface: string;
  originalMac: string;
  currentMac: string;
  spoofed: boolean;
  timestamp: string;
  reason: string;
}

interface KrackResult {
  id: string;
  targetSSID: string;
  targetBSSID: string;
  clientMac: string;
  vulnerable: boolean;
  cveList: string[];
  impact: string;
  testedAt: string;
}

interface ScanConfig {
  interface: string;
  channel: number | 'all';
  band: '2.4' | '5' | '6' | 'all';
  timeout: number;
  saveCapture: boolean;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockClients_1: WiFiClient[] = [
  {
    mac: 'F0:1F:AF:11:22:33',
    vendor: 'Apple',
    signal: -51,
    packets: 4218,
    probes: ['HomeNet', 'Airport_Free'],
  },
  {
    mac: '4C:32:75:AA:BB:CC',
    vendor: 'Samsung',
    signal: -64,
    packets: 1837,
    probes: ['CoffeeShop_WiFi'],
  },
  { mac: '00:1A:2B:3C:4D:5E', vendor: 'Intel', signal: -72, packets: 922, probes: [] },
];

const mockClients_2: WiFiClient[] = [
  {
    mac: 'DC:A6:32:FF:EE:DD',
    vendor: 'Raspberry Pi',
    signal: -48,
    packets: 12400,
    probes: ['Office_5G', 'TP-Link_5G'],
  },
  { mac: '58:FB:84:00:11:22', vendor: 'Cisco', signal: -55, packets: 8100, probes: [] },
];

const mockNetworks: WiFiNetwork[] = [
  {
    id: '1',
    ssid: 'CoffeeShop_WiFi',
    bssid: 'AA:BB:CC:DD:EE:01',
    channel: 6,
    band: '2.4GHz',
    encryption: 'wpa2',
    signal: -45,
    noise: -95,
    quality: 82,
    wps: false,
    wpsLocked: false,
    wpsVulnerable: false,
    mfpEnabled: false,
    transitionMode: false,
    hidden: false,
    vendor: 'Ubiquiti',
    clients: mockClients_1,
    handshakeCaptured: true,
    handshakeFile: 'coffee_hs.cap',
    pmkidCaptured: false,
    crackedPassword: undefined,
    crackProbability: 72,
    lastSeen: '09:54:11',
    firstSeen: '08:30:00',
    beaconCount: 14820,
  },
  {
    id: '2',
    ssid: 'Office_5G',
    bssid: 'AA:BB:CC:DD:EE:02',
    channel: 149,
    band: '5GHz',
    encryption: 'wpa2',
    signal: -58,
    noise: -92,
    quality: 60,
    wps: true,
    wpsLocked: false,
    wpsVulnerable: true,
    wpsPin: '12345670',
    mfpEnabled: false,
    transitionMode: false,
    hidden: false,
    vendor: 'Cisco',
    clients: mockClients_2,
    handshakeCaptured: true,
    handshakeFile: 'office_hs.cap',
    pmkidCaptured: true,
    pmkidFile: 'office.pmkid',
    crackedPassword: 'SecurePass2024!',
    crackAttempts: 4218934,
    crackTimeElapsed: 312,
    crackProbability: 100,
    krackVulnerable: false,
    lastSeen: '09:54:10',
    firstSeen: '07:00:00',
    beaconCount: 38210,
  },
  {
    id: '3',
    ssid: 'Guest_Network',
    bssid: 'AA:BB:CC:DD:EE:03',
    channel: 1,
    band: '2.4GHz',
    encryption: 'wep',
    signal: -72,
    noise: -95,
    quality: 40,
    wps: false,
    wpsLocked: false,
    wpsVulnerable: false,
    mfpEnabled: false,
    transitionMode: false,
    hidden: false,
    vendor: 'TP-Link',
    clients: [],
    handshakeCaptured: false,
    pmkidCaptured: false,
    crackProbability: 98,
    lastSeen: '09:53:44',
    firstSeen: '09:10:00',
    beaconCount: 2900,
  },
  {
    id: '4',
    ssid: 'Huawei-5G-1234',
    bssid: 'AA:BB:CC:DD:EE:04',
    channel: 11,
    band: '2.4GHz',
    encryption: 'wpa2',
    signal: -35,
    noise: -96,
    quality: 95,
    wps: true,
    wpsLocked: true,
    wpsVulnerable: false,
    mfpEnabled: true,
    transitionMode: false,
    hidden: false,
    vendor: 'Huawei',
    clients: [
      { mac: 'B8:27:EB:12:34:56', vendor: 'Generic', signal: -38, packets: 500, probes: [] },
    ],
    handshakeCaptured: false,
    pmkidCaptured: false,
    crackProbability: 30,
    lastSeen: '09:54:09',
    firstSeen: '09:00:00',
    beaconCount: 5500,
  },
  {
    id: '5',
    ssid: '',
    bssid: 'AA:BB:CC:DD:EE:05',
    channel: 4,
    band: '2.4GHz',
    encryption: 'wpa2',
    signal: -88,
    noise: -93,
    quality: 15,
    wps: false,
    wpsLocked: false,
    wpsVulnerable: false,
    mfpEnabled: false,
    transitionMode: false,
    hidden: true,
    vendor: 'Unknown',
    clients: [],
    handshakeCaptured: false,
    pmkidCaptured: false,
    crackProbability: 20,
    lastSeen: '09:52:00',
    firstSeen: '09:50:00',
    beaconCount: 240,
  },
  {
    id: '6',
    ssid: 'Public_Library',
    bssid: 'AA:BB:CC:DD:EE:06',
    channel: 11,
    band: '2.4GHz',
    encryption: 'open',
    signal: -62,
    noise: -95,
    quality: 55,
    wps: false,
    wpsLocked: false,
    wpsVulnerable: false,
    mfpEnabled: false,
    transitionMode: false,
    hidden: false,
    vendor: 'Netgear',
    clients: [
      { mac: '3C:22:FB:AA:BB:CC', vendor: 'Apple', signal: -63, packets: 3000, probes: [] },
      { mac: '00:50:56:FF:EE:DD', vendor: 'VMware', signal: -70, packets: 800, probes: [] },
    ],
    handshakeCaptured: false,
    pmkidCaptured: false,
    crackProbability: 0,
    lastSeen: '09:54:08',
    firstSeen: '08:00:00',
    beaconCount: 22000,
  },
  {
    id: '7',
    ssid: 'SmartHome_Hub',
    bssid: 'AA:BB:CC:DD:EE:07',
    channel: 6,
    band: '2.4GHz',
    encryption: 'wpa3',
    signal: -50,
    noise: -96,
    quality: 74,
    wps: false,
    wpsLocked: false,
    wpsVulnerable: false,
    mfpEnabled: true,
    transitionMode: false,
    hidden: false,
    vendor: 'Eero',
    clients: [
      { mac: 'AC:BC:32:11:22:33', vendor: 'Google', signal: -52, packets: 9800, probes: [] },
    ],
    handshakeCaptured: false,
    pmkidCaptured: false,
    crackProbability: 5,
    lastSeen: '09:54:06',
    firstSeen: '08:10:00',
    beaconCount: 19000,
  },
  {
    id: '8',
    ssid: 'IoT_Device_789',
    bssid: 'AA:BB:CC:DD:EE:08',
    channel: 10,
    band: '2.4GHz',
    encryption: 'wpa',
    signal: -67,
    noise: -94,
    quality: 48,
    wps: true,
    wpsLocked: false,
    wpsVulnerable: true,
    wpsPin: '98765430',
    mfpEnabled: false,
    transitionMode: false,
    hidden: false,
    vendor: 'Espressif',
    clients: [],
    handshakeCaptured: true,
    handshakeFile: 'iot_hs.cap',
    pmkidCaptured: false,
    crackedPassword: 'SmartHome2024',
    crackAttempts: 800112,
    crackTimeElapsed: 48,
    crackProbability: 100,
    lastSeen: '09:54:01',
    firstSeen: '09:30:00',
    beaconCount: 1400,
  },
  {
    id: '9',
    ssid: 'Corp_WPA_Enterprise',
    bssid: 'AA:BB:CC:DD:EE:09',
    channel: 36,
    band: '5GHz',
    encryption: 'enterprise',
    signal: -55,
    noise: -91,
    quality: 65,
    wps: false,
    wpsLocked: false,
    wpsVulnerable: false,
    mfpEnabled: true,
    transitionMode: false,
    hidden: false,
    vendor: 'Aruba',
    clients: [
      { mac: '90:B0:ED:CC:DD:EE', vendor: 'Dell', signal: -58, packets: 18200, probes: [] },
      { mac: 'A4:C3:F0:88:99:AA', vendor: 'Lenovo', signal: -60, packets: 9400, probes: [] },
    ],
    handshakeCaptured: false,
    pmkidCaptured: false,
    crackProbability: 55,
    eapType: 'PEAP/MSCHAPv2',
    krackVulnerable: true,
    lastSeen: '09:54:05',
    firstSeen: '07:30:00',
    beaconCount: 44000,
  },
  {
    id: '10',
    ssid: 'WPA3_Transition',
    bssid: 'AA:BB:CC:DD:EE:10',
    channel: 6,
    band: '2.4GHz',
    encryption: 'wpa3',
    signal: -60,
    noise: -95,
    quality: 58,
    wps: false,
    wpsLocked: false,
    wpsVulnerable: false,
    mfpEnabled: true,
    transitionMode: true,
    hidden: false,
    vendor: 'ASUS',
    clients: [],
    handshakeCaptured: false,
    pmkidCaptured: false,
    crackProbability: 35,
    lastSeen: '09:53:50',
    firstSeen: '08:45:00',
    beaconCount: 8200,
  },
];

const mockActiveAttacks: ActiveAttack[] = [
  {
    id: 'atk1',
    type: 'dictionary_crack',
    targetSSID: 'CoffeeShop_WiFi',
    targetBSSID: 'AA:BB:CC:DD:EE:01',
    progress: 64,
    status: 'running',
    startedAt: '09:42:10',
    elapsedSeconds: 724,
    logLines: [
      'Starting aircrack-ng with rockyou.txt...',
      'Wordlist: 14,344,391 entries',
      'Testing password 9,179,610 / 14,344,391...',
      'Speed: 12,700 keys/sec',
    ],
    handshakeFile: 'coffee_hs.cap',
  },
  {
    id: 'atk2',
    type: 'wps_pixie',
    targetSSID: 'IoT_Device_789',
    targetBSSID: 'AA:BB:CC:DD:EE:08',
    progress: 100,
    status: 'completed',
    result: 'PIN: 98765430 → SmartHome2024',
    startedAt: '09:30:05',
    elapsedSeconds: 48,
    logLines: [
      'Launching Pixie Dust (reaver -K 1)...',
      'Sending M1...',
      'WPS PIN found: 98765430',
      'PSK recovered: SmartHome2024',
    ],
    wpsPin: '98765430',
    crackedPassword: 'SmartHome2024',
  },
  {
    id: 'atk3',
    type: 'handshake_capture',
    targetSSID: 'Huawei-5G-1234',
    targetBSSID: 'AA:BB:CC:DD:EE:04',
    progress: 0,
    status: 'queued',
    startedAt: '09:54:10',
    elapsedSeconds: 0,
    logLines: ['Queued — waiting for active scan to complete...'],
  },
];

const mockEvilTwinSessions: EvilTwinSession[] = [
  {
    id: 'et1',
    ssid: 'CoffeeShop_WiFi',
    fakeBSSID: 'DE:AD:BE:EF:CA:FE',
    channel: 6,
    targetBSSID: 'AA:BB:CC:DD:EE:01',
    clientsConnected: 2,
    deauthSent: 14,
    handshakesCollected: 1,
    uptimeSeconds: 754,
    status: 'active',
    portalType: 'generic',
    credentials: [
      {
        username: 'john.doe',
        password: 'password123',
        clientMac: 'F0:1F:AF:11:22:33',
        clientVendor: 'Apple',
        timestamp: '09:45:23',
        ipAddress: '192.168.1.102',
      },
      {
        username: 'guest_user',
        password: 'welcome2024',
        clientMac: '4C:32:75:AA:BB:CC',
        clientVendor: 'Samsung',
        timestamp: '09:52:10',
        ipAddress: '192.168.1.103',
      },
    ],
  },
];

const mockCrackJobs: CrackJob[] = [
  {
    id: 'cj1',
    targetSSID: 'CoffeeShop_WiFi',
    targetBSSID: 'AA:BB:CC:DD:EE:01',
    mode: 'dictionary',
    status: 'running',
    progress: 64,
    wordlist: 'rockyou.txt',
    attempts: 9179610,
    speed: 12700,
    eta: '9m 18s',
    hashFile: 'coffee_hs.cap',
    startedAt: '09:42:10',
    elapsedSeconds: 724,
  },
  {
    id: 'cj2',
    targetSSID: 'Guest_Network',
    targetBSSID: 'AA:BB:CC:DD:EE:03',
    mode: 'wep',
    status: 'completed',
    progress: 100,
    attempts: 250000,
    speed: 0,
    result: 'WEP Key: 41:42:43:44:45',
    hashFile: 'guest_wep.cap',
    startedAt: '09:25:00',
    elapsedSeconds: 38,
  },
  {
    id: 'cj3',
    targetSSID: 'Office_5G',
    targetBSSID: 'AA:BB:CC:DD:EE:02',
    mode: 'pmkid',
    status: 'completed',
    progress: 100,
    wordlist: 'rockyou.txt',
    attempts: 4218934,
    speed: 0,
    result: 'SecurePass2024!',
    hashFile: 'office.pmkid',
    startedAt: '09:10:00',
    elapsedSeconds: 312,
  },
];

const mockWPA3Results: WPA3Result[] = [
  {
    ssid: 'WPA3_Transition',
    bssid: 'AA:BB:CC:DD:EE:10',
    wpa3Supported: true,
    transitionMode: true,
    mfpEnabled: true,
    vulnerableToDowngrade: true,
    saeHandshakeCaptured: false,
    notes: [
      'Transition mode detected → downgrade to WPA2 possible',
      'MFP enabled but not mandatory (MFPC=1, MFPR=0)',
      'SAE handshake not captured yet',
    ],
  },
];

const mockEntCaptures: EnterpriseCapture[] = [
  {
    id: 'ec1',
    ssid: 'Corp_WPA_Enterprise',
    bssid: 'AA:BB:CC:DD:EE:09',
    username: 'jsmith',
    domain: 'CORP',
    mschapv2Hash: '5B5D7C7D0D3A66B3C2C5C1F1E9B9A8A7:...',
    crackedPassword: undefined,
    clientMac: '90:B0:ED:CC:DD:EE',
    eapMethod: 'PEAP/MSCHAPv2',
    timestamp: '09:51:33',
  },
];

const mockKrackResults: KrackResult[] = [
  {
    id: 'kr1',
    targetSSID: 'Corp_WPA_Enterprise',
    targetBSSID: 'AA:BB:CC:DD:EE:09',
    clientMac: '90:B0:ED:CC:DD:EE',
    vulnerable: true,
    cveList: ['CVE-2017-13077', 'CVE-2017-13080'],
    impact: 'Key reinstallation in 4-way handshake — decrypt & replay possible',
    testedAt: '09:48:20',
  },
];

const mockMacEntries: MacEntry[] = [
  {
    id: 'mac1',
    interface: 'wlan0',
    originalMac: 'B4:2E:99:01:23:45',
    currentMac: 'DE:AD:BE:EF:00:01',
    spoofed: true,
    timestamp: '09:30:00',
    reason: 'Bypass MAC filter on Office_5G',
  },
];

// ============================================================================
// UTILITIES
// ============================================================================

const ENC_PALETTE: Record<Encryption, { color: string; bg: string; border: string }> = {
  open: { color: '#34d399', bg: '#052e16', border: '#065f4620' },
  wep: { color: '#f87171', bg: '#3b0000', border: '#ef444440' },
  wpa: { color: '#fb923c', bg: '#2c1400', border: '#f9731630' },
  wpa2: { color: '#38bdf8', bg: '#021e2e', border: '#0ea5e930' },
  wpa3: { color: '#c084fc', bg: '#1a0b2e', border: '#a855f730' },
  enterprise: { color: '#facc15', bg: '#1f1200', border: '#eab30830' },
};

function encBadge(enc: Encryption) {
  const p = ENC_PALETTE[enc];
  return (
    <span
      style={{
        color: p.color,
        background: p.bg,
        border: `1px solid ${p.border}`,
        fontSize: 8,
        fontWeight: 700,
        padding: '1px 5px',
        borderRadius: 3,
        letterSpacing: '0.1em',
        fontFamily: 'inherit',
      }}
    >
      {enc.toUpperCase()}
    </span>
  );
}

function signalBar(dbm: number) {
  const pct = Math.max(0, Math.min(100, ((dbm + 100) / 60) * 100));
  const color = dbm >= -55 ? '#34d399' : dbm >= -72 ? '#fb923c' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color, fontSize: 9, fontWeight: 700, width: 34, textAlign: 'right' }}>
        {dbm}dBm
      </span>
      <div
        style={{ width: 36, height: 3, background: '#0f1929', borderRadius: 2, overflow: 'hidden' }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: 2,
            transition: 'width 0.5s',
          }}
        />
      </div>
    </div>
  );
}

function progressBar(pct: number, color = '#38bdf8', h = 3) {
  return (
    <div style={{ height: h, background: '#0f1929', borderRadius: 2, overflow: 'hidden', flex: 1 }}>
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 2,
          transition: 'width 0.8s ease',
        }}
      />
    </div>
  );
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60),
    s = sec % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

function fmtNum(n: number) {
  return n.toLocaleString();
}

const STATUS_STYLE: Record<AttackStatus, { color: string; label: string; dot?: string }> = {
  queued: { color: '#6b7280', label: '◌ QUEUED', dot: '#6b7280' },
  running: { color: '#34d399', label: '● RUNNING', dot: '#34d399' },
  completed: { color: '#38bdf8', label: '✓ DONE', dot: '#38bdf8' },
  failed: { color: '#f87171', label: '✗ FAILED', dot: '#f87171' },
  stopped: { color: '#fb923c', label: '■ STOPPED', dot: '#fb923c' },
};

const ATK_LABEL: Record<AttackType, string> = {
  handshake_capture: '📡 Handshake Capture',
  deauth: '⚡ Deauth Flood',
  wps_pixie: '🔓 WPS Pixie Dust',
  wps_bruteforce: '🔑 WPS Bruteforce',
  dictionary_crack: '📖 Dictionary Crack',
  pmkid: '🧬 PMKID Attack',
  evil_twin: '🎭 Evil Twin AP',
  wpa3_sae: '🛡 WPA3-SAE Crack',
  enterprise_rogue: '🏢 Rogue RADIUS AP',
  krack: '💀 KRACK Attack',
  mac_spoof: '🎭 MAC Spoof',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Panel({
  title,
  accent = '#38bdf8',
  right,
  children,
  style,
}: {
  title: string;
  accent?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: '#050b14',
        border: '1px solid #0d1f35',
        borderRadius: 6,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 12px',
          borderBottom: '1px solid #0d1f35',
          background: '#030810',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            style={{
              width: 3,
              height: 12,
              borderRadius: 2,
              background: accent,
              boxShadow: `0 0 6px ${accent}80`,
            }}
          />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#3a5070',
              fontFamily: 'inherit',
            }}
          >
            {title}
          </span>
        </div>
        {right}
      </div>
      <div style={{ padding: 10 }}>{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = '#38bdf8',
  sub,
}: {
  label: string;
  value: string | number;
  accent?: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: '#030810',
        border: '1px solid #0d1f35',
        borderRadius: 5,
        padding: '9px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <div
        style={{
          fontSize: 8,
          color: '#253a55',
          fontWeight: 700,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 8, color: '#253a55' }}>{sub}</div>}
    </div>
  );
}

function Btn({
  label,
  color = '#38bdf8',
  onClick,
  disabled,
  size = 'sm',
}: {
  label: string;
  color?: string;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
}) {
  const fs = size === 'xs' ? 7 : size === 'sm' ? 8 : 9;
  const px = size === 'xs' ? 6 : size === 'sm' ? 8 : 12;
  const py = size === 'xs' ? 2 : size === 'sm' ? 3 : 5;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: fs,
        fontWeight: 700,
        padding: `${py}px ${px}px`,
        borderRadius: 3,
        border: `1px solid ${disabled ? '#1a2a3a' : `${color}40`}`,
        background: disabled ? 'transparent' : `${color}12`,
        color: disabled ? '#253a55' : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        letterSpacing: '0.08em',
        transition: 'opacity 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 7,
        fontWeight: 700,
        padding: '1px 5px',
        borderRadius: 3,
        border: `1px solid ${color}35`,
        background: `${color}15`,
        color,
        letterSpacing: '0.1em',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </span>
  );
}

function ClientBadge({ client }: { client: WiFiClient }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 6px',
        background: '#030810',
        border: '1px solid #0d1f35',
        borderRadius: 3,
        marginBottom: 2,
      }}
    >
      <span style={{ fontSize: 8, color: '#34d399', fontWeight: 700 }}>{client.mac}</span>
      <span style={{ fontSize: 8, color: '#3a5070' }}>{client.vendor}</span>
      <span style={{ fontSize: 7, color: '#fb923c', marginLeft: 'auto' }}>{client.signal}dBm</span>
      <span style={{ fontSize: 7, color: '#253a55' }}>{fmtNum(client.packets)} pkts</span>
    </div>
  );
}

// ============================================================================
// TAB: SCAN
// ============================================================================

function ScanTab({
  networks,
  onAction,
  isScanning,
  onScan,
  scanConfig,
  onScanConfig,
  expandedRow,
  setExpandedRow,
}: {
  networks: WiFiNetwork[];
  onAction: (action: string, net: WiFiNetwork) => void;
  isScanning: boolean;
  onScan: () => void;
  scanConfig: ScanConfig;
  onScanConfig: (c: ScanConfig) => void;
  expandedRow: string | null;
  setExpandedRow: (id: string | null) => void;
}) {
  const [sortKey, setSortKey] = useState<'signal' | 'ssid' | 'encryption' | 'crackProbability'>(
    'signal',
  );
  const [filterEnc, setFilterEnc] = useState<string>('all');
  const [filterVuln, setFilterVuln] = useState(false);

  const sorted = [...networks]
    .filter((n) => filterEnc === 'all' || n.encryption === filterEnc)
    .filter(
      (n) => !filterVuln || n.wpsVulnerable || n.crackProbability >= 70 || n.encryption === 'wep',
    )
    .sort((a, b) => {
      if (sortKey === 'signal') return b.signal - a.signal;
      if (sortKey === 'ssid') return a.ssid.localeCompare(b.ssid);
      if (sortKey === 'crackProbability') return b.crackProbability - a.crackProbability;
      return a.encryption.localeCompare(b.encryption);
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Scan Config Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 10px',
          background: '#030810',
          border: '1px solid #0d1f35',
          borderRadius: 5,
        }}
      >
        <span style={{ fontSize: 8, color: '#253a55', fontWeight: 700, letterSpacing: '0.12em' }}>
          INTERFACE
        </span>
        <select
          value={scanConfig.interface}
          onChange={(e) => onScanConfig({ ...scanConfig, interface: e.target.value })}
          style={{
            background: '#050b14',
            border: '1px solid #0d1f35',
            color: '#7dd3fc',
            fontSize: 8,
            padding: '2px 5px',
            borderRadius: 3,
            fontFamily: 'inherit',
          }}
        >
          {['wlan0mon', 'wlan1mon', 'wlan2mon'].map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
        <span style={{ fontSize: 8, color: '#253a55', fontWeight: 700 }}>BAND</span>
        <select
          value={scanConfig.band}
          onChange={(e) =>
            onScanConfig({ ...scanConfig, band: e.target.value as ScanConfig['band'] })
          }
          style={{
            background: '#050b14',
            border: '1px solid #0d1f35',
            color: '#7dd3fc',
            fontSize: 8,
            padding: '2px 5px',
            borderRadius: 3,
            fontFamily: 'inherit',
          }}
        >
          {['all', '2.4', '5', '6'].map((b) => (
            <option key={b} value={b}>
              {b === 'all' ? 'All Bands' : `${b} GHz`}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 8, color: '#253a55', fontWeight: 700 }}>CHANNEL</span>
        <select
          value={scanConfig.channel}
          onChange={(e) =>
            onScanConfig({
              ...scanConfig,
              channel: e.target.value === 'all' ? 'all' : parseInt(e.target.value),
            })
          }
          style={{
            background: '#050b14',
            border: '1px solid #0d1f35',
            color: '#7dd3fc',
            fontSize: 8,
            padding: '2px 5px',
            borderRadius: 3,
            fontFamily: 'inherit',
          }}
        >
          <option value="all">Hop All</option>
          {Array.from({ length: 14 }, (_, i) => i + 1).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          {[
            36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140,
            149, 153, 157, 161, 165,
          ].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={scanConfig.saveCapture}
            onChange={(e) => onScanConfig({ ...scanConfig, saveCapture: e.target.checked })}
            style={{ accentColor: '#38bdf8', width: 10, height: 10 }}
          />
          <span style={{ fontSize: 8, color: '#3a5070' }}>Save .cap</span>
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Btn
            label={isScanning ? '⟳ SCANNING...' : '⟳ START SCAN'}
            color="#38bdf8"
            onClick={onScan}
            disabled={isScanning}
            size="sm"
          />
          <Btn label="⊞ ENABLE MONITOR" color="#34d399" onClick={() => {}} size="sm" />
        </div>
      </div>

      {/* Filter Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 8, color: '#253a55', fontWeight: 700 }}>FILTER:</span>
        {['all', 'open', 'wep', 'wpa', 'wpa2', 'wpa3', 'enterprise'].map((e) => (
          <button
            key={e}
            onClick={() => setFilterEnc(e)}
            style={{
              fontSize: 7,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.1em',
              border:
                filterEnc === e
                  ? `1px solid ${e === 'all' ? '#38bdf8' : (ENC_PALETTE[e as Encryption]?.color ?? '#38bdf8')}50`
                  : '1px solid #0d1f35',
              background:
                filterEnc === e
                  ? `${e === 'all' ? '#38bdf8' : (ENC_PALETTE[e as Encryption]?.color ?? '#38bdf8')}18`
                  : 'transparent',
              color:
                filterEnc === e
                  ? e === 'all'
                    ? '#38bdf8'
                    : (ENC_PALETTE[e as Encryption]?.color ?? '#38bdf8')
                  : '#253a55',
            }}
          >
            {e.toUpperCase()}
          </button>
        ))}
        <label
          style={{
            marginLeft: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={filterVuln}
            onChange={(e) => setFilterVuln(e.target.checked)}
            style={{ accentColor: '#f87171', width: 10, height: 10 }}
          />
          <span style={{ fontSize: 8, color: '#3a5070' }}>Vulnerable only</span>
        </label>
        <span style={{ marginLeft: 'auto', fontSize: 8, color: '#253a55' }}>
          {sorted.length}/{networks.length} networks
        </span>
        <span style={{ fontSize: 8, color: '#253a55' }}>SORT:</span>
        {(['signal', 'ssid', 'encryption', 'crackProbability'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setSortKey(k)}
            style={{
              fontSize: 7,
              padding: '2px 6px',
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: 'inherit',
              border: `1px solid ${sortKey === k ? '#38bdf840' : '#0d1f35'}`,
              background: sortKey === k ? '#38bdf818' : 'transparent',
              color: sortKey === k ? '#38bdf8' : '#253a55',
            }}
          >
            {k === 'crackProbability' ? 'CRACK%' : k.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr 60px 80px 70px 70px 80px 100px 140px',
          gap: 6,
          padding: '4px 8px',
          borderBottom: '1px solid #0d1f35',
        }}
      >
        {[
          'SIGNAL',
          'SSID / BSSID',
          'CH',
          'BAND',
          'ENC',
          'WPS',
          'CLIENTS',
          'CRACK %',
          'ACTIONS',
        ].map((h) => (
          <span
            key={h}
            style={{ fontSize: 7, color: '#1e3050', fontWeight: 700, letterSpacing: '0.12em' }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Network Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {sorted.map((net) => {
          const exp = expandedRow === net.id;
          return (
            <div
              key={net.id}
              style={{
                background: exp ? '#03090f' : 'transparent',
                border: exp ? '1px solid #0d1f35' : '1px solid transparent',
                borderRadius: 4,
                transition: 'all 0.15s',
              }}
            >
              <div
                onClick={() => setExpandedRow(exp ? null : net.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 60px 80px 70px 70px 80px 100px 140px',
                  gap: 6,
                  padding: '6px 8px',
                  cursor: 'pointer',
                  alignItems: 'center',
                }}
              >
                {/* Signal */}
                <div>{signalBar(net.signal)}</div>

                {/* SSID/BSSID */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {net.hidden && <Tag label="HIDDEN" color="#6b7280" />}
                    {net.crackedPassword && <Tag label="CRACKED" color="#34d399" />}
                    {net.handshakeCaptured && <Tag label="HS" color="#38bdf8" />}
                    {net.pmkidCaptured && <Tag label="PMKID" color="#a78bfa" />}
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#c8dff5' }}>
                      {net.hidden ? '‹hidden›' : net.ssid}
                    </span>
                  </div>
                  <div style={{ fontSize: 7.5, color: '#253a55', marginTop: 1 }}>
                    {net.bssid} · {net.vendor}
                  </div>
                  {net.crackedPassword && (
                    <div style={{ fontSize: 7.5, color: '#34d399', marginTop: 1 }}>
                      → {net.crackedPassword}
                    </div>
                  )}
                </div>

                {/* Channel */}
                <div style={{ fontSize: 9, color: '#4a6a9a' }}>CH {net.channel}</div>

                {/* Band */}
                <div style={{ fontSize: 9, color: '#3a5070' }}>{net.band}</div>

                {/* Encryption */}
                <div>{encBadge(net.encryption)}</div>

                {/* WPS */}
                <div>
                  {net.wps ? (
                    <span
                      style={{
                        fontSize: 7.5,
                        fontWeight: 700,
                        padding: '2px 5px',
                        borderRadius: 3,
                        color: net.wpsVulnerable
                          ? '#f87171'
                          : net.wpsLocked
                            ? '#6b7280'
                            : '#fb923c',
                        background: net.wpsVulnerable ? '#3b000018' : '#0f1929',
                        border: `1px solid ${net.wpsVulnerable ? '#f8717130' : '#1a2a3a'}`,
                      }}
                    >
                      {net.wpsVulnerable ? '⚡ VULN' : net.wpsLocked ? '🔒 LOCK' : '✓ OK'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 8, color: '#1e3050' }}>—</span>
                  )}
                </div>

                {/* Clients */}
                <div style={{ fontSize: 9, color: '#4a6a9a' }}>{net.clients.length} clients</div>

                {/* Crack % */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      fontSize: 8,
                      color:
                        net.crackProbability >= 80
                          ? '#34d399'
                          : net.crackProbability >= 50
                            ? '#fb923c'
                            : '#3a5070',
                      fontWeight: 700,
                      width: 24,
                    }}
                  >
                    {net.crackProbability}%
                  </span>
                  {progressBar(
                    net.crackProbability,
                    net.crackProbability >= 80
                      ? '#34d399'
                      : net.crackProbability >= 50
                        ? '#fb923c'
                        : '#3a5070',
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {net.encryption !== 'open' && net.encryption !== 'wpa3' && (
                    <Btn
                      label={net.handshakeCaptured ? '✓ HS' : 'CAPTURE'}
                      color="#38bdf8"
                      onClick={(e) => {
                        (e as any).stopPropagation();
                        onAction('capture', net);
                      }}
                      disabled={net.handshakeCaptured}
                      size="xs"
                    />
                  )}
                  {!net.pmkidCaptured && net.encryption === 'wpa2' && (
                    <Btn
                      label="PMKID"
                      color="#a78bfa"
                      onClick={(e) => {
                        (e as any).stopPropagation();
                        onAction('pmkid', net);
                      }}
                      size="xs"
                    />
                  )}
                  {net.wps && net.wpsVulnerable && (
                    <Btn
                      label="PIXIE"
                      color="#f87171"
                      onClick={(e) => {
                        (e as any).stopPropagation();
                        onAction('wps', net);
                      }}
                      size="xs"
                    />
                  )}
                  {(net.handshakeCaptured || net.pmkidCaptured) && !net.crackedPassword && (
                    <Btn
                      label="CRACK"
                      color="#fb923c"
                      onClick={(e) => {
                        (e as any).stopPropagation();
                        onAction('crack', net);
                      }}
                      size="xs"
                    />
                  )}
                  {net.encryption === 'wep' && (
                    <Btn
                      label="WEP"
                      color="#f87171"
                      onClick={(e) => {
                        (e as any).stopPropagation();
                        onAction('wep', net);
                      }}
                      size="xs"
                    />
                  )}
                  <Btn
                    label="EVIL"
                    color="#c084fc"
                    onClick={(e) => {
                      (e as any).stopPropagation();
                      onAction('evil', net);
                    }}
                    size="xs"
                  />
                </div>
              </div>

              {/* Expanded Row Details */}
              {exp && (
                <div
                  style={{
                    padding: '0 8px 10px 8px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 7,
                        color: '#1e3050',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        marginBottom: 5,
                      }}
                    >
                      NETWORK INFO
                    </div>
                    {[
                      ['BSSID', net.bssid],
                      ['Vendor', net.vendor],
                      ['Channel', `${net.channel} (${net.band})`],
                      ['Signal / Noise', `${net.signal} / ${net.noise} dBm`],
                      ['Quality', `${net.quality}%`],
                      ['MFP', net.mfpEnabled ? '✓ Enabled' : '✗ Disabled'],
                      ['Transition Mode', net.transitionMode ? '⚠ Yes' : 'No'],
                      ['First Seen', net.firstSeen],
                      ['Last Seen', net.lastSeen],
                      ['Beacons', fmtNum(net.beaconCount)],
                    ].map(([k, v]) => (
                      <div
                        key={k as string}
                        style={{ display: 'flex', gap: 6, fontSize: 8, marginBottom: 2 }}
                      >
                        <span style={{ color: '#253a55', width: 90, flexShrink: 0 }}>{k}</span>
                        <span style={{ color: '#7dd3fc' }}>{v}</span>
                      </div>
                    ))}
                    {net.wpsPin && (
                      <div style={{ display: 'flex', gap: 6, fontSize: 8, marginBottom: 2 }}>
                        <span style={{ color: '#253a55', width: 90 }}>WPS PIN</span>
                        <span style={{ color: '#f87171', fontWeight: 700 }}>{net.wpsPin}</span>
                      </div>
                    )}
                    {net.eapType && (
                      <div style={{ display: 'flex', gap: 6, fontSize: 8 }}>
                        <span style={{ color: '#253a55', width: 90 }}>EAP Type</span>
                        <span style={{ color: '#facc15' }}>{net.eapType}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 7,
                        color: '#1e3050',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        marginBottom: 5,
                      }}
                    >
                      CLIENTS ({net.clients.length})
                    </div>
                    {net.clients.length === 0 ? (
                      <div style={{ fontSize: 8, color: '#1e3050' }}>No clients detected</div>
                    ) : (
                      net.clients.map((c) => <ClientBadge key={c.mac} client={c} />)
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 7,
                        color: '#1e3050',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        marginBottom: 5,
                      }}
                    >
                      CAPTURE STATUS
                    </div>
                    {[
                      [
                        'Handshake',
                        net.handshakeCaptured ? `✓ ${net.handshakeFile}` : '✗ Not captured',
                        net.handshakeCaptured ? '#34d399' : '#3a5070',
                      ],
                      [
                        'PMKID',
                        net.pmkidCaptured ? `✓ ${net.pmkidFile}` : '✗ Not captured',
                        net.pmkidCaptured ? '#a78bfa' : '#3a5070',
                      ],
                      [
                        'Password',
                        net.crackedPassword ?? '—',
                        net.crackedPassword ? '#34d399' : '#3a5070',
                      ],
                    ].map(([k, v, c]) => (
                      <div
                        key={k as string}
                        style={{ display: 'flex', gap: 6, fontSize: 8, marginBottom: 3 }}
                      >
                        <span style={{ color: '#253a55', width: 70, flexShrink: 0 }}>{k}</span>
                        <span style={{ color: c as string, fontWeight: 700 }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Btn
                        label="🎯 Deauth Clients"
                        color="#f87171"
                        onClick={() => onAction('deauth', net)}
                        size="xs"
                      />
                      {net.encryption === 'enterprise' && (
                        <Btn
                          label="🏢 Rogue RADIUS"
                          color="#facc15"
                          onClick={() => onAction('enterprise', net)}
                          size="xs"
                        />
                      )}
                      {net.krackVulnerable && (
                        <Btn
                          label="💀 KRACK Test"
                          color="#f87171"
                          onClick={() => onAction('krack', net)}
                          size="xs"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: ATTACKS
// ============================================================================

function AttacksTab({
  attacks,
  onStop,
}: {
  attacks: ActiveAttack[];
  onStop: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {attacks.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, fontSize: 9, color: '#1e3050' }}>
          No active attacks. Select a network from the Scan tab.
        </div>
      )}
      {attacks.map((atk) => {
        const ss = STATUS_STYLE[atk.status];
        return (
          <div
            key={atk.id}
            style={{
              background: '#03090f',
              border: '1px solid #0d1f35',
              borderRadius: 5,
              padding: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: ss.dot,
                  boxShadow: atk.status === 'running' ? `0 0 6px ${ss.dot}` : 'none',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#c8dff5' }}>
                {ATK_LABEL[atk.type]}
              </span>
              <span style={{ fontSize: 8, color: '#3a5070' }}>→ {atk.targetSSID}</span>
              <span style={{ fontSize: 7.5, color: '#1e3050' }}>{atk.targetBSSID}</span>
              <span style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 700, color: ss.color }}>
                {ss.label}
              </span>
              <span style={{ fontSize: 8, color: '#253a55' }}>{fmtTime(atk.elapsedSeconds)}</span>
              {atk.status === 'running' && (
                <Btn label="■ STOP" color="#f87171" onClick={() => onStop(atk.id)} size="xs" />
              )}
            </div>
            {atk.status === 'running' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                {progressBar(atk.progress, '#38bdf8', 4)}
                <span
                  style={{
                    fontSize: 8,
                    color: '#38bdf8',
                    fontWeight: 700,
                    width: 28,
                    textAlign: 'right',
                  }}
                >
                  {atk.progress}%
                </span>
              </div>
            )}
            {atk.ivsCollected !== undefined && (
              <div style={{ fontSize: 8, color: '#fb923c', marginBottom: 4 }}>
                IVs collected: {fmtNum(atk.ivsCollected)}
              </div>
            )}
            {atk.result && (
              <div
                style={{
                  fontSize: 9,
                  color: '#34d399',
                  fontWeight: 700,
                  padding: '5px 8px',
                  background: '#05150a',
                  borderRadius: 3,
                  border: '1px solid #34d39930',
                  marginBottom: 6,
                }}
              >
                ✓ {atk.result}
              </div>
            )}
            <div
              style={{
                background: '#020609',
                borderRadius: 3,
                padding: '5px 8px',
                fontFamily: 'inherit',
                fontSize: 8,
              }}
            >
              {atk.logLines.map((l, i) => (
                <div
                  key={i}
                  style={{
                    color: l.includes('✅') || l.includes('found') ? '#34d399' : '#3a5070',
                    marginBottom: 1,
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// TAB: EVIL TWIN
// ============================================================================

function EvilTwinTab({
  sessions,
  onStop,
}: {
  sessions: EvilTwinSession[];
  onStop: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          padding: '7px 10px',
          background: '#1f0000',
          border: '1px solid #5c0b0b',
          borderRadius: 4,
          fontSize: 8,
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 10 }}>⚠</span>
        Evil Twin AP requires authorization. Unauthorized use is illegal. All sessions are logged.
      </div>
      {sessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, fontSize: 9, color: '#1e3050' }}>
          No Evil Twin sessions. Click "EVIL" on a network in the Scan tab.
        </div>
      )}
      {sessions.map((session) => (
        <div
          key={session.id}
          style={{
            background: '#03090f',
            border: `1px solid ${session.status === 'active' ? '#5c0b0b' : '#0d1f35'}`,
            borderRadius: 5,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: '#050b14',
              borderBottom: '1px solid #0d1f35',
            }}
          >
            {session.status === 'active' && (
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#f87171',
                  boxShadow: '0 0 8px #f87171',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            )}
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: session.status === 'active' ? '#f87171' : '#3a5070',
              }}
            >
              {session.status === 'active' ? '● EVIL TWIN LIVE' : '■ STOPPED'}
            </span>
            <span style={{ fontSize: 9, color: '#c8dff5', fontWeight: 700 }}>"{session.ssid}"</span>
            <span style={{ fontSize: 8, color: '#3a5070' }}>BSSID {session.fakeBSSID}</span>
            <span style={{ fontSize: 8, color: '#253a55' }}>→ CH {session.channel}</span>
            <span style={{ marginLeft: 'auto', fontSize: 8, color: '#253a55' }}>
              Uptime: {fmtTime(session.uptimeSeconds)}
            </span>
            {session.status === 'active' && (
              <Btn label="■ STOP AP" color="#f87171" onClick={() => onStop(session.id)} size="xs" />
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              padding: 10,
              marginBottom: 4,
            }}
          >
            <Stat label="Clients" value={session.clientsConnected} accent="#38bdf8" />
            <Stat label="Deauths Sent" value={session.deauthSent} accent="#f87171" />
            <Stat label="Handshakes" value={session.handshakesCollected} accent="#34d399" />
            <Stat label="Credentials" value={session.credentials.length} accent="#c084fc" />
          </div>

          {session.credentials.length > 0 && (
            <div style={{ padding: '0 10px 10px' }}>
              <div
                style={{
                  fontSize: 7,
                  color: '#1e3050',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  marginBottom: 5,
                }}
              >
                HARVESTED CREDENTIALS
              </div>
              <div style={{ background: '#020609', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 160px 120px 120px 80px',
                    gap: 6,
                    padding: '4px 8px',
                    borderBottom: '1px solid #0d1f35',
                  }}
                >
                  {['USERNAME', 'PASSWORD', 'CLIENT MAC', 'IP ADDRESS', 'TIME'].map((h) => (
                    <span
                      key={h}
                      style={{
                        fontSize: 7,
                        color: '#1e3050',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
                {session.credentials.map((cred, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '160px 160px 120px 120px 80px',
                      gap: 6,
                      padding: '5px 8px',
                      borderBottom: '1px solid #0a1525',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 9, color: '#38bdf8', fontWeight: 700 }}>
                      {cred.username}
                    </span>
                    <span style={{ fontSize: 9, color: '#fb923c', fontWeight: 700 }}>
                      {cred.password}
                    </span>
                    <span style={{ fontSize: 8, color: '#253a55' }}>
                      {cred.clientMac}{' '}
                      <span style={{ color: '#1e3050' }}>({cred.clientVendor})</span>
                    </span>
                    <span style={{ fontSize: 8, color: '#3a5070' }}>{cred.ipAddress}</span>
                    <span style={{ fontSize: 8, color: '#1e3050' }}>{cred.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// TAB: CRACK JOBS
// ============================================================================

function CrackTab({ jobs, onNewJob }: { jobs: CrackJob[]; onNewJob: () => void }) {
  const CRACK_MODE_COLORS: Record<CrackJob['mode'], string> = {
    dictionary: '#38bdf8',
    bruteforce: '#f87171',
    pmkid: '#a78bfa',
    wep: '#fb923c',
    sae: '#c084fc',
    ntlm: '#facc15',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <Btn label="+ NEW JOB" color="#38bdf8" onClick={onNewJob} size="sm" />
        <Btn label="📂 SELECT WORDLIST" color="#3a5070" size="sm" />
        <Btn label="⚙ HASHCAT GPU CONFIG" color="#3a5070" size="sm" />
      </div>
      {jobs.map((job) => {
        const accentColor = CRACK_MODE_COLORS[job.mode];
        const ss = STATUS_STYLE[job.status];
        return (
          <div
            key={job.id}
            style={{
              background: '#03090f',
              border: '1px solid #0d1f35',
              borderRadius: 5,
              padding: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <Tag label={job.mode.toUpperCase()} color={accentColor} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#c8dff5' }}>
                {job.targetSSID}
              </span>
              <span style={{ fontSize: 8, color: '#253a55' }}>{job.targetBSSID}</span>
              <span style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 700, color: ss.color }}>
                {ss.label}
              </span>
              <span style={{ fontSize: 8, color: '#253a55' }}>{fmtTime(job.elapsedSeconds)}</span>
            </div>
            {job.status === 'running' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                {progressBar(job.progress, accentColor, 4)}
                <span
                  style={{
                    fontSize: 8,
                    color: accentColor,
                    fontWeight: 700,
                    width: 28,
                    textAlign: 'right',
                  }}
                >
                  {job.progress}%
                </span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {job.wordlist && (
                <div style={{ fontSize: 8 }}>
                  <span style={{ color: '#253a55' }}>Wordlist: </span>
                  <span style={{ color: '#7dd3fc' }}>{job.wordlist}</span>
                </div>
              )}
              <div style={{ fontSize: 8 }}>
                <span style={{ color: '#253a55' }}>Attempts: </span>
                <span style={{ color: '#c8dff5' }}>{fmtNum(job.attempts)}</span>
              </div>
              {job.speed > 0 && (
                <div style={{ fontSize: 8 }}>
                  <span style={{ color: '#253a55' }}>Speed: </span>
                  <span style={{ color: '#34d399' }}>{fmtNum(job.speed)} keys/s</span>
                </div>
              )}
              {job.eta && (
                <div style={{ fontSize: 8 }}>
                  <span style={{ color: '#253a55' }}>ETA: </span>
                  <span style={{ color: '#fb923c' }}>{job.eta}</span>
                </div>
              )}
              {job.hashFile && (
                <div style={{ fontSize: 8 }}>
                  <span style={{ color: '#253a55' }}>File: </span>
                  <span style={{ color: '#7dd3fc' }}>{job.hashFile}</span>
                </div>
              )}
            </div>
            {job.result && (
              <div
                style={{
                  marginTop: 7,
                  fontSize: 10,
                  color: '#34d399',
                  fontWeight: 700,
                  padding: '6px 10px',
                  background: '#05150a',
                  border: '1px solid #34d39930',
                  borderRadius: 3,
                }}
              >
                ✓ PASSWORD FOUND: {job.result}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// TAB: WPS ATTACK PANEL (embedded in Attacks tab bottom section)
// ============================================================================

function WPSAttackPanel({
  networks,
  onAction,
}: {
  networks: WiFiNetwork[];
  onAction: (action: string, net: WiFiNetwork) => void;
}) {
  const wpsTargets = networks.filter((n) => n.wps);

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          fontSize: 7,
          color: '#1e3050',
          fontWeight: 700,
          letterSpacing: '0.14em',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        WPS TARGETS ({wpsTargets.length})
        <Btn
          label="🔓 PIXIE DUST ALL VULNERABLE"
          color="#f87171"
          size="xs"
          onClick={() =>
            wpsTargets.filter((n) => n.wpsVulnerable).forEach((n) => onAction('wps', n))
          }
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
        {wpsTargets.map((net) => (
          <div
            key={net.id}
            style={{
              background: '#03090f',
              border: `1px solid ${net.wpsVulnerable ? '#5c0b0b' : '#0d1f35'}`,
              borderRadius: 4,
              padding: '8px 10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              {net.wpsVulnerable && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#f87171',
                    boxShadow: '0 0 5px #f87171',
                  }}
                />
              )}
              <span style={{ fontSize: 9, fontWeight: 700, color: '#c8dff5' }}>{net.ssid}</span>
              <span style={{ fontSize: 7.5, color: '#253a55' }}>{net.bssid}</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 8,
                  fontWeight: 700,
                  color: net.wpsVulnerable ? '#f87171' : net.wpsLocked ? '#6b7280' : '#fb923c',
                }}
              >
                {net.wpsVulnerable ? '⚡ VULNERABLE' : net.wpsLocked ? '🔒 LOCKED' : '● ACTIVE'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 8 }}>
              <span style={{ color: '#253a55' }}>
                CH <span style={{ color: '#4a6a9a' }}>{net.channel}</span>
              </span>
              <span style={{ color: '#253a55' }}>
                Signal <span style={{ color: '#fb923c' }}>{net.signal}dBm</span>
              </span>
              {net.wpsPin && (
                <span style={{ color: '#253a55' }}>
                  PIN <span style={{ color: '#34d399', fontWeight: 700 }}>{net.wpsPin}</span>
                </span>
              )}
              {net.crackedPassword && (
                <span style={{ color: '#253a55' }}>
                  PSK{' '}
                  <span style={{ color: '#34d399', fontWeight: 700 }}>{net.crackedPassword}</span>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {net.wpsVulnerable && !net.wpsPin && (
                <Btn
                  label="⚡ PIXIE DUST"
                  color="#f87171"
                  onClick={() => onAction('wps', net)}
                  size="xs"
                />
              )}
              {!net.wpsLocked && (
                <Btn label="🔑 PIN BRUTEFORCE" color="#fb923c" size="xs" onClick={() => {}} />
              )}
              {net.wpsPin && <Tag label={`✓ PIN: ${net.wpsPin}`} color="#34d399" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CHANNEL UTILIZATION VISUALIZER
// ============================================================================

function ChannelChart({ networks }: { networks: WiFiNetwork[] }) {
  const channels = Array.from({ length: 13 }, (_, i) => i + 1);
  const byChan = (ch: number) =>
    networks.filter((n) => n.channel === ch || n.channel === ch - 1 || n.channel === ch + 1);
  const maxCount = Math.max(
    1,
    ...channels.map((ch) => networks.filter((n) => n.channel === ch).length),
  );

  return (
    <Panel title="Channel Utilization · 2.4 GHz" accent="#a78bfa">
      <div
        style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, padding: '0 4px' }}
      >
        {channels.map((ch) => {
          const direct = networks.filter((n) => n.channel === ch);
          const overlap = byChan(ch).filter((n) => n.channel !== ch);
          const directH = (direct.length / maxCount) * 60;
          const overlapH = (overlap.length / maxCount) * 50;
          const isRecommended = direct.length === 0 && (ch === 1 || ch === 6 || ch === 11);
          return (
            <div
              key={ch}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                flex: 1,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: 64,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                {overlapH > 0 && (
                  <div
                    style={{
                      height: overlapH,
                      background: '#a78bfa18',
                      borderTop: '1px solid #a78bfa30',
                      borderRadius: '2px 2px 0 0',
                      width: '100%',
                      position: 'absolute',
                      bottom: 0,
                    }}
                  />
                )}
                <div
                  style={{
                    height: Math.max(directH, direct.length > 0 ? 4 : 0),
                    background:
                      direct.length > 0
                        ? direct.length >= 2
                          ? '#f87171'
                          : '#38bdf8'
                        : isRecommended
                          ? '#34d39920'
                          : 'transparent',
                    borderRadius: '2px 2px 0 0',
                    border: isRecommended ? '1px dashed #34d39940' : 'none',
                    width: '100%',
                    transition: 'height 0.4s',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 7,
                  color: isRecommended ? '#34d399' : direct.length > 0 ? '#c8dff5' : '#1e3050',
                  fontWeight: direct.length > 0 ? 700 : 400,
                }}
              >
                {ch}
              </span>
              {direct.length > 0 && (
                <span style={{ fontSize: 6, color: '#3a5070' }}>{direct.length}</span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 3, background: '#38bdf8', borderRadius: 1 }} />
          <span style={{ fontSize: 7, color: '#253a55' }}>Direct</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 3, background: '#f87171', borderRadius: 1 }} />
          <span style={{ fontSize: 7, color: '#253a55' }}>Congested</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 8,
              height: 3,
              background: '#34d39920',
              borderRadius: 1,
              border: '1px dashed #34d39940',
            }}
          />
          <span style={{ fontSize: 7, color: '#34d399' }}>Recommended free</span>
        </div>
      </div>
    </Panel>
  );
}

// ============================================================================
// DEAUTH MANAGER
// ============================================================================

interface DeauthSession {
  id: string;
  targetBSSID: string;
  targetSSID: string;
  clientMAC: string;
  packetsPerSec: number;
  totalSent: number;
  status: 'running' | 'stopped';
  startedAt: string;
  reason: 'handshake' | 'evil_twin' | 'test';
}

const mockDeauthSessions: DeauthSession[] = [
  {
    id: 'da1',
    targetBSSID: 'AA:BB:CC:DD:EE:01',
    targetSSID: 'CoffeeShop_WiFi',
    clientMAC: 'FF:FF:FF:FF:FF:FF',
    packetsPerSec: 5,
    totalSent: 3620,
    status: 'running',
    startedAt: '09:42:05',
    reason: 'handshake',
  },
  {
    id: 'da2',
    targetBSSID: 'AA:BB:CC:DD:EE:01',
    targetSSID: 'CoffeeShop_WiFi',
    clientMAC: 'F0:1F:AF:11:22:33',
    packetsPerSec: 2,
    totalSent: 860,
    status: 'stopped',
    startedAt: '09:44:22',
    reason: 'evil_twin',
  },
];

function DeauthManager({
  sessions,
  networks,
}: {
  sessions: DeauthSession[];
  networks: WiFiNetwork[];
}) {
  const [localSessions, setLocalSessions] = useState<DeauthSession[]>(sessions);
  const [targetNet, setTargetNet] = useState(networks[0]?.bssid ?? '');
  const [clientMac, setClientMac] = useState('FF:FF:FF:FF:FF:FF');
  const [pps, setPps] = useState(5);
  const [reason, setReason] = useState<DeauthSession['reason']>('handshake');

  useEffect(() => {
    const iv = setInterval(() => {
      setLocalSessions((prev) =>
        prev.map((s) =>
          s.status === 'running' ? { ...s, totalSent: s.totalSent + s.packetsPerSec } : s,
        ),
      );
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <Panel title="Deauthentication Manager · aireplay-ng -0" accent="#f87171">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 80px 110px 100px',
          gap: 6,
          marginBottom: 8,
          alignItems: 'flex-end',
        }}
      >
        <div>
          <div style={{ fontSize: 7, color: '#253a55', marginBottom: 3 }}>TARGET BSSID</div>
          <select
            value={targetNet}
            onChange={(e) => setTargetNet(e.target.value)}
            style={{
              width: '100%',
              background: '#030810',
              border: '1px solid #0d1f35',
              color: '#7dd3fc',
              fontSize: 8,
              padding: '4px 6px',
              borderRadius: 3,
              fontFamily: 'inherit',
            }}
          >
            {networks.map((n) => (
              <option key={n.bssid} value={n.bssid}>
                {n.ssid || '‹hidden›'} ({n.bssid})
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 7, color: '#253a55', marginBottom: 3 }}>CLIENT MAC</div>
          <input
            value={clientMac}
            onChange={(e) => setClientMac(e.target.value)}
            style={{
              width: '100%',
              background: '#030810',
              border: '1px solid #0d1f35',
              color: '#7dd3fc',
              fontSize: 8,
              padding: '4px 6px',
              borderRadius: 3,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 7, color: '#253a55', marginBottom: 3 }}>PKT/SEC</div>
          <input
            type="number"
            value={pps}
            onChange={(e) => setPps(Number(e.target.value))}
            min={1}
            max={50}
            style={{
              width: '100%',
              background: '#030810',
              border: '1px solid #0d1f35',
              color: '#fb923c',
              fontSize: 9,
              padding: '4px 6px',
              borderRadius: 3,
              fontFamily: 'inherit',
              fontWeight: 700,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 7, color: '#253a55', marginBottom: 3 }}>REASON</div>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as typeof reason)}
            style={{
              width: '100%',
              background: '#030810',
              border: '1px solid #0d1f35',
              color: '#7dd3fc',
              fontSize: 8,
              padding: '4px 6px',
              borderRadius: 3,
              fontFamily: 'inherit',
            }}
          >
            <option value="handshake">Handshake Capture</option>
            <option value="evil_twin">Evil Twin Prep</option>
            <option value="test">Connectivity Test</option>
          </select>
        </div>
        <div style={{ paddingTop: 14 }}>
          <Btn
            label="⚡ LAUNCH"
            color="#f87171"
            size="sm"
            onClick={() => {
              const net = networks.find((n) => n.bssid === targetNet);
              setLocalSessions((prev) => [
                ...prev,
                {
                  id: `da_${Date.now()}`,
                  targetBSSID: targetNet,
                  targetSSID: net?.ssid ?? 'Unknown',
                  clientMAC: clientMac,
                  packetsPerSec: pps,
                  totalSent: 0,
                  status: 'running',
                  startedAt: new Date().toLocaleTimeString(),
                  reason,
                },
              ]);
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '150px 130px 130px 60px 70px 70px 80px 60px',
          gap: 5,
          padding: '3px 0',
          borderBottom: '1px solid #0d1f35',
          marginBottom: 4,
        }}
      >
        {[
          'TARGET SSID',
          'TARGET BSSID',
          'CLIENT MAC',
          'PPS',
          'TOTAL SENT',
          'STATUS',
          'REASON',
          'STARTED',
        ].map((h) => (
          <span
            key={h}
            style={{ fontSize: 6.5, color: '#1e3050', fontWeight: 700, letterSpacing: '0.12em' }}
          >
            {h}
          </span>
        ))}
      </div>

      {localSessions.map((s) => (
        <div
          key={s.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '150px 130px 130px 60px 70px 70px 80px 60px',
            gap: 5,
            padding: '4px 0',
            borderBottom: '1px solid #0a1525',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 8, color: '#c8dff5', fontWeight: 600 }}>{s.targetSSID}</span>
          <span style={{ fontSize: 7.5, color: '#253a55' }}>{s.targetBSSID}</span>
          <span
            style={{
              fontSize: 7.5,
              color: s.clientMAC === 'FF:FF:FF:FF:FF:FF' ? '#fb923c' : '#7dd3fc',
            }}
          >
            {s.clientMAC === 'FF:FF:FF:FF:FF:FF' ? '✱ BROADCAST' : s.clientMAC}
          </span>
          <span style={{ fontSize: 8, color: '#f87171', fontWeight: 700 }}>{s.packetsPerSec}</span>
          <span style={{ fontSize: 8, color: '#3a5070' }}>{fmtNum(s.totalSent)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: s.status === 'running' ? '#34d399' : '#3a5070',
              }}
            />
            <span
              style={{
                fontSize: 7,
                color: s.status === 'running' ? '#34d399' : '#3a5070',
                fontWeight: 700,
              }}
            >
              {s.status.toUpperCase()}
            </span>
          </div>
          <Tag label={s.reason.replace('_', ' ').toUpperCase()} color="#fb923c" />
          <span style={{ fontSize: 7, color: '#1e3050' }}>{s.startedAt}</span>
        </div>
      ))}
    </Panel>
  );
}

// ============================================================================
// NETWORK TOPOLOGY MINI-MAP
// ============================================================================

function TopologyMap({ networks }: { networks: WiFiNetwork[] }) {
  return (
    <Panel title="Network Topology · Detected Infrastructure" accent="#38bdf8">
      <div
        style={{
          position: 'relative',
          height: 180,
          background: '#010408',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid #0d1f35',
        }}
      >
        {/* Grid lines */}
        {[...Array(5)].map((_, i) => (
          <div
            key={`h${i}`}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${(i + 1) * 20}%`,
              height: 1,
              background: '#0d1f3530',
            }}
          />
        ))}
        {[...Array(7)].map((_, i) => (
          <div
            key={`v${i}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${(i + 1) * 14}%`,
              width: 1,
              background: '#0d1f3530',
            }}
          />
        ))}
        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#38bdf818',
            border: '1px solid #38bdf840',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
          }}
        >
          📡
        </div>

        {/* Network nodes */}
        {networks.slice(0, 8).map((net, i) => {
          const angle = (i / Math.min(networks.length, 8)) * Math.PI * 2;
          const radius = 60 + (net.signal + 100) * 0.3;
          const x = 50 + Math.cos(angle) * (radius / 3);
          const y = 50 + Math.sin(angle) * (radius / 2.5);
          const col = ENC_PALETTE[net.encryption].color;
          return (
            <div
              key={net.id}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Pulse ring */}
              <div
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  border: `1px solid ${col}20`,
                  animation: 'none',
                }}
              />
              <div
                style={{
                  width: Math.max(6, (net.clients.length + 1) * 3),
                  height: Math.max(6, (net.clients.length + 1) * 3),
                  borderRadius: '50%',
                  background: `${col}25`,
                  border: `1px solid ${col}60`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 7,
                  boxShadow: `0 0 6px ${col}40`,
                  cursor: 'default',
                }}
                title={`${net.ssid || '‹hidden›'} (${net.bssid})`}
              >
                {net.clients.length > 0 ? net.clients.length : ''}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '100%',
                  transform: 'translateX(-50%)',
                  marginTop: 3,
                  fontSize: 6,
                  color: col,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 3px #010408',
                }}
              >
                {(net.ssid || '‹hidden›').slice(0, 12)}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
        {(Object.keys(ENC_PALETTE) as Encryption[]).map((enc) => {
          const count = networks.filter((n) => n.encryption === enc).length;
          if (!count) return null;
          return (
            <div key={enc} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: ENC_PALETTE[enc].color,
                }}
              />
              <span style={{ fontSize: 7, color: '#3a5070' }}>
                {enc.toUpperCase()} ({count})
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ============================================================================
// PROBE REQUEST SNIFFER
// ============================================================================

interface ProbeEntry {
  mac: string;
  vendor: string;
  ssid: string;
  signal: number;
  timestamp: string;
  count: number;
}

const mockProbes: ProbeEntry[] = [
  {
    mac: 'F0:1F:AF:11:22:33',
    vendor: 'Apple',
    ssid: 'HomeNet',
    signal: -51,
    timestamp: '09:54:01',
    count: 14,
  },
  {
    mac: '4C:32:75:AA:BB:CC',
    vendor: 'Samsung',
    ssid: 'CoffeeShop_WiFi',
    signal: -64,
    timestamp: '09:53:58',
    count: 7,
  },
  {
    mac: 'DC:A6:32:FF:EE:DD',
    vendor: 'Raspberry Pi',
    ssid: 'Office_5G',
    signal: -48,
    timestamp: '09:53:55',
    count: 22,
  },
  {
    mac: '00:50:56:FF:EE:DD',
    vendor: 'VMware',
    ssid: 'Corp_Secure',
    signal: -70,
    timestamp: '09:53:50',
    count: 3,
  },
  {
    mac: 'B8:27:EB:12:34:56',
    vendor: 'Raspberry Pi',
    ssid: 'TP-Link_5G',
    signal: -72,
    timestamp: '09:53:44',
    count: 1,
  },
  {
    mac: 'A4:C3:F0:88:99:AA',
    vendor: 'Lenovo',
    ssid: '',
    signal: -60,
    timestamp: '09:53:40',
    count: 5,
  },
];

function ProbeSniffer({ probes }: { probes: ProbeEntry[] }) {
  return (
    <Panel title="Probe Request Monitor · Client Tracking" accent="#34d399">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '130px 90px 150px 60px 50px 70px',
          gap: 5,
          padding: '3px 0',
          borderBottom: '1px solid #0d1f35',
          marginBottom: 4,
        }}
      >
        {['CLIENT MAC', 'VENDOR', 'PROBING FOR SSID', 'SIGNAL', 'COUNT', 'LAST SEEN'].map((h) => (
          <span
            key={h}
            style={{ fontSize: 6.5, color: '#1e3050', fontWeight: 700, letterSpacing: '0.12em' }}
          >
            {h}
          </span>
        ))}
      </div>
      {probes.map((p, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '130px 90px 150px 60px 50px 70px',
            gap: 5,
            padding: '4px 0',
            borderBottom: '1px solid #0a1525',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 8, color: '#38bdf8', fontWeight: 600 }}>{p.mac}</span>
          <span style={{ fontSize: 7.5, color: '#3a5070' }}>{p.vendor}</span>
          <span
            style={{
              fontSize: 8,
              color: p.ssid ? '#c8dff5' : '#253a55',
              fontStyle: p.ssid ? 'normal' : 'italic',
            }}
          >
            {p.ssid || '‹broadcast›'}
          </span>
          <span style={{ fontSize: 8, color: p.signal >= -60 ? '#34d399' : '#fb923c' }}>
            {p.signal}dBm
          </span>
          <span style={{ fontSize: 8, color: '#3a5070' }}>{p.count}</span>
          <span style={{ fontSize: 7.5, color: '#1e3050' }}>{p.timestamp}</span>
        </div>
      ))}
    </Panel>
  );
}

// ============================================================================
// TAB: WPA3 + ENTERPRISE
// ============================================================================

function WPA3EntTab({
  wpa3Results,
  entCaptures,
  krackResults,
}: {
  wpa3Results: WPA3Result[];
  entCaptures: EnterpriseCapture[];
  krackResults: KrackResult[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Panel title="WPA3 Security Assessment" accent="#c084fc">
        {wpa3Results.length === 0 ? (
          <div style={{ fontSize: 8, color: '#1e3050', padding: 16, textAlign: 'center' }}>
            No WPA3 targets scanned.
          </div>
        ) : (
          wpa3Results.map((r) => (
            <div
              key={r.bssid}
              style={{
                background: '#030810',
                border: '1px solid #0d1f35',
                borderRadius: 4,
                padding: 10,
                marginBottom: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#c8dff5' }}>{r.ssid}</span>
                <span style={{ fontSize: 8, color: '#253a55' }}>{r.bssid}</span>
                {r.vulnerableToDowngrade && <Tag label="⚠ DOWNGRADE VULN" color="#f87171" />}
                {r.transitionMode && <Tag label="TRANSITION MODE" color="#fb923c" />}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                {[
                  ['WPA3 Support', r.wpa3Supported, '#34d399'],
                  ['Transition Mode', r.transitionMode, '#f87171'],
                  ['MFP Enabled', r.mfpEnabled, '#34d399'],
                  ['Downgrade Vuln', r.vulnerableToDowngrade, '#f87171'],
                ].map(([k, v, c]) => (
                  <div
                    key={k as string}
                    style={{
                      padding: '5px 8px',
                      background: '#050b14',
                      borderRadius: 3,
                      border: '1px solid #0d1f35',
                    }}
                  >
                    <div style={{ fontSize: 7, color: '#253a55', marginBottom: 2 }}>
                      {k as string}
                    </div>
                    <div
                      style={{ fontSize: 9, fontWeight: 700, color: v ? (c as string) : '#3a5070' }}
                    >
                      {v ? '✓ Yes' : '✗ No'}
                    </div>
                  </div>
                ))}
              </div>
              {r.notes.map((n, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 8,
                    color: '#fb923c',
                    padding: '2px 6px',
                    background: '#1a0900',
                    borderRadius: 2,
                    marginBottom: 2,
                  }}
                >
                  ⚠ {n}
                </div>
              ))}
            </div>
          ))
        )}
      </Panel>

      <Panel title="WPA-Enterprise · RADIUS Credential Capture" accent="#facc15">
        {entCaptures.length === 0 ? (
          <div style={{ fontSize: 8, color: '#1e3050', padding: 16, textAlign: 'center' }}>
            No enterprise credentials captured. Deploy rogue AP via EVIL action.
          </div>
        ) : (
          entCaptures.map((ec) => (
            <div
              key={ec.id}
              style={{
                background: '#030810',
                border: '1px solid #0d1f35',
                borderRadius: 4,
                padding: 10,
                marginBottom: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#facc15' }}>
                  {ec.domain ? `${ec.domain}\\${ec.username}` : ec.username}
                </span>
                <Tag label={ec.eapMethod} color="#facc15" />
                <span style={{ fontSize: 8, color: '#253a55', marginLeft: 'auto' }}>
                  {ec.timestamp}
                </span>
              </div>
              <div style={{ fontSize: 8 }}>
                <span style={{ color: '#253a55' }}>MSCHAPv2 Hash: </span>
                <span style={{ color: '#fb923c', fontFamily: 'inherit', wordBreak: 'break-all' }}>
                  {ec.mschapv2Hash}
                </span>
              </div>
              {ec.crackedPassword ? (
                <div style={{ marginTop: 6, fontSize: 9, color: '#34d399', fontWeight: 700 }}>
                  ✓ Password: {ec.crackedPassword}
                </div>
              ) : (
                <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                  <Btn label="🔓 Crack with asleap" color="#fb923c" size="xs" />
                  <Btn label="🔓 Hashcat -m 5500" color="#f87171" size="xs" />
                </div>
              )}
            </div>
          ))
        )}
      </Panel>

      <Panel title="KRACK Attack · Key Reinstallation (CVE-2017-13077+)" accent="#f87171">
        {krackResults.length === 0 ? (
          <div style={{ fontSize: 8, color: '#1e3050', padding: 16, textAlign: 'center' }}>
            No KRACK tests run. Select an enterprise or WPA2 network and expand.
          </div>
        ) : (
          krackResults.map((kr) => (
            <div
              key={kr.id}
              style={{
                background: '#030810',
                border: '1px solid #0d1f35',
                borderRadius: 4,
                padding: 10,
                marginBottom: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#c8dff5' }}>
                  {kr.targetSSID}
                </span>
                <span style={{ fontSize: 8, color: '#253a55' }}>{kr.targetBSSID}</span>
                {kr.vulnerable ? (
                  <Tag label="💀 VULNERABLE" color="#f87171" />
                ) : (
                  <Tag label="✓ PATCHED" color="#34d399" />
                )}
                <span style={{ fontSize: 8, color: '#253a55', marginLeft: 'auto' }}>
                  {kr.testedAt}
                </span>
              </div>
              <div style={{ fontSize: 8, marginBottom: 4 }}>
                <span style={{ color: '#253a55' }}>Client MAC: </span>
                <span style={{ color: '#7dd3fc' }}>{kr.clientMac}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {kr.cveList.map((cve) => (
                  <Tag key={cve} label={cve} color="#f87171" />
                ))}
              </div>
              <div
                style={{
                  fontSize: 8,
                  color: '#fb923c',
                  padding: '4px 7px',
                  background: '#1a0900',
                  borderRadius: 3,
                }}
              >
                Impact: {kr.impact}
              </div>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}

// ============================================================================
// TAB: MAC SPOOFING
// ============================================================================

function MacTab({ entries, onAdd }: { entries: MacEntry[]; onAdd: () => void }) {
  const [iface, setIface] = useState('wlan0');
  const [targetMac, setTargetMac] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'manual' | 'random' | 'clone'>('random');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Panel title="MAC Spoof Configuration" accent="#34d399">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 7, color: '#253a55', marginBottom: 3 }}>INTERFACE</div>
            <select
              value={iface}
              onChange={(e) => setIface(e.target.value)}
              style={{
                width: '100%',
                background: '#030810',
                border: '1px solid #0d1f35',
                color: '#7dd3fc',
                fontSize: 8,
                padding: '4px 6px',
                borderRadius: 3,
                fontFamily: 'inherit',
              }}
            >
              {['wlan0', 'wlan1', 'eth0', 'eth1'].map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 7, color: '#253a55', marginBottom: 3 }}>MODE</div>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              style={{
                width: '100%',
                background: '#030810',
                border: '1px solid #0d1f35',
                color: '#7dd3fc',
                fontSize: 8,
                padding: '4px 6px',
                borderRadius: 3,
                fontFamily: 'inherit',
              }}
            >
              <option value="random">Random MAC</option>
              <option value="manual">Manual MAC</option>
              <option value="clone">Clone from Client</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 7, color: '#253a55', marginBottom: 3 }}>
              TARGET MAC {mode === 'random' && '(auto)'}
            </div>
            <input
              value={targetMac}
              onChange={(e) => setTargetMac(e.target.value)}
              placeholder={mode === 'random' ? 'XX:XX:XX:XX:XX:XX' : 'AA:BB:CC:DD:EE:FF'}
              disabled={mode === 'random'}
              style={{
                width: '100%',
                background: mode === 'random' ? '#020609' : '#030810',
                border: '1px solid #0d1f35',
                color: '#7dd3fc',
                fontSize: 8,
                padding: '4px 6px',
                borderRadius: 3,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 7, color: '#253a55', marginBottom: 3 }}>REASON</div>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Bypass MAC filter"
              style={{
                width: '100%',
                background: '#030810',
                border: '1px solid #0d1f35',
                color: '#7dd3fc',
                fontSize: 8,
                padding: '4px 6px',
                borderRadius: 3,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn label="⚡ APPLY SPOOF" color="#34d399" onClick={onAdd} size="sm" />
          <Btn label="↩ RESTORE ORIGINAL" color="#fb923c" size="sm" />
          <Btn label="🔄 RANDOM & APPLY" color="#3a5070" size="sm" />
        </div>
      </Panel>

      <Panel title="MAC History / Active Spoofs" accent="#34d399">
        {entries.length === 0 ? (
          <div style={{ fontSize: 8, color: '#1e3050', padding: 12, textAlign: 'center' }}>
            No MAC changes recorded.
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 130px 130px 100px 1fr 70px',
                gap: 6,
                padding: '3px 6px',
                marginBottom: 4,
                borderBottom: '1px solid #0d1f35',
              }}
            >
              {['IFACE', 'ORIGINAL MAC', 'CURRENT MAC', 'STATUS', 'REASON', 'TIME'].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 7,
                    color: '#1e3050',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
            {entries.map((e) => (
              <div
                key={e.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 130px 130px 100px 1fr 70px',
                  gap: 6,
                  padding: '5px 6px',
                  borderBottom: '1px solid #0a1525',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 8, color: '#4a6a9a' }}>{e.interface}</span>
                <span style={{ fontSize: 8, color: '#253a55' }}>{e.originalMac}</span>
                <span
                  style={{
                    fontSize: 8,
                    color: e.spoofed ? '#34d399' : '#253a55',
                    fontWeight: e.spoofed ? 700 : 400,
                  }}
                >
                  {e.currentMac}
                </span>
                <Tag
                  label={e.spoofed ? '● SPOOFED' : '○ ORIGINAL'}
                  color={e.spoofed ? '#34d399' : '#253a55'}
                />
                <span style={{ fontSize: 8, color: '#3a5070' }}>{e.reason}</span>
                <span style={{ fontSize: 7.5, color: '#1e3050' }}>{e.timestamp}</span>
              </div>
            ))}
          </>
        )}
      </Panel>
    </div>
  );
}

// ============================================================================
// TAB: LIVE LOG
// ============================================================================

function LogTab({ messages }: { messages: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <Btn label="⬇ EXPORT LOG" color="#38bdf8" size="sm" />
        <Btn label="🗑 CLEAR" color="#f87171" size="sm" />
      </div>
      <div
        ref={ref}
        style={{
          background: '#010408',
          border: '1px solid #0d1f35',
          borderRadius: 5,
          padding: '8px 10px',
          height: 520,
          overflowY: 'auto',
          fontFamily: 'inherit',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ fontSize: 8, color: '#1e3050' }}>[INFO] Awaiting commands...</div>
        ) : (
          messages.map((msg, i) => {
            const isSuccess =
              msg.includes('✅') ||
              msg.includes('✓') ||
              msg.toLowerCase().includes('found') ||
              msg.toLowerCase().includes('captured');
            const isError =
              msg.toLowerCase().includes('error') ||
              msg.toLowerCase().includes('failed') ||
              msg.includes('✗');
            const isWarn = msg.includes('⚠') || msg.toLowerCase().includes('warn');
            const color = isSuccess
              ? '#34d399'
              : isError
                ? '#f87171'
                : isWarn
                  ? '#fb923c'
                  : '#3a5878';
            return (
              <div
                key={i}
                style={{ fontSize: 8, color, marginBottom: 1.5, letterSpacing: '0.02em' }}
              >
                {msg}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: REPORT
// ============================================================================

function ReportTab({
  networks,
  attacks,
  crackedCount,
}: {
  networks: WiFiNetwork[];
  attacks: ActiveAttack[];
  crackedCount: number;
}) {
  const vulns = networks.filter(
    (n) =>
      n.wpsVulnerable ||
      n.encryption === 'wep' ||
      n.encryption === 'open' ||
      n.crackProbability >= 70,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Panel title="Executive Summary" accent="#38bdf8">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
            marginBottom: 10,
          }}
        >
          <Stat label="Networks Scanned" value={networks.length} accent="#38bdf8" />
          <Stat label="Vulnerable" value={vulns.length} accent="#f87171" />
          <Stat label="Passwords Cracked" value={crackedCount} accent="#34d399" />
          <Stat
            label="Risk Score"
            value={`${Math.min(100, Math.round((vulns.length / networks.length) * 100))}%`}
            accent="#fb923c"
          />
        </div>
        <div style={{ fontSize: 8, color: '#3a5070', lineHeight: 1.7 }}>
          Wireless security audit completed. {vulns.length} out of {networks.length} networks
          present critical or high-severity vulnerabilities.
          {networks.filter((n) => n.encryption === 'wep').length > 0 &&
            ` ${networks.filter((n) => n.encryption === 'wep').length} network(s) use deprecated WEP encryption.`}
          {networks.filter((n) => n.encryption === 'open').length > 0 &&
            ` ${networks.filter((n) => n.encryption === 'open').length} network(s) are completely open (no encryption).`}
          {networks.filter((n) => n.wpsVulnerable).length > 0 &&
            ` ${networks.filter((n) => n.wpsVulnerable).length} access point(s) are vulnerable to WPS Pixie Dust attacks.`}
        </div>
      </Panel>

      <Panel title="Vulnerability Findings" accent="#f87171">
        {vulns.map((n) => {
          const reasons = [];
          if (n.encryption === 'open')
            reasons.push({ label: 'CRITICAL: No encryption', color: '#f87171' });
          if (n.encryption === 'wep')
            reasons.push({ label: 'CRITICAL: WEP (deprecated)', color: '#f87171' });
          if (n.wpsVulnerable) reasons.push({ label: 'HIGH: WPS Pixie Dust', color: '#fb923c' });
          if (!n.mfpEnabled) reasons.push({ label: 'MEDIUM: MFP disabled', color: '#facc15' });
          if (n.crackProbability >= 70 && !reasons.length)
            reasons.push({ label: 'HIGH: Weak password', color: '#fb923c' });

          return (
            <div
              key={n.id}
              style={{
                padding: '7px 10px',
                background: '#030810',
                border: '1px solid #0d1f35',
                borderRadius: 4,
                marginBottom: 5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#c8dff5' }}>
                  {n.ssid || '‹hidden›'}
                </span>
                <span style={{ fontSize: 8, color: '#253a55' }}>{n.bssid}</span>
                {encBadge(n.encryption)}
                {n.crackedPassword && <Tag label={`PSK: ${n.crackedPassword}`} color="#34d399" />}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {reasons.map((r, i) => (
                  <Tag key={i} label={r.label} color={r.color} />
                ))}
              </div>
            </div>
          );
        })}
      </Panel>

      <Panel title="Recommendations" accent="#34d399">
        {[
          [
            'Disable WEP',
            'Replace all WEP-encrypted networks with WPA2 or WPA3. WEP is cryptographically broken.',
            '#f87171',
          ],
          [
            'Disable WPS',
            'Turn off WPS on all routers. WPS is vulnerable to Pixie Dust and brute-force attacks.',
            '#fb923c',
          ],
          [
            'Enable WPA3 / SAE',
            'Migrate to WPA3 where hardware supports. Enables forward secrecy and dragonfly handshake.',
            '#34d399',
          ],
          [
            'Enable MFP (802.11w)',
            'Mandatory Management Frame Protection prevents deauthentication attacks.',
            '#facc15',
          ],
          [
            'Use Strong Passphrases',
            'Wi-Fi passwords should be 20+ characters, avoiding dictionary words.',
            '#38bdf8',
          ],
          [
            'Deploy RADIUS / 802.1X',
            'Enterprise networks should use per-user certificates instead of shared PSK.',
            '#c084fc',
          ],
        ].map(([title, desc, color]) => (
          <div
            key={title}
            style={{
              display: 'flex',
              gap: 10,
              padding: '6px 0',
              borderBottom: '1px solid #0a1525',
            }}
          >
            <div
              style={{
                width: 5,
                flexShrink: 0,
                background: color as string,
                borderRadius: 2,
                alignSelf: 'stretch',
              }}
            />
            <div>
              <div
                style={{ fontSize: 9, fontWeight: 700, color: color as string, marginBottom: 2 }}
              >
                {title}
              </div>
              <div style={{ fontSize: 8, color: '#3a5070', lineHeight: 1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <Btn label="📄 EXPORT PDF REPORT" color="#38bdf8" size="sm" />
          <Btn label="📊 EXPORT JSON" color="#34d399" size="sm" />
          <Btn label="📋 COPY SUMMARY" color="#3a5070" size="sm" />
        </div>
      </Panel>
    </div>
  );
}

// ============================================================================
// PMKID CAPTURE PANEL
// ============================================================================

function PMKIDPanel({
  networks,
  onAction,
}: {
  networks: WiFiNetwork[];
  onAction: (action: string, net: WiFiNetwork) => void;
}) {
  const wpa2Targets = networks.filter((n) => n.encryption === 'wpa2' || n.encryption === 'wpa');

  return (
    <Panel title="PMKID Attack · hcxdumptool — No Deauth Required" accent="#a78bfa">
      <div
        style={{
          fontSize: 8,
          color: '#3a5070',
          marginBottom: 10,
          lineHeight: 1.7,
          padding: '6px 8px',
          background: '#0d0820',
          border: '1px solid #a78bfa20',
          borderRadius: 3,
        }}
      >
        PMKID attacks capture the RSN IE PMKID from beacon/association frames — no client needed, no
        deauth sent. Use <span style={{ color: '#a78bfa' }}>hcxdumptool</span> to capture, then
        crack with <span style={{ color: '#a78bfa' }}>hashcat -m 22000</span>.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
        {wpa2Targets.map((net) => (
          <div
            key={net.id}
            style={{
              padding: '7px 9px',
              background: '#030810',
              border: `1px solid ${net.pmkidCaptured ? '#a78bfa40' : '#0d1f35'}`,
              borderRadius: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#c8dff5' }}>
                {net.ssid || '‹hidden›'}
              </span>
              {net.pmkidCaptured && <Tag label="✓ CAPTURED" color="#a78bfa" />}
              {net.crackedPassword && <Tag label="CRACKED" color="#34d399" />}
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 8, marginBottom: 5 }}>
              <span style={{ color: '#253a55' }}>
                BSSID <span style={{ color: '#4a6a9a' }}>{net.bssid}</span>
              </span>
              <span style={{ color: '#253a55' }}>
                CH <span style={{ color: '#4a6a9a' }}>{net.channel}</span>
              </span>
              <span style={{ color: '#253a55' }}>{net.signal}dBm</span>
            </div>
            {net.pmkidFile && (
              <div style={{ fontSize: 7.5, color: '#a78bfa', marginBottom: 4 }}>
                → {net.pmkidFile}
              </div>
            )}
            {net.crackedPassword && (
              <div style={{ fontSize: 8, color: '#34d399', fontWeight: 700, marginBottom: 4 }}>
                ✓ {net.crackedPassword}
              </div>
            )}
            <div style={{ display: 'flex', gap: 4 }}>
              {!net.pmkidCaptured ? (
                <Btn
                  label="🧬 CAPTURE PMKID"
                  color="#a78bfa"
                  onClick={() => onAction('pmkid', net)}
                  size="xs"
                />
              ) : !net.crackedPassword ? (
                <Btn
                  label="🔓 CRACK (hashcat)"
                  color="#fb923c"
                  onClick={() => onAction('crack', net)}
                  size="xs"
                />
              ) : (
                <Tag label="✓ PASSWORD RECOVERED" color="#34d399" />
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <Btn
          label="🧬 CAPTURE ALL PMKID"
          color="#a78bfa"
          size="sm"
          onClick={() => wpa2Targets.forEach((n) => onAction('pmkid', n))}
        />
        <Btn label="⚙ hcxdumptool CONFIG" color="#3a5070" size="sm" />
        <Btn label="📊 EXPORT .hc22000" color="#3a5070" size="sm" />
      </div>
    </Panel>
  );
}

// ============================================================================
// CONSTANTS & HELPERS (used across components)
// ============================================================================

/**
 * Well-known IEEE OUI prefix to vendor mapping (abbreviated).
 * Used to enrich captured MAC addresses with manufacturer info.
 */
const OUI_MAP: Record<string, string> = {
  'F0:1F:AF': 'Apple Inc.',
  '4C:32:75': 'Samsung Electronics',
  'DC:A6:32': 'Raspberry Pi Foundation',
  'DE:AD:BE': 'Phantom (spoofed)',
  'AA:BB:CC': 'Mock AP (test)',
  'B8:27:EB': 'Raspberry Pi Foundation',
  'AC:BC:32': 'Google LLC',
  '90:B0:ED': 'Dell Inc.',
  'A4:C3:F0': 'Lenovo Group',
  '58:FB:84': 'Cisco Systems',
  '00:50:56': 'VMware Inc.',
};

function resolveVendor(mac: string): string {
  const prefix = mac.slice(0, 8).toUpperCase();
  return OUI_MAP[prefix] ?? 'Unknown Vendor';
}

/**
 * Convert dBm signal level to a human-readable quality label.
 */
function signalLabel(dbm: number): string {
  if (dbm >= -50) return 'Excellent';
  if (dbm >= -60) return 'Good';
  if (dbm >= -70) return 'Fair';
  if (dbm >= -80) return 'Weak';
  return 'Very Weak';
}

/**
 * Calculate estimated crack time given a speed and keyspace.
 */
function estimateCrackTime(keyspaceSize: number, keysPerSec: number): string {
  if (keysPerSec <= 0) return 'N/A';
  const sec = Math.floor(keyspaceSize / keysPerSec);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  return `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`;
}

/**
 * Determine if a network is considered high-risk based on its properties.
 */
function isHighRisk(net: WiFiNetwork): boolean {
  return (
    net.encryption === 'open' ||
    net.encryption === 'wep' ||
    (net.wps && net.wpsVulnerable) ||
    (!net.mfpEnabled && net.encryption !== 'wpa3') ||
    net.crackProbability >= 80
  );
}

/**
 * Severity tier for findings report.
 */
function getSeverity(net: WiFiNetwork): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  if (net.encryption === 'open' || net.encryption === 'wep') return 'critical';
  if (net.wpsVulnerable) return 'high';
  if (!net.mfpEnabled) return 'medium';
  if (net.crackProbability >= 50) return 'medium';
  if (net.encryption === 'wpa') return 'low';
  return 'info';
}

const SEVERITY_COLORS: Record<ReturnType<typeof getSeverity>, string> = {
  critical: '#f87171',
  high: '#fb923c',
  medium: '#facc15',
  low: '#38bdf8',
  info: '#3a5070',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Wireless() {
  const [networks, setNetworks] = useState<WiFiNetwork[]>(mockNetworks);
  const [activeAttacks, setActiveAttacks] = useState<ActiveAttack[]>(mockActiveAttacks);
  const [evilTwinSessions, setEvilTwinSessions] = useState<EvilTwinSession[]>(mockEvilTwinSessions);
  const [crackJobs, setCrackJobs] = useState<CrackJob[]>(mockCrackJobs);
  const [wpa3Results] = useState<WPA3Result[]>(mockWPA3Results);
  const [entCaptures] = useState<EnterpriseCapture[]>(mockEntCaptures);
  const [krackResults] = useState<KrackResult[]>(mockKrackResults);
  const [macEntries, setMacEntries] = useState<MacEntry[]>(mockMacEntries);
  const [logMessages, setLogMessages] = useState<string[]>([
    '[INIT] Phantoma Wireless v1.0.0 loaded.',
    '[INFO] Interface wlan0mon is in monitor mode.',
    '[INFO] Ready for commands.',
  ]);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('scan');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    interface: 'wlan0mon',
    channel: 'all',
    band: 'all',
    timeout: 30,
    saveCapture: true,
  });

  // Simulate attack progress
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAttacks((prev) =>
        prev.map((atk) => {
          if (atk.status !== 'running') return atk;
          const newProg = Math.min(atk.progress + Math.random() * 2.5, 100);
          return { ...atk, progress: Math.round(newProg), elapsedSeconds: atk.elapsedSeconds + 1 };
        }),
      );
      setCrackJobs((prev) =>
        prev.map((job) => {
          if (job.status !== 'running') return job;
          const newProg = Math.min(job.progress + Math.random() * 1.2, 100);
          return {
            ...job,
            progress: Math.round(newProg),
            elapsedSeconds: job.elapsedSeconds + 1,
            attempts: job.attempts + Math.floor(job.speed / 2),
          };
        }),
      );
      setEvilTwinSessions((prev) =>
        prev.map((s) => (s.status === 'active' ? { ...s, uptimeSeconds: s.uptimeSeconds + 1 } : s)),
      );
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const log = useCallback((msg: string) => {
    setLogMessages((prev) => [...prev.slice(-200), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const handleAction = useCallback(
    (action: string, network: WiFiNetwork) => {
      const target = `${network.ssid || '‹hidden›'} (${network.bssid})`;
      log(`▶ Executing "${action}" on ${target}`);

      if (action === 'capture') {
        const atkId = `atk_${Date.now()}`;
        log(`Starting deauth → handshake capture on CH ${network.channel}...`);
        setActiveAttacks((prev) => [
          ...prev,
          {
            id: atkId,
            type: 'handshake_capture',
            targetSSID: network.ssid,
            targetBSSID: network.bssid,
            progress: 0,
            status: 'running',
            startedAt: new Date().toLocaleTimeString(),
            elapsedSeconds: 0,
            logLines: [
              `airodump-ng -c ${network.channel} --bssid ${network.bssid} -w /tmp/cap wlan0mon`,
              'aireplay-ng -0 3 -a ' + network.bssid + ' wlan0mon',
              'Waiting for WPA handshake...',
            ],
          },
        ]);
        setTimeout(() => {
          log(`✅ Handshake captured for ${target} → ${network.ssid}_hs.cap`);
          setNetworks((prev) =>
            prev.map((n) =>
              n.id === network.id
                ? { ...n, handshakeCaptured: true, handshakeFile: `${network.ssid}_hs.cap` }
                : n,
            ),
          );
          setActiveAttacks((prev) =>
            prev.map((a) =>
              a.id === atkId
                ? {
                    ...a,
                    status: 'completed',
                    progress: 100,
                    logLines: [...a.logLines, `WPA handshake captured! → ${network.ssid}_hs.cap`],
                  }
                : a,
            ),
          );
        }, 4000);
      }

      if (action === 'pmkid') {
        log(`Launching hcxdumptool PMKID capture on ${target}...`);
        setTimeout(() => {
          log(`✅ PMKID captured → ${network.ssid}.pmkid`);
          setNetworks((prev) =>
            prev.map((n) =>
              n.id === network.id
                ? { ...n, pmkidCaptured: true, pmkidFile: `${network.ssid}.pmkid` }
                : n,
            ),
          );
        }, 2500);
      }

      if (action === 'wps') {
        const atkId = `atk_wps_${Date.now()}`;
        log(`Launching Pixie Dust (reaver -K 1) on ${target}...`);
        setActiveAttacks((prev) => [
          ...prev,
          {
            id: atkId,
            type: 'wps_pixie',
            targetSSID: network.ssid,
            targetBSSID: network.bssid,
            progress: 0,
            status: 'running',
            startedAt: new Date().toLocaleTimeString(),
            elapsedSeconds: 0,
            logLines: [
              `reaver -i wlan0mon -b ${network.bssid} -c ${network.channel} -vv -K 1`,
              'Sending M1...',
              'Received M2...',
              'Computing PKE, PSK...',
            ],
          },
        ]);
        setTimeout(() => {
          const pin =
            network.wpsPin ??
            Math.floor(Math.random() * 1e8)
              .toString()
              .padStart(8, '0');
          const pwd = network.crackedPassword ?? 'WPS_Cracked_2024';
          log(`✅ WPS PIN: ${pin} → Password: ${pwd}`);
          setNetworks((prev) =>
            prev.map((n) =>
              n.id === network.id
                ? { ...n, wpsPin: pin, crackedPassword: pwd, crackProbability: 100 }
                : n,
            ),
          );
          setActiveAttacks((prev) =>
            prev.map((a) =>
              a.id === atkId
                ? {
                    ...a,
                    status: 'completed',
                    progress: 100,
                    result: `PIN: ${pin} → ${pwd}`,
                    wpsPin: pin,
                    crackedPassword: pwd,
                  }
                : a,
            ),
          );
        }, 3500);
      }

      if (action === 'crack') {
        const jobId = `cj_${Date.now()}`;
        log(`Starting dictionary attack on ${network.handshakeFile ?? network.pmkidFile}...`);
        setCrackJobs((prev) => [
          ...prev,
          {
            id: jobId,
            targetSSID: network.ssid,
            targetBSSID: network.bssid,
            mode: network.pmkidCaptured ? 'pmkid' : 'dictionary',
            status: 'running',
            progress: 0,
            wordlist: 'rockyou.txt',
            attempts: 0,
            speed: 11000,
            eta: '~12m',
            hashFile: network.pmkidFile ?? network.handshakeFile,
            startedAt: new Date().toLocaleTimeString(),
            elapsedSeconds: 0,
          },
        ]);
        setActiveTab('crack');
      }

      if (action === 'wep') {
        log(`Starting WEP IV collection on ${target}...`);
        const atkId = `atk_wep_${Date.now()}`;
        setActiveAttacks((prev) => [
          ...prev,
          {
            id: atkId,
            type: 'dictionary_crack',
            targetSSID: network.ssid,
            targetBSSID: network.bssid,
            progress: 0,
            status: 'running',
            startedAt: new Date().toLocaleTimeString(),
            elapsedSeconds: 0,
            ivsCollected: 0,
            logLines: [
              'airodump-ng -c ' +
                network.channel +
                ' --bssid ' +
                network.bssid +
                ' -w wep_cap wlan0mon',
              'aireplay-ng -3 -b ' + network.bssid + ' wlan0mon',
              'Collecting IVs...',
            ],
          },
        ]);
        setTimeout(() => {
          log(`✅ WEP key found: 41:42:43:44:45 (ASCII: ABCDE)`);
          setNetworks((prev) =>
            prev.map((n) =>
              n.id === network.id
                ? { ...n, crackedPassword: '41:42:43:44:45', crackProbability: 100 }
                : n,
            ),
          );
          setActiveAttacks((prev) =>
            prev.map((a) =>
              a.id === atkId
                ? { ...a, status: 'completed', progress: 100, result: 'WEP Key: 41:42:43:44:45' }
                : a,
            ),
          );
        }, 5000);
      }

      if (action === 'evil') {
        log(`Configuring Evil Twin AP for ${target}...`);
        log(`hostapd: SSID="${network.ssid}", CH=${network.channel}`);
        log(`dnsmasq: starting DHCP 192.168.1.1/24...`);
        setTimeout(() => {
          const fakeMac = `DE:AD:${Math.floor(Math.random() * 0xffff)
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')
            .match(/../g)!
            .join(':')}`;
          const newSession: EvilTwinSession = {
            id: `et_${Date.now()}`,
            ssid: network.ssid,
            fakeBSSID: fakeMac,
            channel: network.channel,
            targetBSSID: network.bssid,
            clientsConnected: 0,
            credentials: [],
            uptimeSeconds: 0,
            deauthSent: 0,
            handshakesCollected: 0,
            status: 'active',
            portalType: 'generic',
          };
          setEvilTwinSessions((prev) => [...prev, newSession]);
          log(`✅ Evil Twin "${network.ssid}" is broadcasting on CH ${network.channel}`);
          setActiveTab('evil_twin');
        }, 2000);
      }

      if (action === 'deauth') {
        log(`Sending deauth frames to clients of ${target}...`);
        log(`aireplay-ng -0 5 -a ${network.bssid} wlan0mon`);
      }

      if (action === 'enterprise') {
        log(`Deploying rogue RADIUS AP (hostapd-mana) for ${target}...`);
        setActiveTab('wpa3_ent');
      }

      if (action === 'krack') {
        log(`Running KRACK test against ${target}...`);
        setActiveTab('wpa3_ent');
      }
    },
    [log],
  );

  const startScan = useCallback(() => {
    setIsScanning(true);
    log(
      `Starting WiFi scan on ${scanConfig.interface} [band: ${scanConfig.band}GHz, ch: ${scanConfig.channel}]...`,
    );
    setTimeout(() => {
      log(`Channel hopping...`);
    }, 800);
    setTimeout(() => {
      log(
        `Detected ${networks.length} networks, ${networks.reduce((s, n) => s + n.clients.length, 0)} clients.`,
      );
      setIsScanning(false);
    }, 3000);
  }, [scanConfig, networks, log]);

  const stopAttack = (id: string) => {
    setActiveAttacks((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'stopped' } : a)));
    log(`■ Attack ${id} stopped.`);
  };

  const stopEvilTwin = (id: string) => {
    setEvilTwinSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'stopped' } : s)));
    log(`■ Evil Twin ${id} stopped.`);
  };

  const addMacSpoof = () => {
    const newEntry: MacEntry = {
      id: `mac_${Date.now()}`,
      interface: 'wlan0',
      originalMac: 'B4:2E:99:01:23:45',
      currentMac: `${['02', '06', '0A', '0E'][Math.floor(Math.random() * 4)]}:${Array(5)
        .fill(0)
        .map(() =>
          Math.floor(Math.random() * 256)
            .toString(16)
            .padStart(2, '0')
            .toUpperCase(),
        )
        .join(':')}`,
      spoofed: true,
      timestamp: new Date().toLocaleTimeString(),
      reason: 'Manual spoof',
    };
    setMacEntries((prev) => [...prev, newEntry]);
    log(
      `✅ MAC spoofed on ${newEntry.interface}: ${newEntry.originalMac} → ${newEntry.currentMac}`,
    );
  };

  const stats = {
    total: networks.length,
    vulnWPS: networks.filter((n) => n.wpsVulnerable).length,
    handshakes: networks.filter((n) => n.handshakeCaptured).length,
    cracked: networks.filter((n) => n.crackedPassword).length,
    avgProb: Math.round(networks.reduce((s, n) => s + n.crackProbability, 0) / networks.length),
    running: activeAttacks.filter((a) => a.status === 'running').length,
    evilActive: evilTwinSessions.filter((s) => s.status === 'active').length,
    totalClients: networks.reduce((s, n) => s + n.clients.length, 0),
    openNets: networks.filter((n) => n.encryption === 'open').length,
    wepNets: networks.filter((n) => n.encryption === 'wep').length,
  };

  const TABS: { id: TabType; label: string; accent: string; badge?: number }[] = [
    { id: 'scan', label: '📡 SCAN', accent: '#38bdf8', badge: networks.length },
    { id: 'attacks', label: '⚡ ATTACKS', accent: '#f87171', badge: stats.running || undefined },
    {
      id: 'evil_twin',
      label: '🎭 EVIL TWIN',
      accent: '#c084fc',
      badge: stats.evilActive || undefined,
    },
    {
      id: 'crack',
      label: '🔓 CRACK JOBS',
      accent: '#fb923c',
      badge: crackJobs.filter((j) => j.status === 'running').length || undefined,
    },
    { id: 'wpa3_ent', label: '🛡 WPA3 / ENT', accent: '#facc15' },
    { id: 'mac', label: '🎭 MAC SPOOF', accent: '#34d399' },
    {
      id: 'log',
      label: '📋 LIVE LOG',
      accent: '#3a5878',
      badge: logMessages.length > 3 ? logMessages.length : undefined,
    },
    { id: 'report', label: '📊 REPORT', accent: '#38bdf8' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#010408',
        overflow: 'hidden',
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace',
        color: '#c8dff5',
      }}
    >
      {/* ── TOPBAR ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 12px',
          height: 36,
          background: '#020609',
          borderBottom: '1px solid #0d1f35',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#34d399',
              boxShadow: '0 0 8px #34d399',
            }}
          />
          <span style={{ fontSize: 8, fontWeight: 700, color: '#34d399', letterSpacing: '0.18em' }}>
            MONITOR MODE
          </span>
        </div>
        <div style={{ width: 1, height: 14, background: '#0d1f35' }} />
        <span style={{ fontSize: 8, color: '#1e3050', fontWeight: 700, letterSpacing: '0.18em' }}>
          PHANTOMA WIRELESS
        </span>
        <span style={{ fontSize: 7, color: '#0d2035' }}>v1.0.0</span>
        <div style={{ width: 1, height: 14, background: '#0d1f35' }} />
        {/* Status pills */}
        {stats.running > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              background: '#34d39912',
              border: '1px solid #34d39930',
              borderRadius: 10,
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399' }} />
            <span style={{ fontSize: 7, fontWeight: 700, color: '#34d399' }}>
              {stats.running} RUNNING
            </span>
          </div>
        )}
        {stats.evilActive > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              background: '#f8717112',
              border: '1px solid #f8717130',
              borderRadius: 10,
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f87171' }} />
            <span style={{ fontSize: 7, fontWeight: 700, color: '#f87171' }}>EVIL TWIN LIVE</span>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Btn label="⊞ MONITOR MODE" color="#38bdf8" size="xs" />
          <Btn label="🔓 ALL WPS PIXIE" color="#f87171" size="xs" />
          <Btn label="📖 BULK CRACK" color="#fb923c" size="xs" />
          <Btn label="📄 EXPORT REPORT" color="#34d399" size="xs" />
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 4,
          padding: '8px 10px',
          flexShrink: 0,
        }}
      >
        <Stat label="Networks" value={stats.total} accent="#38bdf8" />
        <Stat label="Clients" value={stats.totalClients} accent="#38bdf8" sub="detected" />
        <Stat label="Open" value={stats.openNets} accent="#34d399" sub="no auth" />
        <Stat label="WEP" value={stats.wepNets} accent="#f87171" sub="broken" />
        <Stat label="WPS Vuln" value={stats.vulnWPS} accent="#f87171" sub="pixie dust" />
        <Stat label="Handshakes" value={stats.handshakes} accent="#38bdf8" sub="captured" />
        <Stat label="Cracked" value={stats.cracked} accent="#34d399" sub="passwords" />
        <Stat label="Avg Crack%" value={`${stats.avgProb}%`} accent="#fb923c" />
        <Stat label="Active Jobs" value={stats.running} accent="#34d399" sub="running" />
        <Stat label="Evil Twins" value={stats.evilActive} accent="#c084fc" sub="live APs" />
      </div>

      {/* ── TABS ── */}
      <div
        style={{
          display: 'flex',
          gap: 1,
          padding: '0 10px',
          flexShrink: 0,
          borderBottom: '1px solid #0d1f35',
          background: '#020609',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: '7px 12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: activeTab === tab.id ? '#030d18' : 'transparent',
              color: activeTab === tab.id ? tab.accent : '#253a55',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom:
                activeTab === tab.id ? `2px solid ${tab.accent}` : '2px solid transparent',
              transition: 'all 0.15s',
              position: 'relative',
            }}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  fontSize: 6,
                  fontWeight: 800,
                  padding: '1px 3px',
                  borderRadius: 8,
                  minWidth: 14,
                  textAlign: 'center',
                  background: activeTab === tab.id ? `${tab.accent}30` : '#0d1f35',
                  color: activeTab === tab.id ? tab.accent : '#3a5070',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        {activeTab === 'scan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ScanTab
              networks={networks}
              onAction={handleAction}
              isScanning={isScanning}
              onScan={startScan}
              scanConfig={scanConfig}
              onScanConfig={setScanConfig}
              expandedRow={expandedRow}
              setExpandedRow={setExpandedRow}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <ChannelChart networks={networks} />
              <TopologyMap networks={networks} />
            </div>
            <ProbeSniffer probes={mockProbes} />
          </div>
        )}
        {activeTab === 'attacks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AttacksTab attacks={activeAttacks} onStop={stopAttack} />
            <WPSAttackPanel networks={networks} onAction={handleAction} />
            <DeauthManager sessions={mockDeauthSessions} networks={networks} />
            <PMKIDPanel networks={networks} onAction={handleAction} />
          </div>
        )}
        {activeTab === 'evil_twin' && (
          <EvilTwinTab sessions={evilTwinSessions} onStop={stopEvilTwin} />
        )}
        {activeTab === 'crack' && (
          <CrackTab jobs={crackJobs} onNewJob={() => log('New crack job dialog...')} />
        )}
        {activeTab === 'wpa3_ent' && (
          <WPA3EntTab
            wpa3Results={wpa3Results}
            entCaptures={entCaptures}
            krackResults={krackResults}
          />
        )}
        {activeTab === 'mac' && <MacTab entries={macEntries} onAdd={addMacSpoof} />}
        {activeTab === 'log' && <LogTab messages={logMessages} />}
        {activeTab === 'report' && (
          <ReportTab networks={networks} attacks={activeAttacks} crackedCount={stats.cracked} />
        )}
      </div>
    </div>
  );
}

export default Wireless;
