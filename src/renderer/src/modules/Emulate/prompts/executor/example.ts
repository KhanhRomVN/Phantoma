import type { ToolFormat } from './types';

const buildXMLExample = (): string => `# EXAMPLE
orchestrator: TYPE: TASK
GOAL: lọc tất cả HTTP requests có status 200.
CONTEXT: target đang active, có traffic data.
INPUT: none
EXPECTED OUTPUT: a RESULT with filtered requests list.

assistant:
\`\`\`xml
<conversation_title>Lọc HTTP requests status 200</conversation_title>
\`\`\`
\`\`\`xml
<list_files><folder_path>src/services</folder_path></list_files>
\`\`\`

[Results arrive]

assistant:
\`\`\`xml
<read_file><file_path>src/services/emulate-api.service.ts</file_path></read_file>
\`\`\`

[File content arrives]

assistant:
\`\`\`xml
<run_command><command>npm run filter -- --status=200</command></run_command>
\`\`\`

[Command output arrives]

assistant:
\`\`\`xml
<send_message><agent_id>orchestrator</agent_id><message>TYPE: RESULT
STATUS: OK
SUMMARY: Đã lọc được 45 requests có status 200.
FILES_CHANGED: none
OUTPUT: Found 45 matching requests in current traffic data.</message></send_message>
\`\`\`

---

orchestrator: TYPE: REWORK
GOAL: rework round 1 of 3.
CONTEXT: fix only the defects listed.
INPUT: 1. filter không handle WebSocket requests. 2. thiếu validation cho status parameter.
EXPECTED OUTPUT: a RESULT.

assistant:
\`\`\`xml
<read_file><file_path>src/services/filter.service.ts</file_path></read_file>
\`\`\`

[Fix the issues]

assistant:
\`\`\`xml
<replace_in_file><file_path>src/services/filter.service.ts</file_path>
<old_content>  filterByStatus(status: number) {
    return this.requests.filter(r => r.status === status);
  }</old_content>
<new_content>  filterByStatus(status: number) {
    if (status < 100 || status > 599) {
      throw new Error('Invalid HTTP status code');
    }
    return this.requests.filter(r => r.type === 'http' && r.status === status);
  }</new_content>
</replace_in_file>
\`\`\`
\`\`\`xml
<send_message><agent_id>orchestrator</agent_id><message>TYPE: RESULT
STATUS: OK
SUMMARY: Đã fix 2 defects: thêm validation status và filter chỉ HTTP requests.
FILES_CHANGED: src/services/filter.service.ts
OUTPUT: Filter now validates status code and excludes WebSocket traffic.</message></send_message>
\`\`\``;

const buildJSONExample = (): string => `# EXAMPLE
orchestrator: TYPE: TASK
GOAL: lọc tất cả HTTP requests có status 200.
CONTEXT: target đang active, có traffic data.
INPUT: none
EXPECTED OUTPUT: a RESULT with filtered requests list.

assistant:
\`\`\`json
{"tool":"conversation_title","params":{"title":"Lọc HTTP requests status 200"}}
\`\`\`
\`\`\`json
{"tool":"list_files","params":{"folder_path":"src/services"}}
\`\`\`

[Results arrive]

assistant:
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/services/emulate-api.service.ts"}}
\`\`\`

[File content arrives]

assistant:
\`\`\`json
{"tool":"run_command","params":{"command":"npm run filter -- --status=200"}}
\`\`\`

[Command output arrives]

assistant:
\`\`\`json
{"tool":"send_message","params":{"agent_id":"orchestrator","message":"TYPE: RESULT\\nSTATUS: OK\\nSUMMARY: Đã lọc được 45 requests có status 200.\\nFILES_CHANGED: none\\nOUTPUT: Found 45 matching requests in current traffic data."}}
\`\`\`

---

orchestrator: TYPE: REWORK
GOAL: rework round 1 of 3.
CONTEXT: fix only the defects listed.
INPUT: 1. filter không handle WebSocket requests. 2. thiếu validation cho status parameter.
EXPECTED OUTPUT: a RESULT.

assistant:
\`\`\`json
{"tool":"read_file","params":{"file_path":"src/services/filter.service.ts"}}
\`\`\`

[Fix the issues]

assistant:
\`\`\`json
{"tool":"replace_in_file","params":{"file_path":"src/services/filter.service.ts","old_content":"  filterByStatus(status: number) {\\n    return this.requests.filter(r => r.status === status);\\n  }","new_content":"  filterByStatus(status: number) {\\n    if (status < 100 || status > 599) {\\n      throw new Error('Invalid HTTP status code');\\n    }\\n    return this.requests.filter(r => r.type === 'http' && r.status === status);\\n  }"}}
\`\`\`
\`\`\`json
{"tool":"send_message","params":{"agent_id":"orchestrator","message":"TYPE: RESULT\\nSTATUS: OK\\nSUMMARY: Đã fix 2 defects: thêm validation status và filter chỉ HTTP requests.\\nFILES_CHANGED: src/services/filter.service.ts\\nOUTPUT: Filter now validates status code and excludes WebSocket traffic."}}
\`\`\``;

export const buildEmulateExecutorExample = (toolFormat: ToolFormat): string =>
  toolFormat === 'json' ? buildJSONExample() : buildXMLExample();