/**
 * Tham chiếu công cụ Recon
 * Tài liệu cho các công cụ điều khiển và trinh sát trình duyệt
 */

export const RECON_TOOLS_REFERENCE = `
# RECON TOOLS REFERENCE

## Tab Management

### 1. list_tabs
List all open tabs in the active browser session.

**Parameters:**
- targetId (optional): Target ID. Uses active target if not specified.

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
- targetId (optional): Target ID. Uses active target if not specified.

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
- targetId (optional): Target ID. Uses active target if not specified.

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
- targetId (optional): Target ID. Uses active target if not specified.

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
- tabId (optional): Specific tab ID. Uses active tab if not specified.
- targetId (optional): Target ID. Uses active target if not specified.

**Usage:**
\`\`\`xml
<navigate>
  <url>https://example.com</url>
</navigate>
\`\`\`

---

### 6. back
Navigate back in the active tab.

**Parameters:**
- tabId (optional): Specific tab ID. Uses active tab if not specified.
- targetId (optional): Target ID. Uses active target if not specified.

**Usage:**
\`\`\`xml
<back />
\`\`\`

---

### 7. forward
Navigate forward in the active tab.

**Parameters:**
- tabId (optional): Specific tab ID. Uses active tab if not specified.
- targetId (optional): Target ID. Uses active target if not specified.

**Usage:**
\`\`\`xml
<forward />
\`\`\`

---

### 8. reload
Reload the active tab.

**Parameters:**
- tabId (optional): Specific tab ID. Uses active tab if not specified.
- targetId (optional): Target ID. Uses active target if not specified.

**Usage:**
\`\`\`xml
<reload />
\`\`\`

---

## Content Extraction

### 9. get_page_content
Get the current page content as markdown with element references.

**Parameters:**
- tabId (optional): Specific tab ID. Uses active tab if not specified.
- targetId (optional): Target ID. Uses active target if not specified.

**Usage:**
\`\`\`xml
<get_page_content />
\`\`\`

**Output:**
- Page title, URL, markdown content
- Interactive elements list (inputs, buttons) with ref IDs for interaction

---

### 10. list_elements
List all interactive elements on the page.

**Parameters:**
- elementType (optional): Filter by type (input, button, link, select, textarea)
- tabId (optional): Specific tab ID. Uses active tab if not specified.
- targetId (optional): Target ID. Uses active target if not specified.

**Usage:**
\`\`\`xml
<list_elements>
  <elementType>input</elementType>
</list_elements>
\`\`\`

**Output:**
- Array of elements with: ref, type, selector, label, value, placeholder

---

## Page Interaction

### 11. click_element
Click an element on the page.

**Parameters:**
- ref (required): Element reference ID from get_page_content or list_elements
- tabId (optional): Specific tab ID. Uses active tab if not specified.
- targetId (optional): Target ID. Uses active target if not specified.

**Usage:**
\`\`\`xml
<click_element>
  <ref>btn-login</ref>
</click_element>
\`\`\`

---

### 12. fill_input
Fill an input field with text.

**Parameters:**
- ref (required): Element reference ID from get_page_content or list_elements
- value (required): Text to fill
- tabId (optional): Specific tab ID. Uses active tab if not specified.
- targetId (optional): Target ID. Uses active target if not specified.

**Usage:**
\`\`\`xml
<fill_input>
  <ref>input-email</ref>
  <value>user@example.com</value>
</fill_input>
\`\`\`

---

### 13. press_key
Press keyboard key(s) in the active element.

**Parameters:**
- key (required): Key name (Enter, Tab, Escape, ArrowDown, etc.) or character
- tabId (optional): Specific tab ID. Uses active tab if not specified.
- targetId (optional): Target ID. Uses active target if not specified.

**Usage:**
\`\`\`xml
<press_key>
  <key>Enter</key>
</press_key>
\`\`\`

---

### 14. scroll
Scroll the page.

**Parameters:**
- direction (required): up, down, top, bottom
- amount (optional): Pixels to scroll (for up/down). Default: 500
- tabId (optional): Specific tab ID. Uses active tab if not specified.
- targetId (optional): Target ID. Uses active target if not specified.

**Usage:**
\`\`\`xml
<scroll>
  <direction>down</direction>
  <amount>1000</amount>
</scroll>
\`\`\`

---

## IMPORTANT RULES

1. **Always call list_tabs before assuming tab state**
2. **Always call get_page_content or list_elements before interacting with page elements**
3. **Use element refs from get_page_content/list_elements results, not guessed selectors**
4. **Wait for navigation to complete before getting page content**
`;