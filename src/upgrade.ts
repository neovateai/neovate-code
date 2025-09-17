import EventEmitter from 'events';
import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';

export type UpgradeOptions = {
  registryBase: string;
  name: string;
  version: string;
  installDir: string;
  files: string[];
  channel?: string;
  changelogUrl?: string;
};

export class Upgrade extends EventEmitter {
  registryBase: string;
  name: string;
  version: string;
  channel: string;
  installDir: string;
  changelogUrl: string | undefined;
  files: string[];
  constructor(opts: UpgradeOptions) {
    super();
    this.registryBase = opts.registryBase;
    this.name = opts.name;
    this.version = opts.version;
    this.channel = opts.channel || 'latest';
    this.installDir = opts.installDir;
    this.changelogUrl = opts.changelogUrl;
    this.files = opts.files;
  }

  async check(): Promise<{
    latestVersion: string;
    hasUpdate: boolean;
    tarballUrl?: string;
  }> {
    try {
      const baseUrl = this.registryBase.endsWith('/')
        ? this.registryBase
        : `${this.registryBase}/`;
      const url = `${baseUrl}${encodeURIComponent(this.name)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'neovate',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        return {
          latestVersion: this.version,
          hasUpdate: false,
        };
      }
      const metadata = await response.json();
      const latestVersion = metadata['dist-tags']?.[this.channel];
      if (!latestVersion) {
        return {
          latestVersion: this.version,
          hasUpdate: false,
        };
      }
      const hasUpdate = latestVersion !== this.version;

      // Get tarball URL if update is available
      let tarballUrl: string | undefined;
      if (hasUpdate) {
        const versionData = metadata.versions[latestVersion];
        tarballUrl = versionData?.dist?.tarball;
      }

      return {
        latestVersion,
        hasUpdate,
        tarballUrl,
      };
    } catch (error) {
      return {
        latestVersion: this.version,
        hasUpdate: false,
      };
    }
  }

  async upgrade(opts: { tarballUrl: string }): Promise<void> {
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const tarballPath = path.join(
      tempDir,
      `${this.name.replace('/', '-')}-${timestamp}.tgz`,
    );
    const extractDir = path.join(
      tempDir,
      `${this.name.replace('/', '-')}-${timestamp}-extract`,
    );
    // Download tarball
    this.emit('status', { type: 'downloading', tarballUrl: opts.tarballUrl });
    const downloadResponse = await fetch(opts.tarballUrl, {
      headers: { 'User-Agent': 'neovate' },
    });
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download tarball: ${downloadResponse.status}`);
    }
    if (!downloadResponse.body) {
      throw new Error('Download response body is null');
    }
    // Save tarball to temp file
    this.emit('status', { type: 'saving', tarballPath });
    const writeStream = fs.createWriteStream(tarballPath);
    await pipeline(downloadResponse.body as any, writeStream);
    // Extract tarball
    this.emit('status', { type: 'extracting', extractDir });
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }
    await tar.extract({
      file: tarballPath,
      cwd: extractDir,
      strict: false,
    });
    // Copy files from extracted package to install directory
    this.emit('status', { type: 'copying', files: this.files });
    const sourceBase = path.join(extractDir, 'package');
    for (const file of this.files) {
      const sourcePath = path.join(sourceBase, file);
      const destPath = path.join(this.installDir, file);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file not found: ${sourcePath}`);
      }
      // Create destination directory if needed
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      // Copy file or directory
      if (fs.statSync(sourcePath).isDirectory()) {
        fs.cpSync(sourcePath, destPath, { recursive: true, force: true });
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }
}
