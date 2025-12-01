import { describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import { loadMarkdownFile } from './outputStyle';

vi.mock('fs');

describe('loadMarkdownFile', () => {
  it('should auto-fix colon in unquoted YAML value', () => {
    const brokenYaml = `---
name: Project: Title
description: A description
---
Body content`;

    vi.mocked(fs.readFileSync).mockReturnValue(brokenYaml);

    const result = loadMarkdownFile('test.md');

    expect(result.attributes).toEqual({
      name: 'Project: Title',
      description: 'A description',
    });
    expect(result.body.trim()).toBe('Body content');
  });
});
