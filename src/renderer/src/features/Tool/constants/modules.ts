import { NavModuleConfig } from '../types/types'

export const NAV_MODULES: NavModuleConfig[] = [
  { id: 'recon',    title: 'Recon / OSINT',          activeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  { id: 'scanner',  title: 'Network Scanner',         activeClass: 'bg-green-500/10 text-green-400 border-green-500/30', dotColor: 'bg-green-400' },
  { id: 'vulns',    title: 'Vulnerability Scanner',   activeClass: 'bg-red-500/10 text-red-400 border-red-500/30', dotColor: 'bg-red-400' },
  { id: 'exploit',  title: 'Exploit Engine',          activeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dotColor: 'bg-amber-400' },
  { id: 'post',     title: 'Post-Exploitation',       activeClass: 'bg-zinc-500/10 text-zinc-300 border-zinc-600' },
  { id: 'intruder', title: 'Intruder / Fuzzer',       activeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { id: 'webapp',   title: 'Web App Scanner',         activeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  { id: 'sqli',     title: 'SQLi / XSS / Injection',  activeClass: 'bg-red-500/10 text-red-400 border-red-500/30', dotColor: 'bg-red-400' },
  { id: 'forensics',title: 'Forensics',               activeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { id: 'malware',  title: 'Malware Sandbox',         activeClass: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { id: 'sniffer',  title: 'Network Sniffer',         activeClass: 'bg-green-500/10 text-green-400 border-green-500/30' },
  { id: 'cracking', title: 'Hash / Password Cracking',activeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { id: 'phishing', title: 'Phishing / SE Toolkit',   activeClass: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { id: 'cloud',    title: 'Cloud Security',          activeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  { id: 'report',   title: 'Report Builder',          activeClass: 'bg-green-500/10 text-green-400 border-green-500/30' },
  { id: 'ai',       title: 'AI Assistant',            activeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { id: 'collab',   title: 'Collaboration',           activeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
]

export const MODULE_TITLES: Record<string, string> = Object.fromEntries(
  NAV_MODULES.map((m) => [m.id, m.title])
)

export const MODULE_WS_TABS: Record<string, string[]> = {
  recon:     ['OSINT Overview', 'DNS Enum', 'WHOIS', 'Breach Data', 'Email Harvest', 'Shodan'],
  scanner:   ['Scan Results', 'Host Details', 'Services'],
  vulns:     ['Vulnerabilities', 'CVE Search', 'Reports'],
  exploit:   ['Exploit Suggester', 'Payload Generator', 'Console'],
  post:      ['File Browser', 'Processes', 'Credentials', 'Persistence'],
  intruder:  ['Attack Results', 'Payloads', 'Config'],
  webapp:    ['Spider', 'Active Scan', 'Passive Scan'],
  sqli:      ['Injection Tests', 'Dump Output', 'Payloads'],
  forensics: ['Hex View', 'Strings', 'PCAP', 'Timeline'],
  malware:   ['Process Tree', 'Network Traffic', 'YARA Scanner'],
  sniffer:   ['Packet Capture', 'Protocol Stats'],
  cracking:  ['Hash Input', 'Hashcat Output'],
  phishing:  ['Campaigns', 'Harvested Creds', 'Templates'],
  cloud:     ['AWS Resources', 'Kubernetes', 'IAM Enumeration'],
  report:    ['Sections', 'Preview', 'Export'],
  ai:        ['Chat', 'Prompts'],
  collab:    ['Operators', 'Team Chat', 'Shared Workspace'],
}
