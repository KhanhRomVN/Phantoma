# Emulate Module - Agent Naming Convention

## Agent Types và Responsibilities

### 1. `traffic-analyzer`
**Chức năng**: Phân tích HTTP/WebSocket traffic
- Đọc và parse network requests/responses
- Apply filters (status code, method, path patterns)
- Phát hiện patterns và anomalies
- Extract endpoints và parameters

**Use cases**:
- "Lọc tất cả requests có status 200"
- "Tìm requests chứa 'api' trong path"
- "Phân tích WebSocket messages"

### 2. `fuzzer`
**Chức năng**: Generate và execute fuzzing payloads
- Tạo payloads (SQL injection, XSS, path traversal, etc.)
- Execute fuzzing campaigns
- Track results và detect vulnerabilities
- Replay requests với modified payloads

**Use cases**:
- "Chạy SQL injection fuzzer cho param 'id'"
- "Test XSS trên input field 'username'"
- "Fuzz API endpoint với random payloads"

### 3. `filter`
**Chức năng**: Quản lý traffic filters
- Create/update/delete filter rules
- Combine multiple filter conditions
- Save/load filter presets
- Real-time traffic filtering

**Use cases**:
- "Tạo filter: status=200 AND method=POST"
- "Save filter preset 'API Calls'"
- "Apply filter để chỉ show JSON responses"

### 4. `report-generator`
**Chức năng**: Tạo security reports
- Aggregate findings từ fuzzer và analyzer
- Format reports (markdown, HTML, JSON)
- Categorize vulnerabilities by severity
- Generate executive summary

**Use cases**:
- "Tạo report từ fuzzing session"
- "Export findings as markdown"
- "Generate summary cho tất cả vulnerabilities"

## Workflow Examples

### Example 1: Analyze HTTP Traffic
```
Orchestrator receives: "Lọc requests có status 200"
↓
Orchestrator creates: traffic-analyzer agent
↓
Orchestrator sends TASK to traffic-analyzer:
  GOAL: lọc HTTP requests có status 200
  CONTEXT: target đang active
  EXPECTED OUTPUT: filtered list
↓
traffic-analyzer executes:
  - Reads traffic data via emulate-api.service
  - Applies status filter
  - Returns filtered results
↓
Orchestrator reports to user: "Tìm thấy 45 requests"
```

### Example 2: Fuzzing Campaign
```
Orchestrator receives: "Chạy SQL injection fuzzer cho param 'id'"
↓
Orchestrator creates: fuzzer agent
↓
Orchestrator sends TASK to fuzzer:
  GOAL: generate và execute SQL injection payloads
  CONTEXT: target request GET /api/user?id=123
  EXPECTED OUTPUT: vulnerability findings
↓
fuzzer executes:
  - Generates SQL injection payloads
  - Replays request với từng payload
  - Detects SQL errors in responses
  - Records vulnerable payloads
↓
Orchestrator creates: report-generator agent
↓
Orchestrator sends TASK to report-generator:
  GOAL: tạo report từ fuzzer findings
  INPUT: fuzzer's vulnerability list
  EXPECTED OUTPUT: formatted markdown report
↓
report-generator creates report
↓
Orchestrator reports to user: "Phát hiện 3 SQL injection vulnerabilities"
```

### Example 3: Combined Analysis
```
Orchestrator receives: "Phân tích API endpoints và test cho SQL injection"
↓
Orchestrator creates: traffic-analyzer, fuzzer
↓
Orchestrator sends TASK to traffic-analyzer:
  GOAL: extract tất cả API endpoints có parameters
  EXPECTED OUTPUT: list of endpoints với param names
↓
traffic-analyzer returns: ["/api/user?id", "/api/post?slug"]
↓
Orchestrator sends TASK to fuzzer:
  GOAL: fuzz each endpoint với SQL injection payloads
  INPUT: endpoint list from traffic-analyzer
  EXPECTED OUTPUT: findings per endpoint
↓
fuzzer tests both endpoints, finds 1 vulnerable
↓
Orchestrator creates: report-generator
↓
report-generator tạo comprehensive report
↓
Orchestrator reports to user với summary và report link
```

## Agent Lifecycle

1. **Creation**: Orchestrator creates agent khi cần (via `create_agent`)
2. **Task Assignment**: Orchestrator sends self-contained task message
3. **Execution**: Agent executes, có thể BLOCKED nếu thiếu info
4. **Rework**: Nếu có defects, orchestrator sends REWORK (max 3 rounds)
5. **Completion**: Agent sends RESULT with STATUS: OK
6. **Deletion**: Orchestrator deletes agent khi không còn cần

## Notes

- Mỗi agent type có một clear responsibility
- Agents không communicate trực tiếp — chỉ qua orchestrator
- Orchestrator có thể create multiple instances của cùng agent type nếu tasks độc lập
- Agent names (agent_id) phải unique: `traffic_analyzer_01`, `fuzzer_main`, etc.