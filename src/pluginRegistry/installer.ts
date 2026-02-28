import { execSync } from 'child_process';
import fs from 'fs';
import path from 'pathe';
import type { PluginManifest, PluginScope, PluginSource } from './types';
import { PluginManifestSchema } from './types';

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
    execSync(`npm install ${spec}`, { cwd: installPath, stdio: 'pipe' });
    return { installPath, manifest: this.#readManifest(installPath) };
  }

  #installDeps(dir: string) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      execSync('npm install --production', { cwd: dir, stdio: 'pipe' });
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
