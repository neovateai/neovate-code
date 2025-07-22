import { describe, expect, it } from 'vitest';
import { parseFrontMatter } from './frontmatter';

describe('parseFrontMatter', () => {
  it('should parse valid frontmatter with allowed-tools and description', () => {
    const markdown = `---
allowed-tools:
  - read
  - write
description: Test description
---
Content here`;

    const result = parseFrontMatter(markdown);

    expect(result.frontmatter).toEqual({
      'allowed-tools': ['read', 'write'],
      description: 'Test description',
    });
    expect(result.content).toBe('Content here');
  });

  it('should handle markdown without frontmatter', () => {
    const markdown = 'Just regular markdown content';

    const result = parseFrontMatter(markdown);

    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe('Just regular markdown content');
  });

  it('should handle empty frontmatter', () => {
    const markdown = `---
---
Content after empty frontmatter`;

    const result = parseFrontMatter(markdown);

    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe('Content after empty frontmatter');
  });

  it('should handle frontmatter with only allowed-tools', () => {
    const markdown = `---
allowed-tools:
  - bash
  - grep
---
Some content`;

    const result = parseFrontMatter(markdown);

    expect(result.frontmatter).toEqual({
      'allowed-tools': ['bash', 'grep'],
    });
    expect(result.content).toBe('Some content');
  });

  it('should handle frontmatter with only description', () => {
    const markdown = `---
description: Only description here
---
Markdown content`;

    const result = parseFrontMatter(markdown);

    expect(result.frontmatter).toEqual({
      description: 'Only description here',
    });
    expect(result.content).toBe('Markdown content');
  });

  it('should ignore unknown frontmatter properties', () => {
    const markdown = `---
allowed-tools:
  - read
unknown-property: should be ignored
description: Valid description
another-unknown: also ignored
---
Content`;

    const result = parseFrontMatter(markdown);

    expect(result.frontmatter).toEqual({
      'allowed-tools': ['read'],
      description: 'Valid description',
    });
    expect(result.content).toBe('Content');
  });

  it('should throw error for invalid allowed-tools format', () => {
    const markdown = `---
allowed-tools: not-an-array
---
Content`;

    expect(() => parseFrontMatter(markdown)).toThrow(
      'allowed-tools: must be an array of strings',
    );
  });

  it('should throw error for allowed-tools with non-string elements', () => {
    const markdown = `---
allowed-tools:
  - read
  - 123
  - write
---
Content`;

    expect(() => parseFrontMatter(markdown)).toThrow(
      'allowed-tools: must be an array of strings',
    );
  });

  it('should throw error for invalid description format', () => {
    const markdown = `---
description: 123
---
Content`;

    expect(() => parseFrontMatter(markdown)).toThrow(
      'description: must be a string',
    );
  });

  it('should handle multiline content after frontmatter', () => {
    const markdown = `---
allowed-tools:
  - read
---
Line 1
Line 2
Line 3`;

    const result = parseFrontMatter(markdown);

    expect(result.frontmatter).toEqual({
      'allowed-tools': ['read'],
    });
    expect(result.content).toBe('Line 1\nLine 2\nLine 3');
  });

  it('should handle frontmatter with extra whitespace', () => {
    const markdown = `---
allowed-tools:
  - read
  - write
description: "Description with spaces"
---


Content with leading newlines`;

    const result = parseFrontMatter(markdown);

    expect(result.frontmatter).toEqual({
      'allowed-tools': ['read', 'write'],
      description: 'Description with spaces',
    });
    expect(result.content).toBe('Content with leading newlines');
  });

  it('should handle empty allowed-tools array', () => {
    const markdown = `---
allowed-tools: []
description: Empty tools
---
Content`;

    const result = parseFrontMatter(markdown);

    expect(result.frontmatter).toEqual({
      'allowed-tools': [],
      description: 'Empty tools',
    });
    expect(result.content).toBe('Content');
  });

  it('should handle invalid YAML in frontmatter', () => {
    const markdown = `---
invalid: yaml: content: here
---
Content`;

    expect(() => parseFrontMatter(markdown)).toThrow();
  });

  it('should handle frontmatter that is not an object', () => {
    const markdown = `---
"just a string"
---
Content`;

    const result = parseFrontMatter(markdown);

    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe('Content');
  });
});
