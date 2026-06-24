# Phantoma AI Agent - UI Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [UI Architecture](#ui-architecture)
3. [Component Hierarchy](#component-hierarchy)
4. [Layout Structure](#layout-structure)
5. [Tab System](#tab-system)
6. [Chat Interface](#chat-interface)
7. [Models Tab](#models-tab)
8. [Accounts Tab](#accounts-tab)
9. [Settings Tab](#settings-tab)
10. [State-Driven UI](#state-driven-ui)
11. [Styling System](#styling-system)
12. [Interactive Elements](#interactive-elements)
13. [Keyboard Shortcuts](#keyboard-shortcuts)
14. [Responsive Design](#responsive-design)
15. [Complete Code Examples](#complete-code-examples)

---

## Overview

The AI Agent UI is a **single-page React component** built with TypeScript and Tailwind CSS. It provides a complete conversational interface for interacting with the Phantom AI agent, managing LLM models and accounts, and configuring system settings.

### Key Features

- **4-tab layout**: Chat, Models, Accounts, Settings
- **Real-time streaming**: Messages appear token-by-token
- **Markdown rendering**: With syntax highlighting and copy buttons
- **Tool execution visualization**: Collapsible tool blocks with parameters and outputs
- **Thinking process display**: Collapsible AI reasoning
- **Model selection**: Visual grid of providers and models
- **Account management**: Add/delete accounts with Chrome automation or manual credentials
- **Theme consistency**: Dark theme with cyan accent color
- **Keyboard shortcuts**: Power user productivity

### File Location

```
src/renderer/src/components/IntelPanel/AgentPanel/index.tsx
```

---

## UI Architecture

### Component Structure

```
AgentPanel (Root Component)
├── Header (2-row layout)
│   ├── Row 1: Title + Status
│   │   ├── Icon (Cpu)
│   │   ├── Title: "AI Agent Controller"
│   │   ├── Refresh Button
│   │   └── Connection Status (Online/Offline)
│   └── Row 2: Tab Navigation
│       ├── Chat Tab
│       ├── Models Tab
│       ├── Accounts Tab
│       └── Settings Tab
├── Content Area (dynamic based on activeTab)
│   ├── Chat Tab
│   │   ├── Chat Header
│   │   │   ├── Status Indicator
│   │   │   ├── Session Info
│   │   │   ├── New Chat Button
│   │   │   └── Clear Chat Button
│   │   ├── Message List (scrollable)
│   │   │   ├── Welcome Screen (empty state)
│   │   │   ├── User Messages (right-aligned)
│   │   │   └── Assistant Messages (left-aligned)
│   │   │       ├── Thinking Block (collapsible)
│   │   │       ├── Markdown Content
│   │   │       └── Tool Execution Blocks
│   │   └── Input Area
│   │       ├── Textarea (auto-resize)
│   │       ├── Send Button
│   │       ├── Stop Button (during streaming)
│   │       └── Status Bar
│   ├── Models Tab
│   │   ├── Header (title + active model badge)
│   │   ├── Provider Filter
│   │   ├── Loading State
│   │   ├── Empty State
│   │   └── Provider Grid
│   │       └── Model Cards
│   │           ├── Provider header
│   │           ├── Model name
│   │           ├── Description
│   │           ├── Capability badges
│   │           └── Active indicator
│   ├── Accounts Tab
│   │   ├── Header (title + Add Account button)
│   │   ├── Add Account Form (conditional)
│   │   │   ├── Method selector (Chrome/Manual)
│   │   │   ├── Provider dropdown
│   │   │   ├── Email input (manual)
│   │   │   ├── Credential textarea (manual)
│   │   │   ├── Status messages
│   │   │   └── Submit/Cancel buttons
│   │   ├── Search & Filter
│   │   ├── Loading State
│   │   ├── Empty State
│   │   └── Account List
│   │       ├── Account card
│   │       ├── Provider favicon
│   │       ├── Email/Identifier
│   │       ├── Stats (requests, tokens)
│   │       ├── Active badge
│   │       └── Delete button
│   └── Settings Tab
│       ├── Connection Card
│       │   ├── API URL input
│       │   └── Status indicator
│       ├── Language Card
│       │   ├── UI Language dropdown
│       │   └── AI Output Language dropdown
│       ├── Shortcuts Card
│       │   └── Keyboard shortcut list
│       └── Save Settings Button
└── Footer
    ├── Active Model display
    ├── Active Account display
    └── New Chat Button
```

---

## Layout Structure

### Main Container

The root container uses a dark theme with border styling:

```tsx
<div className="flex flex-col bg-[#111520] border border-[#252e42] rounded-xl overflow-hidden shadow-2xl h-full font-sans text-[#c5cfe0]">
  {/* Content */}
</div>
```

**CSS Classes Breakdown:**
- `flex flex-col`: Vertical flex layout
- `bg-[#111520]`: Dark background (#111520)
- `border border-[#252e42]`: Border styling
- `rounded-xl`: Rounded corners (12px)
- `overflow-hidden`: Clip content to border radius
- `shadow-2xl`: Large shadow
- `h-full`: Full height of parent
- `font-sans`: System sans-serif font
- `text-[#c5cfe0]`: Primary text color

### Color Palette

| Color Code | Usage |
|------------|-------|
| `#111520` | Main background |
| `#0f1319` | Secondary background (headers, panels) |
| `#1e2535` | Dividers and borders |
| `#252e42` | Primary borders |
| `#c5cfe0` | Primary text |
| `#6b7a96` | Secondary text |
| `#4e5d78` | Muted/placeholder text |
| `#0ea5e9` | Accent (cyan) - primary action |
| `#ef4444` | Error/stop (red) |
| `#f59e0b` | Warning (amber) |
| `#22c55e` | Success (green) |

---

## Tab System

### Tab Configuration

```tsx
const tabs = [
  { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
  { id: 'models' as const, icon: Cpu, label: 'Models' },
  { id: 'accounts' as const, icon: Users, label: 'Accounts' },
  { id: 'settings' as const, icon: Settings, label: 'Settings' },
];
```

### Tab Rendering

```tsx
<div className="flex items-center px-4 h-[32px] gap-1">
  {tabs.map(({ id, icon: Icon, label }) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
        activeTab === id
          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
          : 'text-[#6b7a96] hover:text-[#c5cfe0] hover:bg-[#1a2035] border border-transparent'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  ))}
</div>
```

**Styling:**
- **Active tab**: Cyan background with opacity, cyan text, border
- **Inactive tab**: Gray text, transparent border, hover effects
- **Icon**: 3.5x3.5 rem (14px)
- **Font size**: 11px

### Tab Content Switching

```tsx
<div className={`flex-1 bg-[#111520] ${activeTab === 'chat' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto p-4'}`}>
  {activeTab === 'chat' && <ChatContent />}
  {activeTab === 'models' && <ModelsContent />}
  {activeTab === 'accounts' && <AccountsContent />}
  {activeTab === 'settings' && <SettingsContent />}
</div>
```

---

## Chat Interface

### Header

```tsx
<div className="px-4 py-2 border-b border-[#1e2535] bg-[#0f1319] flex items-center justify-between shrink-0">
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
    <span className="text-xs font-bold text-white uppercase tracking-wider">
      Agent Session
    </span>
    <span className="text-[10px] text-[#6b7a96] font-mono">
      {activeModelId ? `(${activeModelId})` : '(No model selected)'}
    </span>
  </div>
  <div className="flex gap-2">
    <button
      onClick={handleNewChat}
      className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/20 text-cyan-400 text-[10px] font-semibold transition-all"
    >
      <Plus className="w-3 h-3" />
      New Chat
    </button>
    <button
      onClick={handleClearChatHistory}
      disabled={messages.filter(m => !m.isHidden).length === 0}
      className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Trash2 className="w-3 h-3" />
      Clear Chat
    </button>
  </div>
</div>
```

### Welcome Screen

Displayed when no visible messages exist:

```tsx
<div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[#6b7a96] max-w-sm mx-auto gap-3.5 my-auto">
  <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
    <Sparkles className="w-6 h-6 animate-pulse" />
  </div>
  <div>
    <h4 className="text-sm font-bold text-white mb-1.5">Phantoma AI Agent</h4>
    <p className="leading-relaxed">
      Welcome to the AI Agent chat panel. You can ask the agent to inspect intercepted network requests, filter traffic, analyze payloads, or delete requests.
    </p>
  </div>
  
  {/* Quick action buttons */}
  <div className="w-full grid grid-cols-1 gap-2 mt-2">
    <div className="p-2.5 bg-[#0f1319] border border-[#252e42] hover:border-cyan-500/20 rounded-lg text-left cursor-pointer transition-all hover:bg-[#141924]"
         onClick={() => setInputText("List all captured HTTP/HTTPS requests")}>
      <p className="font-bold text-white mb-0.5">List Network Traffic</p>
      <p className="text-[10px] text-[#6b7a96]">"List all captured HTTP/HTTPS requests"</p>
    </div>
    <div className="p-2.5 bg-[#0f1319] border border-[#252e42] hover:border-cyan-500/20 rounded-lg text-left cursor-pointer transition-all hover:bg-[#141924]"
         onClick={() => setInputText("Find all requests with status 200 from github.com")}>
      <p className="font-bold text-white mb-0.5">Filter Traffic</p>
      <p className="text-[10px] text-[#6b7a96]">"Find all requests with status 200 from github.com"</p>
    </div>
    <div className="p-2.5 bg-[#0f1319] border border-[#252e42] hover:border-cyan-500/20 rounded-lg text-left cursor-pointer transition-all hover:bg-[#141924]"
         onClick={() => setInputText("Show request details for the first request and analyze its security headers")}>
      <p className="font-bold text-white mb-0.5">Analyze Security</p>
      <p className="text-[10px] text-[#6b7a96]">"Show request details for the first request and analyze its security headers"</p>
    </div>
  </div>
</div>
```

### Message Rendering

#### Message Bubble

```tsx
<div
  key={message.id}
  className={`flex flex-col max-w-[85%] ${
    isUser ? 'align-end self-end' : 'align-start self-start'
  }`}
>
  {/* Sender and Time */}
  <span className="text-[10px] text-[#6b7a96] mb-1 px-1 flex items-center gap-1 font-semibold">
    {isUser ? 'User' : 'Agent'}
    <span className="text-[#3d4a61]">•</span>
    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </span>
  
  {/* Message Bubble */}
  <div
    className={`p-3 rounded-xl text-xs leading-relaxed border shadow-md relative group ${
      isUser
        ? 'bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border-cyan-500/35 text-white rounded-tr-none'
        : 'bg-[#0f1319] border-[#252e42] text-[#c5cfe0] rounded-tl-none'
    }`}
  >
    {/* Content */}
  </div>
</div>
```

**User Message Styling:**
- Gradient background: cyan/blue with 20% opacity
- Border: cyan with 35% opacity
- White text
- Rounded top-right corner removed

**Assistant Message Styling:**
- Solid dark background (#0f1319)
- Border: #252e42
- Primary text color
- Rounded top-left corner removed

#### Thinking Block

```tsx
{parsed.thinking && (
  <details className="mb-2.5 bg-[#141822] border border-[#252e42]/60 rounded-lg p-2 text-[11px] text-[#8c9ba5] transition-all">
    <summary className="cursor-pointer font-semibold text-amber-500/90 select-none hover:text-amber-400 flex items-center gap-1">
      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
      Thinking Process
    </summary>
    <div className="mt-2 whitespace-pre-wrap leading-relaxed border-t border-[#1e2535] pt-2">
      {parsed.thinking}
    </div>
  </details>
)}
```

**Features:**
- Collapsible with `<details>` element
- Amber/amber accent color
- Sparkles icon
- Border top separator when expanded

#### Markdown Rendering

```tsx
{parsed.displayText && (
  <div className="prose prose-invert max-w-none text-[12px] whitespace-pre-wrap">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: ({ className, children, ...props }) => {
          const codeContent = String(children).replace(/\n$/, '');
          const match = /language-(\w+)/.exec(className || '');
          return match ? (
            <div className="relative group/code my-2">
              <pre className="bg-[#0b0e14] border border-[#1e2535] p-2.5 rounded-lg overflow-x-auto text-[11px] font-mono">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
              <button
                onClick={() => handleCopy(codeContent)}
                className="absolute right-2 top-2 p-1 rounded bg-[#1c2333] border border-[#2e3954] text-[#8c9ba5] hover:text-white hover:bg-[#252f44] transition-all opacity-0 group-hover/code:opacity-100"
              >
                {copiedText === codeContent ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ) : (
            <code className="bg-[#1a2030] px-1 py-0.5 rounded text-cyan-400 font-mono text-[11px]" {...props}>
              {children}
            </code>
          );
        },
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 border border-[#252e42] rounded-lg">
            <table className="min-w-full divide-y divide-[#252e42] text-[11px] font-sans">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-[#0f1319]">{children}</thead>,
        th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">{children}</th>,
        td: ({ children }) => <td className="px-3 py-1.5 border-t border-[#1e2535] text-[#a0aec0]">{children}</td>,
      }}
    >
      {parsed.displayText}
    </ReactMarkdown>
  </div>
)}
```

**Markdown Features:**
- GFM (GitHub Flavored Markdown) support
- Syntax highlighting for code blocks
- Copy button for code blocks
- Styled tables with headers
- Inline code styling

#### Tool Execution Blocks

```tsx
<div className="mt-2.5 space-y-2 border-t border-[#1e2535] pt-2">
  {parsed.actions.map(renderToolBlock)}
</div>
```

**Tool Block Rendering:**

```tsx
const renderToolBlock = (action: ToolAction) => {
  const outputObj = toolOutputs[action.rawXml];
  const isPending = !outputObj;
  const isError = outputObj?.isError;
  
  return (
    <div key={action.rawXml} className="my-2 border border-[#252e42] bg-[#0b0e14] rounded-lg overflow-hidden text-xs">
      {/* Tool Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#121620] border-b border-[#252e42]">
        <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-semibold">
          <Terminal className="w-3.5 h-3.5" />
          <span>{action.type}</span>
        </div>
        <div>
          {isPending ? (
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running...
            </span>
          ) : isError ? (
            <span className="text-red-400 font-semibold">Failed</span>
          ) : (
            <span className="text-green-400 font-semibold">Completed</span>
          )}
        </div>
      </div>
      
      {/* Tool Parameters */}
      <div className="p-2 bg-[#0b0e14] font-mono text-[10px] text-[#8c9ba5] border-b border-[#1e2535]">
        <span className="text-[#4e5d78]">Parameters:</span>
        <pre className="mt-1 max-h-[80px] overflow-y-auto whitespace-pre-wrap text-[#c5cfe0]">
          {JSON.stringify(action.params, null, 2)}
        </pre>
      </div>

      {/* Tool Output */}
      {!isPending && outputObj?.output && (
        <details className="group">
          <summary className="flex items-center justify-between px-3 py-1 bg-[#121620] cursor-pointer text-[#6b7a96] hover:text-[#c5cfe0] transition-colors select-none text-[10px]">
            <span>Inspect Output</span>
            <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
          </summary>
          <div className="p-2 bg-[#090b10] border-t border-[#1e2535] font-mono text-[10px] overflow-x-auto max-h-[160px] text-[#a0aec0] relative">
            <pre>{outputObj.output}</pre>
            <button
              onClick={() => handleCopy(outputObj.output)}
              className="absolute right-2 top-2 p-1 rounded bg-[#1c2333] border border-[#2e3954] text-[#8c9ba5] hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
              {copiedText === outputObj.output ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </details>
      )}
    </div>
  );
};
```

### Input Area

```tsx
<div className="p-4 border-t border-[#1e2535] bg-[#0f1319] shrink-0">
  {/* Error message */}
  {errorMessage && (
    <div className="mb-3 flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{errorMessage}</span>
      <button onClick={() => setErrorMessage('')} className="text-[#6b7a96] hover:text-white">✕</button>
    </div>
  )}
  
  <div className="relative flex items-end gap-2 bg-[#111520] border border-[#252e42] focus-within:border-cyan-500/40 rounded-xl p-2 transition-all">
    <textarea
      value={inputText}
      onChange={(e) => setInputText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      }}
      disabled={isProcessing}
      placeholder={
        isProcessing 
          ? "Agent is thinking..." 
          : activeModelId 
            ? "Ask the Agent to inspect traffic or filter requests..." 
            : "Please select a model in the Models tab first..."
      }
      rows={Math.min(6, inputText.split('\n').length || 1)}
      className="flex-1 bg-transparent resize-none outline-none border-none text-xs text-white placeholder-[#4e5d78] max-h-[140px] py-1 px-2 font-sans"
    />
    
    {isProcessing ? (
      <button
        onClick={handleStop}
        className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors shrink-0"
      >
        <StopCircle className="w-4 h-4" />
      </button>
    ) : (
      <button
        onClick={() => handleSend()}
        disabled={!inputText.trim()}
        className={`p-2 rounded-lg transition-colors shrink-0 ${
          inputText.trim() 
            ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30' 
            : 'bg-[#1a2030] text-[#4e5d78] cursor-not-allowed'
        }`}
      >
        <Send className="w-4 h-4" />
      </button>
    )}
  </div>
  
  <div className="mt-2 flex items-center justify-between text-[9px] text-[#4e5d78]">
    <span>Press Enter to send, Shift+Enter for new line</span>
    {isProcessing && (
      <span className="flex items-center gap-1 text-cyan-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Agent thinking...
      </span>
    )}
  </div>
</div>
```

---

## Models Tab

### Header

```tsx
<div className="flex items-center justify-between pb-2 border-b border-[#1e2535]">
  <div>
    <h3 className="text-sm font-bold text-white">Model Selection</h3>
    <p className="text-[11px] text-[#6b7a96]">Select the active LLM model for your agent operations.</p>
  </div>
  <div className="flex items-center gap-2">
    {activeModelId && (
      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
        Active: {activeModelId}
      </span>
    )}
  </div>
</div>
```

### Provider Filter

```tsx
<div className="flex items-center gap-3">
  <select
    value={modelProviderFilter}
    onChange={(e) => setModelProviderFilter(e.target.value)}
    className="bg-[#0f1319] border border-[#252e42] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500/40"
  >
    <option value="">All Providers</option>
    {providers
      .filter((p) => p.is_enabled)
      .map((p) => (
        <option key={p.provider_id} value={p.provider_id}>
          {p.provider_name}
        </option>
      ))}
  </select>
  <span className="text-[10px] text-[#6b7a96]">
    {providers
      .filter((p) => p.is_enabled && (!modelProviderFilter || p.provider_id === modelProviderFilter))
      .reduce((sum, p) => sum + (p.models?.length || 0), 0)} models
  </span>
</div>
```

### Model Cards

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {providers
    .filter((p) => p.is_enabled && (!modelProviderFilter || p.provider_id === modelProviderFilter))
    .map((provider) => (
      <div
        key={provider.provider_id}
        className="p-3 bg-[#0f1319] border border-[#252e42] rounded-lg flex flex-col justify-between"
      >
        {/* Provider Header */}
        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#1e2535]">
          {provider.website_url || provider.website ? (
            <img
              src={getFavicon(provider.website_url || provider.website)}
              alt=""
              className="w-3.5 h-3.5 rounded-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
          <span className="text-xs font-bold text-white">
            {provider.provider_name}
          </span>
          <span className="text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 rounded uppercase font-semibold">
            Enabled
          </span>
        </div>

        {/* Models List */}
        <div className="space-y-1.5">
          {provider.models.map((model) => {
            const isActive = activeModelId === model.id;
            return (
              <div
                key={model.id}
                onClick={() => selectModel(model.id)}
                className={`p-2.5 rounded-md border text-xs cursor-pointer transition-all ${
                  isActive
                    ? 'bg-cyan-500/5 border-cyan-500/40 text-white font-medium'
                    : 'bg-[#111520] border-[#1e2535] hover:border-cyan-500/20 text-[#c5cfe0]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{model.name}</span>
                  {isActive && (
                    <span className="text-[9px] text-green-400 font-bold">✓ Active</span>
                  )}
                </div>

                {model.description && (
                  <p className="text-[10px] text-[#6b7a96] mb-1.5 line-clamp-2">
                    {model.description}
                  </p>
                )}

                {/* Info Badges */}
                <div className="flex flex-wrap gap-1">
                  {(model.max_context_length || model.context_length) && (
                    <span className="text-[9px] bg-[#1a2035] text-[#6b7a96] px-1.5 py-0.5 rounded font-mono">
                      Context: {Number(model.max_context_length ?? model.context_length).toLocaleString()}
                    </span>
                  )}
                  {model.is_thinking && (
                    <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded">
                      Thinking
                    </span>
                  )}
                  {model.is_search && (
                    <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-1.5 py-0.5 rounded">
                      Search
                    </span>
                  )}
                  {model.success_rate != null && (
                    <span className="text-[9px] bg-[#1a2035] text-green-400 px-1.5 py-0.5 rounded font-mono">
                      Success: {model.success_rate.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ))}
</div>
```

---

## Accounts Tab

### Header

```tsx
<div className="flex items-center justify-between pb-2 border-b border-[#1e2535]">
  <div>
    <h3 className="text-sm font-bold text-white">Account Manager</h3>
    <p className="text-[11px] text-[#6b7a96]">Manage provider credentials and active sessions.</p>
  </div>
  <button
    onClick={() => setShowAddForm(!showAddForm)}
    className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/25 rounded-md text-[11px] font-semibold transition-all"
  >
    <Plus className="w-3.5 h-3.5" />
    {showAddForm ? 'Hide Form' : 'Add Account'}
  </button>
</div>
```

### Add Account Form

```tsx
<form onSubmit={handleAddAccount} className="p-4 bg-[#0f1319] border border-[#252e42] rounded-lg space-y-3.5 max-w-lg">
  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
    <Plus className="w-3.5 h-3.5 text-cyan-400" />
    Register New Account
  </h4>

  {/* Method Selector */}
  <div className="flex gap-3 p-1.5 bg-[#111520] border border-[#1e2535] rounded-md text-xs">
    <button
      type="button"
      onClick={() => setAddMethod('chrome')}
      className={`flex-1 py-1 rounded text-center font-medium transition-all ${
        addMethod === 'chrome'
          ? 'bg-cyan-500/10 text-cyan-400'
          : 'text-[#6b7a96] hover:text-[#c5cfe0]'
      }`}
    >
      Chrome Login
    </button>
    <button
      type="button"
      onClick={() => setAddMethod('manual')}
      className={`flex-1 py-1 rounded text-center font-medium transition-all ${
        addMethod === 'manual'
          ? 'bg-cyan-500/10 text-cyan-400'
          : 'text-[#6b7a96] hover:text-[#c5cfe0]'
      }`}
    >
      Manual Credentials
    </button>
  </div>

  {/* Provider Selection */}
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="text-[10px] text-[#6b7a96] block mb-1">Provider ID</label>
      <select
        value={selectedAddProvider}
        onChange={(e) => setSelectedAddProvider(e.target.value)}
        className="w-full bg-[#111520] border border-[#1e2535] rounded px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/40"
      >
        {providers
          .filter((p) => p.is_enabled)
          .map((p) => (
            <option key={p.provider_id} value={p.provider_id}>
              {p.provider_name}
            </option>
          ))}
      </select>
    </div>
    {addMethod === 'manual' && (
      <div>
        <label className="text-[10px] text-[#6b7a96] block mb-1">Email / Identifier</label>
        <input
          type="email"
          required
          value={addEmail}
          onChange={(e) => setAddEmail(e.target.value)}
          placeholder="email@example.com"
          className="w-full bg-[#111520] border border-[#1e2535] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500/40 placeholder-[#3d4a61]"
        />
      </div>
    )}
  </div>

  {/* Credential Input (Manual) */}
  {addMethod === 'manual' && (
    <div>
      <label className="text-[10px] text-[#6b7a96] block mb-1">Credential</label>
      <textarea
        required
        value={addCredential}
        onChange={(e) => setAddCredential(e.target.value)}
        placeholder="Input credentials or cookies..."
        rows={3}
        className="w-full bg-[#111520] border border-[#1e2535] rounded px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/40 placeholder-[#3d4a61] font-mono"
      />
    </div>
  )}

  {/* Status Messages */}
  {addMessage && (
    <div className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded p-2 flex items-center gap-1.5">
      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
      <span>{addMessage}</span>
    </div>
  )}

  {addError && (
    <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2 flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>{addError}</span>
    </div>
  )}

  {/* Form Actions */}
  <div className="flex justify-end gap-2.5 pt-1.5">
    <button
      type="button"
      onClick={() => setShowAddForm(false)}
      className="px-3.5 py-1.5 text-xs text-[#6b7a96] hover:text-[#c5cfe0] transition-colors"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={addingAccount}
      className="px-4 py-1.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 text-xs font-semibold rounded transition-all disabled:opacity-50 flex items-center gap-1.5"
    >
      {addingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {addMethod === 'chrome' ? 'Open Chrome Login' : 'Save Account'}
    </button>
  </div>
</form>
```

### Account List

```tsx
<div className="space-y-2.5">
  {filteredAccounts.map((account) => {
    const isActive = activeAccountId === account.id;
    const providerInfo = providers.find((p) => p.provider_id === account.provider_id);
    return (
      <div
        key={account.id}
        onClick={() => selectAccount(account.id)}
        className={`p-3 bg-[#0f1319] border rounded-lg transition-all flex items-center justify-between cursor-pointer ${
          isActive
            ? 'border-cyan-500/50 bg-cyan-500/5'
            : 'border-[#252e42] hover:border-cyan-500/10'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Provider Favicon */}
          <div className="w-8 h-8 rounded-lg bg-[#1a2035] flex items-center justify-center text-xs font-bold text-white shrink-0 border border-[#252e42]">
            {providerInfo?.website_url || providerInfo?.website ? (
              <img
                src={getFavicon(providerInfo.website_url || providerInfo.website)}
                alt=""
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              account.provider_id.slice(0, 2).toUpperCase()
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">{account.email}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a2035] text-[#6b7a96] font-mono">
                {account.provider_id}
              </span>
              {isActive && (
                <span className="text-[9px] text-green-400 font-bold bg-green-500/5 px-1.5 rounded uppercase">
                  Selected
                </span>
              )}
            </div>
            
            {/* Account Stats */}
            <div className="flex gap-3 mt-1.5 text-[9px] text-[#6b7a96] font-mono">
              <span>Requests: {account.total_requests || 0}</span>
              <span>Tokens: {Number(account.total_tokens || 0).toLocaleString()}</span>
              {account.daily_requests !== undefined && (
                <span>Daily: {account.daily_requests} reqs</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteAccount(account.id);
          }}
          className="p-1.5 hover:bg-red-500/15 text-[#6b7a96] hover:text-red-400 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  })}
</div>
```

---

## Settings Tab

### Connection Card

```tsx
<div className="bg-[#0f1319] border border-[#252e42] rounded-lg overflow-hidden">
  <div className="px-4 py-2.5 border-b border-[#1e2535] flex items-center gap-2">
    <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
      <span className="text-[10px]">🔗</span>
    </div>
    <div>
      <h4 className="text-xs font-bold text-white">Connection</h4>
      <p className="text-[9px] text-[#6b7a96]">Backend API endpoint configuration</p>
    </div>
  </div>
  <div className="p-4 space-y-2.5">
    <div className="space-y-1">
      <label className="text-[10px] text-[#6b7a96] block font-semibold uppercase tracking-wider">API URL</label>
      <input
        type="text"
        value={apiUrl}
        onChange={(e) => setApiUrl(e.target.value)}
        placeholder="http://localhost:8888"
        className="w-full bg-[#111520] border border-[#1e2535] rounded-md px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/40 font-mono"
      />
      <p className="text-[9px] text-[#4e5d78]">
        Target endpoint of your Elara / AIWeb2API proxy backend.
      </p>
    </div>
  </div>
</div>
```

### Language Card

```tsx
<div className="bg-[#0f1319] border border-[#252e42] rounded-lg overflow-hidden">
  <div className="px-4 py-2.5 border-b border-[#1e2535] flex items-center gap-2">
    <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
      <span className="text-[10px]">🌐</span>
    </div>
    <div>
      <h4 className="text-xs font-bold text-white">Language</h4>
      <p className="text-[9px] text-[#6b7a96]">UI and AI output language preferences</p>
    </div>
  </div>
  <div className="p-4 space-y-3">
    <div className="space-y-1">
      <label className="text-[10px] text-[#6b7a96] block font-semibold uppercase tracking-wider">UI Language</label>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="w-full bg-[#111520] border border-[#1e2535] rounded-md px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/40"
      >
        <option value="en">🇺🇸 English</option>
        <option value="vi">🇻🇳 Tiếng Việt</option>
      </select>
    </div>
    <div className="space-y-1">
      <label className="text-[10px] text-[#6b7a96] block font-semibold uppercase tracking-wider">AI Output Language</label>
      <select
        value={aiLanguage}
        onChange={(e) => setAiLanguage(e.target.value)}
        className="w-full bg-[#111520] border border-[#1e2535] rounded-md px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/40"
      >
        <option value="English">English</option>
        <option value="Vietnamese">Vietnamese (Tiếng Việt)</option>
        <option value="Japanese">Japanese (日本語)</option>
        <option value="Chinese">Chinese (中文)</option>
      </select>
    </div>
  </div>
</div>
```

### Shortcuts Card

```tsx
<div className="bg-[#0f1319] border border-[#252e42] rounded-lg overflow-hidden">
  <div className="px-4 py-2.5 border-b border-[#1e2535] flex items-center gap-2">
    <div className="w-6 h-6 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
      <span className="text-[10px]">⌨</span>
    </div>
    <div>
      <h4 className="text-xs font-bold text-white">Keyboard Shortcuts</h4>
      <p className="text-[9px] text-[#6b7a96]">Quick actions for power users</p>
    </div>
  </div>
  <div className="p-4 space-y-2">
    {[
      { keys: 'Ctrl + Enter', action: 'New Chat' },
      { keys: 'Enter', action: 'Send Message' },
      { keys: 'Shift + Enter', action: 'New Line' },
    ].map(({ keys, action }) => (
      <div key={keys} className="flex items-center justify-between py-1">
        <span className="text-xs text-[#c5cfe0]">{action}</span>
        <kbd className="text-[10px] font-mono bg-[#1a2035] text-[#6b7a96] px-2 py-0.5 rounded border border-[#252e42]">
          {keys}
        </kbd>
      </div>
    ))}
  </div>
</div>
```

### Save Button

```tsx
<button
  type="button"
  onClick={handleSaveSettings}
  className="px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 text-xs font-semibold rounded-lg transition-all"
>
  Save Settings
</button>
```

---

## State-Driven UI

### Connection Status

```tsx
<div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold">
  <span
    className={`w-2 h-2 rounded-full ${
      serverStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
    }`}
  />
  <span className={serverStatus === 'online' ? 'text-green-400' : 'text-red-400'}>
    {serverStatus === 'online' ? 'Connected' : 'Offline'}
  </span>
</div>
```

### Loading States

```tsx
// Provider Loading
{loadingProviders ? (
  <div className="flex flex-col items-center justify-center py-12 text-[#6b7a96] gap-2">
    <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
    <span className="text-xs">Loading providers & models...</span>
  </div>
) : (
  // Content
)}

// Account Loading
{loadingAccounts ? (
  <div className="flex flex-col items-center justify-center py-12 text-[#6b7a96] gap-2">
    <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
    <span className="text-xs">Loading accounts...</span>
  </div>
) : (
  // Content
)}
```

### Empty States

```tsx
// No Providers
<div className="text-center py-12 text-[#6b7a96] text-xs">
  No providers found. Make sure your AIWeb2API server is running and configured correctly.
</div>

// No Accounts
<div className="text-center py-12 text-[#6b7a96] text-xs">
  No accounts match your criteria or none registered yet.
</div>
```

---

## Styling System

### Tailwind CSS Configuration

The UI uses Tailwind CSS with custom colors and utilities:

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Custom colors from the design system
        'cyan': {
          400: '#0ea5e9',
          500: '#0ea5e9',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // For markdown styling
  ],
};
```

### Inline Tailwind Classes

All styling is done via Tailwind classes directly in JSX:

**Pros:**
- No separate CSS files
- Scoped to components
- Easy to see styling in context
- Consistent design tokens

**Common Patterns:**

| Pattern | Classes |
|---------|---------|
| **Dark backgrounds** | `bg-[#111520]`, `bg-[#0f1319]` |
| **Borders** | `border border-[#252e42]` |
| **Text** | `text-[#c5cfe0]`, `text-[#6b7a96]` |
| **Accent** | `text-cyan-400`, `border-cyan-500/20` |
| **States** | `hover:bg-[#1a2035]`, `disabled:opacity-50` |
| **Transitions** | `transition-all`, `duration-200` |
| **Layout** | `flex`, `flex-col`, `items-center`, `gap-2` |
| **Typography** | `text-xs`, `font-bold`, `uppercase` |

### Custom Scrollbar

```css
/* In global CSS */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: #111520;
}

::-webkit-scrollbar-thumb {
  background: #252e42;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3d4a61;
}
```

---

## Interactive Elements

### Buttons

**Primary Button:**
```tsx
<button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 text-xs font-semibold rounded-lg transition-all">
  Save Settings
</button>
```

**Danger Button:**
```tsx
<button className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 text-[10px] font-semibold transition-all disabled:opacity-40">
  <Trash2 className="w-3 h-3" />
  Clear Chat
</button>
```

**Icon Button:**
```tsx
<button className="p-2 rounded-lg transition-colors bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30">
  <Send className="w-4 h-4" />
</button>
```

### Forms

**Input:**
```tsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Enter value..."
  className="w-full bg-[#111520] border border-[#1e2535] rounded-md px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/40 placeholder-[#3d4a61]"
/>
```

**Select:**
```tsx
<select
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="w-full bg-[#111520] border border-[#1e2535] rounded-md px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/40"
>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
```

**Textarea:**
```tsx
<textarea
  value={value}
  onChange={(e) => setValue(e.target.value)}
  rows={3}
  className="w-full bg-[#111520] border border-[#1e2535] rounded-md px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/40 placeholder-[#3d4a61] font-mono"
/>
```

### Status Indicators

**Online/Offline Dot:**
```tsx
<span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
```

**Processing Spinner:**
```tsx
<Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
```

**Success/Error Messages:**
```tsx
// Success
<div className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded p-2 flex items-center gap-1.5">
  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
  <span>Operation successful</span>
</div>

// Error
<div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2 flex items-center gap-1.5">
  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
  <span>Error message</span>
</div>
```

---

## Keyboard Shortcuts

### Implementation

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleNewChat();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleNewChat]);
```

### Available Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | New Chat |
| `Enter` | Send Message |
| `Shift + Enter` | New Line in input |

---

## Responsive Design

### Grid Layouts

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Content */}
</div>
```

- **Mobile**: Single column (`grid-cols-1`)
- **Tablet/Desktop**: Two columns (`md:grid-cols-2`)

### Max Width Constraints

```tsx
<div className="max-w-sm mx-auto">
  {/* Content */}
</div>
```

### Overflow Handling

```tsx
<div className="overflow-y-auto p-4">
  {/* Scrollable content */}
</div>
```

### Text Truncation

```tsx
<button className="truncate max-w-[120px]">
  {longText}
</button>
```

---

## Complete Code Examples

### Full Component Skeleton

```tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Settings, Users, Cpu, Search, Plus, Trash2, Loader2, AlertCircle, CheckCircle, ChevronRight, RefreshCw, MessageSquare, Send, StopCircle, Sparkles, Terminal, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function AgentPanel() {
  // State declarations
  const [activeTab, setActiveTab] = useState<'chat' | 'models' | 'accounts' | 'settings'>('chat');
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('aiweb2api-url') || 'http://localhost:8888');
  const [language, setLanguage] = useState(() => localStorage.getItem('preferred-language') || 'en');
  const [aiLanguage, setAiLanguage] = useState(() => localStorage.getItem('ai-language') || 'English');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline'>('offline');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeModelId, setActiveModelId] = useState(() => localStorage.getItem('active-model-id') || '');
  const [activeAccountId, setActiveAccountId] = useState(() => localStorage.getItem('active-account-id') || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string>(() => localStorage.getItem('active-conversation-id') || '');
  const [toolOutputs, setToolOutputs] = useState<Record<string, { output: string; isError: boolean }>>({});
  const [isStopped, setIsStopped] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Refs
  const messagesRef = useRef<Message[]>([]);
  const prevProcessingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Effects
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (currentConversationId) {
      const loaded = ChatStorage.loadMessages(currentConversationId) as Message[];
      const hasSystemPrompt = loaded.some(m => m.role === 'system');
      if (!hasSystemPrompt) {
        const systemMsg: Message = {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: SYSTEM_PROMPT,
          timestamp: Date.now(),
          isHidden: true,
        };
        const updated = [systemMsg, ...loaded];
        ChatStorage.saveMessages(currentConversationId, updated);
        setMessages(updated);
      } else {
        setMessages(loaded);
      }
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      ChatStorage.saveMessages(currentConversationId, messages);
    }
  }, [messages, currentConversationId]);

  // ... more code

  return (
    <div className="flex flex-col bg-[#111520] border border-[#252e42] rounded-xl overflow-hidden shadow-2xl h-full font-sans text-[#c5cfe0]">
      {/* UI content */}
    </div>
  );
}
```

### Chat Message Component

```tsx
const renderMessage = (message: Message) => {
  const isUser = message.role === 'user';
  const parsed = parseAIResponse(message.content);
  
  return (
    <div
      key={message.id}
      className={`flex flex-col max-w-[85%] ${
        isUser ? 'align-end self-end' : 'align-start self-start'
      }`}
    >
      <span className="text-[10px] text-[#6b7a96] mb-1 px-1 flex items-center gap-1 font-semibold">
        {isUser ? 'User' : 'Agent'}
        <span className="text-[#3d4a61]">•</span>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      
      <div
        className={`p-3 rounded-xl text-xs leading-relaxed border shadow-md relative group ${
          isUser
            ? 'bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border-cyan-500/35 text-white rounded-tr-none'
            : 'bg-[#0f1319] border-[#252e42] text-[#c5cfe0] rounded-tl-none'
        }`}
      >
        {/* Thinking Block */}
        {parsed.thinking && (
          <details className="mb-2.5 bg-[#141822] border border-[#252e42]/60 rounded-lg p-2 text-[11px] text-[#8c9ba5]">
            <summary className="cursor-pointer font-semibold text-amber-500/90 select-none hover:text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Thinking Process
            </summary>
            <div className="mt-2 whitespace-pre-wrap leading-relaxed border-t border-[#1e2535] pt-2">
              {parsed.thinking}
            </div>
          </details>
        )}
        
        {/* Markdown Content */}
        {parsed.displayText && (
          <div className="prose prose-invert max-w-none text-[12px] whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {parsed.displayText}
            </ReactMarkdown>
          </div>
        )}
        
        {/* Tool Actions */}
        {parsed.actions && parsed.actions.length > 0 && (
          <div className="mt-2.5 space-y-2 border-t border-[#1e2535] pt-2">
            {parsed.actions.map(renderToolBlock)}
          </div>
        )}
      </div>
    </div>
  );
};
```

### Footer Component

```tsx
<div className="px-4 py-1.5 border-t border-[#1e2535] bg-[#0f1319] flex items-center justify-between text-[10px] text-[#6b7a96] shrink-0 font-mono">
  <div className="flex items-center gap-3 min-w-0">
    <div className="truncate flex items-center gap-1">
      <span className="text-[#4e5d78]">Model:</span>
      <button
        onClick={() => setActiveTab('models')}
        className={`truncate max-w-[120px] hover:underline ${activeModelId ? 'text-cyan-400 font-bold' : 'italic text-[#4e5d78]'}`}
      >
        {activeModelId || 'None'}
      </button>
    </div>
    <span className="text-[#252e42]">|</span>
    <div className="truncate flex items-center gap-1">
      <span className="text-[#4e5d78]">Account:</span>
      <button
        onClick={() => setActiveTab('accounts')}
        className={`truncate max-w-[120px] hover:underline ${activeAccountId ? 'text-cyan-400 font-bold' : 'italic text-[#4e5d78]'}`}
      >
        {accounts.find((a) => a.id === activeAccountId)?.email || activeAccountId || 'None'}
      </button>
    </div>
  </div>
  <button
    onClick={handleNewChat}
    className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-[9px] font-semibold transition-all shrink-0"
    title="New Chat (Ctrl+Enter)"
  >
    <Plus className="w-2.5 h-2.5" />
    New
  </button>
</div>
```

---

## Testing the UI

### Manual Testing Checklist

- [ ] All tabs render correctly
- [ ] Chat messages display with proper alignment
- [ ] Markdown renders with syntax highlighting
- [ ] Code blocks have copy buttons
- [ ] Thinking blocks are collapsible
- [ ] Tool blocks show status (Running/Completed/Failed)
- [ ] Tool parameters display properly
- [ ] Tool output is collapsible and copyable
- [ ] Input area auto-resizes
- [ ] Send button enables/disables correctly
- [ ] Stop button appears during streaming
- [ ] Keyboard shortcuts work
- [ ] Connection status updates
- [ ] Model selection persists
- [ ] Account management works
- [ ] Settings save and load from localStorage
- [ ] Welcome screen shows when no messages
- [ ] Empty states display correctly
- [ ] Loading states show spinners
- [ ] Error messages display properly

---

## Performance Considerations

### Optimizations

1. **Memoized components**: Use `React.memo` for message items
2. **Virtual scrolling**: For large message histories
3. **Debounced input**: For auto-resize textarea
4. **Lazy loading**: Load models and accounts on tab switch
5. **SSE streaming**: Real-time updates without full re-renders

### Code Splitting

```tsx
// Lazy load tabs
const ChatTab = React.lazy(() => import('./tabs/ChatTab'));
const ModelsTab = React.lazy(() => import('./tabs/ModelsTab'));
const AccountsTab = React.lazy(() => import('./tabs/AccountsTab'));
const SettingsTab = React.lazy(() => import('./tabs/SettingsTab'));
```

---

## Accessibility

### ARIA Labels

```tsx
<button
  aria-label="New Chat"
  title="New Chat (Ctrl+Enter)"
  onClick={handleNewChat}
>
  <Plus className="w-3 h-3" />
</button>
```

### Keyboard Navigation

- Tab order follows visual hierarchy
- Focus indicators for interactive elements
- Keyboard shortcuts documented

### Color Contrast

- Text colors meet WCAG AA standards
- Status colors have sufficient contrast
- Hover states provide clear feedback

---

## Conclusion

The Phantoma AI Agent UI is a **comprehensive, well-designed** interface built with React and Tailwind CSS. It provides:

- **Intuitive navigation** through 4 tabs
- **Real-time chat** with markdown and tool support
- **Visual feedback** for all states (loading, error, success)
- **Consistent theming** with dark theme and cyan accent
- **Keyboard shortcuts** for power users
- **Responsive design** for different screen sizes

**Key Files:**
- Component: `src/renderer/src/components/IntelPanel/AgentPanel/index.tsx`
- Styling: Tailwind CSS (inline)
- Icons: Lucide React
- Markdown: React Markdown + remark-gfm

**Extending the UI:**
1. Add new tabs in the tab array
2. Create new tab content sections
3. Add new state variables for features
4. Use existing styling patterns for consistency
5. Follow the component hierarchy for organization

---

*Documentation generated from Phantoma source code (v1.0.0)*  
*Last updated: 2026-06-24*