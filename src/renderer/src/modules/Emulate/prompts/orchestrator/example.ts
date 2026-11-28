import type { SystemPromptMode, ToolFormat } from './types';
import { fenceCall, fenceMarkdown, fenceQuestion } from './tools-reference';

export const buildEmulateOrchestratorExample = (
  toolFormat: ToolFormat = 'xml',
  _mode: SystemPromptMode = 'balanced',
): string => {
  const title = fenceCall('conversation_title', { title: 'Phân tích traffic HTTP' }, toolFormat);
  const agents = fenceCall('list_agents', {}, toolFormat);
  const createAnalyzer = fenceCall(
    'create_agent',
    {
      agent_id: 'traffic_analyzer',
      agent_type: 'traffic-analyzer',
      agent_name: 'Traffic Analyzer',
    },
    toolFormat,
  );
  const createFuzzer = fenceCall(
    'create_agent',
    {
      agent_id: 'fuzzer_01',
      agent_type: 'fuzzer',
      agent_name: 'Fuzzer 01',
    },
    toolFormat,
  );
  const toAnalyzer = fenceCall(
    'send_message',
    {
      agent_id: 'traffic_analyzer',
      message:
        'TYPE: TASK\nGOAL: lọc tất cả requests có status 200 và chứa "api" trong path.\nCONTEXT: target đang chạy, có traffic HTTP.\nINPUT: none\nEXPECTED OUTPUT: danh sách requests matching filter.',
    },
    toolFormat,
  );
  const toFuzzer = fenceCall(
    'send_message',
    {
      agent_id: 'fuzzer_01',
      message:
        'TYPE: TASK\nGOAL: generate SQL injection payloads cho param "id".\nCONTEXT: request GET /api/user?id=123.\nINPUT: none\nEXPECTED OUTPUT: list of payloads ready to test.',
    },
    toolFormat,
  );
  const rework = fenceCall(
    'send_message',
    {
      agent_id: 'fuzzer_01',
      message:
        'TYPE: REWORK\nGOAL: rework round 1 of 3.\nCONTEXT: fix only the defects listed.\nINPUT: 1. payload \'OR 1=1-- không encode đúng. 2. thiếu Content-Type header.\nEXPECTED OUTPUT: a RESULT.',
    },
    toolFormat,
  );
  const ask = fenceQuestion(
    [
      {
        id: '1',
        type: 'confirm',
        label: 'Fuzzer sẽ gửi 500 requests. Tiếp tục?',
      },
    ],
    toolFormat,
  );

  const markdown = fenceMarkdown(
    'Đã tạo traffic analyzer và fuzzer. Đang chờ kết quả phân tích.',
    toolFormat,
  );

  return `# EXAMPLE
user: lọc requests có status 200
assistant:
${title}
${agents}
${createAnalyzer}

[Agent replies arrive in a later turn]

assistant:
${toAnalyzer}

[More examples]
${createFuzzer}
${toFuzzer}
${rework}
${ask}
${markdown}`;
};