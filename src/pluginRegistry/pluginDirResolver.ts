import fs from 'fs';
import path from 'pathe';

const COMPAT_DIR = '.claude-plugin';

export function getPluginDirName(productName: string): string {
  return `.${productName.toLowerCase()}-plugin`;
}

export function resolvePluginMetaDir(
  pluginRoot: string,
  productName: string,
): string | null {
  const primary = path.join(pluginRoot, getPluginDirName(productName));
  if (fs.existsSync(primary)) return primary;

  const compat = path.join(pluginRoot, COMPAT_DIR);
  if (fs.existsSync(compat)) return compat;

  return null;
}

export function resolveManifestPath(
  pluginRoot: string,
  productName: string,
): string | null {
  const metaDir = resolvePluginMetaDir(pluginRoot, productName);
  if (!metaDir) return null;
  const manifestPath = path.join(metaDir, 'plugin.json');
  return fs.existsSync(manifestPath) ? manifestPath : null;
}

export function resolveMarketplacePath(
  pluginRoot: string,
  productName: string,
): string | null {
  const metaDir = resolvePluginMetaDir(pluginRoot, productName);
  if (!metaDir) return null;
  const mpPath = path.join(metaDir, 'marketplace.json');
  return fs.existsSync(mpPath) ? mpPath : null;
}
