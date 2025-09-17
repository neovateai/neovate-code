import fs from 'fs';
import { homedir } from 'os';
import path from 'pathe';

const PROJECT_MARKERS = [
  'package.json',
  'Cargo.toml',
  'pyproject.toml',
  'go.mod',
  'composer.json',
  'pom.xml',
  'build.gradle',
  'requirements.txt',
  'Gemfile',
  'mix.exs',
  'deno.json',
  'deno.jsonc',
];

export function isProjectDirectory(cwd: string): boolean {
  const normalizedCwd = path.resolve(cwd);
  const homeDir = path.resolve(homedir());

  if (normalizedCwd === homeDir) {
    return false;
  }

  return PROJECT_MARKERS.some((marker) => {
    const markerPath = path.join(normalizedCwd, marker);
    return fs.existsSync(markerPath);
  });
}
