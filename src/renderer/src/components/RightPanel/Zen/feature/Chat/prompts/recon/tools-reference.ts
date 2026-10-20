/**
 * Tham chiếu công cụ Recon
 * Tài liệu cho các công cụ điều khiển và trinh sát trình duyệt
 * Spec v3 — 28 tools (23 browser + 5 file)
 */

const CLOSE_CONTENT = '</' + 'content>';

export const RECON_TOOLS_REFERENCE = `
# RECON TOOLS REFERENCE

## Tab Management

### 1. list_tabs
List all open tabs in the active browser session.

**Parameters:**

**Usage:**
\`\`\`xml
<list_tabs />
\`\`\`

**Output:**
- Array of tabs with: tabId, title, url, isActive

---

### 2. create_tab
Create a new tab with optional URL.

**Parameters:**
- url (optional): URL to navigate to. Opens blank tab if not specified.

**Usage:**
\`\`\`xml
<create_tab>
  <url>https://example.com</url>
</create_tab>
\`\`\`

**Output:**
- New tab ID and status

---

### 3. close_tab
Close a specific tab.

**Parameters:**
- tabId (required): ID of the tab to close. Get from list_tabs.

**Usage:**
\`\`\`xml
<close_tab>
  <tabId>tab-123</tabId>
</close_tab>
\`\`\`

---

### 4. switch_tab
Switch to a specific tab.

**Parameters:**
- tabId (required): ID of the tab to switch to. Get from list_tabs.

**Usage:**
\`\`\`xml
<switch_tab>
  <tabId>tab-123</tabId>
</switch_tab>
\`\`\`

---

## Navigation

### 5. navigate
Navigate to a URL in the active tab.

**Parameters:**
- url (required): URL to navigate to
- waitUntil (optional): domcontentloaded, load, networkidle. Default: load
- timeoutMs (optional): Max wait time in ms. Default: 30000

**Usage:**
\`\`\`xml
<navigate>
  <url>https://example.com</url>
  <waitUntil>networkidle</waitUntil>
</navigate>
\`\`\`

**Output:**
- Navigation status

---

### 6. back
Navigate back in the active tab.

**Parameters:**

**Usage:**
\`\`\`xml
<back />
\`\`\`

---

### 7. forward
Navigate forward in the active tab.

**Parameters:**

**Usage:**
\`\`\`xml
<forward />
\`\`\`

---

### 8. reload
Reload the active tab.

**Parameters:**

**Usage:**
\`\`\`xml
<reload />
\`\`\`

---

## Content Extraction

### 9. get_page_content
Get the current page content as markdown with element references.

**Parameters:**
- maxChars (optional): Override default truncation threshold (8000 chars).

**Usage:**
\`\`\`xml
<get_page_content />
\`\`\`

**Output:**
- Page title, URL, markdown content
- Interactive elements list (max 10 rows if > 20 elements)

---

### 10. list_elements
List all interactive elements on the page with filters.

**Parameters:**
- elementType (optional): input, button, link, select, textarea, checkbox, radio
- labelContains (optional): Filter by keyword in label/placeholder (case-insensitive)
- visibleOnly (optional): If true, only return elements visible in current viewport
- limit (optional): Max results. Default: 50
- offset (optional): Pagination start. Default: 0

**Usage:**
\`\`\`xml
<list_elements>
  <elementType>input</elementType>
  <labelContains>search</labelContains>
  <visibleOnly>true</visibleOnly>
</list_elements>
\`\`\`

**Output:**
- Array of elements with: ref, type, selector, label, value, placeholder, visible, boundingBox

---

### 11. list_frames
List all iframes in the current page.

**Parameters:**

**Usage:**
\`\`\`xml
<list_frames />
\`\`\`

**Output:**
- Array of frames: frameId, frameUrl, name

---

### 12. capture_screenshot
Capture screenshot of the current page with numbered overlay (Set-of-Marks) on interactive elements.

**Parameters:**
- fullPage (optional): If true, capture full page height. Default: false (viewport only)

**Usage:**
\`\`\`xml
<capture_screenshot />
\`\`\`

**Output:**
- Screenshot with orange numbered badges on visible interactive elements
- Ref-map table: index, ref, selector, type, label
- Page title and URL

**Important:** Use the numbered badge to locate an element, then use its matching ref from the ref-map table.

---

## Page Interaction

### 13. click_element
Click an element on the page.

**Parameters:**
- ref (required): Element reference ID from get_page_content, list_elements or capture_screenshot
- clickType (optional): single (default), double, right
- frameId (optional): Specify if element is inside an iframe

**Usage:**
\`\`\`xml
<click_element>
  <ref>btn-login</ref>
</click_element>
\`\`\`

**Output:**
- Click status
- newTabId: appears if click opens a new tab (current tab does NOT auto-switch)

**⚠ Stale ref:** If DOM has changed since last ref fetch (SPA re-render, AJAX), you may get error reason stale_ref. Call list_elements/get_page_content again to get fresh refs.

---

### 14. fill_input
Fill an input field. Clears existing value then types new value (not append).

**Parameters:**
- ref (required): Element reference ID
- value (required): Text to fill
- frameId (optional): Specify if element is inside an iframe

**Usage:**
\`\`\`xml
<fill_input>
  <ref>input-email</ref>
  <value>user@example.com</value>
</fill_input>
\`\`\`

---

### 15. clear_input
Clear current content of an input field without filling new value.

**Parameters:**
- ref (required): Element reference ID

**Usage:**
\`\`\`xml
<clear_input>
  <ref>input-email</ref>
</clear_input>
\`\`\`

---

### 16. select_option
Select a value in a <select> dropdown.

**Parameters:**
- ref (required): Element reference ID of <select>
- value (one of): value attribute of option to select
- label (one of): visible text of option (use when value unknown)

**Usage:**
\`\`\`xml
<select_option>
  <ref>select-country</ref>
  <label>Việt Nam</label>
</select_option>
\`\`\`

---

### 17. hover
Hover mouse over an element without clicking — for menus/tooltips that only appear on hover.

**Parameters:**
- ref (required): Element reference ID

**Usage:**
\`\`\`xml
<hover>
  <ref>menu-products</ref>
</hover>
\`\`\`

---

### 18. upload_file
Upload a file through <input type="file"> element.

**Parameters:**
- ref (required): Element reference ID of file input
- filePath (required): Path to file on agent machine

**Usage:**
\`\`\`xml
<upload_file>
  <ref>input-avatar</ref>
  <filePath>/tmp/avatar.png</filePath>
</upload_file>
\`\`\`

---

### 19. press_key
Press keyboard key in active element (or specified element).

**Parameters:**
- key (required): Key name (Enter, Tab, Escape, ArrowDown, etc.) or character
- ref (optional): If specified, focus this element before pressing

**Usage:**
\`\`\`xml
<press_key>
  <key>Enter</key>
</press_key>
\`\`\`

---

### 20. scroll
Scroll the page.

**Parameters:**
- direction (required): up, down, top, bottom
- amount (optional): Pixels to scroll (for up/down). Default: 500

**Usage:**
\`\`\`xml
<scroll>
  <direction>down</direction>
  <amount>1000</amount>
</scroll>
\`\`\`

---

### 21. scroll_to_element
Scroll directly to a specific element (known ref) currently outside viewport.

**Parameters:**
- ref (required): Element reference ID to scroll to

**Usage:**
\`\`\`xml
<scroll_to_element>
  <ref>btn-submit</ref>
</scroll_to_element>
\`\`\`

---

### 22. wait_for
Wait until a condition is met before continuing — important for SPA async loading.

**Parameters:**
- condition (required): element_visible, element_hidden, text_present, network_idle
- ref (required if condition=element_visible/element_hidden)
- text (required if condition=text_present)
- timeoutMs (optional): Default: 10000

**Usage:**
\`\`\`xml
<wait_for>
  <condition>element_visible</condition>
  <ref>result-list</ref>
  <timeoutMs>5000</timeoutMs>
</wait_for>
\`\`\`

---

### 23. evaluate_js
Execute arbitrary JavaScript in the current page context. Use as escape hatch when other tools are insufficient.

⚠ **Safety:** broadest scope in the toolset — use sparingly and only when necessary. Calling this tool triggers IMPACT-CONFIRM (see CONSTRAINTS): you MUST ask the user to confirm before executing.

**Parameters:**
- script (required): JS code to run. Final return value returned (must be serializable)

**Usage:**
\`\`\`xml
<evaluate_js>
  <script>return document.title;</script>
</evaluate_js>
\`\`\`

---

## File Management (Recon workspace)

These 5 tools read and write the files that store the intelligence you collect (.recon files and attachments). They work on the recon workspace folder, NOT on the browser. Every file_path is relative to the workspace root and may include sub-folders (e.g. _index.recon, files/ghi-chu/tong-quan.md). Follow the RECON FILE FORMAT section when creating or editing .recon files.

### 24. read_file
Read a file from the recon workspace.

**Parameters:**
- file_path (required): Path relative to the workspace root
- start_line (optional): First line to read (inclusive)
- end_line (optional): Last line to read (inclusive)

**Usage:**
<read_file>
  <file_path>_index.recon</file_path>
</read_file>

<read_file>
  <file_path>_table.recon</file_path>
  <start_line>1</start_line>
  <end_line>50</end_line>
</read_file>

---

### 25. create_file
Create a new file with the given full content. Use it for NEW files; use update_file for targeted edits to existing files. Only overwrite an existing file with create_file when you are rewriting most of it.

**Parameters:**
- file_path (required): Path relative to the workspace root (sub-folders allowed)
- content (required): Full file content, written with real line breaks

**Usage:**
<create_file>
  <file_path>_timeline.recon</file_path>
  <content>full file content${CLOSE_CONTENT}
</create_file>

---

### 26. update_file
Replace one exact snippet of an existing file. Read the file first.

**Parameters:**
- file_path (required): Path relative to the workspace root
- old_content (required): Exact original snippet, byte-for-byte (indentation and spacing included)
- new_content (required): Replacement

**Usage:**
<update_file>
  <file_path>_kv.recon</file_path>
  <old_content>Mức ưu tiên: Cao [enum] {tone=danger}</old_content>
  <new_content>Mức ưu tiên: Trung bình [enum] {tone=warn}</new_content>
</update_file>

⚠ TAG-CLOSE-VERIFY: closing tag must match its opening tag — never close one tag with another tag's closing tag. Re-read the opening tag before closing.

---

### 27. list_files
List files and folders under a path. Each file entry includes its exact line count (e.g. (155 lines)), so you can size a read batch before calling read_file.

**Parameters:**
- folder_path (optional): Folder to list, relative to the workspace root. Default: workspace root
- depth (optional): A number, or the string "max" for the full subtree. Default: 1

**Usage:**
<list_files>
</list_files>

<list_files>
  <folder_path>files</folder_path>
  <depth>max</depth>
</list_files>

---

### 28. delete_file
Delete a file from the recon workspace. Irreversible: you MUST ask the user to confirm with a <question> (type confirm) before calling it.

**Parameters:**
- file_path (required): Path relative to the workspace root

**Usage:**
<delete_file>
  <file_path>_old-tab.recon</file_path>
</delete_file>

### File tool rules
1. Always read_file before update_file, and copy old_content exactly from what you read.
2. Before reading several files in one turn, sum their line counts from list_files and keep the total at or under 1500 lines; use start_line/end_line for large files.
3. Use create_file for new files and update_file for edits — do not rewrite a whole file just to change one value.
4. Never write a .recon file that breaks the RECON FILE FORMAT section.

---

## Error Handling

All action tools (click_element,   fill_input, select_option, hover, upload_file, press_key, scroll_to_element, navigate, wait_for) return unified error schema:

\`\`\`json
{
  "status": "error",
  "tool": "click_element",
  "ref": "btn-login",
  "reason": "stale_ref",
  "message": "Element with ref 'btn-login' no longer matches current DOM. Call list_elements to get fresh refs."
}
\`\`\`

**Standard reason enum:**

| reason | Meaning | Suggested action |
|--------|---------|------------------|
| element_not_found | Ref doesn't exist in DOM | Call list_elements/get_page_content |
| stale_ref | Ref was valid but DOM changed | Call list_elements to get fresh refs |
| element_not_visible | Element exists but hidden/outside viewport | Call scroll_to_element first |
| element_disabled | Element is disabled | Check page state before interacting |
| intercepted | Element covered by overlay/modal | Close overlay or retry later |
| timeout | Operation exceeded wait time | Increase timeoutMs or check network |
| frame_not_found | frameId doesn't exist | Call list_frames again |

---

## PRIORITIZE-AND-CONFIRM

When multiple valid options exist for a <question>, you MUST analyze and rank them. Present your recommendation clearly by marking the best option with \`(recommended — ...)\` inside the option text itself. Do NOT hide the recommendation in prose outside the <q> block.

Example:

\`\`\`xml
<question>
  <q id="1" type="single" label="Which button should I click?">
    <option>Header "Sign In" button (btn-header-signin)</option>
    <option>Form "Login" button (btn-form-login) (recommended — this is the main form submit button)</option>
  </q>
</question>
\`\`\`

This section is the authoritative reference for PRIORITIZE-AND-CONFIRM, as cited in CONSTRAINTS (ASSUMPTION-BAN, CONTRADICTION-CLARIFY).

---

## TOOL-SPECIFIC RULES

1. **After navigate with waitUntil=networkidle, page is ready for SPA content.**
2. **Screenshot default is viewport only — use fullPage=true only when necessary to avoid token overload.**
3. **If an expected element is not found via list_elements in the main frame, call list_frames to check for iframes before concluding the element doesn't exist.**
4. **If you get stale_ref error, re-fetch elements via list_elements or get_page_content — do NOT retry blindly.**
`;

// ─── JSON variant ─────────────────────────────────────────────────────────
// Used when toolFormat === 'json'. Every tool call is a single JSON object
// inside its own fenced ```json block; prose is emitted as a
// {"type":"markdown","content":"..."} UI object. NO XML tags anywhere.
export const RECON_TOOLS_REFERENCE_JSON = `# RECON TOOLS REFERENCE (JSON FORMAT)

Use JSON objects inside fenced code blocks for ALL output — both tool calls AND UI content. Each object MUST be in its own fenced block, one object per block, no arrays. There are TWO legal shapes, distinguished by the top-level key:

**Shape 1 — Tool call (has a \`"tool"\` key):**
\`\`\`json
{"tool":"<tool_name>","params":{ ... }}
\`\`\`

**Shape 2 — UI/render object (has a \`"type"\` key, NO \`"tool"\` key):**
\`\`\`json
{"type":"markdown","content":"..."}
{"type":"code","language":"ts","content":"..."}
{"type":"question","questions":[ ... ]}
\`\`\`
These replace the XML tags \`<markdown>\`, \`<code>\`, and \`<question>\` used in XML mode. They are NOT executable tools — the renderer consumes them.

**Zero XML in JSON mode.** Do NOT emit \`<markdown>\`, \`<code>\`, \`<question>\`, \`<list_tabs>\`, or any other \`<...>\` tag anywhere in a JSON-mode response.

## Tab Management
### 1. list_tabs
List all open tabs in the active browser session.
- No parameters.
- Example: \`{"tool":"list_tabs","params":{}}\`
- Output: Array of tabs with tabId, title, url, isActive.

### 2. create_tab
Create a new tab with optional URL.
- \`url\` (optional): URL to navigate to. Opens blank tab if not specified.
- Example: \`{"tool":"create_tab","params":{"url":"https://example.com"}}\`
- Output: New tab ID and status.

### 3. close_tab
Close a specific tab.
- \`tabId\` (required): ID of the tab to close. Get from list_tabs.
- Example: \`{"tool":"close_tab","params":{"tabId":"tab-123"}}\`

### 4. switch_tab
Switch to a specific tab.
- \`tabId\` (required): ID of the tab to switch to.
- Example: \`{"tool":"switch_tab","params":{"tabId":"tab-123"}}\`

## Navigation
### 5. navigate
Navigate to a URL in the active tab.
- \`url\` (required): URL to navigate to.
- \`waitUntil\` (optional): \`domcontentloaded\` | \`load\` | \`networkidle\`. Default: \`load\`.
- \`timeoutMs\` (optional): Max wait time in ms. Default: 30000.
- Example: \`{"tool":"navigate","params":{"url":"https://example.com","waitUntil":"networkidle"}}\`
- Output: Navigation status.

### 6. back
Navigate back in the active tab. No parameters.
- Example: \`{"tool":"back","params":{}}\`

### 7. forward
Navigate forward in the active tab. No parameters.
- Example: \`{"tool":"forward","params":{}}\`

### 8. reload
Reload the active tab. No parameters.
- Example: \`{"tool":"reload","params":{}}\`

## Content Extraction
### 9. get_page_content
Get the current page content as markdown with element references.
- \`maxChars\` (optional): Override default truncation threshold (8000 chars).
- Example: \`{"tool":"get_page_content","params":{}}\`
- Output: Page title, URL, markdown content + interactive elements list.

### 10. list_elements
List all interactive elements on the page with filters.
- \`elementType\` (optional): input | button | link | select | textarea | checkbox | radio.
- \`labelContains\` (optional): Filter by keyword in label/placeholder (case-insensitive).
- \`visibleOnly\` (optional, boolean): If true, only return visible elements.
- \`limit\` (optional, number): Max results. Default: 50.
- \`offset\` (optional, number): Pagination start. Default: 0.
- Example: \`{"tool":"list_elements","params":{"elementType":"input","labelContains":"search","visibleOnly":true}}\`
- Output: Array of elements with ref, type, selector, label, value, placeholder, visible, boundingBox.

### 11. list_frames
List all iframes in the current page. No parameters.
- Example: \`{"tool":"list_frames","params":{}}\`
- Output: Array of frames: frameId, frameUrl, name.

### 12. capture_screenshot
Capture screenshot of the current page with numbered overlay (Set-of-Marks) on interactive elements.
- \`fullPage\` (optional, boolean): If true, capture full page height. Default: false (viewport only).
- Example: \`{"tool":"capture_screenshot","params":{}}\`
- Output: Screenshot with numbered badges + ref-map table.
- Important: use the numbered badge to locate an element, then use its matching ref from the ref-map table.

## Page Interaction
### 13. click_element
Click an element on the page.
- \`ref\` (required): Element reference ID from get_page_content, list_elements or capture_screenshot.
- \`clickType\` (optional): \`single\` (default) | \`double\` | \`right\`.
- \`frameId\` (optional): Specify if element is inside an iframe.
- Example: \`{"tool":"click_element","params":{"ref":"btn-login"}}\`
- ⚠ Stale ref: if DOM has changed since last ref fetch, you may get \`stale_ref\`. Call list_elements/get_page_content again to get fresh refs.

### 14. fill_input
Fill an input field (clears existing value then types new value).
- \`ref\` (required): Element reference ID.
- \`value\` (required): Text to fill.
- \`frameId\` (optional): If element is inside an iframe.
- Example: \`{"tool":"fill_input","params":{"ref":"input-email","value":"user@example.com"}}\`

### 15. clear_input
Clear current content of an input field without filling new value.
- \`ref\` (required).
- Example: \`{"tool":"clear_input","params":{"ref":"input-email"}}\`

### 16. select_option
Select a value in a \`<select>\` dropdown.
- \`ref\` (required): Element reference ID of \`<select>\`.
- \`value\` (one of): value attribute of option to select.
- \`label\` (one of): visible text of option (use when value unknown).
- Example: \`{"tool":"select_option","params":{"ref":"select-country","label":"Việt Nam"}}\`

### 17. hover
Hover mouse over an element without clicking — for menus/tooltips that only appear on hover.
- \`ref\` (required).
- Example: \`{"tool":"hover","params":{"ref":"menu-products"}}\`

### 18. upload_file
Upload a file through \`<input type="file">\` element.
- \`ref\` (required): Element reference ID of file input.
- \`filePath\` (required): Path to file on agent machine.
- Example: \`{"tool":"upload_file","params":{"ref":"input-avatar","filePath":"/tmp/avatar.png"}}\`

### 19. press_key
Press keyboard key in active element (or specified element).
- \`key\` (required): Key name (Enter, Tab, Escape, ArrowDown, etc.) or character.
- \`ref\` (optional): If specified, focus this element before pressing.
- Example: \`{"tool":"press_key","params":{"key":"Enter"}}\`

### 20. scroll
Scroll the page.
- \`direction\` (required): \`up\` | \`down\` | \`top\` | \`bottom\`.
- \`amount\` (optional, number): Pixels to scroll (for up/down). Default: 500.
- Example: \`{"tool":"scroll","params":{"direction":"down","amount":1000}}\`

### 21. scroll_to_element
Scroll directly to a specific element (known ref) currently outside viewport.
- \`ref\` (required).
- Example: \`{"tool":"scroll_to_element","params":{"ref":"btn-submit"}}\`

### 22. wait_for
Wait until a condition is met before continuing — important for SPA async loading.
- \`condition\` (required): \`element_visible\` | \`element_hidden\` | \`text_present\` | \`network_idle\`.
- \`ref\` (required if condition=element_visible/element_hidden).
- \`text\` (required if condition=text_present).
- \`timeoutMs\` (optional, number): Default: 10000.
- Example: \`{"tool":"wait_for","params":{"condition":"element_visible","ref":"result-list","timeoutMs":5000}}\`

### 23. evaluate_js
Execute arbitrary JavaScript in the current page context. Use as escape hatch when other tools are insufficient.
⚠ **Safety:** broadest scope in the toolset — use sparingly and only when necessary. Calling this tool triggers IMPACT-CONFIRM: you MUST ask the user to confirm before executing.
- \`script\` (required): JS code to run. Final return value returned (must be serializable).
- Example: \`{"tool":"evaluate_js","params":{"script":"return document.title;"}}\`

## File Management (Recon workspace)
These 5 tools read and write the files that store the intelligence you collect (.recon files and attachments). They work on the recon workspace folder, NOT on the browser. Every file_path is relative to the workspace root and may include sub-folders (e.g. _index.recon, files/ghi-chu/tong-quan.md). Follow the RECON FILE FORMAT section when creating or editing .recon files.

### 24. read_file
Read a file from the recon workspace.
- file_path (required): Path relative to the workspace root.
- start_line (optional, number): First line to read (inclusive).
- end_line (optional, number): Last line to read (inclusive).
- Example: {"tool":"read_file","params":{"file_path":"_index.recon"}}
- Example with range: {"tool":"read_file","params":{"file_path":"_table.recon","start_line":1,"end_line":50}}

### 25. create_file
Create a new file with the given full content. Use it for NEW files; use update_file for targeted edits to existing files. Only overwrite an existing file with create_file when rewriting most of it.
- file_path (required): Path relative to the workspace root (sub-folders allowed).
- content (required): Full file content. In JSON every newline must be written as \n and every double quote as \".
- Example: {"tool":"create_file","params":{"file_path":"_timeline.recon","content":"---\nrecon: 1.0\ntype: tab\ntitle: Timeline\n---\n\n# Mốc thời gian\n@box w=5 maxh=8 ui=timeline icon=History desc=\"Hai sự kiện\"\n\n- 2026-10-01 | Bắt đầu thu thập dữ liệu\n- 2026-10-12 | Hoàn tất đợt thu thập đầu tiên\n"}}

### 26. update_file
Replace one exact snippet of an existing file. Read the file first.
- file_path (required): Path relative to the workspace root.
- old_content (required): Exact original snippet, byte-for-byte (indentation and spacing included).
- new_content (required): Replacement.
- Example: {"tool":"update_file","params":{"file_path":"_kv.recon","old_content":"Mức ưu tiên: Cao [enum] {tone=danger}","new_content":"Mức ưu tiên: Trung bình [enum] {tone=warn}"}}
- ⚠ BYTE-PERFECT: old_content must match exactly.
- ⚠ JSON-STRINGS: Escape newlines, backslashes and double quotes per the JSON spec. Never use HTML entities.

### 27. list_files
List files and folders under a path. Each file entry includes its exact line count (e.g. (155 lines)), so you can size a read batch before calling read_file.
- folder_path (optional): Folder to list, relative to the workspace root. Default: workspace root.
- depth (optional): A number, or the string "max" for the full subtree. Default: 1.
- Example: {"tool":"list_files","params":{}}
- Example with folder: {"tool":"list_files","params":{"folder_path":"files","depth":"max"}}

### 28. delete_file
Delete a file from the recon workspace. Irreversible: you MUST ask the user to confirm with a question (type confirm) before calling it.
- file_path (required): Path relative to the workspace root.
- Example: {"tool":"delete_file","params":{"file_path":"_old-tab.recon"}}

### File tool rules
1. Always read_file before update_file, and copy old_content exactly from what you read.
2. Before reading several files in one turn, sum their line counts from list_files and keep the total at or under 1500 lines; use start_line/end_line for large files.
3. Use create_file for new files and update_file for edits — do not rewrite a whole file just to change one value.
4. Never write a .recon file that breaks the RECON FILE FORMAT section.

## Error Handling
All action tools return unified error schema:
\`\`\`json
{
  "status": "error",
  "tool": "click_element",
  "ref": "btn-login",
  "reason": "stale_ref",
  "message": "Element with ref 'btn-login' no longer matches current DOM. Call list_elements to get fresh refs."
}
\`\`\`
Standard reason enum:
| reason | Meaning | Suggested action |
|--------|---------|------------------|
| element_not_found | Ref doesn't exist in DOM | Call list_elements/get_page_content |
| stale_ref | Ref was valid but DOM changed | Call list_elements to get fresh refs |
| element_not_visible | Element exists but hidden/outside viewport | Call scroll_to_element first |
| element_disabled | Element is disabled | Check page state before interacting |
| intercepted | Element covered by overlay/modal | Close overlay or retry later |
| timeout | Operation exceeded wait time | Increase timeoutMs or check network |
| frame_not_found | frameId doesn't exist | Call list_frames again |

## PRIORITIZE-AND-CONFIRM
When multiple valid options exist for a question object, you MUST analyze and rank them. Present your recommendation clearly by marking the best option with \`(recommended — ...)\` inside the option text itself.
Example:
\`\`\`json
{"type":"question","questions":[{"id":"1","type":"single","label":"Which button should I click?","options":["Header \"Sign In\" button (btn-header-signin)","Form \"Login\" button (btn-form-login) (recommended — main form submit button)"]}]}
\`\`\`

## UI object examples
\`\`\`json
{"type":"markdown","content":"Đã mở tab. Chuẩn bị điền email."}
\`\`\`
\`\`\`json
{"type":"question","questions":[{"id":"1","type":"single","label":"Chọn tab để đóng?","options":["tab-002 (recommended — ít khả năng có dữ liệu chưa lưu)","tab-003","Tất cả"]},{"id":"2","type":"confirm","label":"Tiếp tục điền form đăng ký?"}]}
\`\`\`

## TOOL-SPECIFIC RULES
1. **After navigate with waitUntil=networkidle, page is ready for SPA content.**
2. **Screenshot default is viewport only — use fullPage=true only when necessary to avoid token overload.**
3. **If an expected element is not found via list_elements in the main frame, call list_frames to check for iframes before concluding the element doesn't exist.**
4. **If you get stale_ref error, re-fetch elements via list_elements or get_page_content — do NOT retry blindly.**
`;
