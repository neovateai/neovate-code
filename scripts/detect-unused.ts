#!/usr/bin/env bun

import * as ts from 'typescript';
import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import pc from 'picocolors';

// ============================================================================
// Types
// ============================================================================

interface UnusedExport {
  name: string;
  kind: string;
  line: number;
  isTypeOnly: boolean;
}

interface UnusedFile {
  path: string;
  reason: 'never-imported' | 'only-type-imports';
}

interface AnalysisResult {
  unusedFiles: UnusedFile[];
  unusedExports: Map<string, UnusedExport[]>;
  stats: {
    totalFiles: number;
    totalExports: number;
    unusedFilesCount: number;
    unusedExportsCount: number;
    strictMode: boolean;
    timestamp: string;
  };
}

interface FileInfo {
  imports: Map<string, Set<string>>; // source file -> imported symbols
  exports: Map<string, ExportInfo>; // export name -> info
  typeOnlyImports: Set<string>; // files imported with 'import type'
  hasDynamicImports: boolean;
  hasNamespaceImport: Set<string>; // files imported with 'import * as'
}

interface ExportInfo {
  name: string;
  kind: ts.SyntaxKind;
  line: number;
  isTypeOnly: boolean;
  isReexport: boolean;
  reexportSource?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const ENTRY_POINTS = [
  'src/cli.ts',
  'src/index.ts',
  'src/commands/server/server.ts',
  'src/commands/commit.ts',
  'src/commands/mcp.ts',
  'src/commands/run.ts',
  'src/commands/update.ts',
];

const EXCLUDE_PATTERNS = ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**'];

// ============================================================================
// File Discovery
// ============================================================================

function discoverSourceFiles(rootDir: string): string[] {
  const pattern = 'src/**/*.{ts,tsx}';
  const files = glob.sync(pattern, {
    cwd: rootDir,
    absolute: true,
    ignore: EXCLUDE_PATTERNS,
  });
  return files;
}

// ============================================================================
// TypeScript Program Creation
// ============================================================================

function createTypeScriptProgram(
  files: string[],
  rootDir: string,
): {
  program: ts.Program;
  checker: ts.TypeChecker;
} {
  // Try to load tsconfig.json
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');
  let compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
  };

  if (fs.existsSync(tsconfigPath)) {
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (!configFile.error) {
      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        rootDir,
      );
      compilerOptions = parsedConfig.options;
    }
  }

  const program = ts.createProgram(files, compilerOptions);
  const checker = program.getTypeChecker();

  return { program, checker };
}

// ============================================================================
// Dependency Graph Building
// ============================================================================

function buildDependencyGraph(
  program: ts.Program,
  checker: ts.TypeChecker,
  files: string[],
): Map<string, FileInfo> {
  const fileInfoMap = new Map<string, FileInfo>();

  for (const fileName of files) {
    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) continue;

    const fileInfo: FileInfo = {
      imports: new Map(),
      exports: new Map(),
      typeOnlyImports: new Set(),
      hasDynamicImports: false,
      hasNamespaceImport: new Set(),
    };

    // Visit all nodes in the source file
    function visit(node: ts.Node) {
      // Handle imports
      if (ts.isImportDeclaration(node)) {
        handleImportDeclaration(node, sourceFile, fileInfo);
      }

      // Handle exports
      if (ts.isExportDeclaration(node)) {
        handleExportDeclaration(node, sourceFile, fileInfo);
      } else if (hasExportModifier(node)) {
        handleExportedDeclaration(node, fileInfo);
      }

      // Detect dynamic imports
      if (ts.isCallExpression(node)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          fileInfo.hasDynamicImports = true;
        }
        // Detect require()
        if (
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'
        ) {
          fileInfo.hasDynamicImports = true;
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    fileInfoMap.set(fileName, fileInfo);
  }

  return fileInfoMap;
}

function handleImportDeclaration(
  node: ts.ImportDeclaration,
  sourceFile: ts.SourceFile,
  fileInfo: FileInfo,
) {
  if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
    return;
  }

  const importPath = node.moduleSpecifier.text;

  // Skip external modules
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return;
  }

  const resolvedPath = resolveImportPath(importPath, sourceFile.fileName);
  if (!resolvedPath) return;

  const isTypeOnly = node.importClause?.isTypeOnly || false;

  if (isTypeOnly) {
    fileInfo.typeOnlyImports.add(resolvedPath);
  }

  if (!node.importClause) return;

  const importedSymbols = new Set<string>();

  // Named imports: import { a, b } from '...'
  if (node.importClause.namedBindings) {
    if (ts.isNamedImports(node.importClause.namedBindings)) {
      for (const element of node.importClause.namedBindings.elements) {
        importedSymbols.add(element.name.text);
      }
    }
    // Namespace import: import * as foo from '...'
    else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
      fileInfo.hasNamespaceImport.add(resolvedPath);
      // Mark as importing everything
      importedSymbols.add('*');
    }
  }

  // Default import: import foo from '...'
  if (node.importClause.name) {
    importedSymbols.add('default');
  }

  if (importedSymbols.size > 0) {
    fileInfo.imports.set(resolvedPath, importedSymbols);
  }
}

function handleExportDeclaration(
  node: ts.ExportDeclaration,
  sourceFile: ts.SourceFile,
  fileInfo: FileInfo,
) {
  // Re-export: export { a, b } from '...' or export * from '...'
  if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
    const importPath = node.moduleSpecifier.text;

    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return;
    }

    const resolvedPath = resolveImportPath(importPath, sourceFile.fileName);
    if (!resolvedPath) return;

    if (node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          const exportName = element.name.text;
          const line =
            sourceFile.getLineAndCharacterOfPosition(element.getStart()).line +
            1;

          fileInfo.exports.set(exportName, {
            name: exportName,
            kind: ts.SyntaxKind.ExportSpecifier,
            line,
            isTypeOnly: node.isTypeOnly || false,
            isReexport: true,
            reexportSource: resolvedPath,
          });
        }
      }
    } else {
      // export * from '...'
      // This is a barrel export, we'll handle it during usage analysis
      fileInfo.exports.set(`*:${resolvedPath}`, {
        name: '*',
        kind: ts.SyntaxKind.ExportDeclaration,
        line:
          sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        isTypeOnly: false,
        isReexport: true,
        reexportSource: resolvedPath,
      });
    }
  }
}

function handleExportedDeclaration(node: ts.Node, fileInfo: FileInfo) {
  const line =
    node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line +
    1;

  // export function/class/interface/type/const/let/var
  if (ts.isFunctionDeclaration(node) && node.name) {
    fileInfo.exports.set(node.name.text, {
      name: node.name.text,
      kind: node.kind,
      line,
      isTypeOnly: false,
      isReexport: false,
    });
  } else if (ts.isClassDeclaration(node) && node.name) {
    fileInfo.exports.set(node.name.text, {
      name: node.name.text,
      kind: node.kind,
      line,
      isTypeOnly: false,
      isReexport: false,
    });
  } else if (ts.isInterfaceDeclaration(node)) {
    fileInfo.exports.set(node.name.text, {
      name: node.name.text,
      kind: node.kind,
      line,
      isTypeOnly: true,
      isReexport: false,
    });
  } else if (ts.isTypeAliasDeclaration(node)) {
    fileInfo.exports.set(node.name.text, {
      name: node.name.text,
      kind: node.kind,
      line,
      isTypeOnly: true,
      isReexport: false,
    });
  } else if (ts.isVariableStatement(node)) {
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) {
        fileInfo.exports.set(declaration.name.text, {
          name: declaration.name.text,
          kind:
            node.declarationList.flags & ts.NodeFlags.Const
              ? ts.SyntaxKind.ConstKeyword
              : node.declarationList.flags & ts.NodeFlags.Let
                ? ts.SyntaxKind.LetKeyword
                : ts.SyntaxKind.VarKeyword,
          line,
          isTypeOnly: false,
          isReexport: false,
        });
      }
    }
  } else if (ts.isEnumDeclaration(node)) {
    fileInfo.exports.set(node.name.text, {
      name: node.name.text,
      kind: node.kind,
      line,
      isTypeOnly: false,
      isReexport: false,
    });
  }
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    (ts.canHaveModifiers(node) &&
      ts
        .getModifiers(node)
        ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) ||
    false
  );
}

function resolveImportPath(
  importPath: string,
  fromFile: string,
): string | null {
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(dir, importPath);

  // Try with different extensions
  const extensions = ['.ts', '.tsx', '.d.ts', '/index.ts', '/index.tsx'];

  for (const ext of extensions) {
    const fullPath = resolved + ext;
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Try as-is
  if (fs.existsSync(resolved)) {
    return resolved;
  }

  return null;
}

// ============================================================================
// Usage Analysis
// ============================================================================

function analyzeUsage(
  fileInfoMap: Map<string, FileInfo>,
  entryPoints: string[],
  strictMode: boolean,
  rootDir: string,
): AnalysisResult {
  const usedFiles = new Set<string>();
  const usedExports = new Map<string, Set<string>>(); // file -> used export names

  // Resolve entry points to absolute paths
  const absoluteEntryPoints = entryPoints.map((ep) =>
    path.resolve(rootDir, ep),
  );

  // BFS from entry points
  const queue = [...absoluteEntryPoints];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentFile = queue.shift()!;
    if (visited.has(currentFile)) continue;
    visited.add(currentFile);
    usedFiles.add(currentFile);

    const fileInfo = fileInfoMap.get(currentFile);
    if (!fileInfo) continue;

    // Process imports from this file
    for (const [importedFile, importedSymbols] of fileInfo.imports) {
      if (!visited.has(importedFile)) {
        queue.push(importedFile);
      }

      // Track which exports are used
      if (!usedExports.has(importedFile)) {
        usedExports.set(importedFile, new Set());
      }

      const usedSet = usedExports.get(importedFile)!;

      // If namespace import, mark all exports as used
      if (
        importedSymbols.has('*') ||
        fileInfo.hasNamespaceImport.has(importedFile)
      ) {
        // Mark all exports from that file as used
        const importedFileInfo = fileInfoMap.get(importedFile);
        if (importedFileInfo) {
          for (const exportName of importedFileInfo.exports.keys()) {
            usedSet.add(exportName);
          }
        }
      } else {
        for (const symbol of importedSymbols) {
          usedSet.add(symbol);
        }
      }
    }

    // Handle re-exports
    for (const [exportName, exportInfo] of fileInfo.exports) {
      if (exportInfo.isReexport && exportInfo.reexportSource) {
        if (!visited.has(exportInfo.reexportSource)) {
          queue.push(exportInfo.reexportSource);
        }
      }
    }
  }

  // Analyze unused files
  const unusedFiles: UnusedFile[] = [];
  for (const [fileName, fileInfo] of fileInfoMap) {
    // Skip entry points
    if (absoluteEntryPoints.includes(fileName)) continue;

    // In strict mode, skip files with dynamic imports
    if (strictMode && fileInfo.hasDynamicImports) continue;

    if (!usedFiles.has(fileName)) {
      // Check if only imported for types
      const onlyTypeImport = Array.from(fileInfoMap.values()).some((fi) =>
        fi.typeOnlyImports.has(fileName),
      );

      unusedFiles.push({
        path: fileName,
        reason: onlyTypeImport ? 'only-type-imports' : 'never-imported',
      });
    }
  }

  // Analyze unused exports
  const unusedExports = new Map<string, UnusedExport[]>();
  for (const [fileName, fileInfo] of fileInfoMap) {
    // Skip files that are completely unused
    if (!usedFiles.has(fileName)) continue;

    // Skip entry points
    if (absoluteEntryPoints.includes(fileName)) continue;

    // In strict mode, skip files with dynamic imports
    if (strictMode && fileInfo.hasDynamicImports) continue;

    const fileUnusedExports: UnusedExport[] = [];
    const exportUsageSet = usedExports.get(fileName) || new Set();

    for (const [exportName, exportInfo] of fileInfo.exports) {
      // Skip barrel re-exports
      if (exportName.startsWith('*:')) continue;

      if (!exportUsageSet.has(exportName)) {
        fileUnusedExports.push({
          name: exportName,
          kind: getKindString(exportInfo.kind),
          line: exportInfo.line,
          isTypeOnly: exportInfo.isTypeOnly,
        });
      }
    }

    if (fileUnusedExports.length > 0) {
      unusedExports.set(fileName, fileUnusedExports);
    }
  }

  // Calculate stats
  const totalFiles = fileInfoMap.size;
  let totalExports = 0;
  for (const fileInfo of fileInfoMap.values()) {
    totalExports += fileInfo.exports.size;
  }

  let unusedExportsCount = 0;
  for (const exports of unusedExports.values()) {
    unusedExportsCount += exports.length;
  }

  return {
    unusedFiles,
    unusedExports,
    stats: {
      totalFiles,
      totalExports,
      unusedFilesCount: unusedFiles.length,
      unusedExportsCount,
      strictMode,
      timestamp: new Date().toISOString(),
    },
  };
}

function getKindString(kind: ts.SyntaxKind): string {
  switch (kind) {
    case ts.SyntaxKind.FunctionDeclaration:
      return 'function';
    case ts.SyntaxKind.ClassDeclaration:
      return 'class';
    case ts.SyntaxKind.InterfaceDeclaration:
      return 'interface';
    case ts.SyntaxKind.TypeAliasDeclaration:
      return 'type';
    case ts.SyntaxKind.ConstKeyword:
      return 'const';
    case ts.SyntaxKind.LetKeyword:
      return 'let';
    case ts.SyntaxKind.VarKeyword:
      return 'var';
    case ts.SyntaxKind.EnumDeclaration:
      return 'enum';
    default:
      return 'unknown';
  }
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatConsoleOutput(result: AnalysisResult, rootDir: string) {
  console.log('\n' + pc.bold(pc.cyan('='.repeat(60))));
  console.log(pc.bold(pc.cyan('  Unused Code Analysis Report')));
  console.log(pc.bold(pc.cyan('='.repeat(60))) + '\n');

  // Stats
  console.log(pc.bold('Statistics:'));
  console.log(`  Total files analyzed: ${result.stats.totalFiles}`);
  console.log(`  Total exports found: ${result.stats.totalExports}`);
  console.log(
    `  Unused files: ${pc.yellow(result.stats.unusedFilesCount.toString())}`,
  );
  console.log(
    `  Unused exports: ${pc.yellow(result.stats.unusedExportsCount.toString())}`,
  );
  console.log(
    `  Strictness mode: ${result.stats.strictMode ? pc.green('strict') : pc.yellow('relaxed')}`,
  );
  console.log('');

  // Unused Files
  if (result.unusedFiles.length > 0) {
    console.log(
      pc.bold(pc.red(`\nUnused Files (${result.unusedFiles.length}):`)),
    );
    console.log(pc.red('-'.repeat(60)));

    for (const file of result.unusedFiles) {
      const relativePath = path.relative(rootDir, file.path);
      console.log(`  ${pc.red('✗')} ${relativePath}`);
      console.log(`     ${pc.dim(`Reason: ${file.reason}`)}`);
    }
  } else {
    console.log(pc.bold(pc.green('\n✓ No unused files found!')));
  }

  // Unused Exports
  if (result.unusedExports.size > 0) {
    console.log(
      pc.bold(
        pc.yellow(
          `\nUnused Exports (${result.stats.unusedExportsCount} total):`,
        ),
      ),
    );
    console.log(pc.yellow('-'.repeat(60)));

    const sortedFiles = Array.from(result.unusedExports.entries()).sort(
      (a, b) => a[0].localeCompare(b[0]),
    );

    for (const [fileName, exports] of sortedFiles) {
      const relativePath = path.relative(rootDir, fileName);
      console.log(`\n  ${pc.cyan(relativePath)}`);

      for (const exp of exports) {
        const typeLabel = exp.isTypeOnly
          ? pc.blue('[type]')
          : pc.green('[value]');
        console.log(
          `    ${pc.yellow('•')} ${typeLabel} ${pc.bold(exp.name)} ${pc.dim(`(${exp.kind}, line ${exp.line})`)}`,
        );
      }
    }
  } else {
    console.log(pc.bold(pc.green('\n✓ No unused exports found!')));
  }

  console.log('\n' + pc.bold(pc.cyan('='.repeat(60))) + '\n');
}

function writeJsonOutput(result: AnalysisResult, rootDir: string) {
  const outputPath = path.join(rootDir, 'scripts', 'unused-analysis.json');

  const jsonData = {
    stats: result.stats,
    unusedFiles: result.unusedFiles.map((f) => ({
      path: path.relative(rootDir, f.path),
      reason: f.reason,
    })),
    unusedExports: Array.from(result.unusedExports.entries()).map(
      ([file, exports]) => ({
        file: path.relative(rootDir, file),
        exports: exports,
      }),
    ),
  };

  fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(
    pc.dim(`JSON report saved to: ${path.relative(rootDir, outputPath)}`),
  );
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const strictMode = !args.includes('--relaxed');

  const rootDir = process.cwd();

  console.log(pc.dim('Discovering source files...'));
  const files = discoverSourceFiles(rootDir);
  console.log(pc.dim(`Found ${files.length} TypeScript files\n`));

  console.log(pc.dim('Creating TypeScript program...'));
  const { program, checker } = createTypeScriptProgram(files, rootDir);
  console.log(pc.dim('Program created\n'));

  console.log(pc.dim('Building dependency graph...'));
  const fileInfoMap = buildDependencyGraph(program, checker, files);
  console.log(pc.dim('Dependency graph built\n'));

  console.log(pc.dim('Analyzing usage...'));
  const result = analyzeUsage(fileInfoMap, ENTRY_POINTS, strictMode, rootDir);
  console.log(pc.dim('Analysis complete\n'));

  // Output results
  formatConsoleOutput(result, rootDir);
  writeJsonOutput(result, rootDir);
}

main().catch((error) => {
  console.error(pc.red('Error:'), error);
  process.exit(1);
});
