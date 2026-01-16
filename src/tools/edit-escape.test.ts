import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { createEditTool } from './edit';

describe('edit tool with escaped strings', () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edit-test-'));
    testFilePath = path.join(tempDir, 'test.ts');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should handle LLM output with literal newlines (\\n)', async () => {
    // Setup: Create a test file with original content
    const originalContent = `function foo() {
  const x = 1;
  return x;
}`;
    fs.writeFileSync(testFilePath, originalContent, 'utf-8');

    // Simulate LLM output with literal escape sequences
    const llmOldString = 'function foo() {\\n  const x = 1;\\n  return x;\\n}';
    const llmNewString =
      'function bar() {\\n  const y = 2;\\n  return y * 2;\\n}';

    const editTool = createEditTool({ cwd: tempDir });
    const result = await editTool.execute({
      file_path: testFilePath,
      old_string: llmOldString,
      new_string: llmNewString,
      replace_all: false,
    });

    // Verify the edit was successful
    expect(result.isError).toBeFalsy();
    expect(result.llmContent).toContain('successfully edited');

    // Verify the file content was actually updated
    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    const expectedContent = `function bar() {
  const y = 2;
  return y * 2;
}`;
    expect(updatedContent).toBe(expectedContent);
  });

  test('should handle mixed tabs and newlines from LLM', async () => {
    const originalContent = `if (condition) {
\tdo();
\tmore();
}`;
    fs.writeFileSync(testFilePath, originalContent, 'utf-8');

    // LLM returns with escaped sequences
    const llmOldString = 'if (condition) {\\n\\tdo();\\n\\tmore();\\n}';
    const llmNewString = 'if (newCondition) {\\n\\tdoOther();\\n}';

    const editTool = createEditTool({ cwd: tempDir });
    const result = await editTool.execute({
      file_path: testFilePath,
      old_string: llmOldString,
      new_string: llmNewString,
      replace_all: false,
    });

    expect(result.isError).toBeFalsy();

    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    const expectedContent = `if (newCondition) {
\tdoOther();
}`;
    expect(updatedContent).toBe(expectedContent);
  });

  test('should still work with normal newlines (no escaping)', async () => {
    const originalContent = `function test() {
  console.log('hello');
}`;
    fs.writeFileSync(testFilePath, originalContent, 'utf-8');

    // Normal string with actual newlines (not escaped)
    const normalOldString = `function test() {
  console.log('hello');
}`;
    const normalNewString = `function test() {
  console.log('world');
}`;

    const editTool = createEditTool({ cwd: tempDir });
    const result = await editTool.execute({
      file_path: testFilePath,
      old_string: normalOldString,
      new_string: normalNewString,
      replace_all: false,
    });

    expect(result.isError).toBeFalsy();

    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    const expectedContent = `function test() {
  console.log('world');
}`;
    expect(updatedContent).toBe(expectedContent);
  });

  test('should handle escaped backslashes correctly', async () => {
    const originalContent = 'const path = "c:\\\\users\\\\file.txt";';
    fs.writeFileSync(testFilePath, originalContent, 'utf-8');

    // LLM escapes backslashes
    const llmOldString = 'const path = "c:\\\\\\\\users\\\\\\\\file.txt";';
    const llmNewString = 'const path = "d:\\\\\\\\data\\\\\\\\file.txt";';

    const editTool = createEditTool({ cwd: tempDir });
    const result = await editTool.execute({
      file_path: testFilePath,
      old_string: llmOldString,
      new_string: llmNewString,
      replace_all: false,
    });

    expect(result.isError).toBeFalsy();

    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    expect(updatedContent).toBe('const path = "d:\\\\data\\\\file.txt";');
  });

  test('should handle real-world Gemini output example', async () => {
    // This is the actual example from the bug report
    const originalContent = `      } else {
        throw new Error(\`Unsupported message role: \${message}.\`);
      }
    });
  }

  #shouldCompress(model: ModelInfo, usage: Usage): boolean {
    if (usage.totalTokens < MIN_TOKEN_THRESHOLD) {
      return false;
    }
    const { context: contextLimit, output: outputLimit } = model.model.limit;
`;

    fs.writeFileSync(testFilePath, originalContent, 'utf-8');

    // Gemini's escaped output
    const llmOldString = `      } else {\\n        throw new Error(\`Unsupported message role: \${message}.\`);\\n      }\\n    });\\n  }\\n\\n  #shouldCompress(model: ModelInfo, usage: Usage): boolean {\\n    if (usage.totalTokens < MIN_TOKEN_THRESHOLD) {\\n      return false;\\n    }\\n    const { context: contextLimit, output: outputLimit } = model.model.limit;\\n`;

    const llmNewString = `      } else {\\n        throw new Error(\`Unsupported message role: \${message}.\`);\\n      }\\n    });\\n  }\\n\\n  #estimateTokens(content: any): number {\\n    return Math.ceil(JSON.stringify(content).length / 3);\\n  }\\n\\n  #shouldCompress(model: ModelInfo, usage: Usage): boolean {\\n    let unaccountedTokens = 0;\\n    if (usage.totalTokens < MIN_TOKEN_THRESHOLD) {\\n      return false;\\n    }\\n    const { context: contextLimit, output: outputLimit } = model.model.limit;\\n`;

    const editTool = createEditTool({ cwd: tempDir });
    const result = await editTool.execute({
      file_path: testFilePath,
      old_string: llmOldString,
      new_string: llmNewString,
      replace_all: false,
    });

    expect(result.isError).toBeFalsy();
    expect(result.llmContent).toContain('successfully edited');

    const updatedContent = fs.readFileSync(testFilePath, 'utf-8');
    expect(updatedContent).toContain('#estimateTokens');
    expect(updatedContent).toContain('let unaccountedTokens = 0;');
  });
});
