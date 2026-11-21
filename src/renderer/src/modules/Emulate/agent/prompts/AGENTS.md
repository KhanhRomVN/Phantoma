# Emulate Agents

Mỗi system prompt nằm trong folder riêng và tự chứa mọi phần của nó (`config.ts`, `types.ts`, `messaging.ts` nếu là sub-agent, `identity.ts`, `constraints.ts`, `workflow.ts`, `system-context.ts`, `tools-reference.ts`, `tool-validation.ts`, `example(s).ts`, `index.ts`). KHÔNG có file dùng chung ở ngoài các folder này; import qua đường dẫn folder (vd `./agent/prompts/orchestrator`).

## analyzer

- `list_https`
- `get_https_detail`
- `list_hosts`
- `list_sources`
- `get_source_detail`
- `list_resources`
- `get_resource_content`
- `apply_filter`
- `list_fuzzers`
- `get_fuzzer_detail`
- `send_to_fuzzer`
- `update_fuzzer_content`
- `run_fuzzer`
- `delete_fuzzer`
- `list_reports`
- `read_report`
- `create_report`
- `update_report`
- `conversation_title`
- UI: `markdown`, `question`

## orchestrator

- `conversation_title`
- `list_agents`
- `create_agent`
- `delete_agent`
- `send_message`
- `list_reports`
- `create_report`
- `read_report`
- `update_report`
- UI: `markdown`, `question`

## planner

- `read_file`
- `list_files`
- `send_message`

## browser-control

- `launch_browser`
- `close_browser`
- `list_tabs`
- `create_tab`
- `close_tab`
- `switch_tab`
- `navigate`
- `back`
- `forward`
- `reload`
- `get_page_content`
- `list_elements`
- `list_frames`
- `capture_screenshot`
- `click_element`
- `fill_input`
- `clear_input`
- `select_option`
- `hover`
- `upload_file`
- `press_key`
- `scroll`
- `scroll_to_element`
- `wait_for`
- `evaluate_js`
- `send_message`

## local-operator

- `run_command`
- `read_file`
- `list_files`
- `create_file`
- `update_file`
- `send_message`