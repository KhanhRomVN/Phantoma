/**
 * ------------------------------------------------------------------
 * Secure Storage Service
 * ------------------------------------------------------------------
 * Wrapper for Electron's safeStorage IPC handlers to manage sensitive data
 * like sudo passwords securely across sessions.
 * 
 * Usage:
 * - getPassword(): Loads and decrypts the stored password (returns null if not found/error).
 * - setPassword(pw): Encrypts and saves the password. Pass empty string to clear.
 * ------------------------------------------------------------------
 */

// ─── Interfaces ──────────────────────────────────────────────────────────
interface WindowWithApi {
  api?: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
  };
}

declare global {
  interface Window extends WindowWithApi {}
}

// ─── Constants ───────────────────────────────────────────────────────────
const CHANNEL_GET_PASSWORD = 'app:get-sudo-password';
const CHANNEL_SET_PASSWORD = 'app:set-sudo-password';

// ─── Service Implementation ──────────────────────────────────────────────
class SecureStorageService {
  private getApi() {
    if (!window.api?.invoke) {
      throw new Error('[SecureStorage] window.api is not available. Ensure preload script is loaded.');
    }
    return window.api;
  }

  /**
   * Retrieve the saved sudo password from secure storage.
   * @returns The decrypted password string, or null if not set/unavailable.
   */
  async getSudoPassword(): Promise<string | null> {
    try {
      const result = await this.getApi().invoke(CHANNEL_GET_PASSWORD);
      return typeof result === 'string' ? result : null;
    } catch (error) {
      console.error('[SecureStorage] Failed to get sudo password:', error);
      return null;
    }
  }

  /**
   * Save the sudo password to secure storage.
   * @param password The password to encrypt and store. Empty string clears it.
   * @returns True if successful, false otherwise.
   */
  async setSudoPassword(password: string): Promise<boolean> {
    try {
      const success = await this.getApi().invoke(CHANNEL_SET_PASSWORD, password);
      return !!success;
    } catch (error) {
      console.error('[SecureStorage] Failed to set sudo password:', error);
      return false;
    }
  }
}

export const secureStorage = new SecureStorageService();