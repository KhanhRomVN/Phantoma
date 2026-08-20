/**
 * ------------------------------------------------------------------
 * Trạng thái proxy
 * ------------------------------------------------------------------
 * Phiên bản singleton dùng chung của ProxyManager cho tiến trình chính.
 * Cung cấp một điểm truy cập duy nhất cho quản lý phiên proxy.
 *
 * Export chính:
 * - proxyManager : Singleton ProxyManager dùng chung
 * ------------------------------------------------------------------
 */

import { ProxyManager } from '../proxy/ProxyManager';

export const proxyManager = new ProxyManager();