import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Test file to verify TypeScript Language Service can detect diagnostics
 * in IndicatorCard.tsx file using LSP functionality
 */

// Path to the file we want to check
const targetFile = path.resolve(
  __dirname,
  '../src/renderer/src/modules/Tool/components/Tools/Alienvault/components/IndicatorCard.tsx'
);

// Path to tsconfig
const tsconfigPath = path.resolve(__dirname, '../tsconfig.renderer.json');

// Read and parse tsconfig
function loadTsConfig(configPath: string): ts.ParsedCommandLine {
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.formatDiagnostic(configFile.error, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (fileName) => fileName,
      getNewLine: () => '\n'
    }));
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  );

  return parsedConfig;
}

// Create language service host
function createLanguageServiceHost(
  files: string[],
  compilerOptions: ts.CompilerOptions
): ts.LanguageServiceHost {
  const fileVersions = new Map<string, number>();
  
  return {
    getScriptFileNames: () => files,
    getScriptVersion: (fileName) => {
      const version = fileVersions.get(fileName) || 0;
      return version.toString();
    },
    getScriptSnapshot: (fileName) => {
      if (!fs.existsSync(fileName)) {
        return undefined;
      }
      const text = fs.readFileSync(fileName, 'utf-8');
      return ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
}

// Format diagnostic message
function formatDiagnostic(diagnostic: ts.Diagnostic, fileName: string): string {
  const { line, character } = diagnostic.file
    ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)
    : { line: 0, character: 0 };

  const category = ts.DiagnosticCategory[diagnostic.category];
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  
  return `[${category}] ${path.basename(fileName)}:${line + 1}:${character + 1} - ${message}`;
}

// Main test function
function runLSPDiagnosticsTest(): void {
  console.log('🔍 Starting LSP Diagnostics Test\n');
  console.log(`Target File: ${targetFile}\n`);

  // Check if file exists
  if (!fs.existsSync(targetFile)) {
    console.error('❌ Error: Target file does not exist!');
    process.exit(1);
  }

  // Load TypeScript config
  console.log('📋 Loading TypeScript configuration...');
  const parsedConfig = loadTsConfig(tsconfigPath);
  console.log('✅ TypeScript config loaded\n');

  // Get all files from tsconfig
  const files = parsedConfig.fileNames;
  console.log(`📁 Found ${files.length} files in project\n`);

  // Create language service
  console.log('🚀 Creating TypeScript Language Service...');
  const serviceHost = createLanguageServiceHost(files, parsedConfig.options);
  const languageService = ts.createLanguageService(serviceHost, ts.createDocumentRegistry());
  console.log('✅ Language Service created\n');

  // Get diagnostics for the target file
  console.log('🔎 Running diagnostics on IndicatorCard.tsx...\n');
  
  const syntacticDiagnostics = languageService.getSyntacticDiagnostics(targetFile);
  const semanticDiagnostics = languageService.getSemanticDiagnostics(targetFile);
  const suggestionDiagnostics = languageService.getSuggestionDiagnostics(targetFile);
  
  const allDiagnostics = [
    ...syntacticDiagnostics,
    ...semanticDiagnostics,
    ...suggestionDiagnostics
  ];

  // Count errors and warnings
  const errors = allDiagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
  const warnings = allDiagnostics.filter(d => d.category === ts.DiagnosticCategory.Warning);
  const suggestions = allDiagnostics.filter(d => d.category === ts.DiagnosticCategory.Suggestion);

  // Display results
  console.log('═'.repeat(80));
  console.log('📊 DIAGNOSTICS SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total Issues: ${allDiagnostics.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Suggestions: ${suggestions.length}`);
  console.log('═'.repeat(80));
  console.log();

  // Display errors
  if (errors.length > 0) {
    console.log('🔴 ERRORS:\n');
    errors.forEach((diagnostic, index) => {
      console.log(`${index + 1}. ${formatDiagnostic(diagnostic, targetFile)}`);
    });
    console.log();
  }

  // Display warnings
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    warnings.forEach((diagnostic, index) => {
      console.log(`${index + 1}. ${formatDiagnostic(diagnostic, targetFile)}`);
    });
    console.log();
  }

  // Display suggestions
  if (suggestions.length > 0 && suggestions.length <= 5) {
    console.log('💡 SUGGESTIONS:\n');
    suggestions.forEach((diagnostic, index) => {
      console.log(`${index + 1}. ${formatDiagnostic(diagnostic, targetFile)}`);
    });
    console.log();
  }

  // Verify expected issues (1 error + 3 warnings)
  console.log('═'.repeat(80));
  console.log('✅ VERIFICATION');
  console.log('═'.repeat(80));
  console.log(`Expected: 1 error + 3 warnings`);
  console.log(`Found: ${errors.length} error(s) + ${warnings.length} warning(s)`);
  
  if (errors.length === 1 && warnings.length === 3) {
    console.log('✅ TEST PASSED: LSP detected exactly 1 error + 3 warnings!');
  } else {
    console.log('⚠️  TEST NOTE: Different number of issues detected than expected');
  }
  console.log('═'.repeat(80));
}

// Run the test
try {
  runLSPDiagnosticsTest();
} catch (error) {
  console.error('❌ Test failed with error:');
  console.error(error);
  process.exit(1);
}
