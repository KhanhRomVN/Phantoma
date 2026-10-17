# Phantoma Recon Server

Standalone server for browser reconnaissance using Chrome DevTools Protocol (CDP) and Puppeteer.

## Features

- **Multi-browser management**: Launch and control multiple browser instances simultaneously
- **Tab management**: Create, close, and switch between tabs
- **Browser automation**: Navigate, click, fill forms, scroll, screenshot
- **CDP-based**: Direct control via Puppeteer for full automation capabilities
- **REST API**: Simple HTTP endpoints for integration with Phantoma main app

## Architecture

```
Phantoma/recon/
├── src/
│   ├── services/
│   │   ├── browser-manager.service.ts  # Browser lifecycle management
│   │   └── automation.service.ts       # Automation operations
│   ├── routes/
│   │   └── browser.routes.ts           # REST API endpoints
│   ├── types/
│   │   └── session.ts                  # TypeScript interfaces
│   └── index.ts                        # Server entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
cd Phantoma/recon
npm install
```

## Development

```bash
npm run dev
```

Server starts at `http://localhost:3003`

## Production

```bash
npm run build
npm start
```

## API Endpoints

### Browser Management

- `POST /api/browser/launch` - Launch browser for target
- `POST /api/browser/close` - Close browser session
- `GET /api/browser/status` - Get session status

### Tab Management

- `GET /api/browser/tabs` - List all tabs
- `POST /api/browser/tabs` - Create new tab
- `DELETE /api/browser/tabs` - Close tab
- `POST /api/browser/tabs/switch` - Switch to tab

### Navigation

- `POST /api/browser/navigate` - Navigate to URL
- `POST /api/browser/back` - Go back
- `POST /api/browser/forward` - Go forward
- `POST /api/browser/reload` - Reload page

### Automation

- `GET /api/browser/content` - Get page text content
- `POST /api/browser/click` - Click element
- `POST /api/browser/fill` - Fill input field
- `POST /api/browser/key` - Press keyboard key
- `GET /api/browser/screenshot` - Capture screenshot

## Environment Variables

```env
RECON_PORT=3003
RECON_HOST=0.0.0.0
BROWSER_EXECUTABLE_PATH=/opt/ungoogled-chromium/chrome
```

## Integration with Phantoma Main

The main Electron app connects to this server via HTTP requests:

1. User clicks "Launch Browser" in Recon UI
2. Main process sends `POST /api/browser/launch` to recon server
3. Recon server launches browser and returns session info
4. Agent/UI sends automation commands to server
5. Server executes commands on browser via Puppeteer

## Differences from `puppeteer.handlers.ts`

The old implementation in `Phantoma/src/main/ipc/puppeteer.handlers.ts` ran browser automation directly inside the Electron main process. This new architecture:

- **Decouples browser logic** from Electron runtime
- **Runs as standalone service** - can be deployed separately
- **Scales better** - multiple browser instances without blocking main process
- **Cleaner separation** - Recon UI → HTTP → Server → Puppeteer

## Future Enhancements

- [ ] WebSocket support for real-time events (network traffic, console logs)
- [ ] Fingerprint evasion integration
- [ ] Session persistence and recovery
- [ ] Browser profiles management
- [ ] Proxy support per target