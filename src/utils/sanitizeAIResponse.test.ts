import { describe, expect, it } from 'vitest';
import {
  sanitizeAIResponse,
  stripCodeBlocks,
  stripInlineCode,
  stripThinkTags,
} from './sanitizeAIResponse';

describe('stripThinkTags', () => {
  it('removes think tags', () => {
    expect(stripThinkTags('<think>reasoning</think>result')).toBe('result');
  });

  it('removes multiple think tags', () => {
    expect(
      stripThinkTags('<think>first</think>middle<think>second</think>end'),
    ).toBe('middleend');
  });

  it('handles nested-like content', () => {
    expect(stripThinkTags('<think>nested <inner> tag</think>result')).toBe(
      'result',
    );
  });

  it('handles multiline think content', () => {
    expect(stripThinkTags('<think>\nmultiline\nthinking\n</think>result')).toBe(
      'result',
    );
  });

  it('returns text unchanged when no think tags', () => {
    expect(stripThinkTags('hello world')).toBe('hello world');
  });
});

describe('stripCodeBlocks', () => {
  it('removes bash code blocks', () => {
    expect(stripCodeBlocks('```bash\nls -la\n```')).toBe('ls -la');
  });

  it('removes sh code blocks', () => {
    expect(stripCodeBlocks('```sh\npwd\n```')).toBe('pwd');
  });

  it('removes shell code blocks', () => {
    expect(stripCodeBlocks('```shell\necho hello\n```')).toBe('echo hello');
  });

  it('removes code blocks without language', () => {
    expect(stripCodeBlocks('```\ncommand\n```')).toBe('command');
  });

  it('preserves multiline command content', () => {
    expect(stripCodeBlocks('```bash\nline1\nline2\nline3\n```')).toBe(
      'line1\nline2\nline3',
    );
  });

  it('does not strip partial code blocks', () => {
    const text = 'prefix```bash\nls\n```suffix';
    expect(stripCodeBlocks(text)).toBe(text);
  });

  it('returns text unchanged when no code blocks', () => {
    expect(stripCodeBlocks('hello world')).toBe('hello world');
  });
});

describe('stripInlineCode', () => {
  it('removes inline code backticks', () => {
    expect(stripInlineCode('`pwd`')).toBe('pwd');
  });

  it('preserves shell backticks in command', () => {
    // echo `date` has more than 2 backticks, so it's preserved
    expect(stripInlineCode('echo `date`')).toBe('echo `date`');
  });

  it('does not strip partial backticks', () => {
    expect(stripInlineCode('`hello')).toBe('`hello');
    expect(stripInlineCode('hello`')).toBe('hello`');
  });

  it('returns text unchanged when no backticks', () => {
    expect(stripInlineCode('hello world')).toBe('hello world');
  });
});

describe('sanitizeAIResponse', () => {
  it('returns simple text unchanged', () => {
    expect(sanitizeAIResponse('hello')).toBe('hello');
  });

  it('removes think tags', () => {
    expect(sanitizeAIResponse('<think>reasoning</think>result')).toBe('result');
  });

  it('removes code blocks', () => {
    expect(sanitizeAIResponse('```bash\nls -la\n```')).toBe('ls -la');
  });

  it('removes inline code', () => {
    expect(sanitizeAIResponse('`pwd`')).toBe('pwd');
  });

  it('handles mixed content with think tags and code blocks', () => {
    expect(
      sanitizeAIResponse('<think>hmm</think>\n```sh\necho `date`\n```'),
    ).toBe('echo `date`');
  });

  it('trims whitespace', () => {
    expect(sanitizeAIResponse('  spaced  ')).toBe('spaced');
  });

  it('handles empty string', () => {
    expect(sanitizeAIResponse('')).toBe('');
  });

  it('handles only whitespace', () => {
    expect(sanitizeAIResponse('   \n\t  ')).toBe('');
  });

  it('handles complex real-world response', () => {
    const input = `<think>
The user wants to list files. I should use ls command.
</think>
\`\`\`bash
ls -la
\`\`\`
`;
    expect(sanitizeAIResponse(input)).toBe('ls -la');
  });
});
