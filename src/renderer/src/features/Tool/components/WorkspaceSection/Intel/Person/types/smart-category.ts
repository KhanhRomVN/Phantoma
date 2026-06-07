/**
 * A smart category group for dynamic tab generation.
 * Categories are grouped into tabs based on data availability.
 */
export interface SmartCategoryGroup {
  /** Unique group ID (used as tab key) */
  id: string;
  /** Display label for the tab */
  label: string;
  /** Icon identifier (matches Lucide icon names) */
  icon: string;
  /** Accent color for the tab */
  accent: string;
  /** Data categories that belong to this group */
  categories: string[];
  /** Priority for ordering (lower = first) */
  priority: number;
  /** Whether this group should be shown (based on data availability) */
  isActive: boolean;
  /** Count of data points in this group */
  count: number;
  /** Brief description of what this tab contains */
  description: string;
}

/**
 * Predefined category groups.
 * New groups can be added dynamically if new data patterns emerge.
 */
export const CATEGORY_GROUP_DEFINITIONS: Omit<SmartCategoryGroup, 'isActive' | 'count'>[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'LayoutDashboard',
    accent: '#0af',
    categories: [],
    priority: 0,
    description: 'Tổng quan tất cả thực thể được tìm thấy',
  },
  {
    id: 'entities',
    label: 'Entities',
    icon: 'Users',
    accent: '#af52de',
    categories: [],
    priority: 1,
    description: 'Danh sách các thực thể riêng biệt đã phân tách',
  },
  {
    id: 'identity',
    label: 'Identity',
    icon: 'User',
    accent: '#af52de',
    categories: [
      'full_name', 'alias', 'username', 'nickname', 'avatar',
      'gender', 'age', 'nationality', 'language', 'bio', 'location',
    ],
    priority: 2,
    description: 'Thông tin danh tính, tên, biệt danh, quốc tịch',
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: 'Mail',
    accent: '#30d158',
    categories: ['email', 'phone', 'address', 'messenger'],
    priority: 3,
    description: 'Thông tin liên lạc: email, số điện thoại, địa chỉ',
  },
  {
    id: 'social',
    label: 'Social',
    icon: 'Share2',
    accent: '#0a84ff',
    categories: ['social_profile', 'social_post', 'social_mention'],
    priority: 4,
    description: 'Hồ sơ mạng xã hội và hoạt động',
  },
  {
    id: 'professional',
    label: 'Professional',
    icon: 'Briefcase',
    accent: '#64d2ff',
    categories: ['job_title', 'company', 'education', 'skill', 'certification'],
    priority: 5,
    description: 'Nghề nghiệp, học vấn, kỹ năng',
  },
  {
    id: 'technical',
    label: 'Technical',
    icon: 'Cpu',
    accent: '#64d2ff',
    categories: [
      'domain', 'ip_address', 'hosting', 'technology', 'repository',
      'public_key', 'ssh_key', 'pgp_key', 'api_key', 'crypto_address',
      'url', 'domain_registration', 'ssl_certificate', 'port', 'service',
    ],
    priority: 6,
    description: 'Dấu vết kỹ thuật: domain, IP, repo, key',
  },
  {
    id: 'breaches',
    label: 'Breaches & Leaks',
    icon: 'AlertTriangle',
    accent: '#ff375f',
    categories: [
      'password_leak', 'credential_leak', 'breach_entry',
      'pastebin_entry', 'stealer_log',
    ],
    priority: 7,
    description: 'Lộ lọt dữ liệu, breach, password leak',
  },
  {
    id: 'darkweb',
    label: 'Dark Web',
    icon: 'EyeOff',
    accent: '#af52de',
    categories: ['darkweb_mention'],
    priority: 8,
    description: 'Đề cập trên darknet, forum ngầm',
  },
  {
    id: 'media',
    label: 'Media',
    icon: 'Image',
    accent: '#f5a623',
    categories: ['image', 'video', 'audio'],
    priority: 9,
    description: 'Hình ảnh, video, media liên quan',
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: 'CreditCard',
    accent: '#ff9f0a',
    categories: ['credit_card', 'bank_account', 'crypto_wallet'],
    priority: 10,
    description: 'Thông tin tài chính, crypto',
  },
  {
    id: 'legal',
    label: 'Legal',
    icon: 'Scale',
    accent: '#ff2d55',
    categories: ['court_record', 'criminal_record', 'sanction_list'],
    priority: 11,
    description: 'Hồ sơ pháp lý, tòa án',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: 'Clock',
    accent: '#5e5ce6',
    categories: [],
    priority: 12,
    description: 'Dòng thời gian hoạt động của thực thể',
  },
  {
    id: 'relations',
    label: 'Relations',
    icon: 'GitBranch',
    accent: '#30d158',
    categories: [],
    priority: 13,
    description: 'Mối quan hệ giữa các thực thể',
  },
  {
    id: 'raw',
    label: 'Raw Data',
    icon: 'FileJson',
    accent: '#6a7a9a',
    categories: ['other', 'unclassified'],
    priority: 14,
    description: 'Dữ liệu thô chưa phân loại',
  },
  {
    id: 'sources',
    label: 'Sources',
    icon: 'Database',
    accent: '#6a7a9a',
    categories: [],
    priority: 15,
    description: 'Danh sách nguồn dữ liệu và độ tin cậy',
  },
];