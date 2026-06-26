#!/usr/bin/env tsx
/**
 * Unused Code Analyzer for Phantoma
 * Scans TypeScript/TSX files to find unused files, exports, and functions.
 * 
 * Usage:
 *   tsx scripts/find-unused.ts <target_folder_path>
 * 
 * Example:
 *   tsx scripts/find-unused.ts src/renderer/src/features/Emulate
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import ts from 'typescript';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// Types
interface ImportInfo {
  sourceFile: string;      // File that contains the import
  importedFrom: string;    // Path being imported from (relative or module)
  importedNames: string[]; // Names being imported (for named imports)
  defaultImport?: string;  // Default import name if any
  namespaceImport?: string; // Namespace import name if any
}

interface ExportInfo {
  exportedFrom: string;    // File that exports
  exportedName: string;    // Name being exported
  isDefault: boolean;      // Whether it's a default export
  isType: boolean;         // Whether it's a type export
}

interface FunctionInfo {
  file: string;
  name: string;
  isExported: boolean;
  isDefaultExport: boolean;
  startLine: number;
}

interface AnalysisResult {
  allFiles: string[];
  usedFiles: Set<string>;
  unusedFiles: string[];
  allExports: Map<string, ExportInfo>; // key: "file:exportName"
  usedExports: Set<string>;            // key: "file:exportName"
  unusedExports: string[];
  allFunctions: Map<string, FunctionInfo>; // key: "file:functionName"
  usedFunctions: Set<string>;             // key: "file:functionName"
  unusedFunctions: string[];
  importMap: Map<string, ImportInfo[]>;    // key: importedFrom, value: ImportInfo[]
  exportMap: Map<string, ExportInfo[]>;    // key: file, value: ExportInfo[]
}

// Configuration
const TS_EXTENSIONS = ['.ts', '.tsx'];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'out', '.git', '__tests__', 'test', 'tests', 'coverage'];
const EXCLUDED_FILES = ['*.d.ts', 'index.ts', 'index.tsx']; // Exclude declaration files and index files from unused file detection

// Main analyzer class
class UnusedAnalyzer {
  private rootPath: string;
  private tsFiles: string[] = [];
  private fileContentCache: Map<string, string> = new Map();
  private result: AnalysisResult = {
    allFiles: [],
    usedFiles: new Set(),
    unusedFiles: [],
    allExports: new Map(),
    usedExports: new Set(),
    unusedExports: [],
    allFunctions: new Map(),
    usedFunctions: new Set(),
    unusedFunctions: [],
    importMap: new Map(),
    exportMap: new Map(),
  };

  constructor(targetPath: string) {
    this.rootPath = path.resolve(targetPath);
  }

  async analyze(): Promise<AnalysisResult> {
    console.log(chalk.cyan(`🔍 Scanning ${this.rootPath}...`));

    // Step 1: Find all TS/TSX files
    await this.collectFiles(this.rootPath);
    console.log(chalk.gray(`Found ${this.tsFiles.length} TypeScript files`));

    // Step 2: Parse each file to extract imports, exports, and functions
    for (const file of this.tsFiles) {
      await this.parseFile(file);
    }

    // Step 3: Analyze usage - mark used files
    this.analyzeFileUsage();

    // Step 4: Analyze unused exports
    this.analyzeUnusedExports();

    // Step 5: Analyze unused functions
    this.analyzeUnusedFunctions();

    // Step 6: Generate report
    this.generateReport();

    return this.result;
  }

  private async collectFiles(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.rootPath, fullPath);

      // Skip excluded directories
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.some(excl => fullPath.includes(excl))) {
          continue;
        }
        await this.collectFiles(fullPath);
        continue;
      }

      // Check if it's a TS/TSX file
      if (TS_EXTENSIONS.includes(path.extname(entry.name))) {
        // Skip declaration files
        if (entry.name.endsWith('.d.ts')) {
          continue;
        }
        this.tsFiles.push(fullPath);
        this.result.allFiles.push(fullPath);
      }
    }
  }

  private async parseFile(filePath: string): Promise<void> {
    const content = await readFile(filePath, 'utf-8');
    this.fileContentCache.set(filePath, content);

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];
    const functions: FunctionInfo[] = [];

    const visit = (node: ts.Node) => {
      // Extract imports
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const importPath = node.moduleSpecifier.text;
        const importClause = node.importClause;

        if (importClause) {
          const info: ImportInfo = {
            sourceFile: filePath,
            importedFrom: importPath,
            importedNames: [],
          };

          // Default import
          if (importClause.name) {
            info.defaultImport = importClause.name.text;
          }

          // Named imports
          if (importClause.namedBindings) {
            if (ts.isNamedImports(importClause.namedBindings)) {
              for (const element of importClause.namedBindings.elements) {
                const name = element.name.text;
                info.importedNames.push(name);
              }
            } else if (ts.isNamespaceImport(importClause.namedBindings)) {
              info.namespaceImport = importClause.namedBindings.name.text;
            }
          }

          imports.push(info);

          // Store in import map
          if (!this.result.importMap.has(importPath)) {
            this.result.importMap.set(importPath, []);
          }
          this.result.importMap.get(importPath)!.push(info);
        }
      }

      // Extract exports
      if (ts.isExportDeclaration(node)) {
        const isType = false;
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const specifier of node.exportClause.elements) {
            const name = specifier.name.text;
            const info: ExportInfo = {
              exportedFrom: filePath,
              exportedName: name,
              isDefault: false,
              isType,
            };
            exports.push(info);
            this.result.allExports.set(`${filePath}:${name}`, info);
          }
        }
      }

      // Default export
      if (ts.isExportAssignment(node)) {
        let name = 'default';
        // Try to extract the name from the expression
        if (node.expression && ts.isIdentifier(node.expression)) {
          name = node.expression.text;
        } else if (node.expression && ts.isArrowFunction(node.expression)) {
          name = 'defaultFunction';
        } else if (node.expression && ts.isFunctionExpression(node.expression)) {
          name = node.expression.name?.text || 'defaultFunction';
        }
        const info: ExportInfo = {
          exportedFrom: filePath,
          exportedName: name,
          isDefault: true,
          isType: false,
        };
        exports.push(info);
        this.result.allExports.set(`${filePath}:default`, info);
      }

      // Extract function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const funcName = node.name.text;
        const isExported = this.isExported(node, sourceFile);
        const isDefaultExport = this.isDefaultExport(node, sourceFile);
        const startLine = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart()).line + 1;

        const info: FunctionInfo = {
          file: filePath,
          name: funcName,
          isExported,
          isDefaultExport,
          startLine,
        };
        functions.push(info);
        this.result.allFunctions.set(`${filePath}:${funcName}`, info);
      }

      // Extract function expressions / arrow functions assigned to variables
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            const varName = declaration.name.text;
            if (declaration.initializer && 
                (ts.isArrowFunction(declaration.initializer) || 
                 ts.isFunctionExpression(declaration.initializer))) {
              const isExported = this.isExported(node, sourceFile);
              const isDefaultExport = false;
              const startLine = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart()).line + 1;

              const info: FunctionInfo = {
                file: filePath,
                name: varName,
                isExported,
                isDefaultExport,
                startLine,
              };
              functions.push(info);
              this.result.allFunctions.set(`${filePath}:${varName}`, info);
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Store exports per file
    if (exports.length > 0) {
      this.result.exportMap.set(filePath, exports);
    }
  }

  private isExported(node: ts.Node, sourceFile: ts.SourceFile): boolean {
    // Check if the node has export modifier
    if (ts.canHaveModifiers(node)) {
      const modifiers = ts.getModifiers(node);
      if (modifiers) {
        for (const mod of modifiers) {
          if (mod.kind === ts.SyntaxKind.ExportKeyword) {
            return true;
          }
        }
      }
    }

    // Check if the node is inside an export statement
    let parent = node.parent;
    while (parent) {
      if (ts.isExportDeclaration(parent) || ts.isExportAssignment(parent)) {
        return true;
      }
      parent = parent.parent;
    }

    return false;
  }

  private isDefaultExport(node: ts.Node, sourceFile: ts.SourceFile): boolean {
    // Check for export default
    if (ts.canHaveModifiers(node)) {
      const modifiers = ts.getModifiers(node);
      if (modifiers) {
        let hasExport = false;
        let hasDefault = false;
        for (const mod of modifiers) {
          if (mod.kind === ts.SyntaxKind.ExportKeyword) hasExport = true;
          if (mod.kind === ts.SyntaxKind.DefaultKeyword) hasDefault = true;
        }
        if (hasExport && hasDefault) return true;
      }
    }

    // Check if it's the default export assignment
    let parent = node.parent;
    while (parent) {
      if (ts.isExportAssignment(parent) && parent.isExportEquals !== true) {
        // Check if the expression matches this node
        if (parent.expression === node || 
            (ts.isIdentifier(parent.expression) && parent.expression.text === (node as any).name?.text)) {
          return true;
        }
      }
      parent = parent.parent;
    }

    return false;
  }

  private analyzeFileUsage(): void {
    // For each import, mark the imported file as used
    for (const [importPath, importInfos] of this.result.importMap) {
      // Try to resolve the import path to a file
      for (const importInfo of importInfos) {
        const resolved = this.resolveImportPath(importInfo.sourceFile, importPath);
        if (resolved) {
          this.result.usedFiles.add(resolved);
        }
      }
    }

    // Also mark files that are entry points (index files, main files, etc.)
    // This is heuristic - index files are often entry points
    for (const file of this.tsFiles) {
      const fileName = path.basename(file);
      if (fileName === 'index.ts' || fileName === 'index.tsx' || 
          fileName === 'main.ts' || fileName === 'main.tsx') {
        this.result.usedFiles.add(file);
      }
    }

    // Find unused files
    this.result.unusedFiles = this.tsFiles.filter(file => {
      // Skip files that are used
      if (this.result.usedFiles.has(file)) return false;
      
      // Skip index files (they might be entry points)
      const fileName = path.basename(file);
      if (fileName === 'index.ts' || fileName === 'index.tsx') return false;

      // Skip files that have exports but might be used indirectly
      // If a file has exports and is in the export map, check if any of its exports are used
      if (this.result.exportMap.has(file)) {
        const exports = this.result.exportMap.get(file)!;
        for (const exp of exports) {
          const key = `${file}:${exp.exportedName}`;
          if (this.result.allExports.has(key)) {
            // This export might be used elsewhere - mark as used if any import references it
            // TODO: More sophisticated analysis
          }
        }
      }

      return true;
    });
  }

  private resolveImportPath(sourceFile: string, importPath: string): string | null {
    // Handle node modules
    if (importPath.startsWith('@') || !importPath.startsWith('.')) {
      return null; // Node module, can't resolve to a file in our project
    }

    const sourceDir = path.dirname(sourceFile);
    let resolvedPath = path.resolve(sourceDir, importPath);

    // Try with extensions
    const possiblePaths = [
      resolvedPath,
      `${resolvedPath}.ts`,
      `${resolvedPath}.tsx`,
      path.join(resolvedPath, 'index.ts'),
      path.join(resolvedPath, 'index.tsx'),
    ];

    for (const candidate of possiblePaths) {
      if (this.tsFiles.includes(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private analyzeUnusedExports(): void {
    // Mark exports that are used by imports
    for (const [importPath, importInfos] of this.result.importMap) {
      for (const importInfo of importInfos) {
        const resolved = this.resolveImportPath(importInfo.sourceFile, importPath);
        if (!resolved) continue;

        // Mark default import as used
        if (importInfo.defaultImport) {
          const key = `${resolved}:default`;
          if (this.result.allExports.has(key)) {
            this.result.usedExports.add(key);
          }
        }

        // Mark named imports as used
        for (const name of importInfo.importedNames) {
          const key = `${resolved}:${name}`;
          if (this.result.allExports.has(key)) {
            this.result.usedExports.add(key);
          }
        }

        // Mark namespace import as used (all exports from the file are used)
        if (importInfo.namespaceImport) {
          const exports = this.result.exportMap.get(resolved) || [];
          for (const exp of exports) {
            const key = `${resolved}:${exp.exportedName}`;
            if (this.result.allExports.has(key)) {
              this.result.usedExports.add(key);
            }
          }
        }
      }
    }

    // Find unused exports
    this.result.unusedExports = Array.from(this.result.allExports.keys())
      .filter(key => !this.result.usedExports.has(key))
      .map(key => {
        const [file, name] = key.split(':');
        return `${chalk.yellow(name)} ${chalk.gray(`(exported from ${path.relative(this.rootPath, file)})`)}`;
      });
  }

  private analyzeUnusedFunctions(): void {
    // For now, we'll mark functions as used if they are:
    // 1. Exported (they might be used externally)
    // 2. Called somewhere (hard to detect without full code flow analysis)
    // We'll use a simple heuristic: check if the function name appears in the source code
    
    for (const [key, funcInfo] of this.result.allFunctions) {
      // If the function is exported, consider it used (it's an API)
      if (funcInfo.isExported) {
        this.result.usedFunctions.add(key);
        continue;
      }

      // Check if the function name appears in other files
      const funcName = funcInfo.name;
      let isUsed = false;
      
      // Check all files for references to this function name
      for (const [filePath, content] of this.fileContentCache) {
        if (filePath === funcInfo.file) continue; // Skip the file itself
        
        // Check if the function name appears as a call or reference
        const regex = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
        if (regex.test(content)) {
          isUsed = true;
          break;
        }
      }

      if (isUsed) {
        this.result.usedFunctions.add(key);
      }
    }

    // Find unused functions
    this.result.unusedFunctions = Array.from(this.result.allFunctions.keys())
      .filter(key => !this.result.usedFunctions.has(key))
      .map(key => {
        const [file, name] = key.split(':');
        const info = this.result.allFunctions.get(key)!;
        return `${chalk.yellow(name)} ${chalk.gray(`(defined in ${path.relative(this.rootPath, file)}:${info.startLine})`)}`;
      });
  }

  private generateReport(): void {
    console.log('\n' + chalk.bold.cyan('📊 Unused Code Analysis Report'));
    console.log(chalk.gray('═'.repeat(50)));

    // Unused Files
    console.log(chalk.bold.yellow(`\n📁 Unused Files (${this.result.unusedFiles.length}):`));
    if (this.result.unusedFiles.length === 0) {
      console.log(chalk.green('  ✅ No unused files found!'));
    } else {
      for (const file of this.result.unusedFiles) {
        console.log(`  ${chalk.gray('•')} ${chalk.white(path.relative(this.rootPath, file))}`);
      }
    }

    // Unused Exports
    console.log(chalk.bold.yellow(`\n📤 Unused Exports (${this.result.unusedExports.length}):`));
    if (this.result.unusedExports.length === 0) {
      console.log(chalk.green('  ✅ No unused exports found!'));
    } else {
      for (const exp of this.result.unusedExports) {
        console.log(`  ${chalk.gray('•')} ${exp}`);
      }
    }

    // Unused Functions
    console.log(chalk.bold.yellow(`\n🔧 Unused Functions (${this.result.unusedFunctions.length}):`));
    if (this.result.unusedFunctions.length === 0) {
      console.log(chalk.green('  ✅ No unused functions found!'));
    } else {
      for (const func of this.result.unusedFunctions) {
        console.log(`  ${chalk.gray('•')} ${func}`);
      }
    }

    // Summary
    console.log(chalk.gray('\n' + '═'.repeat(50)));
    console.log(chalk.bold(`📈 Summary:`));
    console.log(`  Total files: ${chalk.white(this.tsFiles.length)}`);
    console.log(`  Used files: ${chalk.green(this.result.usedFiles.size)}`);
    console.log(`  Unused files: ${chalk.red(this.result.unusedFiles.length)}`);
    console.log(`  Total exports: ${chalk.white(this.result.allExports.size)}`);
    console.log(`  Unused exports: ${chalk.red(this.result.unusedExports.length)}`);
    console.log(`  Total functions: ${chalk.white(this.result.allFunctions.size)}`);
    console.log(`  Unused functions: ${chalk.red(this.result.unusedFunctions.length)}`);
    console.log(chalk.gray('═'.repeat(50)) + '\n');
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(chalk.red('❌ Error: target_folder_path is required'));
    console.error(chalk.gray('Usage: tsx scripts/find-unused.ts <target_folder_path>'));
    console.error(chalk.gray('Example: tsx scripts/find-unused.ts src/renderer/src/features/Emulate'));
    process.exit(1);
  }

  const targetPath = args[0];
  
  if (!fs.existsSync(targetPath)) {
    console.error(chalk.red(`❌ Error: Path "${targetPath}" does not exist`));
    process.exit(1);
  }

  const isDirectory = fs.statSync(targetPath).isDirectory();
  if (!isDirectory) {
    console.error(chalk.red(`❌ Error: "${targetPath}" is not a directory`));
    process.exit(1);
  }

  try {
    const analyzer = new UnusedAnalyzer(targetPath);
    await analyzer.analyze();
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

main();