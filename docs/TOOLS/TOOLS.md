# TOOLS DASHBOARD MODULE DOCUMENTATION

## OVERVIEW

The **Tools Dashboard Module** is a unified UI component that provides access to all server-side security tools in one centralized interface. It allows users to view detailed documentation for each tool, understand input parameters and return data structures, and test tools directly without going through other pipeline modules.

## MODULE LOCATION

```
src/renderer/src/features/Tool/components/ToolsDashboard/
```

## FEATURES

### 1. TOOL LISTING
Displays all available server tools (from `server/internal/service/`) in a responsive grid layout. Each tool card shows:
- Tool name
- Brief description
- Documentation button (for viewing input/output schemas)
- Expandable area for testing

### 2. TOOL DOCUMENTATION
Each tool includes comprehensive documentation:
- **Input Parameters**: Name, type, required status, description, and default values
- **Return Data Structure**: Detailed JSON structure of what the tool returns
- **Description**: What the tool does and when to use it

### 3. TESTING INTERFACE
Built-in tool testing without pipeline dependencies:
- Form inputs for all tool parameters
- Real-time parameter validation
- Direct execution against server API
- Results display with execution time
- Success/failure indicators

## TOOLS CURRENTLY SUPPORTED

The dashboard supports all tools found in `server/internal/service/`:

| TOOL | DESCRIPTION |
|------|-------------|
| **Nuclei** | Vulnerability scanner using templates for CVEs and misconfigurations |
| **Nmap** | Network discovery and port scanning |
| **Subfinder** | Passive subdomain enumeration |
| **GAU (GetAllUrls)** | Historical URL discovery from online archives |
| **Metasploit** | Exploitation framework |
| **Go Dork** | Google dorking for sensitive information |
| **RustScan** | High-speed port scanner |
| **SearchSploit** | Exploit database search |
| **Nikto** | Web server vulnerability scanner |
| **AlienVault OTX** | Threat intelligence and IoC lookup |
| **Amass** | Advanced subdomain enumeration and network mapping |

## COMPONENT STRUCTURE

### MAIN COMPONENT: `ToolsDashboard`

```typescript
interface ToolParameter {
  name: string;
  type: string;        // 'string', 'number', 'boolean', 'array'
  required: boolean;
  description: string;
  default?: any;
}

interface ToolSchema {
  name: string;
  description: string;
  parameters: ToolParameter[];
  returnType: {
    type: string;
    structure: any;     // JSON structure of return data
    description: string;
  };
}
```

### STATE MANAGEMENT
- `expandedTool`: Currently expanded tool card
- `executingTool`: Tool currently being tested
- `results`: Map of tool execution results
- `formData`: Map of form inputs for each tool
- `showSchema`: Toggle for schema documentation visibility

## INTEGRATION WITH MODULEBAR

The Tools Dashboard is accessible from the main navigation sidebar:

```typescript
// In NAV_MODULES array
{
  id: 'tools',
  title: 'Server Tools',
  activeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
}
```

Navigation icon uses the `Wrench` icon from `lucide-react`.

## API INTEGRATION

### REQUIRED SERVER ENDPOINTS

The dashboard expects the following API endpoints (currently using mock data):

| ENDPOINT | METHOD | PURPOSE |
|----------|--------|---------|
| `GET /api/tools` | GET | List all available tools with metadata |
| `GET /api/tools/:toolName/schema` | GET | Get input/output schema for specific tool |
| `POST /api/tools/:toolName/execute` | POST | Execute tool with provided parameters |

### API RESPONSE FORMAT

**GET /api/tools/:toolName/schema**
```json
{
  "name": "nuclei",
  "description": "Vulnerability scanner...",
  "parameters": [
    {
      "name": "target",
      "type": "string",
      "required": true,
      "description": "Target URL or IP"
    }
  ],
  "returnType": {
    "type": "array",
    "structure": {
      "id": "string",
      "name": "string",
      "severity": "string"
    }
  }
}
```

**POST /api/tools/:toolName/execute**
```json
{
  "parameters": {
    "target": "example.com",
    "tags": ["cve"]
  }
}
```

**RESPONSE**
```json
{
  "success": true,
  "data": { /* tool-specific results */ },
  "output": "Execution log output",
  "executionTime": 2345
}
```

## UI STYLING

The component uses Tailwind CSS with the application's existing dark theme:
- Background: `bg-[#0f1319]`
- Cards: `bg-[#161b26]` with `border-[#1e2535]`
- Active elements: Cyan/emerald accents
- Hover states: Cyan border on cards

## USAGE

### ADDING TO PARENT COMPONENT

```typescript
import ToolsDashboard from './components/ToolsDashboard';

// In your routing/rendering logic
{activeModule === 'tools' && <ToolsDashboard />}
```

### TO ADD A NEW TOOL

1. Add tool schema to `TOOLS_SCHEMAS` object
2. Ensure the tool exists in `server/internal/service/`
3. The dashboard will automatically display it

## FUTURE ENHANCEMENTS

1. **Real API Integration**: Replace mock data with actual server API calls
2. **Execution History**: Save and replay tool executions
3. **Batch Execution**: Run multiple tools sequentially
4. **Export Results**: Export test results to JSON/CSV
5. **WebSocket Support**: Real-time execution progress updates
6. **Parameter Presets**: Save commonly used parameter combinations
7. **Tool Dependencies**: Show tools that depend on each other
8. **Performance Metrics**: Track execution time history per tool

## TROUBLESHOOTING

### COMMON ISSUES

1. **"WrenchIcon not found"**
   - Ensure `lucide-react` has Wrench export (version 0.300+)
   - Import: `import { Wrench } from 'lucide-react'`

2. **Tools not showing**
   - Verify `PhantomModule` type includes 'tools'
   - Check ModuleBar NAV_MODULES includes tools entry

3. **Execution fails**    
   - Ensure server API endpoints are implemented
   - Check CORS configuration
   - Verify tool container is running

## VERSION HISTORY

- **v1.0.0** (Current): Initial implementation with mock data and 11 tools
- Future: Full API integration with all server tools

## RELATED FILES

- `src/renderer/src/features/Tool/components/ToolsDashboard/index.tsx` - Main component
- `src/renderer/src/features/Tool/components/ModuleBar/index.tsx` - Navigation integration
- `src/renderer/src/features/Tool/types/types.ts` - Type definitions
- `server/internal/service/*` - Server tool implementations