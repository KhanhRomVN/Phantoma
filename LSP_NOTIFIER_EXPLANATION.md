# 🔔 LSP Notifier Explanation

## ❓ Tại Sao Có Toast Khi Mở File .tsx?

### 🎯 Đây là **LSP Notifier Feature**

**Location**: `src/renderer/src/modules/Code/hooks/useLSPNotifier.ts`

**Workflow:**
```
1. User opens .tsx file
   ↓
2. useLSPNotifier detects file type
   ↓
3. Check if LSP server installed (localStorage)
   ↓
4. If NOT installed → Show toast with suggestions
```

### 📋 Toast Content:

**Title**: "TypeScript Language Server not installed"

**Description**: "Want IntelliSense for TypeScript? Install via Extensions or quick install the LSP server."

**Actions:**
1. **Browse Extensions** (Primary) - Opens Extensions panel
2. **Quick Install** (Secondary) - Installs raw LSP server via npm
3. **Dismiss** (Ghost) - Hides forever for this language

---

## 🔄 Updated Logic (After Migration)

### Before:
```typescript
// Old behavior
Toast → [Install] → npm install -g typescript-language-server
```

### After:
```typescript
// New behavior - Hybrid approach
Toast → [Browse Extensions] → Extensions Panel (Recommended)
     → [Quick Install] → npm install (Fallback)
     → [Dismiss] → Never show again
```

---

## 🎨 User Experience

### Scenario 1: User Mở File TypeScript Lần Đầu

```
┌─────────────────────────────────────────────┐
│ 🔔 TypeScript Language Server not installed│
│                                             │
│ Want IntelliSense for TypeScript?          │
│ Install via Extensions or quick install.   │
│                                             │
│ [Browse Extensions] [Quick Install] [Dismiss]│
└─────────────────────────────────────────────┘
```

**Click "Browse Extensions":**
- Opens Extensions panel (📦 tab)
- Shows Python, TypeScript, Rust, etc. extensions
- User can install full VS Code extension (recommended)

**Click "Quick Install":**
- Runs `npm install -g typescript-language-server`
- Shows progress bar
- Fast but only installs raw LSP server

**Click "Dismiss":**
- Saves to localStorage
- Never shows again for TypeScript

---

## 🛠️ How It Works

### 1. File Detection (`lsp.service.ts`)

```typescript
// Detect language from file extension
detectLanguage('Component.tsx') // → 'typescript'

// Get LSP server info
getLSPServer('Component.tsx') // → { 
//   id: 'typescript',
//   name: 'TypeScript Language Server',
//   npmPackage: 'typescript-language-server',
//   ...
// }
```

### 2. Installation Check

```typescript
// Check localStorage
isLSPInstalled('typescript') // → false (first time)
isLSPDismissed('typescript') // → false

// → Show toast!
```

### 3. User Action

**Option A: Browse Extensions**
```typescript
// Navigate to Extensions panel
useCodeStore.getState().setActivityPanelTab('extensions');

// User can now browse and install:
// - Python extension
// - TypeScript extension  
// - Rust Analyzer extension
// etc.
```

**Option B: Quick Install**
```typescript
// Install raw LSP server
await window.api.invoke('shell:exec', 
  'npm install -g typescript-language-server'
);

// Mark as installed
markLSPInstalled('typescript');

// Never show again
```

**Option C: Dismiss**
```typescript
// Mark as dismissed
dismissLSP('typescript');

// Saved to localStorage: { 'lsp-dismissed': ['typescript'] }
// Never show again
```

---

## 🎛️ Configuration

### Disable LSP Notifier Entirely

If you don't want the toast at all:

**Option 1: Comment out in Code.tsx**
```typescript
// src/renderer/src/modules/Code/Code.tsx
export function Code() {
  // useLSPNotifier(); // ← Comment this line
  // ...
}
```

**Option 2: Dismiss All Languages**
```typescript
// In browser console
['typescript', 'javascript', 'python', 'rust', 'go'].forEach(lang => {
  localStorage.setItem('lsp-dismissed', 
    JSON.stringify([...existing, lang])
  );
});
```

---

## 🔧 Customization

### Change Delay Before Showing Toast

```typescript
// useLSPNotifier.ts
useEffect(() => {
  const timer = setTimeout(() => {
    // ...
  }, 1500); // ← Change this (milliseconds)
  
  return () => clearTimeout(timer);
}, [activeFileTabId]);
```

### Change Toast Appearance

```typescript
// useLSPNotifier.ts
toastService.show({
  id: LSP_TOAST_ID,
  title: 'Custom Title',
  description: 'Custom description',
  variant: 'info', // 'info' | 'success' | 'warning' | 'error'
  // ...
});
```

### Add More Languages

```typescript
// lsp.service.ts
const LSP_SERVERS: Record<string, LSPServer> = {
  // ... existing languages
  
  ruby: {
    id: 'ruby',
    name: 'Solargraph',
    language: 'Ruby',
    npmPackage: 'solargraph',
    description: 'Ruby language server',
    homepage: 'https://github.com/castwide/solargraph',
  },
  
  // Add more...
};
```

---

## 🎯 Recommendation

### ✅ Keep LSP Notifier Active

**Why:**
1. Helps users discover language support
2. Smooth onboarding experience
3. Can choose Extensions (recommended) or quick install
4. Can dismiss forever if not needed

### 🔄 User Journey

```
Open .tsx file
   ↓
See toast notification
   ↓
Click "Browse Extensions" (Recommended)
   ↓
Install Python/TypeScript/etc. extension
   ↓
Get full VS Code experience
   ↓
Never see toast again (auto-dismissed)
```

---

## 📊 Statistics Tracking (Optional Enhancement)

Track which languages users need:

```typescript
// Add to useLSPNotifier
const trackLanguageDetected = (languageId: string) => {
  window.api.invoke('analytics:track', {
    event: 'lsp_detected',
    language: languageId,
  });
};

const trackInstallAction = (languageId: string, method: 'extension' | 'quick') => {
  window.api.invoke('analytics:track', {
    event: 'lsp_installed',
    language: languageId,
    method,
  });
};
```

---

## ✨ Summary

**Toast xuất hiện vì:**
- ✅ Feature tốt để onboard users
- ✅ Suggest install language support
- ✅ Giờ có 2 options: Extensions (recommended) hoặc Quick Install

**Nên làm gì:**
- ✅ Click "Browse Extensions" → Install full extension (best)
- ✅ Click "Quick Install" → Fast npm install (fallback)
- ✅ Click "Dismiss" → Never show again

**Muốn tắt hẳn:**
- Comment out `useLSPNotifier()` trong `Code.tsx`
