// pnpm hooks to fix string-width version compatibility issues
// Downgrade string-width 8.x to 7.2.0 for certain packages

const TARGET_STRING_WIDTH_VERSION = '7.2.0';
const PACKAGES_TO_OVERRIDE = new Set(['ink', 'cli-truncate']);

function isVersion8(version) {
  return typeof version === 'string' && version.includes('8.');
}

function overrideStringWidth(pkg, context, reason) {
  pkg.dependencies = {
    ...pkg.dependencies,
    'string-width': TARGET_STRING_WIDTH_VERSION,
  };
  context.log(`${reason} => string-width@${TARGET_STRING_WIDTH_VERSION}`);
}

function readPackage(pkg, context) {
  if (!pkg.dependencies) {
    return pkg;
  }

  const stringWidthVersion = pkg.dependencies['string-width'];

  // Override specific packages known to have issues
  if (PACKAGES_TO_OVERRIDE.has(pkg.name)) {
    if (!stringWidthVersion || isVersion8(stringWidthVersion)) {
      overrideStringWidth(pkg, context, pkg.name);
    }
    return pkg;
  }

  // Global override for any package using string-width 8.x
  if (stringWidthVersion && isVersion8(stringWidthVersion)) {
    overrideStringWidth(pkg, context, `${pkg.name} (string-width@8.x)`);
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
