import { execSync } from 'child_process';
import fs from 'fs';
import path from 'pathe';
import type { PluginManifest, PluginScope, PluginSource } from './types';
import { PluginManifestSchema } from './types';

function detectPackageManager(dir: string): string {
  let current = path.resolve(dir);
  while (true) {
    if (fs.existsSync(path.join(current, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(current, 'yarn.lock'))) return 'yarn';
    if (
      fs.existsSync(path.join(current, 'bun.lock')) ||
      fs.existsSync(path.join(current, 'bun.lockb'))
    )
      return 'bun';
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return 'npm';
}

export class PluginInstaller {
  #pluginsRoot: string;

  constructor(opts: { pluginsRoot: string }) {
    this.#pluginsRoot = opts.pluginsRoot;
  }

  async install(opts: {
    name: string;
    source: PluginSource;
    scope: PluginScope;
  }): Promise<{ installPath: string; manifest: PluginManifest }> {
    const installPath = path.join(this.#pluginsRoot, opts.name);

    switch (opts.source.type) {
      case 'local':
        return this.#installLocal(opts.source.path, installPath);
      case 'git':
        return this.#installGit(opts.source.url, opts.source.ref, installPath);
      case 'github':
        return this.#installGit(
          `https://github.com/${opts.source.repo}.git`,
          opts.source.ref,
          installPath,
        );
      case 'npm':
        return this.#installNpm(
          opts.source.package,
          opts.source.version,
          installPath,
        );
    }
  }

  async uninstall(installPath: string) {
    if (fs.existsSync(installPath)) {
      const stats = fs.lstatSync(installPath);
      if (stats.isSymbolicLink()) {
        fs.unlinkSync(installPath);
      } else {
        fs.rmSync(installPath, { recursive: true });
      }
    }
  }

  async update(opts: {
    name: string;
    source: PluginSource;
    installPath: string;
  }): Promise<{ manifest: PluginManifest }> {
    if (opts.source.type === 'git' || opts.source.type === 'github') {
      execSync('git pull', { cwd: opts.installPath, stdio: 'pipe' });
      this.#installDeps(opts.installPath);
      return { manifest: this.#readManifest(opts.installPath) };
    }
    const result = await this.install({
      name: opts.name,
      source: opts.source,
      scope: 'global',
    });
    return { manifest: result.manifest };
  }

  async #installLocal(sourcePath: string, installPath: string) {
    const resolvedPath = path.resolve(sourcePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Plugin path not found: ${resolvedPath}`);
    }
    fs.mkdirSync(path.dirname(installPath), { recursive: true });
    if (fs.existsSync(installPath)) fs.rmSync(installPath, { recursive: true });
    fs.symlinkSync(resolvedPath, installPath);
    return { installPath, manifest: this.#readManifest(installPath) };
  }

  async #installGit(url: string, ref: string | undefined, installPath: string) {
    fs.mkdirSync(path.dirname(installPath), { recursive: true });
    if (fs.existsSync(installPath)) fs.rmSync(installPath, { recursive: true });
    const refArg = ref ? `--branch ${ref}` : '';
    execSync(
      `git clone --depth 1 ${refArg} ${url} ${installPath}`.replace(
        /\s+/g,
        ' ',
      ),
      { stdio: 'pipe' },
    );
    this.#installDeps(installPath);
    return { installPath, manifest: this.#readManifest(installPath) };
  }

  async #installNpm(
    pkg: string,
    version: string | undefined,
    installPath: string,
  ) {
    fs.mkdirSync(installPath, { recursive: true });
    const spec = version ? `${pkg}@${version}` : pkg;
    const pm = detectPackageManager(installPath);
    const installCmd =
      pm === 'npm' ? `npm install ${spec}` : `${pm} add ${spec}`;
    execSync(installCmd, { cwd: installPath, stdio: 'pipe' });
    return { installPath, manifest: this.#readManifest(installPath) };
  }

  #installDeps(dir: string) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      const pm = detectPackageManager(dir);
      const prodFlag =
        pm === 'pnpm' || pm === 'bun' ? '--prod' : '--production';
      execSync(`${pm} install ${prodFlag}`, { cwd: dir, stdio: 'pipe' });
    }
  }

  #readManifest(pluginDir: string): PluginManifest {
    const manifestPath = path.join(pluginDir, 'plugin.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Missing plugin.json: ${manifestPath}`);
    }
    const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    return PluginManifestSchema.parse(raw);
  }
}
