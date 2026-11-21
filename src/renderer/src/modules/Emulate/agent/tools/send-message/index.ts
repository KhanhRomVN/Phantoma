import type { EmulateTool } from '../tool.types';
import { executeSendMessage } from './send-message.executor';
import { parseSendMessage } from './send-message.parser';

export const sendMessageTool: EmulateTool = {
  name: 'send_message',
  execute: async (a, c) => executeSendMessage(a.params || {}, c),
  parse: parseSendMessage,
};
