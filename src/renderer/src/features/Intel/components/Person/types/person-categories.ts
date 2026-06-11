/**
 * Person-specific Smart Category Groups for dynamic tab generation.
 */
import type { SmartCategoryGroup } from './smart-category';
import type { PersonDataCategory } from './person-data-point';

export interface PersonCategoryGroup extends Omit<SmartCategoryGroup, 'categories'> {
  categories: PersonDataCategory[];
}

export const PERSON_CATEGORY_GROUPS: Omit<PersonCategoryGroup, 'isActive' | 'count'>[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'LayoutDashboard',
    accent: '#0af',
    categories: [],
    priority: 0,
    description: 'Tổng quan: danh tính, liên hệ, mạng xã hội, rủi ro',
  },
  {
    id: 'identity',
    label: 'Identity',
    icon: 'User',
    accent: '#0a84ff',
    categories: [
      'identity_full_name', 'identity_alias', 'identity_username', 'identity_nickname',
      'identity_avatar', 'identity_real_name', 'identity_age', 'identity_gender',
      'identity_nationality', 'identity_language', 'identity_location',
      'identity_timezone', 'identity_bio',
    ],
    priority: 1,
    description: 'Thông tin danh tính: tên, alias, username, tuổi, vị trí',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: 'Mail',
    accent: '#30d158',
    categories: [
      'contact_email', 'contact_phone', 'contact_address', 'contact_messenger',
    ],
    priority: 2,
    description: 'Thông tin liên hệ: email, số điện thoại, địa chỉ, messenger',
  },
  {
    id: 'social',
    label: 'Social Media',
    icon: 'Share2',
    accent: '#ff6b35',
    categories: [
      'social_twitter', 'social_linkedin', 'social_github', 'social_facebook',
      'social_instagram', 'social_reddit', 'social_hackerone', 'social_bugcrowd',
      'social_stackoverflow', 'social_medium', 'social_youtube', 'social_patreon',
      'social_devto', 'social_keybase', 'social_mastodon', 'social_flickr',
      'social_tiktok', 'social_pinterest', 'social_goodreads', 'social_letterboxd',
      'social_myanimelist', 'social_anilist', 'social_trakt', 'social_vimeo',
      'social_dribbble', 'social_behance', 'social_steam', 'social_twitch',
      'social_couchsurfing', 'social_meetup', 'social_other',
    ],
    priority: 3,
    description: 'Hồ sơ mạng xã hội trên 30+ nền tảng',
  },
  {
    id: 'technical',
    label: 'Technical',
    icon: 'Cpu',
    accent: '#af52de',
    categories: [
      'tech_github', 'tech_gitlab', 'tech_dockerhub', 'tech_npm', 'tech_pypi',
      'tech_stackoverflow', 'tech_public_key', 'tech_domain', 'tech_ip_address',
      'tech_hosting', 'tech_technology', 'tech_repo_contribution',
      'tech_tool_published', 'tech_conference', 'tech_ctf_result',
    ],
    priority: 4,
    description: 'Dấu chân kỹ thuật: GitHub, domains, tools, CTF, conferences',
  },
  {
    id: 'leaks',
    label: 'Leaks & Breaches',
    icon: 'AlertTriangle',
    accent: '#ff375f',
    categories: [
      'leak_password', 'leak_credential', 'leak_breach',
      'leak_pastebin', 'leak_public_document', 'leak_darkweb_mention',
    ],
    priority: 5,
    description: 'Lộ mật khẩu, breach databases, pastebin leaks, dark web mentions',
  },
  {
    id: 'services',
    label: 'Services',
    icon: 'Globe',
    accent: '#64d2ff',
    categories: [
      'service_registered', 'service_unconfirmed',
    ],
    priority: 6,
    description: 'Dịch vụ đã đăng ký với email này (70+ services)',
  },
  {
    id: 'mentions',
    label: 'Mentions',
    icon: 'MessageCircle',
    accent: '#ff9f0a',
    categories: [
      'mention_social', 'mention_forum', 'mention_darkweb',
    ],
    priority: 7,
    description: 'Đề cập trên mạng xã hội, diễn đàn, dark web',
  },
  {
    id: 'noise',
    label: 'Noise',
    icon: 'EyeOff',
    accent: '#6a7a9a',
    categories: [
      'noise_username_collision', 'noise_email_similar', 'noise_domain_mention',
      'noise_breach_false_positive', 'noise_social_false_positive',
      'noise_ip_conflict', 'noise_collision',
    ],
    priority: 8,
    description: 'False positives, username collisions, dữ liệu không liên quan',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: 'Clock',
    accent: '#5e5ce6',
    categories: [],
    priority: 14,
    description: 'Dòng thời gian các sự kiện liên quan đến đối tượng',
  },
  {
    id: 'raw',
    label: 'Raw / Noise',
    icon: 'FileJson',
    accent: '#6a7a9a',
    categories: ['other', 'unclassified'],
    priority: 15,
    description: 'Dữ liệu thô chưa phân loại, false positives',
  },
  {
    id: 'sources',
    label: 'Sources',
    icon: 'Database',
    accent: '#6a7a9a',
    categories: [],
    priority: 16,
    description: 'Danh sách nguồn dữ liệu và độ tin cậy',
  },
];