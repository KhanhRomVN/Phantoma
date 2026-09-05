import * as fs from 'fs';
/**
 * ------------------------------------------------------------------
 * Hồ sơ Genymotion
 * ------------------------------------------------------------------
 * Lưu trữ và quản lý hồ sơ trình giả lập Genymotion bền vững.
 * Cung cấp thao tác CRUD với lưu trữ JSON dưới userData.
 *
 * Hàm chính:
 * - loadProfiles()        : Tải hồ sơ từ bộ lưu trữ
 * - saveProfiles()        : Lưu hồ sơ xuống đĩa
 * - getProfileById()      : Lấy hồ sơ theo ID
 * - createProfile()       : Tạo hồ sơ mới
 * - updateProfile()       : Cập nhật hồ sơ hiện có
 * - deleteProfile()       : Xóa hồ sơ
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Node.js ──
import * as path from 'path';
import { randomUUID } from 'crypto';

// ── Electron ──
import { app } from 'electron';

// ── Internal ──
import { logger } from './logger';

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface GenymotionProfile {
  id: string;
  name: string;
  description: string;
  vmName: string;
  androidVersion: string;
  architecture: string;
  screenSize: string;
  deviceModel: string;
  autoProxy: boolean;
  autoFrida: boolean;
  customSettings: {
    dpi: number;
    ram: number;
    diskSize: number;
  };
  createdAt: number;
  updatedAt: number;
}

// ─── Constants ──────────────────────────────────────────────────────────
const PROFILES_FILE = 'genymotion-profiles.json';

interface ProfilesData {
  version: string;
  profiles: GenymotionProfile[];
}

// ─── Functions ──────────────────────────────────────────────────────────
function getProfilesPath(): string {
  const profilesDir = path.join(app.getPath('userData'), 'profiles');
  fs.mkdirSync(profilesDir, { recursive: true });
  return path.join(profilesDir, PROFILES_FILE);
}

/**
 * Load profiles from storage
 */
export function loadProfiles(): GenymotionProfile[] {
  const profilesPath = getProfilesPath();

  if (!fs.existsSync(profilesPath)) {
    // Create with default profiles
    const defaultProfiles = getDefaultProfiles();
    saveProfiles(defaultProfiles);
    return defaultProfiles;
  }

  try {
    const data = fs.readFileSync(profilesPath, 'utf-8');
    const profilesData: ProfilesData = JSON.parse(data);
    return profilesData.profiles || [];
  } catch (error) {
    logger.error('Failed to load profiles:', error);
    return [];
  }
}

/**
 * Save profiles to storage
 */
export function saveProfiles(profiles: GenymotionProfile[]): boolean {
  const profilesPath = getProfilesPath();

  const profilesData: ProfilesData = {
    version: '1.0',
    profiles,
  };

  try {
    fs.writeFileSync(profilesPath, JSON.stringify(profilesData, null, 2), 'utf-8');
    return true;
  } catch (error) {
    logger.error('Failed to save profiles:', error);
    return false;
  }
}

/**
 * Get default pre-configured profiles
 */
export function getDefaultProfiles(): GenymotionProfile[] {
  return [
    {
      id: randomUUID(),
      name: 'Android 11 - Proxy Ready',
      description: 'Pre-configured profile with proxy and Frida ready for HTTPS tracking',
      vmName: 'Systema_Android11_Default',
      androidVersion: '11.0',
      architecture: 'x86_64',
      screenSize: '1080x1920',
      deviceModel: 'Google Pixel 5',
      autoProxy: true,
      autoFrida: true,
      customSettings: {
        dpi: 420,
        ram: 2048,
        diskSize: 8192,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: randomUUID(),
      name: 'Android 13 - Security Testing',
      description: 'Advanced profile for security testing with all tools pre-installed',
      vmName: 'Systema_Android13_Security',
      androidVersion: '13.0',
      architecture: 'x86_64',
      screenSize: '1080x2400',
      deviceModel: 'Google Pixel 7',
      autoProxy: true,
      autoFrida: true,
      customSettings: {
        dpi: 440,
        ram: 4096,
        diskSize: 16384,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: randomUUID(),
      name: 'Android 9 - Compatibility',
      description: 'Older Android version for compatibility testing',
      vmName: 'Phantoma_Android9_Compat',
      androidVersion: '9.0',
      architecture: 'x86',
      screenSize: '720x1280',
      deviceModel: 'Generic Device',
      autoProxy: false,
      autoFrida: false,
      customSettings: {
        dpi: 320,
        ram: 1024,
        diskSize: 4096,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}

/**
 * Get profile by ID
 */
export function getProfileById(profileId: string): GenymotionProfile | null {
  const profiles = loadProfiles();
  return profiles.find((p) => p.id === profileId) || null;
}

/**
 * Create new profile
 */
export function createProfile(
  profileData: Omit<GenymotionProfile, 'id' | 'createdAt' | 'updatedAt'>,
): GenymotionProfile {
  const profiles = loadProfiles();

  const newProfile: GenymotionProfile = {
    ...profileData,
    id: randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  profiles.push(newProfile);
  saveProfiles(profiles);

  return newProfile;
}

/**
 * Update existing profile
 */
export function updateProfile(
  profileId: string,
  updates: Partial<Omit<GenymotionProfile, 'id' | 'createdAt'>>,
): GenymotionProfile | null {
  const profiles = loadProfiles();
  const index = profiles.findIndex((p) => p.id === profileId);

  if (index === -1) {
    return null;
  }

  profiles[index] = {
    ...profiles[index],
    ...updates,
    updatedAt: Date.now(),
  };

  saveProfiles(profiles);
  return profiles[index];
}

/**
 * Delete profile
 */
export function deleteProfile(profileId: string): boolean {
  const profiles = loadProfiles();
  const filteredProfiles = profiles.filter((p) => p.id !== profileId);

  if (filteredProfiles.length === profiles.length) {
    return false; // Profile not found
  }

  saveProfiles(filteredProfiles);
  return true;
}

/**
 * Get all profiles
 */
export function getAllProfiles(): GenymotionProfile[] {
  return loadProfiles();
}
