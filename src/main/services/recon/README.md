# Recon Browser Automation Handlers

This directory contains handler classes for browser automation using Playwright. These handlers are used in the main process to execute browser operations requested from the renderer process via IPC.

## Handlers

### TabHandler
Manages browser tabs (pages):
- Register/unregister tabs
- Track active tab
- List all tabs with metadata (title, URL, status)
- Close tabs

### NavigationHandler
Handles page navigation:
- Navigate to URLs
- Go back/forward in history
- Reload pages
- Wait for navigation completion

### ContentHandler
Extracts page content and elements:
- Convert page to markdown
- Extract interactive elements (inputs, buttons, links, etc.)
- Generate element references for AI interaction
- List elements by type

### InteractionHandler
Handles user interactions:
- Click elements
- Fill input fields
- Press keyboard keys
- Scroll pages
- Hover, select options, check/uncheck
- Wait for elements

## Usage

These handlers are designed to be used in the main process IPC handlers:

```typescript
import { 
  TabHandler, 
  NavigationHandler, 
  ContentHandler, 
  InteractionHandler 
} from './services/recon';

// Create handler instances for each browser session
const tabHandler = new TabHandler();
const navigationHandler = new NavigationHandler();
const contentHandler = new ContentHandler();
const interactionHandler = new InteractionHandler();

// Use in IPC handlers
ipcMain.handle('browser:listTabs', async (event, targetId) => {
  const session = getSession(targetId);
  const tabs = await session.tabHandler.listTabs();
  return { success: true, data: { tabs } };
});
```

## Integration

See `RECON_IPC_INTEGRATION.md` in the project root for detailed integration instructions.

## Note

These handlers require **Puppeteer** (not Playwright) and should only be used in the main process (Node.js environment), not in the renderer process (browser environment).

## API Differences from Playwright

This project uses Puppeteer instead of Playwright. Key API differences:
- `page.fill()` → `page.type()` 
- `page.waitForLoadState()` → `page.waitForNavigation()`
- `page.check()` → manual check via `page.click()` if unchecked
- `text=selector` → XPath `//*[contains(text(), '...')]`
