import { expect, test } from 'vitest';
import { safeFrontMatter } from './safeFrontMatter';

test('should parse valid frontmatter correctly', () => {
  const content = `---
name: Test Project
description: A test description
---
Body content`;

  const result = safeFrontMatter(content);

  expect(result.attributes).toEqual({
    name: 'Test Project',
    description: 'A test description',
  });
  expect(result.body.trim()).toBe('Body content');
});

test('should auto-fix colon in unquoted YAML value', () => {
  const brokenYaml = `---
name: Project: Title
description: A description
---
Body content`;

  const result = safeFrontMatter(brokenYaml);

  expect(result.attributes).toEqual({
    name: 'Project: Title',
    description: 'A description',
  });
  expect(result.body.trim()).toBe('Body content');
});

test('should not modify already quoted values', () => {
  const content = `---
name: "Project: Title"
description: 'Another: Description'
---
Body content`;

  const result = safeFrontMatter(content);

  expect(result.attributes).toEqual({
    name: 'Project: Title',
    description: 'Another: Description',
  });
  expect(result.body.trim()).toBe('Body content');
});

test('should handle content without frontmatter', () => {
  const content = 'Just plain content without frontmatter';

  const result = safeFrontMatter(content);

  expect(result.attributes).toEqual({});
  expect(result.body).toBe(content);
});

test('should throw error when parsing fails', () => {
  const invalidContent = `---
name: value
invalid yaml: [unclosed
---
Body`;

  expect(() => {
    safeFrontMatter(invalidContent);
  }).toThrow(/Failed to parse frontmatter/);
});

test('should auto-fix values with parentheses and special chars', () => {
  const content = `---
description: Git rollback command
allowed-tools: Read(**), Exec(git fetch, git log), Write()
argument-hint: [--branch <branch>] [--mode reset|revert]
---
Body content`;

  const result = safeFrontMatter(content);

  expect(result.attributes).toEqual({
    description: 'Git rollback command',
    'allowed-tools': 'Read(**), Exec(git fetch, git log), Write()',
    'argument-hint': '[--branch <branch>] [--mode reset|revert]',
  });
  expect(result.body.trim()).toBe('Body content');
});

test('should preserve comments in frontmatter', () => {
  const content = `---
name: Test
# this is a comment
description: A description
---
Body`;

  const result = safeFrontMatter(content);

  expect(result.attributes).toEqual({
    name: 'Test',
    description: 'A description',
  });
});

test('should handle values with internal quotes', () => {
  const content = `---
name: Test with "quotes" inside
---
Body`;

  const result = safeFrontMatter(content);

  expect(result.attributes).toEqual({
    name: 'Test with "quotes" inside',
  });
});
