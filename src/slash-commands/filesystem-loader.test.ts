import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadFilesystemCommands } from './filesystem-loader';

describe('loadFilesystemCommands', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'takumi-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('description resolution', () => {
    it('should use YAML frontmatter description when available', () => {
      const commandPath = path.join(tempDir, 'test-command.md');
      const content = `---
description: "Custom description from YAML"
---

Some content here`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('Custom description from YAML');
    });

    it('should use first non-comment line when no YAML frontmatter', () => {
      const commandPath = path.join(tempDir, 'test-command.md');
      const content = `This is the first line description

Some more content here`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe(
        'This is the first line description',
      );
    });

    it('should use filename when first line starts with #', () => {
      const commandPath = path.join(tempDir, 'header-first.md');
      const content = `# This is a header
This should NOT be used as description

Some more content`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('Header First');
    });

    it('should convert filename to Title Case when no other description found', () => {
      const commandPath = path.join(tempDir, 'foo-bar-baz.md');
      const content = `# Just a header

$ARGUMENTS`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('Foo Bar Baz');
    });

    it('should handle single word filename', () => {
      const commandPath = path.join(tempDir, 'review.md');
      const content = `# Review Command

$ARGUMENTS`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('Review');
    });

    it('should handle empty frontmatter description', () => {
      const commandPath = path.join(tempDir, 'test-command.md');
      const content = `---
description: ""
---

First line should be used`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('First line should be used');
    });

    it('should handle whitespace-only frontmatter description', () => {
      const commandPath = path.join(tempDir, 'test-command.md');
      const content = `---
description: "   "
---

First line should be used`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('First line should be used');
    });

    it('should handle empty content', () => {
      const commandPath = path.join(tempDir, 'empty-command.md');
      fs.writeFileSync(commandPath, '');

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('Empty Command');
    });

    it('should handle content with only whitespace and comments', () => {
      const commandPath = path.join(tempDir, 'whitespace-command.md');
      const content = `
# Header 1
## Header 2

   

`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('Whitespace Command');
    });

    it('should trim description from first line', () => {
      const commandPath = path.join(tempDir, 'test-command.md');
      const content = `   This description has extra whitespace   

More content`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe(
        'This description has extra whitespace',
      );
    });

    it('should handle postfix correctly with new descriptions', () => {
      const commandPath = path.join(tempDir, 'test-command.md');
      const content = `First line description`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
        postfix: 'user',
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('First line description (user)');
    });

    it('should skip lines starting with numbers and use filename', () => {
      const commandPath = path.join(tempDir, 'numeric-start.md');
      const content = `1. This starts with a number
2. This also starts with a number

$ARGUMENTS`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('Numeric Start');
    });

    it('should skip lines starting with symbols and use filename', () => {
      const commandPath = path.join(tempDir, 'symbol-start.md');
      const content = `- This starts with a dash
* This starts with asterisk
$ This starts with dollar

$ARGUMENTS`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('Symbol Start');
    });

    it('should use filename when first line starts with # (mixed content)', () => {
      const commandPath = path.join(tempDir, 'mixed-content.md');
      const content = `# Header
1. Numbered item
- Bullet point
* Another bullet

This line would NOT be used because first line starts with #

More content here`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('Mixed Content');
    });

    it('should handle uppercase letter starting line', () => {
      const commandPath = path.join(tempDir, 'uppercase-start.md');
      const content = `UPPERCASE line should work
lowercase line after`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('UPPERCASE line should work');
    });

    it('should only check first line - ignore valid lines after invalid first line', () => {
      const commandPath = path.join(tempDir, 'first-line-only.md');
      const content = `1. First line starts with number (invalid)
This valid line should be ignored
Another valid line should also be ignored`;
      fs.writeFileSync(commandPath, content);

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].description).toBe('First Line Only');
    });
  });

  describe('existing functionality', () => {
    it('should skip non-.md files', () => {
      fs.writeFileSync(path.join(tempDir, 'not-a-command.txt'), 'content');
      fs.writeFileSync(path.join(tempDir, 'valid-command.md'), 'content');

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('valid-command');
    });

    it('should handle missing commands directory', () => {
      const nonExistentDir = path.join(tempDir, 'does-not-exist');

      const commands = loadFilesystemCommands({
        commandsDir: nonExistentDir,
      });

      expect(commands).toHaveLength(0);
    });

    it('should skip commands with invalid names', () => {
      fs.writeFileSync(path.join(tempDir, 'valid-command.md'), 'content');
      fs.writeFileSync(path.join(tempDir, 'invalid@name.md'), 'content');

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('valid-command');
    });
  });

  describe('recursive deep file discovery', () => {
    it('should find and load nested .md files with colon naming', () => {
      // Create nested directory structure
      const subDir = path.join(tempDir, 'foo');
      fs.mkdirSync(subDir);

      // Create files at different levels
      fs.writeFileSync(
        path.join(tempDir, 'root-command.md'),
        'Root level command',
      );
      fs.writeFileSync(path.join(subDir, 'bar.md'), 'Nested command');

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(2);

      const rootCommand = commands.find((cmd) => cmd.name === 'root-command');
      const nestedCommand = commands.find((cmd) => cmd.name === 'foo:bar');

      expect(rootCommand).toBeDefined();
      expect(nestedCommand).toBeDefined();
      expect(nestedCommand?.description).toBe('Nested command');
    });

    it('should handle deeply nested files', () => {
      // Create deeply nested structure: foo/bar/baz.md
      const fooDir = path.join(tempDir, 'foo');
      const barDir = path.join(fooDir, 'bar');
      fs.mkdirSync(fooDir);
      fs.mkdirSync(barDir);

      fs.writeFileSync(path.join(barDir, 'baz.md'), 'Deep nested command');

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('foo:bar:baz');
      expect(commands[0].description).toBe('Deep nested command');
    });

    it('should handle multiple files in same subdirectory', () => {
      const subDir = path.join(tempDir, 'category');
      fs.mkdirSync(subDir);

      fs.writeFileSync(path.join(subDir, 'first.md'), 'First command');
      fs.writeFileSync(path.join(subDir, 'second.md'), 'Second command');

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(2);

      const firstCommand = commands.find(
        (cmd) => cmd.name === 'category:first',
      );
      const secondCommand = commands.find(
        (cmd) => cmd.name === 'category:second',
      );

      expect(firstCommand).toBeDefined();
      expect(secondCommand).toBeDefined();
      expect(firstCommand?.description).toBe('First command');
      expect(secondCommand?.description).toBe('Second command');
    });

    it('should skip non-.md files in subdirectories', () => {
      const subDir = path.join(tempDir, 'mixed');
      fs.mkdirSync(subDir);

      fs.writeFileSync(path.join(subDir, 'command.md'), 'Valid command');
      fs.writeFileSync(path.join(subDir, 'readme.txt'), 'Not a command');
      fs.writeFileSync(path.join(subDir, 'script.js'), 'Also not a command');

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('mixed:command');
    });

    it('should handle Windows-style paths correctly', () => {
      const subDir = path.join(tempDir, 'windows');
      fs.mkdirSync(subDir);

      fs.writeFileSync(path.join(subDir, 'command.md'), 'Windows command');

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      // Should use : regardless of platform path separator
      expect(commands[0].name).toBe('windows:command');
    });

    it('should validate nested command names with colons', () => {
      const subDir = path.join(tempDir, 'valid-dir');
      fs.mkdirSync(subDir);

      // Valid nested command
      fs.writeFileSync(
        path.join(subDir, 'valid-name.md'),
        'Valid nested command',
      );

      // Invalid character in filename (@ symbol)
      fs.writeFileSync(path.join(subDir, 'invalid@name.md'), 'Invalid command');

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('valid-dir:valid-name');
    });

    it('should handle empty subdirectories gracefully', () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir);

      fs.writeFileSync(path.join(tempDir, 'root.md'), 'Root command');

      const commands = loadFilesystemCommands({
        commandsDir: tempDir,
      });

      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('root');
    });
  });
});
