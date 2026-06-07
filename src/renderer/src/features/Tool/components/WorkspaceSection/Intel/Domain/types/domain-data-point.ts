/**
 * Domain-specific DataCategory extensions.
 * Reuses the base DataPoint type from Person module.
 */
import type { DataCategory as BaseDataCategory } from '../../Person/types/data-point';

// Re-export base categories that apply to Domain
export type { DataPoint, DataSource, SourceType } from '../../Person/types/data-point';

/**
 * Domain-specific data categories.
 * Extends the base categories with domain RECON specific ones.
 */
export type DomainDataCategory =
  | BaseDataCategory
  // WHOIS & Registration
  | 'whois_domain_name'
  | 'whois_registrar'
  | 'whois_registry'
  | 'whois_creation_date'
  | 'whois_expiration_date'
  | 'whois_updated_date'
  | 'whois_status'
  | 'whois_nameserver'
  | 'whois_registrant'
  | 'whois_admin_contact'
  | 'whois_tech_contact'
  | 'whois_raw'
  | 'whois_historical'
  // DNS Records
  | 'dns_a_record'
  | 'dns_aaaa_record'
  | 'dns_mx_record'
  | 'dns_ns_record'
  | 'dns_soa_record'
  | 'dns_txt_record'
  | 'dns_cname_record'
  | 'dns_srv_record'
  | 'dns_ptr_record'
  | 'dns_caa_record'
  | 'dns_ds_record'
  | 'dns_dnskey_record'
  | 'dns_historical'
  // Subdomains
  | 'subdomain'
  | 'subdomain_takeover'
  | 'subdomain_wildcard'
  | 'subdomain_internal'
  | 'subdomain_cname'
  // Certificate Transparency
  | 'certificate'
  | 'cert_issuer'
  | 'cert_domains'
  | 'cert_validity'
  | 'cert_transparency_log'
  // Infrastructure
  | 'asn'
  | 'cidr_range'
  | 'reverse_ip'
  | 'hosting_provider'
  | 'cloud_provider'
  | 'geo_location'
  | 'bgp_prefix'
  | 'peer_networks'
  // Sensitive Exposure
  | 'env_exposure'
  | 'git_exposure'
  | 'backup_file'
  | 'config_file'
  | 'exposed_api_key'
  | 'exposed_secret_token'
  | 'firebase_config'
  | 'public_s3_bucket'
  | 'database_dump'
  | 'log_file'
  | 'source_code_exposure'
  | 'debug_endpoint'
  | 'admin_panel'
  | 'phpinfo_exposure'
  // Technology Stack
  | 'tech_framework'
  | 'tech_cms'
  | 'tech_server'
  | 'tech_cdn'
  | 'tech_analytics'
  | 'tech_javascript'
  | 'tech_ssl'
  | 'tech_header'
  | 'tech_cookie'
  // Email Harvesting
  | 'harvested_email'
  | 'email_pattern'
  | 'catch_all_email'
  // OSINT
  | 'google_dork'
  | 'wayback_snapshot'
  | 'social_mention'
  | 'news_mention'
  | 'forum_mention'
  | 'employee_name'
  | 'employee_email'
  | 'employee_position'
  | 'public_document'
  | 'file_metadata'
  | 'mobile_app'
  // Network
  | 'open_port'
  | 'service_banner'
  | 'http_response'
  | 'ssl_certificate_chain'
  | 'cors_header'
  | 'security_header'
  // Related domains
  | 'related_domain'
  | 'sibling_domain'
  | 'parked_domain';