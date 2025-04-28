import fs from 'fs';
import path from 'path';
import { editQuery } from '../llm/query';
import { Context } from '../types';
import * as logger from '../utils/logger';

const fileChanged = new Set<string>();

interface AICommentResult {
  lineNums: number[];
  comments: string[];
  hasAction: null | '!' | '?';
}

export async function runWatch(opts: { context: Context }) {
  const { context } = opts;
  const chokidar = await import('chokidar');
  const watcher = chokidar.watch(context.cwd, {
    ignoreInitial: true,
    ignored: (path) => {
      if (
        path.includes('node_modules') ||
        path.includes('.git') ||
        path.includes('.umi') ||
        path.includes('dist')
      ) {
        return true;
      }
      return false;
    },
    persistent: true,
  });
  watcher.on('change', (filePath) => {
    const relativePath = filePath.replace(context.cwd + '/', '');
    const isJS = ['.js', '.ts', '.jsx', '.tsx'].includes(
      path.extname(relativePath),
    );
    if (!isJS) {
      return;
    }
    if (fileIsTooLarge(filePath)) {
      return;
    }
    fileChanged.add(filePath);
    processFileChanged(context).catch(console.error);
  });
  logger.logAction({ message: `Watching for changes in ${context.cwd}` });
}

let isProcessing = false;

async function processFileChanged(context: Context) {
  if (isProcessing) {
    return;
  }
  isProcessing = true;
  try {
    for (const path of fileChanged) {
      if (!fs.existsSync(path)) {
        continue;
      }
      const content = fs.readFileSync(path, 'utf-8');
      const aiCommentResult = getAIComment(content);
      if (aiCommentResult) {
        console.log(`File ${path} has been changed with AI comments`);
        await processFileWithAI(context, path, content, aiCommentResult);
      }
      fileChanged.delete(path);
    }
  } catch (e: any) {
    logger.logError({ error: e.message });
  } finally {
    isProcessing = false;
  }
  if (fileChanged.size > 0) {
    processFileChanged(context).catch(console.error);
  }
}

export function getAIComment(content: string): AICommentResult | null {
  const aiCommentPattern = /(\/\/|#|--|;+)\s*(ai\b.*|ai\b.*|.*\bai[?!]?)\s*$/im;
  const lines = content.split('\n');
  const lineNums: number[] = [];
  const comments: string[] = [];
  let hasAction: null | '!' | '?' = null;
  lines.forEach((line, index) => {
    const match = line.match(aiCommentPattern);
    if (match) {
      const comment = match[0].trim();
      if (comment) {
        lineNums.push(index);
        comments.push(comment);
        const lowerComment = comment.toLowerCase();
        const trimmedComment = lowerComment
          .replace(/^(\/\/|#|--|;+)/, '')
          .trim();
        if (
          trimmedComment.startsWith('ai!') ||
          trimmedComment.endsWith('ai!')
        ) {
          hasAction = '!';
        } else if (
          trimmedComment.startsWith('ai?') ||
          trimmedComment.endsWith('ai?')
        ) {
          hasAction = '?';
        }
      }
    }
  });
  if (lineNums.length === 0) {
    return null;
  }
  return { lineNums, comments, hasAction };
}

function fileIsTooLarge(filePath: string) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size > 100 * 1024; // 100KB
  } catch (e) {
    return true;
  }
}

async function processFileWithAI(
  context: Context,
  path: string,
  content: string,
  aiCommentResult: AICommentResult,
) {
  console.log(`Processing file ${path} with AI`);
  console.log(`Found ${aiCommentResult.comments.length} AI comments`);
  console.log(`Action type: ${aiCommentResult.hasAction || 'none'}`);
  if (aiCommentResult.hasAction === '!') {
    // const lines = content.split('\n');
    // for (const index of aiCommentResult.lineNums) {
    //   lines[index] = `${lines[index]}`;
    // }
    // const code = lines.join('\n');
    const prompt = `
${PROMPT}
<code path="${path}">
${content}
</code>
    `;
    await editQuery({
      prompt,
      context,
    });
  } else if (aiCommentResult.hasAction === '?') {
    throw new Error('Not implemented');
  }
}

const PROMPT = `
I've written your instructions in comments in the code and marked them with "ai"
You can see the "AI" comments shown below (marked with AI! prefix).
Find them in the code files I've shared with you, and follow their instructions.

After completing those instructions, also be sure to remove all the "AI" comments from the code too.
`;

const ASK_PROMPT = `
Find the "AI" comments below (marked with █) in the code files I've shared with you.
They contain my questions that I need you to answer and other instructions for you.
`;
