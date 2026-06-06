# RECON Targets & Data Mapping

## Mục lục

* [1. Domain](#1-domain)
* [2. IP / Server](#2-ip--server)
* [3. Website / Web Application](#3-website--web-application)
* [4. Organization / Company](#4-organization--company)
* [5. Person](#5-person)
* [6. Source Code / Repository](#6-source-code--repository)

---

# 1. Domain

## 1.1 Domain Identity

* Domain name
* Registrar
* Registry
* Creation date
* Expiration date
* Updated date
* Domain status
* WHOIS raw
* Nameserver
* DNSSEC
* TLD
* Registrar abuse contact

---

## 1.2 DNS Data

* A Record
* AAAA Record
* MX Record
* TXT Record
* SPF
* DKIM
* DMARC
* NS Record
* CNAME
* SOA
* PTR
* SRV
* CAA

---

## 1.3 Subdomain Enumeration

* API subdomain
* Admin subdomain
* Dev subdomain
* Staging subdomain
* VPN subdomain
* Mail subdomain
* CDN subdomain
* Internal subdomain
* Wildcard subdomain
* Orphan subdomain

---

## 1.4 Infrastructure Mapping

* IP Address
* IPv6
* ASN
* Hosting Provider
* Cloud Provider
* CDN
* WAF
* Reverse Proxy
* Load Balancer
* Reverse IP
* CIDR Range
* Geo Location

---

## 1.5 Service Enumeration

* Open Port
* Protocol
* Service Name
* Service Banner
* Version
* SSL/TLS
* Cipher Suite
* Certificate
* HTTP Response
* Expired Certificate

---

## 1.6 Web Surface Discovery

* Website
* Login Page
* Admin Panel
* API Endpoint
* GraphQL Endpoint
* Swagger/OpenAPI
* WebSocket
* Upload Endpoint
* Hidden Directory
* robots.txt
* sitemap.xml
* JS Files
* Source Map
* File Listing
* Redirect
* Error Page

---

## 1.7 Technology Fingerprinting

* Web Server
* Backend Language
* Frontend Framework
* CMS
* Runtime
* Database Hint
* Analytics
* CDN Technology
* Tag Manager
* Package Leak

---

## 1.8 Vulnerability Surface

* CVE
* Missing Security Headers
* Weak TLS
* Open Redirect
* XSS
* SQL Injection
* SSRF
* LFI/RFI
* IDOR
* Default Credential
* Exposed Admin Panel
* Directory Traversal
* RCE Indicator
* CORS Misconfiguration
* Clickjacking

---

## 1.9 Sensitive Exposure

* .env Exposure
* .git Exposure
* Backup Files
* Config Files
* API Keys
* Secret Tokens
* Firebase Config
* Public S3 Bucket
* Jenkins Exposure
* Kibana Exposure
* Database Dump
* Log Files
* Source Code Exposure

---

## 1.10 OSINT & Organization

* Employee Email
* Phone Number
* GitHub Organization
* LinkedIn Employee
* Social Account
* Breach Data
* Archived URLs
* Public Documents
* Metadata
* Mobile App
* Certificate Transparency
* Internet Mentions

---

# 2. IP / Server

## 2.1 Network Information

* IP Address
* Reverse DNS
* ASN
* CIDR
* GeoIP
* ISP
* Latency
* Packet Loss

---

## 2.2 Port & Service Scan

* Open Ports
* Closed Ports
* Filtered Ports
* Service Detection
* Banner Grabbing
* Version Detection
* Protocol Detection

---

## 2.3 Operating System Detection

* Operating System
* Kernel Version
* Architecture
* Hostname
* Uptime

---

## 2.4 Security Analysis

* CVE
* Weak Cipher
* Weak SSH Config
* Anonymous FTP
* SMB Exposure
* RDP Exposure
* VNC Exposure
* Telnet Exposure

---

## 2.5 Infrastructure Exposure

* Docker Exposure
* Kubernetes Exposure
* Redis Exposure
* Elasticsearch Exposure
* MongoDB Exposure
* PostgreSQL Exposure
* MySQL Exposure

---

# 3. Website / Web Application

## 3.1 Application Structure

* URL Structure
* Endpoint Mapping
* Route Discovery
* API Discovery
* Hidden Paths
* Upload Paths

---

## 3.2 Authentication Surface

* Login Page
* Register Page
* Password Reset
* OAuth
* SSO
* Session Cookie
* JWT
* MFA

---

## 3.3 Client-Side Analysis

* JavaScript Files
* Source Map
* API Calls
* Local Storage
* Session Storage
* WebSocket
* CSP

---

## 3.4 Vulnerability Surface

* XSS
* SQLi
* CSRF
* SSRF
* IDOR
* File Upload Vulnerability
* Open Redirect
* Business Logic Bug

---

## 3.5 Technology Detection

* Frontend Framework
* Backend Framework
* CMS
* Web Server
* Runtime
* CDN
* WAF

---

# 4. Organization / Company

## 4.1 Company Information

* Company Name
* Legal Name
* Address
* Phone Number
* Email
* Industry
* Subsidiary

---

## 4.2 Digital Assets

* Domains
* Subdomains
* Mobile Apps
* Cloud Assets
* GitHub Organization
* Public Repositories

---

## 4.3 Employee Intelligence

* Employee Names
* LinkedIn Profiles
* Public Emails
* Job Positions
* Department Structure

---

## 4.4 External Exposure

* Data Breach
* Credential Leak
* Public Documents
* PDF Metadata
* Press Releases
* Conference Talks

---

# 5. Person

## 5.1 Identity Information

* Full Name
* Alias
* Username
* Nickname
* Avatar

---

## 5.2 Contact Information

* Email
* Phone Number
* Address
* Messenger Account

---

## 5.3 Social Media

* Facebook
* X/Twitter
* Instagram
* LinkedIn
* TikTok
* Reddit
* Discord

---

## 5.4 Technical Footprint

* GitHub
* GitLab
* StackOverflow
* Public Keys
* Domain Ownership
* Repository Contributions

---

## 5.5 Leak & Exposure

* Password Leak
* Credential Leak
* Breach Database
* Pastebin Leak
* Public Documents

---

# 6. Source Code / Repository

## 6.1 Repository Information

* Repository Name
* Owner
* Visibility
* Commit History
* Branches
* Tags
* Releases

---

## 6.2 Developer Information

* Contributor
* Commit Email
* Commit Metadata
* Maintainer

---

## 6.3 Sensitive Exposure

* API Keys
* Secret Tokens
* SSH Keys
* Database Credentials
* Cloud Credentials
* Hardcoded Passwords

---

## 6.4 Infrastructure Information

* CI/CD Config
* Docker Config
* Kubernetes Config
* Terraform
* CloudFormation
* Deployment Script

---

## 6.5 Application Intelligence

* API Endpoint
* Internal URL
* Debug Endpoint
* Feature Flag
* Admin Route
* Hidden Route

---

## 6.6 Dependency Analysis

* package.json
* requirements.txt
* pom.xml
* composer.json
* go.mod
* Cargo.toml
* Vulnerable Dependencies
