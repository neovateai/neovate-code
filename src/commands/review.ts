import fs from 'fs';
import path from 'path';
import { askQuery } from '../llm/query';
import { Context } from '../types';
import { checkContentSize } from '../utils/contentSizeCheck';
import { logError, logInfo } from '../utils/logger';

export async function runReview(opts: { context: Context }) {
  const { argv, cwd } = opts.context;

  // Get file/directory paths from arguments (excluding the command name 'review')
  const paths = argv._.slice(1).map(String);

  if (paths.length === 0) {
    logError('Error: No files or directories specified for review.');
    console.log(
      'Usage: takumi review <file1.ts> [file2.js ...] [path/to/dir/ ...]',
    );
    return;
  }

  // Collect file contents
  const filesToReview: { path: string; content: string }[] = [];

  for (const inputPath of paths) {
    // Convert relative paths to absolute paths based on current working directory
    const absolutePath = path.isAbsolute(inputPath)
      ? inputPath
      : path.resolve(cwd, inputPath);

    try {
      const stats = fs.statSync(absolutePath);

      if (stats.isFile()) {
        try {
          const content = fs.readFileSync(absolutePath, 'utf-8');
          // Store the original inputPath for display purposes but use absolute path for reading
          filesToReview.push({ path: inputPath, content });
        } catch (error: any) {
          logError(`Error reading file ${inputPath}: ${error.message}`);
        }
      } else if (stats.isDirectory()) {
        try {
          const entries = fs.readdirSync(absolutePath);

          for (const entry of entries) {
            const entryPath = path.join(absolutePath, entry);
            // Create a relative entry path for display
            const displayPath = path.join(inputPath, entry);

            try {
              const entryStats = fs.statSync(entryPath);

              if (entryStats.isFile()) {
                try {
                  const content = fs.readFileSync(entryPath, 'utf-8');
                  filesToReview.push({ path: displayPath, content });
                } catch (error: any) {
                  logError(
                    `Error reading file ${displayPath}: ${error.message}`,
                  );
                }
              }
              // Skip subdirectories (non-recursive)
            } catch (error: any) {
              logError(`Error accessing ${displayPath}: ${error.message}`);
            }
          }
        } catch (error: any) {
          logError(`Error reading directory ${inputPath}: ${error.message}`);
        }
      }
    } catch (error: any) {
      logError(`Error accessing path ${inputPath}: ${error.message}`);
    }
  }

  if (filesToReview.length === 0) {
    logError(
      'No valid files found for review. Please check the specified paths.',
    );
    return;
  }

  // Max content size limit (100KB)
  const MAX_CONTENT_SIZE = 100 * 1024;

  // Combine all file contents
  let combinedContent = '';

  for (const file of filesToReview) {
    combinedContent += `// File: ${file.path}\n${file.content}\n\n`;
  }

  const { content: processedContent, isTruncated } = checkContentSize(
    combinedContent,
    MAX_CONTENT_SIZE,
  );

  if (isTruncated) {
    logInfo('Combined content exceeds 100KB limit, truncating.');
  }

  combinedContent = processedContent;

  const fileListText = filesToReview.map((f) => `- ${f.path}`).join('\n');

  try {
    await askQuery({
      systemPrompt: [systemReviewPrompt],
      prompt: `
      #Files being reviewed:
      ${fileListText}
      #CodeContent:
      ${combinedContent}`,
      context: opts.context,
    });
  } catch (error: any) {
    logError(`Error querying LLM: ${error.message}`);
  }
}

const systemReviewPrompt = `
You are an expert code reviewer. Analyze the 'Primary Code' based on the specified 'Review Focus Areas'. Use the 'Contextual Code' and 'Project Guidelines' for deeper understanding and consistency checks.

**Review Focus Areas:**
- style
- logic
- best-practices

**Project Guidelines:**
No specific project guidelines provided for this basic review.

**Contextual Code:**
No contextual code provided for this basic review.

**Output Format Instructions:**
For each finding, provide:
- File path (relative to project root)
- Line number (or range)
- Severity (low, medium, high, critical)
- Description of the issue
- Suggested improvement (if applicable)
- Always reply to the user in {language}.

Provide your response as a JSON array of review finding objects. Example object: 
{"file": "src/utils/helper.ts", "line": 42, "severity": "medium", "description": "Variable name 'x' is too generic.", "suggestion": "Rename 'x' to 'userCount'."}

`;
