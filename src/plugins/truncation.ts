import createDebug from 'debug';
import fs from 'fs/promises';
import path from 'pathe';
import { TRUNCATE_MAX_BYTES, TRUNCATE_MAX_LINES } from '../constants';
import type { Plugin } from '../plugin';
import type { ReturnDisplay } from '../tool';

const debug = createDebug('neovate:truncation');

// Tool output directory name
const TOOL_OUTPUT_DIR_NAME = 'tool-output';

/**
 * Generate unique file ID for truncated output
 */
function generateFileId(sessionId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `tool_${sessionId}_${timestamp}_${random}`;
}

/**
 * Truncate text and save full content to file
 */
async function truncateAndSave(
  text: string,
  outputDir: string,
  sessionId: string,
): Promise<{ content: string; outputPath: string }> {
  const lines = text.split('\n');
  const totalBytes = Buffer.byteLength(text, 'utf-8');

  // Truncate from head (keep first N lines/bytes)
  const out: string[] = [];
  let bytes = 0;
  let hitBytes = false;

  for (let i = 0; i < lines.length && out.length < TRUNCATE_MAX_LINES; i++) {
    const lineBytes = Buffer.byteLength(lines[i], 'utf-8') + (i > 0 ? 1 : 0);
    if (bytes + lineBytes > TRUNCATE_MAX_BYTES) {
      hitBytes = true;
      break;
    }
    out.push(lines[i]);
    bytes += lineBytes;
  }

  // Calculate removed amount
  const removed = hitBytes ? totalBytes - bytes : lines.length - out.length;
  const unit = hitBytes ? 'bytes' : 'lines';
  const preview = out.join('\n');

  // Save full content to file
  const id = generateFileId(sessionId);
  const filepath = path.join(outputDir, `${id}.txt`);

  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(filepath, text, 'utf-8');
  } catch (err) {
    debug(`Failed to save truncated output: ${err}`);
    // Fallback: still return truncated content without file path
    return {
      content: `${preview}\n\n...${removed} ${unit} truncated...\n\n(Failed to save full output to file)`,
      outputPath: '',
    };
  }

  // Generate hint message
  const hint =
    `Full output saved to: ${filepath}\n` +
    `Use Grep to search the full content or Read with offset/limit to view specific sections.`;

  const content = `${preview}\n\n...${removed} ${unit} truncated...\n\n${hint}`;

  return { content, outputPath: filepath };
}

// Skip truncating returnDisplay if it's smaller than this threshold (5KB)
const RETURN_DISPLAY_SKIP_THRESHOLD = 5000;

/**
 * Get the returnDisplay value for truncated result
 * - If original is object (special type like diff_viewer), keep as-is
 * - If original string is small enough, keep as-is
 * - Otherwise use the truncated content
 */
function getReturnDisplay(
  original: ReturnDisplay | undefined,
  truncatedContent: string,
): ReturnDisplay | undefined {
  // Special types (object) should be kept as-is
  if (typeof original === 'object' && original !== null) {
    return original;
  }
  // If original string is small enough, keep as-is
  if (
    typeof original === 'string' &&
    Buffer.byteLength(original, 'utf-8') <= RETURN_DISPLAY_SKIP_THRESHOLD
  ) {
    return original;
  }
  // undefined or large string: use truncated content
  return truncatedContent;
}

export const truncationPlugin: Plugin = {
  name: 'truncation',
  enforce: 'post', // Execute after other plugins

  async toolResult(toolResult, opts) {
    // 1. Check if truncation is disabled
    if (this.config.truncation === false) {
      debug('Truncation disabled by config');
      return toolResult;
    }

    // 2. Skip if tool already handled truncation
    if (toolResult.truncated !== undefined) {
      debug(`[${opts.toolUse.name}] skipped: truncated already defined`);
      return toolResult;
    }

    // 3. Skip error results
    if (toolResult.isError) {
      return toolResult;
    }

    // 4. Only handle string content
    if (typeof toolResult.llmContent !== 'string') {
      // TODO: Could extend to handle text parts in arrays
      return toolResult;
    }

    // 5. Check if truncation is needed
    const text = toolResult.llmContent;
    const lines = text.split('\n');
    const totalBytes = Buffer.byteLength(text, 'utf-8');

    if (
      lines.length <= TRUNCATE_MAX_LINES &&
      totalBytes <= TRUNCATE_MAX_BYTES
    ) {
      return { ...toolResult, truncated: false };
    }

    // 6. Execute truncation
    debug(
      `[${opts.toolUse.name}] truncating: ${lines.length} lines, ${totalBytes} bytes`,
    );

    const outputDir = path.join(
      this.paths.globalConfigDir,
      TOOL_OUTPUT_DIR_NAME,
    );
    const result = await truncateAndSave(text, outputDir, opts.sessionId);

    return {
      ...toolResult,
      llmContent: result.content,
      returnDisplay: getReturnDisplay(toolResult.returnDisplay, result.content),
      truncated: true,
      outputPath: result.outputPath || undefined,
    };
  },
};
