/**
 * IP-specific DataCategory extensions.
 */

/**
 * IP-specific data categories for port scanning, reverse IP, BGP, threat intel, etc.
 */
export type IpDataCategory =
  // Ports & Services (Shodan / Censys)
  | 'open_port'
  | 'service'
  | 'service_banner'
  | 'service_version'
  | 'http_response'
  | 'ssl_certificate'
  | 'tls_version'
  | 'tls_cipher'
  // Reverse IP / Hosted Domains
  | 'hosted_domain'
  | 'related_domain'
  | 'unrelated_domain'
  | 'primary_domain'
  // Geolocation
  | 'geoip_country'
  | 'geoip_city'
  | 'geoip_region'
  | 'geoip_coordinates'
  | 'geoip_isp'
  | 'geoip_timezone'
  | 'geoip_usage_type'
  // BGP / ASN
  | 'bgp_asn'
  | 'bgp_prefix'
  | 'bgp_peer'
  | 'bgp_upstream'
  | 'bgp_origin'
  // SSL Certificates (IP-based)
  | 'cert_ip_issuer'
  | 'cert_ip_domains'
  | 'cert_ip_validity'
  | 'cert_ip_san'
  // Threat Intelligence
  | 'threat_report'
  | 'malware_association'
  | 'phishing_association'
  | 'c2_communication'
  | 'scanner_activity'
  | 'brute_force'
  | 'ddos_participant'
  // Abuse Reports
  | 'abuse_report'
  | 'spam_report'
  | 'fraud_report'
  | 'hacking_report'
  // Spam / Block Lists
  | 'spam_listing'
  | 'exploit_listing'
  | 'policy_listing'
  // Noise Intelligence (GreyNoise)
  | 'noise_classification'
  // Malware URLs
  | 'malware_url'
  // Reputation
  | 'reputation_score'
  | 'reputation_volume'
  // Mentions
  | 'social_mention'
  | 'forum_mention'
  | 'darkweb_mention'
  // Index Pages (CommonCrawl)
  | 'indexed_page'
  // Passive DNS
  | 'passive_dns_domain'
  // Scan Reports (Shadowserver)
  | 'scan_report'
  // Generic
  | 'other'
  | 'unclassified';