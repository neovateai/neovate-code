import fs from 'fs';
import path from 'path';
import { type SourceOptions } from '../dataSource';

export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  author?: string | { name?: string; email?: string };
  license?: string;
  repository?: string | { type?: string; url?: string };
  keywords?: string[];
  [key: string]: any;
}

export interface WorkspaceData {
  root: string;
  name: string;
  version?: string;
  description?: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';
  packageJson?: PackageJson;
  hasTypeScript: boolean;
  hasEslint: boolean;
  hasPrettier: boolean;
  hasJest: boolean;
  hasVitest: boolean;
  framework?: string;
  monorepo: boolean;
  workspaces?: string[];
  scripts: string[];
  dependencies: string[];
  devDependencies: string[];
}

export function createWorkspaceSource(
  cwd: string,
): SourceOptions<WorkspaceData> {
  return {
    fetcher: async () => {
      const packageJsonPath = path.join(cwd, 'package.json');
      let packageJson: PackageJson | undefined;

      if (fs.existsSync(packageJsonPath)) {
        try {
          packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        } catch {
          // Invalid package.json
        }
      }

      // Detect package manager
      let packageManager: WorkspaceData['packageManager'] = 'unknown';
      if (fs.existsSync(path.join(cwd, 'bun.lockb'))) {
        packageManager = 'bun';
      } else if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
        packageManager = 'pnpm';
      } else if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
        packageManager = 'yarn';
      } else if (fs.existsSync(path.join(cwd, 'package-lock.json'))) {
        packageManager = 'npm';
      }

      // Detect tools and frameworks
      const allDeps = {
        ...packageJson?.dependencies,
        ...packageJson?.devDependencies,
      };

      const hasTypeScript =
        fs.existsSync(path.join(cwd, 'tsconfig.json')) ||
        'typescript' in allDeps;

      const hasEslint =
        fs.existsSync(path.join(cwd, '.eslintrc')) ||
        fs.existsSync(path.join(cwd, '.eslintrc.json')) ||
        fs.existsSync(path.join(cwd, '.eslintrc.js')) ||
        'eslint' in allDeps;

      const hasPrettier =
        fs.existsSync(path.join(cwd, '.prettierrc')) ||
        fs.existsSync(path.join(cwd, '.prettierrc.json')) ||
        fs.existsSync(path.join(cwd, '.prettierrc.js')) ||
        'prettier' in allDeps;

      const hasJest =
        fs.existsSync(path.join(cwd, 'jest.config.js')) ||
        fs.existsSync(path.join(cwd, 'jest.config.json')) ||
        'jest' in allDeps;

      const hasVitest =
        fs.existsSync(path.join(cwd, 'vitest.config.js')) ||
        fs.existsSync(path.join(cwd, 'vitest.config.ts')) ||
        'vitest' in allDeps;

      // Detect framework
      let framework: string | undefined;
      if ('next' in allDeps) {
        framework = 'Next.js';
      } else if ('react' in allDeps) {
        framework = 'React';
      } else if ('vue' in allDeps) {
        framework = 'Vue';
      } else if ('@angular/core' in allDeps) {
        framework = 'Angular';
      } else if ('svelte' in allDeps) {
        framework = 'Svelte';
      } else if ('express' in allDeps) {
        framework = 'Express';
      } else if ('fastify' in allDeps) {
        framework = 'Fastify';
      } else if ('koa' in allDeps) {
        framework = 'Koa';
      }

      // Detect monorepo
      const monorepo = !!(
        packageJson?.workspaces ||
        fs.existsSync(path.join(cwd, 'lerna.json')) ||
        fs.existsSync(path.join(cwd, 'nx.json')) ||
        fs.existsSync(path.join(cwd, 'rush.json')) ||
        fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'))
      );

      // Get workspaces
      let workspaces: string[] | undefined;
      if (packageJson?.workspaces) {
        workspaces = Array.isArray(packageJson.workspaces)
          ? packageJson.workspaces
          : packageJson.workspaces.packages || [];
      }

      return {
        root: cwd,
        name: packageJson?.name || path.basename(cwd),
        version: packageJson?.version,
        description: packageJson?.description,
        packageManager,
        packageJson,
        hasTypeScript,
        hasEslint,
        hasPrettier,
        hasJest,
        hasVitest,
        framework,
        monorepo,
        workspaces,
        scripts: Object.keys(packageJson?.scripts || {}),
        dependencies: Object.keys(packageJson?.dependencies || {}),
        devDependencies: Object.keys(packageJson?.devDependencies || {}),
      };
    },
    ttl: 60000, // 1 minute cache
    dependencies: ['fileTree'], // Invalidate when file tree changes
  };
}
