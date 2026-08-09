/**
 * Test language detection logic for CodeBlock component
 * Verifies that file extensions are correctly mapped to Monaco/LSP language IDs
 */

/**
 * Detect correct Monaco/LSP language ID based on file path
 */
function detectLanguageId(filePath: string | undefined, fallbackLanguage: string = 'plaintext'): string {
  if (!filePath) return fallbackLanguage;

  const ext = filePath.toLowerCase().split('.').pop();

  const languageMap: Record<string, string> = {
    'tsx': 'typescriptreact',
    'jsx': 'javascriptreact',
    'ts': 'typescript',
    'js': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sh': 'shell',
    'bash': 'shell',
    'sql': 'sql',
  };

  return languageMap[ext || ''] || fallbackLanguage;
}

// Test cases
const testCases = [
  {
    input: '/home/user/project/Component.tsx',
    expected: 'typescriptreact',
    description: 'TSX file should map to typescriptreact'
  },
  {
    input: '/home/user/project/Component.jsx',
    expected: 'javascriptreact',
    description: 'JSX file should map to javascriptreact'
  },
  {
    input: '/home/user/project/utils.ts',
    expected: 'typescript',
    description: 'TS file should map to typescript'
  },
  {
    input: '/home/user/project/utils.js',
    expected: 'javascript',
    description: 'JS file should map to javascript'
  },
  {
    input: '/home/user/project/config.json',
    expected: 'json',
    description: 'JSON file should map to json'
  },
  {
    input: '/home/user/project/README.md',
    expected: 'markdown',
    description: 'MD file should map to markdown'
  },
  {
    input: '/home/user/project/script.py',
    expected: 'python',
    description: 'PY file should map to python'
  },
  {
    input: '/home/user/project/Main.java',
    expected: 'java',
    description: 'Java file should map to java'
  },
  {
    input: undefined,
    expected: 'plaintext',
    description: 'Undefined path should return fallback'
  },
  {
    input: '/home/user/project/file.unknown',
    expected: 'plaintext',
    description: 'Unknown extension should return fallback'
  },
  {
    input: '/home/khanhromvn/Documents/Coding/Phantoma/src/renderer/src/modules/Tool/components/Tools/Alienvault/components/IndicatorCard.tsx',
    expected: 'typescriptreact',
    description: 'Real project TSX file should map to typescriptreact'
  },
];

console.log('🧪 Testing Language Detection\n');
console.log('═'.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = detectLanguageId(test.input);
  const isPass = result === test.expected;
  
  if (isPass) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${test.description}`);
    console.log(`   Input: ${test.input || '(undefined)'}`);
    console.log(`   Result: ${result}`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${test.description}`);
    console.log(`   Input: ${test.input || '(undefined)'}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got: ${result}`);
  }
  console.log();
});

console.log('═'.repeat(80));
console.log('📊 Test Summary');
console.log('═'.repeat(80));
console.log(`Total: ${testCases.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('═'.repeat(80));

if (failed === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed!`);
  process.exit(1);
}
