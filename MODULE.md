### Nhóm 1: OSINT & Reconnaissance (gộp 5 module OSINT + Recon cũ)

#### 1. **OSINT**
- **People & Social** – tìm username, email, ảnh, metadata, face recognition, social graph.
- **Code & Digital Footprint** – GitHub/GitLab, token leak, commit history, subdomain takeover.
- **Breach & Dark Web** – HIBP, Dehashed, pastebin, darknet markets, leak database.
- **WHOIS / DNS / Cert** – lịch sử WHOIS, crt.sh, subdomain enumeration, bucket public.
- **IoT / Shodan** – quét thiết bị, CVE theo device, default creds.
- **Geo / Phone** – IP geolocation, ảnh GPS, số điện thoại (carrier, WhatsApp, OTP brute).

#### 2. **Recon – Mục tiêu chủ động**
- Quét port (RustScan + Nmap), service, product, version.
- Nuclei + Nikto phát hiện CVE, misconfig.
- Traceroute, OS fingerprint, risk score.
- Hiển thị tất cả vulnerabilities tìm được từ scan.


---

### Nhóm 2: Tấn công & Khai thác

#### 3. **Exploit**
- Exploit suggester (Log4Shell, EternalBlue, MS17-010… theo CVE, EPSS).
- Payload generator (msfvenom, encoder, listener).
- Metasploit console mô phỏng.
- Quản lý session (interact, background, kill, upgrade).

#### 4. **Post-Exploit**
- System info, file browser (highlight sensitive), processes, credentials (hashdump, mimikatz).
- Persistence (Registry Run, scheduled task, service, WMI).
- Lateral movement (PTH, WMI, PsExec, SSH, WinRM).
- Pivot (SOCKS, port forwarding).

#### 5. **C2 & Collaboration** (gộp C2 + Collab cũ)
- Sessions (meterpreter, ssh…), Arsenal (wordlists, CVE DB), Vault (credentials).
- War Room (operator graph, heatmap, kill score).
- Comms (chat mã hóa, share session/file).
- Activity log (filter theo severity).

---

### Nhóm 3: Tấn công Web & Ứng dụng

#### 6. **Web Injection**
- SQLMap (full: detect, dump, tamper).
- XSS, SSTI, LFI, CMDi, XXE, NoSQLi, SSRF.
- Payload library với success rate.
- Real-time log, dump output.

#### 7. **Fuzzing & Intruder**
- Attack modes (Sniper, Battering Ram, Pitchfork, Cluster Bomb).
- Payload sets & processing (encode, hash, prefix/suffix).
- Match/grep rules, status code stats, sparkline.
- Real-time log, ETA, req/sec.

---

### Nhóm 4: Mật khẩu & Bẻ khóa

#### 8. **Cracking**
- Hash input (thủ công, file, từ Vault).
- Hashcat config (attack mode, wordlist, rule, GPU).
- GPU status (NVIDIA/AMD), real-time speed/ETA.
- Online lookup (CrackStation, MD5Decrypt).
- Kết quả → export Vault.

---

### Nhóm 5: Mạng & Thiết bị

#### 9. **Network Attack** (gộp Sniffer + MITM + Wireless)
- Packet capture & decode (BPF, highlight C2 beacon).
- ARP spoofing / MITM (capture HTTP Basic, NTLMv2, cookie).
- WiFi (quét AP, deauth, capture handshake, cracking).
- Bluetooth (quét, sniff, inject).
- PCAP export, real-time alerts.

#### 10. **Cloud & Container**
- AWS (S3, IAM, EC2, RDS), GCP, Azure.
- Kubernetes (outdated, anon auth, privileged pods, RBAC).
- IAM analysis, Compliance (CIS, PCI DSS).

#### 11. **SCADA / ICS**
- Quét Modbus, DNP3, S7, BACnet.
- Đọc/ghi coil, holding register.
- Tìm PLC/HMI mặc định, tải ladder logic.

---

### Nhóm 6: Malware & Reverse Engineering

#### 12. **Malware Analysis**
- Process tree, network (C2, DGA), YARA scan.
- Strings phân loại, memory regions (RWX, injected).
- Tích hợp VirusTotal, Any.Run.

#### 13. **Malware Builder & Decryptor**
- Tạo keylogger, ransomware, worm, dropper (tùy chọn persistence, anti-VM).
- Bypass AV/EDR (obfuscation, syscall, AMSI bypass).
- Giải mã ransomware (tìm key, decrypt file).

#### 14. **Reverse Engineering**
- Disassembler (Ghidra/IDA style) – pseudocode, patch binary.
- Unpacker tự động (UPX, ASPack, Themida).
- Decryption suite (Base64, AES, XOR, bruteforce key yếu).
- Steganography (phát hiện/giấu trong ảnh, audio).

---

### Nhóm 7: Pháp y & Điều tra

#### 15. **Forensics**
- Hex view, strings extraction (PE, ELF).
- PCAP analysis độc lập (không qua sniffer).
- Memory analysis (memory dump từ máy nạn nhân, không phải malware).
- Timeline (process, file, registry, network).
- YARA scan trên disk image.

---

### Nhóm 8: Phishing & Social Engineering

#### 16. **Phishing**
- Quản lý campaign (sent, opened, clicked, creds).
- Email templates (HTML, test gửi).
- Clone landing page (Office 365, VPN, SharePoint).
- Evilginx integration (capture MFA, session token).
- Theo dõi tracking (open, click, submit).
- Sync harvested creds → Vault.

---

### Nhóm 9: Hardware & Mobile

#### 17. **Hardware Hacking**
- Firmware extraction (binwalk, QEMU emulation).
- JTAG/SWD, UART, SPI (debug, dump flash).
- Side-channel (nếu có thiết bị).

#### 18. **Mobile Hacking**
- APK/IPA decompile (jadx, apktool).
- Frida instrumentation (hook, bypass SSL/root).
- ADB attack (screencap, logcat, shell).
- iOS (non-jailbreak, keychain).

---

### Nhóm 10: Tự động hóa & Quản lý

#### 19. **Orchestration Engine** (pipeline auto)
- Workflow kéo thả (Recon → Exploit → Post → Report).
- Trigger sự kiện (subdomain mới, CVE mới, leak mới).
- Parallel tasks, state machine, auto-retry.
- Vẫn có manual override cho từng bước.

#### 20. **Vulnerability Intelligence** (tách từ Vulns cũ)
- Danh sách CVE (CVSS, EPSS, in-the-wild).
- Tìm kiếm CVE theo product/version.
- Gợi ý exploit dựa trên EPSS.
- Dashboard: severity distribution, top vulnerabilities.

#### 21. **Reporting & Integration**
- Report builder (chọn sections, live preview).
- Export PDF/DOCX/HTML/JSON (password protect).
- Auto-fill findings từ các module.
- Compliance mapping (PCI DSS, HIPAA, ISO 27001).
- Tích hợp bot (Matrix, Discord, Telegram).

#### 22. **Knowledge Base & Assistant**
- Lưu TTPs (MITRE ATT&CK) đã dùng thành công.
- Gợi ý kỹ thuật tấn công dựa trên OSINT.
- Command runner đa phiên (SSH, WinRM, meterpreter…).
- AI assistant (gợi ý lệnh, tóm tắt log – optional).