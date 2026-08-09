# LSP Diagnostics Test

This folder contains tests that use the TypeScript Language Service API to programmatically detect diagnostics (errors and warnings) in TypeScript/React files.

## Overview

The `lsp-diagnostics-test.ts` file demonstrates how to use TypeScript's Language Service API (LSP) to detect compile-time issues in code files, similar to what VSCode's language server does.

## Common Issue: TSX Files Showing Hundreds of Errors

### Problem

If you see LSP reporting hundreds of errors like:
- `'>' expected.`
- `Unterminated regular expression literal`
- `Cannot find name 'div'`, `Cannot find name 'span'`

This means **the LSP server is parsing JSX as plain JavaScript** and misinterpreting JSX syntax (`<div>`) as comparison operators and regex patterns (`< div >`).

### Root Cause

The issue occurs when:
1. File has `.tsx` extension
2. But LSP receives `languageId: "typescript"` instead of `languageId: "typescriptreact"`
3. TypeScript Language Server then parses the file **without JSX support**

### Solution

We added a `detectLanguageId()` helper function in `CodeBlock/index.tsx` that correctly maps file extensions to Monaco/LSP language IDs:

```typescript
'.tsx'  → 'typescriptreact'  // ✅ Enables JSX parsing
'.jsx'  → 'javascriptreact'  // ✅ Enables JSX parsing  
'.ts'   → 'typescript'
'.js'   → 'javascript'
```

This ensures the Language Server receives the correct `languageId` and parses JSX correctly.

### Verification

Run the language detection test:
```bash
npm run test:lang
```

This verifies that all file extensions are correctly mapped to their language IDs.

## Test: IndicatorCard.tsx Diagnostics

### Target File
`src/renderer/src/modules/Tool/components/Tools/Alienvault/components/IndicatorCard.tsx`

### Expected Issues (as shown in VSCode)
- **1 Error:** Cannot find name '$' (line 44)
- **3 Warnings:** 
  - 'IndicatorResult' is declared but never used (line 2)
  - 'globalIdx' is declared but never used (line 28)
  - 'glow' is declared but never used (line 33)

### Running the Test

```bash
npm run test:lsp
```

### Test Results

The TypeScript Language Service API detects all 4 issues, but classifies them all as **Errors** rather than distinguishing between errors and warnings like VSCode does. This is expected behavior because:

1. TypeScript's compiler treats unused variables as errors by default
2. The LSP API uses TypeScript's `DiagnosticCategory` which has three levels:
   - `Error` (severity 1)
   - `Warning` (severity 2)
   - `Suggestion` (severity 3)

VSCode applies additional heuristics to downgrade certain errors to warnings for better UX.

### How It Works

The test:

1. **Loads TypeScript Configuration** - Reads `tsconfig.renderer.json`
2. **Creates Language Service** - Initializes TypeScript's Language Service with project files
3. **Runs Diagnostics** - Executes three types of diagnostics:
   - `getSyntacticDiagnostics()` - Syntax errors
   - `getSemanticDiagnostics()` - Type checking errors
   - `getSuggestionDiagnostics()` - Code suggestions
4. **Formats Results** - Displays diagnostics with file location, line number, and message

### Key Components

#### Language Service Host
The `createLanguageServiceHost()` function implements the `ts.LanguageServiceHost` interface, which provides:
- File list from tsconfig
- File content reading via snapshots
- TypeScript compiler options
- File system operations

#### Diagnostic Formatting
Each diagnostic includes:
- **Category**: Error, Warning, or Suggestion
- **Location**: File name, line number, and column
- **Message**: Detailed description of the issue

### Example Output

```
🔍 Starting LSP Diagnostics Test

Target File: /path/to/IndicatorCard.tsx

📋 Loading TypeScript configuration...
✅ TypeScript config loaded

📁 Found 711 files in project

🚀 Creating TypeScript Language Service...
✅ Language Service created

🔎 Running diagnostics on IndicatorCard.tsx...

════════════════════════════════════════════════════════════════════════════════
📊 DIAGNOSTICS SUMMARY
════════════════════════════════════════════════════════════════════════════════
Total Issues: 4
Errors: 4
Warnings: 0
Suggestions: 0
════════════════════════════════════════════════════════════════════════════════

🔴 ERRORS:

1. [Error] IndicatorCard.tsx:2:22 - 'IndicatorResult' is declared but its value is never read.
2. [Error] IndicatorCard.tsx:28:3 - 'globalIdx' is declared but its value is never read.
3. [Error] IndicatorCard.tsx:33:3 - 'glow' is declared but its value is never read.
4. [Error] IndicatorCard.tsx:44:57 - Cannot find name '$'. Do you need to install type definitions for jQuery?

════════════════════════════════════════════════════════════════════════════════
✅ VERIFICATION
════════════════════════════════════════════════════════════════════════════════
Expected: 1 error + 3 warnings
Found: 4 error(s) + 0 warning(s)
⚠️  TEST NOTE: Different number of issues detected than expected
════════════════════════════════════════════════════════════════════════════════
```

### Technical Notes

#### Why TypeScript LSP Reports All as Errors

The TypeScript compiler's Language Service API classifies issues based on the TypeScript compiler's perspective:

- **Unused variables** (`noUnusedLocals`, `noUnusedParameters`) are compiler errors
- **Undefined names** are type errors

VSCode's TypeScript extension adds additional logic to present some errors as warnings based on severity and user experience considerations.

#### Customizing the Test

To check a different file, modify the `targetFile` constant in `lsp-diagnostics-test.ts`:

```typescript
const targetFile = path.resolve(
  __dirname,
  '../path/to/your/file.tsx'
);
```

### Dependencies

This test uses:
- **typescript** - TypeScript compiler and Language Service API
- **tsx** - TypeScript execution (already in project devDependencies)
- **fs** / **path** - Node.js built-in modules for file operations

No additional npm packages are required!

### References

- [TypeScript Language Service API](https://github.com/microsoft/TypeScript/wiki/Using-the-Language-Service-API)
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [LSP Specification](https://microsoft.github.io/language-server-protocol/)
