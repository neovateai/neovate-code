import fs from 'fs';
import path from 'path';
import { parseFrontMatter } from '../utils/frontmatter';
import { kebabToTitleCase } from '../utils/string';
import { type OutputStyle, type OutputStyleLoaderOptions } from './types';

function resolveOutputStyleDescription(
  frontmatterDescription: string | undefined,
  content: string,
  styleName: string,
): string {
  if (frontmatterDescription && frontmatterDescription.trim()) {
    return frontmatterDescription.trim();
  }

  const lines = content.split('\n');
  const firstLine = lines.find((line) => line.trim())?.trim();
  if (firstLine && /^[a-zA-Z]/.test(firstLine)) {
    return firstLine;
  }

  return kebabToTitleCase(styleName);
}

function findMarkdownFiles(dir: string, baseDir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath, baseDir));
      } else if (stat.isFile() && entry.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }

  return files;
}

export function loadFilesystemOutputStyles(
  options: OutputStyleLoaderOptions,
): OutputStyle[] {
  const { outputStylesDir, postfix } = options;
  const outputStyles: OutputStyle[] = [];

  if (!fs.existsSync(outputStylesDir)) {
    return outputStyles;
  }

  try {
    const markdownFiles = findMarkdownFiles(outputStylesDir, outputStylesDir);

    for (const filePath of markdownFiles) {
      const relativePath = path.relative(outputStylesDir, filePath);
      const styleName = relativePath
        .replace(/\.md$/, '')
        .replace(/[/\\]/g, ':');

      if (!/^[a-zA-Z0-9_:-]+$/.test(styleName)) {
        console.warn(`Skipping invalid output style name: ${styleName}`);
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { frontmatter, content: body } = parseFrontMatter(content);

        const baseDescription = resolveOutputStyleDescription(
          frontmatter?.description,
          body,
          styleName,
        );
        const description = postfix
          ? `${baseDescription} (${postfix})`
          : baseDescription;

        const outputStyle: OutputStyle = {
          name: styleName,
          description,
          isCodingRelated: (frontmatter as any)?.isCodingRelated ?? true,
          prompt: body.trim(),
        };

        outputStyles.push(outputStyle);
      } catch (error) {
        console.warn(
          `Warning: Could not read output style file ${filePath}:`,
          error,
        );
      }
    }
  } catch (error) {
    console.warn(
      `Warning: Could not read output styles directory ${outputStylesDir}:`,
      error,
    );
  }

  return outputStyles;
}

export function loadGlobalOutputStyles(globalConfigDir: string): OutputStyle[] {
  const outputStylesDir = path.join(globalConfigDir, 'output-styles');
  return loadFilesystemOutputStyles({
    outputStylesDir,
    postfix: 'user',
  });
}

export function loadProjectOutputStyles(
  projectConfigDir: string,
): OutputStyle[] {
  const outputStylesDir = path.join(projectConfigDir, 'output-styles');
  return loadFilesystemOutputStyles({
    outputStylesDir,
    postfix: 'project',
  });
}
