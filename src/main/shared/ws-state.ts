/**
 * ------------------------------------------------------------------
 * Trạng thái WS
 * ------------------------------------------------------------------
 * Phiên bản singleton dùng chung của SingletonWSManager để truy cập
 * máy chủ WebSocket trong toàn bộ tiến trình chính.
 *
 * Export chính:
 * - wsManager : Phiên bản SingletonWSManager dùng chung
 * ------------------------------------------------------------------
 */

import { SingletonWSManager } from '../server/SingletonWSManager';

export const wsManager = SingletonWSManager.getInstance();