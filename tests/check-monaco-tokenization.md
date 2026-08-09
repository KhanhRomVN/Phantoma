# Debug: Check Monaco Tokenization

## In Browser Console, run these commands:

```javascript
// 1. Check if Monaco is loaded
console.log('Monaco loaded:', !!window.monaco);

// 2. Get the model
const models = window.monaco.editor.getModels();
console.log('Models count:', models.length);

// 3. Check the TSX model
const tsxModel = models.find(m => m.uri.path.includes('IndicatorCard.tsx'));
console.log('TSX Model:', {
  uri: tsxModel?.uri.toString(),
  language: tsxModel?.getLanguageId(),
  lineCount: tsxModel?.getLineCount()
});

// 4. Check tokenization for line 1 (import statement)
if (tsxModel) {
  const line1Tokens = window.monaco.editor.tokenize(tsxModel.getLineContent(1), tsxModel.getLanguageId());
  console.log('Line 1 tokens:', line1Tokens);
}

// 5. Check if TypeScript language is registered
const languages = window.monaco.languages.getLanguages();
console.log('Registered languages:', languages.map(l => l.id));

// 6. Check theme
const currentTheme = window.monaco.editor.getTheme?.() || 'unknown';
console.log('Current theme:', currentTheme);
```

## Expected Output:

**If tokenization is working:**
```
Line 1 tokens: [
  { type: 'keyword.ts', offset: 0 },      // 'import'
  { type: 'identifier.ts', offset: 7 },   // 'React'
  { type: 'keyword.ts', offset: 13 },     // 'from'
  { type: 'string.ts', offset: 18 },      // "'react'"
]
```

**If tokenization is NOT working:**
```
Line 1 tokens: [
  { type: '', offset: 0 }  // Empty type = no tokenization!
]
```
