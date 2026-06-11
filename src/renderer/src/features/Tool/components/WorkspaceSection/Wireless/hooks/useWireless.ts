// ============================================================================
// useWireless — Main hook for Wireless component state & actions
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import type {
  WiFiNetwork,
  ActiveAttack,
  EvilTwinSession,
  CrackJob,
  WPA3Result,
  EnterpriseCapture,
  KrackResult,
  MacEntry,
  ScanConfig,
  TabType,
} from '../types';
import {
  mockNetworks,
  mockActiveAttacks,
  mockEvilTwinSessions,
  mockCrackJobs,
  mockWPA3Results,
  mockEntCaptures,
  mockKrackResults,
  mockMacEntries,
  mockDeauthSessions,
  mockProbes,
} from '../data';

export function useWireless() {
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

  return {
    networks,
    activeAttacks,
    evilTwinSessions,
    crackJobs,
    wpa3Results,
    entCaptures,
    krackResults,
    macEntries,
    logMessages,
    isScanning,
    activeTab,
    expandedRow,
    scanConfig,
    stats,
    setActiveTab,
    setExpandedRow,
    setScanConfig,
    handleAction,
    startScan,
    stopAttack,
    stopEvilTwin,
    addMacSpoof,
    log,
    deauthSessions: mockDeauthSessions,
    probes: mockProbes,
  };
}