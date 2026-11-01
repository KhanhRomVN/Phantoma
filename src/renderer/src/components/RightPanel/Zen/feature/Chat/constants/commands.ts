/**
 * IPC command constants
 */

export const IPC_COMMANDS = {
  OPEN_FILE: 'openFile',
  OPEN_FOLDER: 'openFolder',
  OPEN_TEMP_IMAGE: 'openTempImage',
} as const;

export type IPCCommand = typeof IPC_COMMANDS[keyof typeof IPC_COMMANDS];