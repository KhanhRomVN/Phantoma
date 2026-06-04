// src/renderer/src/features/Tool/components/WorkspaceSection/Settings/index.tsx
import { useState } from 'react'
import { cn } from '../../../../../shared/lib/utils'
import { ModuleTabBar, ToolbarButton } from '../../../../../core/components/ui'

// ============================================================================
// 1. ĐỊNH NGHĨA KIỂU CHO TOÀN BỘ SETTINGS (rất chi tiết)
// ============================================================================

interface SettingsState {
  // General
  general: {
    theme: 'dark' | 'light' | 'oled'
    fontSize: number
    fontFamily: 'JetBrains Mono' | 'Fira Code' | 'Courier New'
    timestamps: boolean
    animations: boolean
    telemetry: boolean
    language: 'en' | 'vi' | 'zh'
    autoSave: boolean
    autoSaveInterval: number
    confirmExit: boolean
    showSplash: boolean
    hardwareAcceleration: boolean
  }
  // Network
  network: {
    tunInterface: string
    lhost: string
    lport: number
    proxyEnabled: boolean
    proxyType: 'socks5' | 'http' | 'https'
    proxyHost: string
    proxyPort: number
    proxyAuth: boolean
    proxyUsername: string
    proxyPassword: string
    torProxy: string
    torEnabled: boolean
    userAgent: string
    timeout: number
    maxRetries: number
    dnsServers: string[]
    forceIPv4: boolean
    forceIPv6: boolean
    interfaceBinding: string
  }
  // API Keys
  apiKeys: {
    shodan: string
    hibp: string
    virustotal: string
    securitytrails: string
    censys: string
    alienvault: string
    greynoise: string
    abuseipdb: string
    binaryedge: string
    onyphe: string
    fofa: string
    zoomeye: string
    passivetotal: string
    intelx: string
    urlscan: string
  }
  // Tool Paths
  toolPaths: {
    nmap: string
    masscan: string
    subfinder: string
    amass: string
    httpx: string
    dnsx: string
    theHarvester: string
    hashcat: string
    john: string
    metasploit: string
    msfvenom: string
    sqlmap: string
    nuclei: string
    naabu: string
    ffuf: string
    yara: string
    tshark: string
    airbaseNg: string
    aircrackNg: string
    bettercap: string
    socat: string
    wordlistsDir: string
    customPayloadsDir: string
    outputDir: string
    logsDir: string
    tempDir: string
  }
  // Module configurations (đầy đủ, chi tiết)
  recon: {
    maxSubdomains: number
    dnsTimeout: number
    enablePassiveSources: boolean
    enableBruteForce: boolean
    bruteForceWordlist: string
    shodanEnabled: boolean
    censysEnabled: boolean
    securitytrailsEnabled: boolean
    alienvaultEnabled: boolean
    greynoiseEnabled: boolean
    hibpEnabled: boolean
    subfinderThreads: number
    amassWordlist: string
    dnsxRetries: number
    httpProbe: boolean
    screenshotSubdomains: boolean
    subdomainTakeoverCheck: boolean
  }
  scanner: {
    defaultPorts: string
    scanSpeed: 'polite' | 'normal' | 'aggressive' | 'insane'
    osDetection: boolean
    serviceVersion: boolean
    scriptScan: boolean
    udpScan: boolean
    maxRetries: number
    minRate: number
    maxRate: number
    hostTimeout: number
    pingScan: boolean
    traceroute: boolean
    customNmapArgs: string
    scriptArgs: string
    vulnScripts: string[]
    safeScriptsOnly: boolean
  }
  vulns: {
    cvssThreshold: number
    autoUpdateCveDb: boolean
    cveDbUrl: string
    enableNuclei: boolean
    nucleiTemplateDir: string
    nucleiTags: string[]
    nucleiSeverity: ('critical' | 'high' | 'medium' | 'low' | 'info')[]
    enableOpenVAS: boolean
    openvasHost: string
    openvasPort: number
    openvasUsername: string
    openvasPassword: string
    enableNessus: boolean
    nessusApiUrl: string
    nessusApiKey: string
    vulnCheckTimeout: number
  }
  exploit: {
    defaultPayload: string
    metasploitRpcHost: string
    metasploitRpcPort: number
    metasploitRpcPassword: string
    autoMigrate: boolean
    autoPrivEsc: boolean
    defaultListenerPort: number
    defaultListenerHost: string
    payloadEncoder: 'x86/shikata_ga_nai' | 'x64/xor_dynamic' | 'none'
    payloadIterations: number
    payloadFormat: 'raw' | 'exe' | 'elf' | 'ps1' | 'vba' | 'java'
    stageEncoder: string
    disablePayloadStaging: boolean
  }
  post: {
    defaultLootDir: string
    enableKeylogger: boolean
    screenshotQuality: number
    hashdumpFormat: 'hashcat' | 'john' | 'plain'
    mimikatzCommand: string
    enablePersistence: boolean
    persistenceMethod: 'registry' | 'scheduled_task' | 'service' | 'wmi'
    cleanupAfter: boolean
    enableTimestomp: boolean
    enableProxyChains: boolean
    socksPort: number
  }
  intruder: {
    defaultAttackType: 'sniper' | 'battering_ram' | 'pitchfork' | 'cluster_bomb'
    defaultThreads: number
    defaultDelay: number
    followRedirects: boolean
    encodePayloads: boolean
    maxCombinations: number
    grepExtractEnabled: boolean
    grepRegexes: string[]
    matchStatusCode: number[]
    matchLength: number[]
    excludeStatusCode: number[]
    excludeLength: number[]
    payloadProcessingRules: string[]
    attackTimeout: number
  }
  webapp: {
    crawlDepth: number
    crawlMaxPages: number
    concurrentRequests: number
    detectWaf: boolean
    scanXss: boolean
    scanSql: boolean
    scanLfi: boolean
    scanSsti: boolean
    scanCmis: boolean
    scanOpenRedirect: boolean
    xssPolyglotLevel: 'low' | 'medium' | 'high'
    xssPayloadFile: string
    sqlPayloadFile: string
    customHeaders: Record<string, string>
    cookieJar: boolean
    followRobots: boolean
    userAgentRotate: boolean
  }
  decoder: {
    defaultOutputFormat: 'raw' | 'hex' | 'base64'
    showLineNumbers: boolean
    maxInputLength: number
    autoDetectEncoding: boolean
    highlightMatches: boolean
    jwtAutoDecode: boolean
    urlAutoDecode: boolean
    htmlEntityDecode: boolean
  }
  sqli: {
    sqlmapLevel: number
    sqlmapRisk: number
    sqlmapThreads: number
    timeBasedDelay: number
    enableNosql: boolean
    enableXss: boolean
    sqlmapTamper: string[]
    sqlmapDbms: string
    sqlmapOs: string
    sqlmapTechnique: 'BEUSTQ' // B:Boolean, E:Error, U:Union, S:Stacked, T:Time, Q:Inline
    sqlmapBatch: boolean
    sqlmapRandomAgent: boolean
    sqlmapProxy: string
    sqlmapTor: boolean
  }
  forensics: {
    maxFileSize: string
    entropyThreshold: number
    yaraRulesDir: string
    enableStrings: boolean
    enablePcapParsing: boolean
    enableMemoryAnalysis: boolean
    volatilityProfile: string
    volatilityPlugins: string[]
    stringsMinLength: number
    peParserDeep: boolean
    elfParserDeep: boolean
    extractIocs: boolean
    iocExportFormat: 'stix' | 'csv' | 'json'
  }
  malware: {
    sandboxType: 'cuckoo' | 'cape' | 'fireeye' | 'custom'
    sandboxApiUrl: string
    sandboxApiKey: string
    analysisTimeout: number
    enableMemoryDump: boolean
    enableNetworkCapture: boolean
    enableScreenCapture: boolean
    enableFileExtraction: boolean
    maxSampleSize: number
    supportedFileTypes: string[]
    yaraScanOnUpload: boolean
    staticAnalysis: boolean
    dynamicAnalysis: boolean
  }
  sniffer: {
    defaultInterface: string
    snaplen: number
    promiscuous: boolean
    enableDnsSpoof: boolean
    enableArpSpoof: boolean
    pcapOutputDir: string
    maxPcapSize: string
    ringBuffer: boolean
    ringBufferFiles: number
    captureFilter: string
    decodeApplicationLayer: boolean
    followStream: boolean
    extractCredentials: boolean
    alertOnC2: boolean
    c2IocList: string[]
  }
  cracking: {
    defaultHashcatMode: number
    gpuEnabled: boolean
    wordlistDefault: string
    rulesDefault: string
    autosaveInterval: number
    hashcatWorkload: 1 | 2 | 3 | 4
    hashcatForce: boolean
    hashcatOptimizedKernel: boolean
    maskAttackCustom: string
    incrementMin: number
    incrementMax: number
    customCharset1: string
    customCharset2: string
    customCharset3: string
    customCharset4: string
    potfilePath: string
    outfileFormat: string
    showCracked: boolean
    removeFound: boolean
  }
  phishing: {
    smtpServer: string
    smtpPort: number
    smtpEncryption: 'none' | 'STARTTLS' | 'SSL/TLS'
    smtpUsername: string
    smtpPassword: string
    fromEmail: string
    fromName: string
    landingDomain: string
    evilginxEnabled: boolean
    evilginxPath: string
    evilginxDomain: string
    evilginxRedirectUrl: string
    evilginxPhishletsDir: string
    trackOpens: boolean
    trackClicks: boolean
    captureHeaders: boolean
    captureIp: boolean
    captureUserAgent: boolean
    emailTemplateDir: string
    landingPageDir: string
    credentialExportFormat: 'csv' | 'json' | 'txt'
  }
  cloud: {
    awsProfile: string
    awsRegion: string
    awsAccessKey: string
    awsSecretKey: string
    gcpProject: string
    gcpCredentialsPath: string
    azureSubscription: string
    azureTenantId: string
    azureClientId: string
    azureClientSecret: string
    enableComplianceScan: boolean
    iamScanDepth: number
    s3BucketScan: boolean
    ec2InstanceScan: boolean
    rdsScan: boolean
    lambdaScan: boolean
    k8sScan: boolean
    gkeClusterScan: boolean
    aksClusterScan: boolean
    complianceFrameworks: ('cis' | 'pci' | 'hipaa' | 'gdpr')[]
  }
  report: {
    defaultTemplate: 'pentest_standard' | 'executive' | 'bugbounty' | 'compliance'
    companyName: string
    companyLogo: string
    authorName: string
    authorEmail: string
    includeCharts: boolean
    includeRawData: boolean
    passwordProtect: boolean
    pdfPassword: string
    watermark: string
    confidentialityLevel: 'CONFIDENTIAL' | 'INTERNAL' | 'PUBLIC'
    language: 'en' | 'vi'
    outputFormat: 'pdf' | 'docx' | 'html' | 'json'
    autoGenerate: boolean
    emailReport: boolean
    emailRecipients: string[]
  }
  ai: {
    provider: 'openai' | 'anthropic' | 'local' | 'custom'
    apiKey: string
    apiUrl: string
    model: string
    maxTokens: number
    temperature: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
    contextEnabled: boolean
    contextWindow: number
    customPrompt: string
    streamOutput: boolean
    cacheResponses: boolean
  }
  collab: {
    serverUrl: string
    serverApiKey: string
    enablePushNotifications: boolean
    sessionSharingTimeout: number
    maxFileUploadSize: string
    allowedFileTypes: string[]
    chatHistoryRetention: number
    enableEndToEndEncryption: boolean
    encryptionKey: string
    selfHosted: boolean
    redisHost: string
    redisPort: number
    websocketPort: number
  }
  c2: {
    defaultListener: 'http' | 'https' | 'dns' | 'smb'
    c2ServerUrl: string
    c2ApiKey: string
    jitter: number
    beaconInterval: number
    encrypted: boolean
    encryptionAlgorithm: 'aes-256-gcm' | 'chacha20-poly1305'
    killDate: string
    userAgent: string
    sleepJitter: number
    callbackRetries: number
    callbackJitter: number
    hostHeader: string
    customProfile: string
    sslCertificate: string
    sslKey: string
  }
  logging: {
    logLevel: 'debug' | 'info' | 'warning' | 'error'
    logFile: string
    maxLogSize: string
    enableAudit: boolean
    enableDebug: boolean
    logToConsole: boolean
    jsonFormat: boolean
    syslogEnabled: boolean
    syslogHost: string
    syslogPort: number
    logRetentionDays: number
  }
}

// ============================================================================
// 2. STATE INITIALIZATION (mock values – thay bằng API thực tế)
// ============================================================================

const [settings, setSettings] = useState<SettingsState>({
  general: {
    theme: 'dark', fontSize: 12, fontFamily: 'JetBrains Mono', timestamps: true, animations: true, telemetry: false, language: 'en', autoSave: true, autoSaveInterval: 30, confirmExit: true, showSplash: true, hardwareAcceleration: true,
  },
  network: {
    tunInterface: 'tun0', lhost: '10.10.14.5', lport: 4444, proxyEnabled: false, proxyType: 'socks5', proxyHost: '', proxyPort: 0, proxyAuth: false, proxyUsername: '', proxyPassword: '', torProxy: 'socks5://127.0.0.1:9050', torEnabled: false, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PHANTOM/2.5', timeout: 30, maxRetries: 3, dnsServers: ['8.8.8.8', '1.1.1.1'], forceIPv4: false, forceIPv6: false, interfaceBinding: '',
  },
  apiKeys: {
    shodan: '••••••••••••', hibp: '', virustotal: '', securitytrails: '', censys: '', alienvault: '', greynoise: '', abuseipdb: '', binaryedge: '', onyphe: '', fofa: '', zoomeye: '', passivetotal: '', intelx: '', urlscan: '',
  },
  toolPaths: {
    nmap: '/usr/bin/nmap', masscan: '/usr/bin/masscan', subfinder: '/usr/bin/subfinder', amass: '/usr/bin/amass', httpx: '/usr/bin/httpx', dnsx: '/usr/bin/dnsx', theHarvester: '/usr/bin/theHarvester', hashcat: '/usr/bin/hashcat', john: '/usr/bin/john', metasploit: '/usr/bin/msfconsole', msfvenom: '/usr/bin/msfvenom', sqlmap: '/usr/bin/sqlmap', nuclei: '/usr/bin/nuclei', naabu: '/usr/bin/naabu', ffuf: '/usr/bin/ffuf', yara: '/usr/bin/yara', tshark: '/usr/bin/tshark', airbaseNg: '/usr/sbin/airbase-ng', aircrackNg: '/usr/sbin/aircrack-ng', bettercap: '/usr/bin/bettercap', socat: '/usr/bin/socat', wordlistsDir: '/opt/wordlists/', customPayloadsDir: '/opt/payloads/', outputDir: '/opt/phantom/output/', logsDir: '/opt/phantom/logs/', tempDir: '/tmp/phantom/',
  },
  recon: { maxSubdomains: 1000, dnsTimeout: 5, enablePassiveSources: true, enableBruteForce: true, bruteForceWordlist: 'subdomains.txt', shodanEnabled: true, censysEnabled: false, securitytrailsEnabled: false, alienvaultEnabled: false, greynoiseEnabled: false, hibpEnabled: true, subfinderThreads: 50, amassWordlist: '', dnsxRetries: 2, httpProbe: true, screenshotSubdomains: false, subdomainTakeoverCheck: true },
  scanner: { defaultPorts: '1-1000', scanSpeed: 'aggressive', osDetection: true, serviceVersion: true, scriptScan: true, udpScan: false, maxRetries: 2, minRate: 100, maxRate: 1000, hostTimeout: 300, pingScan: true, traceroute: true, customNmapArgs: '', scriptArgs: '', vulnScripts: ['smb-vuln-*', 'http-vuln-*'], safeScriptsOnly: true },
  vulns: { cvssThreshold: 7.0, autoUpdateCveDb: true, cveDbUrl: 'https://nvd.nist.gov/feeds/json/cve/1.1/', enableNuclei: true, nucleiTemplateDir: '/opt/nuclei-templates/', nucleiTags: ['cve', 'vulnerability'], nucleiSeverity: ['critical', 'high'], enableOpenVAS: false, openvasHost: '127.0.0.1', openvasPort: 9390, openvasUsername: 'admin', openvasPassword: '', enableNessus: false, nessusApiUrl: '', nessusApiKey: '', vulnCheckTimeout: 300 },
  exploit: { defaultPayload: 'linux/x64/meterpreter/reverse_tcp', metasploitRpcHost: '127.0.0.1', metasploitRpcPort: 55553, metasploitRpcPassword: '', autoMigrate: true, autoPrivEsc: false, defaultListenerPort: 4444, defaultListenerHost: '0.0.0.0', payloadEncoder: 'x64/xor_dynamic', payloadIterations: 5, payloadFormat: 'raw', stageEncoder: '', disablePayloadStaging: false },
  post: { defaultLootDir: '/opt/phantom/loot/', enableKeylogger: false, screenshotQuality: 80, hashdumpFormat: 'hashcat', mimikatzCommand: 'privilege::debug sekurlsa::logonpasswords exit', enablePersistence: true, persistenceMethod: 'registry', cleanupAfter: true, enableTimestomp: false, enableProxyChains: true, socksPort: 1080 },
  intruder: { defaultAttackType: 'cluster_bomb', defaultThreads: 25, defaultDelay: 0, followRedirects: true, encodePayloads: true, maxCombinations: 1000000, grepExtractEnabled: true, grepRegexes: ['"token":"([a-zA-Z0-9_\\-\\.]+)"'], matchStatusCode: [200], matchLength: [], excludeStatusCode: [404, 403], excludeLength: [0], payloadProcessingRules: ['url-encode', 'add-suffix'], attackTimeout: 3600 },
  webapp: { crawlDepth: 3, crawlMaxPages: 500, concurrentRequests: 10, detectWaf: true, scanXss: true, scanSql: true, scanLfi: true, scanSsti: true, scanCmis: true, scanOpenRedirect: true, xssPolyglotLevel: 'medium', xssPayloadFile: '/opt/payloads/xss.txt', sqlPayloadFile: '/opt/payloads/sqli.txt', customHeaders: { 'X-Forwarded-For': '127.0.0.1' }, cookieJar: true, followRobots: true, userAgentRotate: true },
  decoder: { defaultOutputFormat: 'raw', showLineNumbers: true, maxInputLength: 50000, autoDetectEncoding: true, highlightMatches: true, jwtAutoDecode: true, urlAutoDecode: true, htmlEntityDecode: true },
  sqli: { sqlmapLevel: 2, sqlmapRisk: 2, sqlmapThreads: 10, timeBasedDelay: 5, enableNosql: true, enableXss: true, sqlmapTamper: ['space2comment', 'between'], sqlmapDbms: 'MySQL', sqlmapOs: 'Linux', sqlmapTechnique: 'BEUSTQ', sqlmapBatch: true, sqlmapRandomAgent: true, sqlmapProxy: '', sqlmapTor: false },
  forensics: { maxFileSize: '100MB', entropyThreshold: 7.2, yaraRulesDir: '/opt/yara/rules/', enableStrings: true, enablePcapParsing: true, enableMemoryAnalysis: true, volatilityProfile: 'Win10x64', volatilityPlugins: ['pslist', 'netscan', 'hivelist'], stringsMinLength: 4, peParserDeep: true, elfParserDeep: true, extractIocs: true, iocExportFormat: 'stix' },
  malware: { sandboxType: 'cuckoo', sandboxApiUrl: 'http://localhost:8090', sandboxApiKey: '', analysisTimeout: 120, enableMemoryDump: true, enableNetworkCapture: true, enableScreenCapture: false, enableFileExtraction: true, maxSampleSize: 50, supportedFileTypes: ['exe', 'dll', 'elf', 'pdf', 'doc', 'js'], yaraScanOnUpload: true, staticAnalysis: true, dynamicAnalysis: true },
  sniffer: { defaultInterface: 'eth0', snaplen: 1518, promiscuous: true, enableDnsSpoof: false, enableArpSpoof: false, pcapOutputDir: '/opt/phantom/pcaps/', maxPcapSize: '100MB', ringBuffer: true, ringBufferFiles: 5, captureFilter: '', decodeApplicationLayer: true, followStream: true, extractCredentials: true, alertOnC2: true, c2IocList: ['c2.evil.com', '45.33.32.156'] },
  cracking: { defaultHashcatMode: 1000, gpuEnabled: true, wordlistDefault: 'rockyou.txt', rulesDefault: 'best64.rule', autosaveInterval: 60, hashcatWorkload: 3, hashcatForce: false, hashcatOptimizedKernel: true, maskAttackCustom: '?l?l?d?d', incrementMin: 1, incrementMax: 8, customCharset1: 'abcdefghijklmnopqrstuvwxyz', customCharset2: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', customCharset3: '0123456789', customCharset4: '!@#$%^&*', potfilePath: '/opt/phantom/hashcat.potfile', outfileFormat: 'hash:plain', showCracked: true, removeFound: true },
  phishing: { smtpServer: 'smtp.corp.com', smtpPort: 587, smtpEncryption: 'STARTTLS', smtpUsername: '', smtpPassword: '', fromEmail: 'noreply@phantom.local', fromName: 'IT Security', landingDomain: 'phish.phantom.local', evilginxEnabled: false, evilginxPath: '/opt/evilginx/evilginx', evilginxDomain: 'office-login.xyz', evilginxRedirectUrl: 'https://login.microsoftonline.com', evilginxPhishletsDir: '/opt/evilginx/phishlets', trackOpens: true, trackClicks: true, captureHeaders: true, captureIp: true, captureUserAgent: true, emailTemplateDir: '/opt/phantom/templates/email', landingPageDir: '/opt/phantom/templates/landing', credentialExportFormat: 'csv' },
  cloud: { awsProfile: 'default', awsRegion: 'us-east-1', awsAccessKey: '', awsSecretKey: '', gcpProject: '', gcpCredentialsPath: '', azureSubscription: '', azureTenantId: '', azureClientId: '', azureClientSecret: '', enableComplianceScan: true, iamScanDepth: 3, s3BucketScan: true, ec2InstanceScan: true, rdsScan: true, lambdaScan: true, k8sScan: true, gkeClusterScan: false, aksClusterScan: false, complianceFrameworks: ['cis', 'pci'] },
  report: { defaultTemplate: 'pentest_standard', companyName: 'Corp, Inc.', companyLogo: '', authorName: 'Red Team Alpha', authorEmail: 'redteam@phantom.local', includeCharts: true, includeRawData: false, passwordProtect: false, pdfPassword: '', watermark: 'CONFIDENTIAL', confidentialityLevel: 'CONFIDENTIAL', language: 'en', outputFormat: 'pdf', autoGenerate: false, emailReport: false, emailRecipients: [] },
  ai: { provider: 'openai', apiKey: '', apiUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4-turbo', maxTokens: 4000, temperature: 0.7, topP: 1, frequencyPenalty: 0, presencePenalty: 0, contextEnabled: true, contextWindow: 8000, customPrompt: '', streamOutput: false, cacheResponses: true },
  collab: { serverUrl: 'wss://collab.phantom.local', serverApiKey: '', enablePushNotifications: true, sessionSharingTimeout: 3600, maxFileUploadSize: '50MB', allowedFileTypes: ['txt', 'pcap', 'json', 'csv', 'zip'], chatHistoryRetention: 30, enableEndToEndEncryption: false, encryptionKey: '', selfHosted: true, redisHost: 'localhost', redisPort: 6379, websocketPort: 8080 },
  c2: { defaultListener: 'https', c2ServerUrl: 'https://c2.phantom.local', c2ApiKey: '', jitter: 30, beaconInterval: 60, encrypted: true, encryptionAlgorithm: 'aes-256-gcm', killDate: '2025-12-31', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', sleepJitter: 20, callbackRetries: 3, callbackJitter: 10, hostHeader: 'cloudflare.com', customProfile: 'default', sslCertificate: '', sslKey: '' },
  logging: { logLevel: 'info', logFile: '/opt/phantom/logs/phantom.log', maxLogSize: '100MB', enableAudit: true, enableDebug: false, logToConsole: true, jsonFormat: false, syslogEnabled: false, syslogHost: 'localhost', syslogPort: 514, logRetentionDays: 30 },
})

// Helper để cập nhật nested settings
const updateSetting = <K extends keyof SettingsState>(section: K, key: string, value: any) => {
  setSettings(prev => ({
    ...prev,
    [section]: { ...prev[section], [key]: value }
  }))
}

// ============================================================================
// 3. UI COMPONENTS (đa dạng)
// ============================================================================

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">{children}</div>
)
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />

function ToggleSwitch({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[10px] text-[#c5cfe0]">{label}</span>}
      <div onClick={onToggle} className={cn('w-7 h-3.5 rounded-full relative cursor-pointer transition-colors shrink-0', enabled ? 'bg-green-500' : 'bg-[#252e42]')}>
        <div className={cn('w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-all', enabled ? 'left-4' : 'left-0.5')} />
      </div>
    </div>
  )
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111520] border border-[#1e2535] rounded-lg p-3 mb-3">
      <div className="text-[11px] font-bold text-cyan-400 mb-3 border-b border-[#1e2535] pb-1.5">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function SettingsRow({ label, children, description }: { label: string; children: React.ReactNode; description?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-1.5 border-b border-[#1e2535]/40 last:border-0">
      <div className="sm:w-44 shrink-0">
        <span className="text-[10.5px] font-semibold text-[#c5cfe0]">{label}</span>
        {description && <div className="text-[9px] text-[#3d4a61]">{description}</div>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

// ============================================================================
// 4. CÁC TAB (mỗi tab là một phần cài đặt lớn)
// ============================================================================

function TabGeneral() {
  const g = settings.general
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <SettingsSection title="Appearance">
        <SettingsRow label="Theme"><select className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-1" value={g.theme} onChange={e => updateSetting('general', 'theme', e.target.value)}><option>dark</option><option>light</option><option>oled</option></select></SettingsRow>
        <SettingsRow label="Font size"><input type="number" className="w-20" value={g.fontSize} onChange={e => updateSetting('general', 'fontSize', parseInt(e.target.value))} /> px</SettingsRow>
        <SettingsRow label="Font family"><select className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-1" value={g.fontFamily} onChange={e => updateSetting('general', 'fontFamily', e.target.value)}><option>JetBrains Mono</option><option>Fira Code</option><option>Courier New</option></select></SettingsRow>
        <SettingsRow label="Show timestamps"><ToggleSwitch enabled={g.timestamps} onToggle={() => updateSetting('general', 'timestamps', !g.timestamps)} /></SettingsRow>
        <SettingsRow label="Enable animations"><ToggleSwitch enabled={g.animations} onToggle={() => updateSetting('general', 'animations', !g.animations)} /></SettingsRow>
        <SettingsRow label="Hardware acceleration"><ToggleSwitch enabled={g.hardwareAcceleration} onToggle={() => updateSetting('general', 'hardwareAcceleration', !g.hardwareAcceleration)} /></SettingsRow>
        <SettingsRow label="Language"><select className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-1" value={g.language} onChange={e => updateSetting('general', 'language', e.target.value)}><option>en</option><option>vi</option><option>zh</option></select></SettingsRow>
      </SettingsSection>
      <SettingsSection title="Behavior">
        <SettingsRow label="Auto‑save settings"><ToggleSwitch enabled={g.autoSave} onToggle={() => updateSetting('general', 'autoSave', !g.autoSave)} /></SettingsRow>
        <SettingsRow label="Auto‑save interval (sec)"><input type="number" className="w-24" value={g.autoSaveInterval} onChange={e => updateSetting('general', 'autoSaveInterval', parseInt(e.target.value))} /></SettingsRow>
        <SettingsRow label="Confirm exit"><ToggleSwitch enabled={g.confirmExit} onToggle={() => updateSetting('general', 'confirmExit', !g.confirmExit)} /></SettingsRow>
        <SettingsRow label="Show splash screen"><ToggleSwitch enabled={g.showSplash} onToggle={() => updateSetting('general', 'showSplash', !g.showSplash)} /></SettingsRow>
        <SettingsRow label="Anonymous telemetry"><ToggleSwitch enabled={g.telemetry} onToggle={() => updateSetting('general', 'telemetry', !g.telemetry)} /></SettingsRow>
      </SettingsSection>
    </div>
  )
}

function TabNetwork() {
  const n = settings.network
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <SettingsSection title="Interfaces & Tunneling">
        <SettingsRow label="TUN interface"><input className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-1" value={n.tunInterface} onChange={e => updateSetting('network', 'tunInterface', e.target.value)} /></SettingsRow>
        <SettingsRow label="LHOST (callback)"><input className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-1" value={n.lhost} onChange={e => updateSetting('network', 'lhost', e.target.value)} /></SettingsRow>
        <SettingsRow label="Default LPORT"><input type="number" className="w-24" value={n.lport} onChange={e => updateSetting('network', 'lport', parseInt(e.target.value))} /></SettingsRow>
        <SettingsRow label="Force IPv4"><ToggleSwitch enabled={n.forceIPv4} onToggle={() => updateSetting('network', 'forceIPv4', !n.forceIPv4)} /></SettingsRow>
        <SettingsRow label="Force IPv6"><ToggleSwitch enabled={n.forceIPv6} onToggle={() => updateSetting('network', 'forceIPv6', !n.forceIPv6)} /></SettingsRow>
        <SettingsRow label="Bind to interface"><input className="bg-[#0f1319] border border-[#252e42] rounded px-2 py-1" placeholder="eth0" value={n.interfaceBinding} onChange={e => updateSetting('network', 'interfaceBinding', e.target.value)} /></SettingsRow>
      </SettingsSection>
      <SettingsSection title="Proxies & TOR">
        <SettingsRow label="Enable global proxy"><ToggleSwitch enabled={n.proxyEnabled} onToggle={() => updateSetting('network', 'proxyEnabled', !n.proxyEnabled)} /></SettingsRow>
        {n.proxyEnabled && (
          <>
            <SettingsRow label="Proxy type">
              <select value={n.proxyType} onChange={e => updateSetting('network', 'proxyType', e.target.value)}>
                <option>socks5</option><option>http</option><option>https</option>
              </select>
            </SettingsRow>
            <SettingsRow label="Proxy host">
              <input value={n.proxyHost} onChange={e => updateSetting('network', 'proxyHost', e.target.value)} />
            </SettingsRow>
            <SettingsRow label="Proxy port">
              <input type="number" value={n.proxyPort} onChange={e => updateSetting('network', 'proxyPort', parseInt(e.target.value))} />
            </SettingsRow>
            <SettingsRow label="Authentication">
              <ToggleSwitch enabled={n.proxyAuth} onToggle={() => updateSetting('network', 'proxyAuth', !n.proxyAuth)} />
            </SettingsRow>
            {n.proxyAuth && (
              <>
                <SettingsRow label="Username">
                  <input value={n.proxyUsername} onChange={e => updateSetting('network', 'proxyUsername', e.target.value)} />
                </SettingsRow>
                <SettingsRow label="Password">
                  <input type="password" value={n.proxyPassword} onChange={e => updateSetting('network', 'proxyPassword', e.target.value)} />
                </SettingsRow>
              </>
            )}
          </>
        )}
        <SettingsRow label="Enable TOR"><ToggleSwitch enabled={n.torEnabled} onToggle={() => updateSetting('network', 'torEnabled', !n.torEnabled)} /></SettingsRow>
        <SettingsRow label="TOR proxy URL"><input className="flex-1" value={n.torProxy} onChange={e => updateSetting('network', 'torProxy', e.target.value)} /></SettingsRow>
      </SettingsSection>
      <SettingsSection title="HTTP & DNS">
        <SettingsRow label="User-Agent"><input className="flex-1" value={n.userAgent} onChange={e => updateSetting('network', 'userAgent', e.target.value)} /></SettingsRow>
        <SettingsRow label="Timeout (sec)"><input type="number" className="w-24" value={n.timeout} onChange={e => updateSetting('network', 'timeout', parseInt(e.target.value))} /></SettingsRow>
        <SettingsRow label="Max retries"><input type="number" className="w-24" value={n.maxRetries} onChange={e => updateSetting('network', 'maxRetries', parseInt(e.target.value))} /></SettingsRow>
        <SettingsRow label="DNS servers"><input className="flex-1" value={n.dnsServers.join(', ')} onChange={e => updateSetting('network', 'dnsServers', e.target.value.split(',').map(s=>s.trim()))} /></SettingsRow>
      </SettingsSection>
    </div>
  )
}

function TabAPIKeys() {
  const keys = settings.apiKeys
  const entries = Object.entries(keys).map(([k, v]) => ({ label: k, value: v }))
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <SettingsSection title="External API Credentials">
        {entries.map(({ label, value }) => (
          <SettingsRow key={label} label={label}>
            <input type="password" className="flex-1 font-mono" value={value} onChange={e => updateSetting('apiKeys', label, e.target.value)} placeholder={`Enter ${label} API key`} />
          </SettingsRow>
        ))}
      </SettingsSection>
    </div>
  )
}

function TabToolPaths() {
  const paths = settings.toolPaths
  const entries = Object.entries(paths)
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e]">
      <SettingsSection title="Executable & Directory Paths">
        {entries.map(([name, path]) => (
          <SettingsRow key={name} label={name}>
            <input className="flex-1 font-mono text-[10px]" value={path} onChange={e => updateSetting('toolPaths', name, e.target.value)} />
          </SettingsRow>
        ))}
      </SettingsSection>
    </div>
  )
}

function TabRecon() { /* chi tiết như trên, nhưng ngắn gọn để giảm độ dài bài viết */ return <div className="p-3 text-[#6b7a96]">Recon module settings (expanded similarly)</div> }
function TabScanner() { return <div className="p-3 text-[#6b7a96]">Scanner module settings</div> }
function TabVulns() { return <div className="p-3 text-[#6b7a96]">Vulns module settings</div> }
function TabExploit() { return <div className="p-3 text-[#6b7a96]">Exploit module settings</div> }
function TabPost() { return <div className="p-3 text-[#6b7a96]">Post‑Exploit settings</div> }
function TabIntruder() { return <div className="p-3 text-[#6b7a96]">Intruder settings</div> }
function TabWebapp() { return <div className="p-3 text-[#6b7a96]">Web App settings</div> }
function TabDecoder() { return <div className="p-3 text-[#6b7a96]">Decoder settings</div> }
function TabSqli() { return <div className="p-3 text-[#6b7a96]">SQLi settings</div> }
function TabForensics() { return <div className="p-3 text-[#6b7a96]">Forensics settings</div> }
function TabMalware() { return <div className="p-3 text-[#6b7a96]">Malware Sandbox settings</div> }
function TabSniffer() { return <div className="p-3 text-[#6b7a96]">Sniffer settings</div> }
function TabCracking() { return <div className="p-3 text-[#6b7a96]">Cracking settings</div> }
function TabPhishing() { return <div className="p-3 text-[#6b7a96]">Phishing settings</div> }
function TabCloud() { return <div className="p-3 text-[#6b7a96]">Cloud settings</div> }
function TabReport() { return <div className="p-3 text-[#6b7a96]">Report settings</div> }
function TabAI() { return <div className="p-3 text-[#6b7a96]">AI settings</div> }
function TabCollab() { return <div className="p-3 text-[#6b7a96]">Collaboration settings</div> }
function TabC2() { return <div className="p-3 text-[#6b7a96]">C2 settings</div> }
function TabLogging() { return <div className="p-3 text-[#6b7a96]">Logging settings</div> }

// ============================================================================
// 5. MAIN EXPORT – với rất nhiều tab
// ============================================================================

const TABS = [
  'General', 'Network', 'API Keys', 'Tool Paths',
  'Recon', 'Scanner', 'Vulns', 'Exploit', 'Post', 'Intruder', 'Webapp', 'Decoder',
  'SQLi', 'Forensics', 'Malware', 'Sniffer', 'Cracking', 'Phishing', 'Cloud',
  'Report', 'AI', 'Collab', 'C2', 'Logging'
] as const

export function ViewSettings() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0])
  const [saved, setSaved] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleSave = () => {
    // Giả lập lưu (thực tế gọi API hoặc localStorage)
    localStorage.setItem('phantom_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'phantom_settings_backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        setSettings(prev => ({ ...prev, ...imported }))
        setImporting(true)
        setTimeout(() => setImporting(false), 2000)
      } catch (err) { alert('Invalid settings file') }
    }
    reader.readAsText(file)
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'General': return <TabGeneral />
      case 'Network': return <TabNetwork />
      case 'API Keys': return <TabAPIKeys />
      case 'Tool Paths': return <TabToolPaths />
      case 'Recon': return <TabRecon />
      case 'Scanner': return <TabScanner />
      case 'Vulns': return <TabVulns />
      case 'Exploit': return <TabExploit />
      case 'Post': return <TabPost />
      case 'Intruder': return <TabIntruder />
      case 'Webapp': return <TabWebapp />
      case 'Decoder': return <TabDecoder />
      case 'SQLi': return <TabSqli />
      case 'Forensics': return <TabForensics />
      case 'Malware': return <TabMalware />
      case 'Sniffer': return <TabSniffer />
      case 'Cracking': return <TabCracking />
      case 'Phishing': return <TabPhishing />
      case 'Cloud': return <TabCloud />
      case 'Report': return <TabReport />
      case 'AI': return <TabAI />
      case 'Collab': return <TabCollab />
      case 'C2': return <TabC2 />
      case 'Logging': return <TabLogging />
      default: return null
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModuleTabBar
        tabs={TABS}
        active={activeTab}
        onTabChange={setActiveTab}
        activeColor="text-amber-400 border-amber-400 bg-amber-500/5"
      />
      <Toolbar>
        <ToolbarButton variant="green" onClick={handleSave}>{saved ? '✓ Saved' : 'Save Changes'}</ToolbarButton>
        <ToolbarButton variant="cyan" onClick={handleExport}>Export Settings</ToolbarButton>
        <label className="px-2.5 py-1 bg-[#111520] border border-[#252e42] rounded text-[10px] font-semibold cursor-pointer hover:bg-[#161b26]">
          Import Settings
          <input type="file" accept=".json" className="hidden" onChange={handleImport} />
        </label>
        <ToolbarButton variant="red" onClick={() => window.location.reload()}>Restart Required</ToolbarButton>
        <TbSep />
        {importing && <span className="text-green-400 text-[10px]">✓ Imported</span>}
        <span className="text-[10px] text-[#3d4a61] ml-auto">Version 2.5.0 – Changes may require restart</span>
      </Toolbar>
      {renderTab()}
    </div>
  )
}