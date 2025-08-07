import yaml from 'js-yaml';
import { isArray, isString } from 'lodash-es';

export interface FrontMatter {
  'allowed-tools'?: string[];
  description?: string;
  model?: string;
}

function validateFrontMatterProperty<T>(
  value: unknown,
  propertyName: string,
  validator: (value: unknown) => value is T,
  errorMessage: string,
): T {
  if (!validator(value)) {
    throw new Error(`${propertyName}: ${errorMessage}`);
  }
  return value;
}

function isStringArray(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

const frontMatterReg = /^---\n([\s\S]*?)^---/m;

function extractFrontMatterContent(markdownContent: string): {
  rawFrontmatter: unknown;
  content: string;
} {
  const match = markdownContent.match(frontMatterReg);

  if (!match) {
    return { rawFrontmatter: {}, content: markdownContent };
  }

  const yamlContent = match[1];
  const rawFrontmatter = yamlContent.trim() ? yaml.load(yamlContent) || {} : {};
  const content = markdownContent.slice(match[0].length).trimStart();

  return { rawFrontmatter, content };
}

function validateAndParseFrontMatter(rawFrontmatter: unknown): FrontMatter {
  const frontmatter: FrontMatter = {};

  if (typeof rawFrontmatter !== 'object' || rawFrontmatter === null) {
    return frontmatter;
  }

  const fm = rawFrontmatter as Record<string, unknown>;

  if ('allowed-tools' in fm) {
    frontmatter['allowed-tools'] = validateFrontMatterProperty(
      fm['allowed-tools'],
      'allowed-tools',
      isStringArray,
      'must be an array of strings',
    );
  }

  if ('description' in fm) {
    frontmatter.description = validateFrontMatterProperty(
      fm.description,
      'description',
      isString,
      'must be a string',
    );
  }

  if ('model' in fm) {
    frontmatter.model = validateFrontMatterProperty(
      fm.model,
      'model',
      isString,
      'must be a string',
    );
  }

  return frontmatter;
}

export function parseFrontMatter(markdownContent: string): {
  frontmatter: FrontMatter;
  content: string;
} {
  const { rawFrontmatter, content } =
    extractFrontMatterContent(markdownContent);
  const frontmatter = validateAndParseFrontMatter(rawFrontmatter);

  return { frontmatter, content };
}
