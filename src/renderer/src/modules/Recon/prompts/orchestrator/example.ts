import type { SystemPromptMode, ToolFormat } from '../types';
import { fenceCall, fenceMarkdown, fenceQuestion } from './tools-reference';

export const buildOrchestratorExample = (
  toolFormat: ToolFormat = 'xml',
  _mode: SystemPromptMode = 'balanced',
): string => {
  const title = fenceCall('conversation_title', { title: 'Điều tra tên miền example.com' }, toolFormat);
  const agents = fenceCall('list_agents', {}, toolFormat);
  const createPlanner = fenceCall(
    'create_agent',
    { agent_id: 'recon_plan', agent_type: 'recon_planner', agent_name: 'Recon Planner' },
    toolFormat,
  );
  const createWeb = fenceCall(
    'create_agent',
    { agent_id: 'web_scout_1', agent_type: 'recon_web', agent_name: 'Web Scout #1' },
    toolFormat,
  );
  const createLocal = fenceCall(
    'create_agent',
    { agent_id: 'local_ops_1', agent_type: 'recon_local', agent_name: 'Local Operator #1' },
    toolFormat,
  );
  const createVerifier = fenceCall(
    'create_agent',
    { agent_id: 'verifier_1', agent_type: 'recon_verifier', agent_name: 'Verifier' },
    toolFormat,
  );
  const createSynth = fenceCall(
    'create_agent',
    { agent_id: 'synth_1', agent_type: 'recon_synthesizer', agent_name: 'Synthesizer' },
    toolFormat,
  );
  const toPlanner = fenceCall(
    'send_message',
    {
      agent_id: 'recon_plan',
      message:
        'TYPE: TASK\nGOAL: lập kế hoạch OSINT thụ động cho tên miền example.com.\nCONTEXT: mục tiêu là thu thập thông tin công khai — WHOIS, DNS, trang chủ, hồ sơ mạng xã hội liên quan. Không chủ động quét cổng.\nINPUT: none\nEXPECTED OUTPUT: một PLAN gồm TARGET, SCOPE, COLLECTION VECTORS, PRIORITY ORDER, ACCEPTANCE.',
    },
    toolFormat,
  );
  const toWeb = fenceCall(
    'send_message',
    {
      agent_id: 'web_scout_1',
      message:
        'TYPE: TASK\nGOAL: thu thập WHOIS và bản ghi DNS công khai cho example.com.\nCONTEXT: chỉ đọc, không điền form. Ghi lại chính xác từng trường và URL nguồn.\nINPUT: none\nEXPECTED OUTPUT: một RESULT với danh sách trường (registrar, ngày tạo, nameserver, email liên hệ) kèm source URL.',
    },
    toolFormat,
  );
  const toLocal = fenceCall(
    'send_message',
    {
      agent_id: 'local_ops_1',
      message:
        'TYPE: TASK\nGOAL: chạy `whois example.com` và `dig +short NS example.com` để đối chiếu với kết quả web.\nCONTEXT: chỉ đọc; không sudo, không nmap.\nINPUT: none\nEXPECTED OUTPUT: một RESULT chứa raw output của từng lệnh.',
    },
    toolFormat,
  );
  const toVerifier = fenceCall(
    'send_message',
    {
      agent_id: 'verifier_1',
      message:
        'TYPE: VERIFY\nGOAL: đối chiếu WHOIS/DNS từ web với output terminal.\nCONTEXT: ACCEPTANCE = mọi trường phải có ít nhất 2 nguồn độc lập hoặc đánh dấu UNVERIFIED.\nINPUT: [dán toàn bộ RESULT của web_scout_1 và local_ops_1]\nEXPECTED OUTPUT: một REVIEW gồm VERIFIED, UNVERIFIED, CONTRADICTIONS.',
    },
    toolFormat,
  );
  const toSynth = fenceCall(
    'send_message',
    {
      agent_id: 'synth_1',
      message:
        'TYPE: SYNTHESIZE\nGOAL: tạo _index.recon và _kv.recon từ findings đã VERIFIED.\nCONTEXT: dùng đúng RECON FILE FORMAT; chỉ ghi dữ liệu đã VERIFIED, UNVERIFIED gắn {tone=warn}.\nINPUT: [dán REVIEW đã VERIFIED]\nEXPECTED OUTPUT: một RESULT liệt kê các file đã tạo.',
    },
    toolFormat,
  );
  const ask = fenceQuestion(
    [
      {
        id: '1',
        type: 'confirm',
        label:
          'Local Operator cần chạy `nmap -sV example.com` — đây là quét cổng chủ động lên máy chủ của bên thứ ba. Bạn có chắc muốn tiếp tục?',
      },
    ],
    toolFormat,
  );
  const finalReply = fenceMarkdown(
    'Đã thu thập và đối chiếu WHOIS/DNS cho example.com; đã tạo _index.recon và _kv.recon. Vui lòng kiểm tra lại tab Recon.',
    toolFormat,
  );

  return `# EXAMPLES
These examples show shape only. Message text is illustrative: your own prose to the user follows the response language. Real tool results and agent replies arrive between turns and are never predicted.

## Example 1: new target → title + staffing check
Turn 1 — set the title and list agents in one batch:
${title}
${agents}
STOP. Wait for the result.

## Example 2: no agents exist → create the whole team in one turn
Turn 2 — every agent is missing, so create them together. This turn ends right after the calls:
${createPlanner}
${createWeb}
${createLocal}
${createVerifier}
${createSynth}
STOP. Wait until the agents exist (confirm with list_agents).

## Example 3: delegate the planning task
Turn 3 — the planner is idle, so send the TASK:
${toPlanner}
STOP. Wait for the planner's reply.

## Example 4: run collection steps in parallel
Turn 4 — two independent collection tasks to two different agents in one turn:
${toWeb}
${toLocal}
STOP. Wait for both replies before continuing.

## Example 5: cross-check the collection results
Turn 5 — send both results to the verifier in one message:
${toVerifier}
STOP. Wait for the verifier's REVIEW.

## Example 6: write the .recon files
Turn 6 — send the verified findings to the synthesizer:
${toSynth}
STOP. Wait for the synthesizer's RESULT.

## Example 7: active probing needs user confirmation first
${ask}
STOP. Only after the user confirms, send the step to the local operator and say in the message that the user confirmed.

## Example 8: final reply to the user
${finalReply}`;
};