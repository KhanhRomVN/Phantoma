/**
 * ------------------------------------------------------------------
 * Genymotion Profiles (port từ src/main/utils/genymotion-profiles.ts)
 * ------------------------------------------------------------------
 * Thay app.getPath('userData') → RUNTIME_DIR/profiles. Thêm import fs
 * (bản gốc dùng fs mà không import tường minh).
 * ------------------------------------------------------------------
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { RUNTIME_DIR } from '../paths';
import { createLogger } from '../../utils/logger';

const logger = createLogger('GenymotionProfiles');

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

const PROFILES_FILE = 'genymotion-profiles.json';

interface ProfilesData {
  version: string;
  profiles: GenymotionProfile[];
}

function getProfilesPath(): string {
  const profilesDir = path.join(RUNTIME_DIR, 'profiles');
  fs.mkdirSync(profilesDir, { recursive: true });
  return path.join(profilesDir, PROFILES_FILE);
}

export function loadProfiles(): GenymotionProfile[] {
  const profilesPath = getProfilesPath();

  if (!fs.existsSync(profilesPath)) {
    const defaultProfiles = getDefaultProfiles();
    saveProfiles(defaultProfiles);
    return defaultProfiles;
  }

  try {
    const data = fs.readFileSync(profilesPath, 'utf-8');
    const profilesData: ProfilesData = JSON.parse(data);
    return profilesData.profiles || [];
  } catch (error) {
    logger.error('Failed to load profiles', { err: String(error) });
    return [];
  }
}

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
    logger.error('Failed to save profiles', { err: String(error) });
    return false;
  }
}

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
      customSettings: { dpi: 420, ram: 2048, diskSize: 8192 },
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
      customSettings: { dpi: 440, ram: 4096, diskSize: 16384 },
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
      customSettings: { dpi: 320, ram: 1024, diskSize: 4096 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}

export function getProfileById(profileId: string): GenymotionProfile | null {
  const profiles = loadProfiles();
  return profiles.find((p) => p.id === profileId) || null;
}

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

export function deleteProfile(profileId: string): boolean {
  const profiles = loadProfiles();
  const filteredProfiles = profiles.filter((p) => p.id !== profileId);

  if (filteredProfiles.length === profiles.length) {
    return false;
  }

  saveProfiles(filteredProfiles);
  return true;
}

export function getAllProfiles(): GenymotionProfile[] {
  return loadProfiles();
}