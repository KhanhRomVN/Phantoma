import type { SystemPromptMode, ToolFormat } from './types';
import { fenceCall, fenceMarkdown, fenceQuestion } from './tools-reference';

export const buildOrchestratorExample = (
  toolFormat: ToolFormat = 'xml',
  _mode: SystemPromptMode = 'balanced',
): string => {
  const title = fenceCall('conversation_title', { title: 'Phân tích luồng đăng nhập shop.example.com' }, toolFormat);
  const agents = fenceCall('list_agents', {}, toolFormat);
  const createPlanner = fenceCall(
    'create_agent',
    { agent_id: 'planner_1', agent_type: 'emulate_planner', agent_name: 'Emulate Planner' },
    toolFormat,
  );
  const createBrowser = fenceCall(
    'create_agent',
    { agent_id: 'browser_1', agent_type: 'emulate_browser', agent_name: 'Browser Control #1' },
    toolFormat,
  );
  const createCli = fenceCall(
    'create_agent',
    { agent_id: 'cli_1', agent_type: 'emulate_cli', agent_name: 'CLI Tool #1' },
    toolFormat,
  );
  const createAnalyzer = fenceCall(
    'create_agent',
    { agent_id: 'analyzer_1', agent_type: 'emulate_analyzer', agent_name: 'Traffic Analyzer' },
    toolFormat,
  );
  const toPlanner = fenceCall(
    'send_message',
    {
      agent_id: 'planner_1',
      message:
        'TYPE: TASK\nGOAL: lập kế hoạch kiểm tra bảo mật luồng đăng nhập của shop.example.com.\nCONTEXT: traffic được Emulate bắt lại; người dùng xác nhận shop.example.com là hệ thống của họ nên được phép fuzz.\nINPUT: none\nEXPECTED OUTPUT: một PLAN gồm TARGET, SCOPE, STEPS, PRIORITY ORDER, ACCEPTANCE, RISKS.',
    },
    toolFormat,
  );
  const toBrowser = fenceCall(
    'send_message',
    {
      agent_id: 'browser_1',
      message:
        'TYPE: TASK\nGOAL: tái hiện luồng đăng nhập trên https://shop.example.com/login.\nCONTEXT: dùng tài khoản test test@example.com / Test1234!; làm đúng thứ tự, không lặp bước.\nINPUT: none\nEXPECTED OUTPUT: một RESULT gồm FLOW, OBSERVED, TRAFFIC HINTS, OPEN ISSUES.',
    },
    toolFormat,
  );
  const toCli = fenceCall(
    'send_message',
    {
      agent_id: 'cli_1',
      message:
        'TYPE: TASK\nGOAL: chạy `curl -sI https://shop.example.com/login` để lấy response header.\nCONTEXT: chỉ đọc, một request, host thuộc người dùng.\nINPUT: none\nEXPECTED OUTPUT: một RESULT chứa raw output của lệnh.',
    },
    toolFormat,
  );
  const toAnalyzer = fenceCall(
    'send_message',
    {
      agent_id: 'analyzer_1',
      message:
        'TYPE: ANALYZE\nGOAL: phân tích traffic đăng nhập vừa bắt được: rò rỉ token, thiếu rate limit, header nhạy cảm.\nCONTEXT: host shop.example.com; luồng gồm POST /api/auth/login; được phép chạy fuzzer với tối đa 100 payload.\nINPUT: [dán RESULT của browser_1 và cli_1]\nEXPECTED OUTPUT: một RESULT gồm FINDINGS kèm bằng chứng (request id, trích đoạn).',
    },
    toolFormat,
  );
  const listReports = fenceCall('list_reports', {}, toolFormat);
  const createReport = fenceCall(
    'create_report',
    {
      content:
        '# Review luồng đăng nhập shop.example.com\n\n## Phạm vi\nPassive + fuzzer trên host của người dùng.\n\n## Findings\n- [Medium] POST /api/auth/login không giới hạn tần suất (request_12, 100/100 payload trả 401 không bị chặn).',
    },
    toolFormat,
  );
  const ask = fenceQuestion(
    [
      {
        id: '1',
        type: 'confirm',
        label:
          'Analyzer cần chạy khoảng 200 payload fuzz vào api.example.com/login. Bạn xác nhận mình sở hữu hoặc được phép kiểm thử host này?',
      },
    ],
    toolFormat,
  );
  const finalReply = fenceMarkdown(
    'Đã phân tích luồng đăng nhập shop.example.com và lưu báo cáo "Review luồng đăng nhập"; có 1 finding mức Medium về thiếu rate limit.',
    toolFormat,
  );

  return `# EXAMPLES
These examples show shape only. Message text is illustrative: your own prose to the user follows the response language. Real tool results and agent replies arrive between turns and are never predicted.

## Example 1: new request → title + staffing check
Turn 1 — set the title and list agents in one batch:
${title}
${agents}
STOP. Wait for the result.

## Example 2: no agents exist → create the whole team in one turn
Turn 2 — every agent is missing, so create them together. This turn ends right after the calls:
${createPlanner}
${createBrowser}
${createCli}
${createAnalyzer}
STOP. Wait until the agents exist (confirm with list_agents).

## Example 3: delegate the planning task
Turn 3 — the planner is idle, so send the TASK:
${toPlanner}
STOP. Wait for the planner's reply.

## Example 4: generate traffic and collect headers in parallel
Turn 4 — two independent tasks to two different agents in one turn:
${toBrowser}
${toCli}
STOP. Wait for both replies before continuing.

## Example 5: send the traffic to the analyzer
Turn 5 — the fuzzing scope was already confirmed by the user, so ask the analyzer to inspect and fuzz:
${toAnalyzer}
STOP. Wait for the analyzer's RESULT.

## Example 6: write the report
Turn 6 — check existing reports first, then create (or update) the report from the analyzer's findings only:
${listReports}
STOP. Wait for the result.
${createReport}
STOP. Wait for the confirmation.

## Example 7: fuzzing needs user authorization first
${ask}
STOP. Only after the user confirms, send the step to the analyzer and say in the message that the user confirmed.

## Example 8: final reply to the user
${finalReply}`;
};