import fs from 'fs';
import pathe from 'pathe';
import { askQuery } from '../llm/query';
import { Context } from '../types';
import { checkContentSize } from '../utils/contentSizeCheck';
import { logAction, logError, logInfo } from '../utils/logger';
import { getStagedDiff } from './commit';

interface Finding {
  level: string;
  severity: string;
  message: string;
  locations: {
    uri: string;
    region: {
      startLine: number;
      endLine: number;
      snippet: string;
    };
  }[];
  suggestions: string[];
}

/**
 * 格式化日期为 YYYY-MM-DD-HH-mm-ss 格式
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

/**
 * Loads review rules from a file or uses the provided text
 */
function loadReviewRules(ruleArg: string | undefined, cwd: string): string {
  if (!ruleArg) {
    return 'No specific project guidelines provided for this basic review.';
  }

  // Check if the rule argument looks like a file path
  const hasPathSeparator = ruleArg.includes('/') || ruleArg.includes('\\');
  const hasFileExtension = /\.\w+$/.test(ruleArg);

  if (hasPathSeparator || hasFileExtension) {
    try {
      const absolutePath = pathe.isAbsolute(ruleArg)
        ? ruleArg
        : pathe.resolve(cwd, ruleArg);

      const content = fs.readFileSync(absolutePath, 'utf-8');
      return content;
    } catch (error: any) {
      logError({
        error: `Error loading rules from file ${ruleArg}: ${error.message}`,
      });
      return `Failed to load project guidelines from ${ruleArg}: ${error.message}`;
    }
  }

  // If it's not a file path, treat it as direct rule text
  return ruleArg;
}

/**
 * Safely reads file content
 */
function safeReadFile(filePath: string): {
  content: string;
  success: boolean;
  error?: string;
} {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content, success: true };
  } catch (error: any) {
    return {
      content: '',
      success: false,
      error: `Error reading file ${filePath}: ${error.message}`,
    };
  }
}

/**
 * Writes review results to a file
 */
function writeReviewResultToFile(
  content: string,
  filePath: string,
): { success: boolean; errorMessage?: string } {
  try {
    const dirPath = pathe.dirname(filePath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      errorMessage: `Error writing results to file: ${error.message}`,
    };
  }
}

/**
 * Creates a default output file path in the root directory
 */
function getDefaultOutputPath(cwd: string): string {
  const timestamp = formatDate(new Date());
  return pathe.join(cwd, `review-result-${timestamp}.json`);
}

/**
 * Collects files for review from paths
 */
function collectFilesToReview(
  paths: string[],
  cwd: string,
): { path: string; content: string }[] {
  const filesToReview: { path: string; content: string }[] = [];

  for (const inputPath of paths) {
    // Convert relative paths to absolute paths based on current working directory
    const absolutePath = pathe.isAbsolute(inputPath)
      ? inputPath
      : pathe.resolve(cwd, inputPath);

    try {
      const stats = fs.statSync(absolutePath);

      if (stats.isFile()) {
        const result = safeReadFile(absolutePath);
        if (result.success) {
          filesToReview.push({ path: inputPath, content: result.content });
        } else {
          logError({ error: result.error });
        }
      } else if (stats.isDirectory()) {
        try {
          const entries = fs.readdirSync(absolutePath);

          for (const entry of entries) {
            const entryPath = pathe.join(absolutePath, entry);
            const displayPath = pathe.join(inputPath, entry);

            try {
              const entryStats = fs.statSync(entryPath);

              if (entryStats.isFile()) {
                const result = safeReadFile(entryPath);
                if (result.success) {
                  filesToReview.push({
                    path: displayPath,
                    content: result.content,
                  });
                } else {
                  logError({ error: result.error });
                }
              }
              // Skip subdirectories (non-recursive)
            } catch (error: any) {
              logError({
                error: `Error accessing ${displayPath}: ${error.message}`,
              });
            }
          }
        } catch (error: any) {
          logError({
            error: `Error reading directory ${inputPath}: ${error.message}`,
          });
        }
      }
    } catch (error: any) {
      logError({
        error: `Error accessing path ${inputPath}: ${error.message}`,
      });
    }
  }

  return filesToReview;
}

/**
 * Generates metadata object for the review result
 */
function generateMetadata(
  startTimeUtc: string,
  modelName: string,
  ruleInfo: string | null,
  finalOutputPath: string,
  findingsSummary?: string,
  errorMessage?: string,
) {
  return {
    tool: {
      name: 'takumi',
      command: 'review',
      arguments: {
        model: modelName,
        rules: ruleInfo,
        outputFile: finalOutputPath,
      },
    },
    invocation: {
      startTimeUtc: startTimeUtc,
      endTimeUtc: formatDate(new Date()),
      ...(errorMessage && { error: errorMessage }),
    },
    ...(findingsSummary && { findingsSummary }),
  };
}

function generateFindingsSummary(findings: Finding[]): string {
  return `Found ${findings.length} issues`;
}

// todo
// - [ ] --deep

export async function runReview(opts: { context: Context }) {
  const { argv, cwd, config } = opts.context;
  const ruleArg = argv.rule;
  const outputPath = argv.output || argv.o;

  // Get file/directory paths from arguments (excluding the command name 'review')
  const paths = argv._.slice(1).map(String);

  // Check if using --diff flag
  const useDiff = argv.diff === true;

  if (!useDiff && paths.length === 0) {
    logError({ error: 'Error: No files or directories specified for review.' });
    console.log(
      'Usage: takumi review <file1.ts> [file2.js ...] [path/to/dir/ ...] [--rule <text_or_filepath>] [--output <filepath>] [--diff]',
    );
    return;
  }

  // Determine output file path
  const finalOutputPath = outputPath
    ? pathe.isAbsolute(outputPath)
      ? outputPath
      : pathe.resolve(cwd, outputPath)
    : getDefaultOutputPath(cwd);

  let filesToReview: { path: string; content: string }[] = [];
  let fileListText = '';
  let combinedContent = '';

  // Decide whether to use git diff or file paths for review
  if (useDiff) {
    try {
      const diff = await getStagedDiff();

      if (!diff || diff.trim().length === 0) {
        logError({ error: 'No staged changes to review.' });
        return;
      }

      combinedContent = diff;
      fileListText = '- Staged changes in git repository';
      filesToReview = []; // Empty array as we're not using files directly
    } catch (error: any) {
      logError({ error: error.message });
      return;
    }
  } else {
    // Collect file contents using the original approach
    filesToReview = collectFilesToReview(paths, cwd);

    if (filesToReview.length === 0) {
      logError({
        error:
          'No valid files found for review. Please check the specified paths.',
      });
      return;
    }

    // Generate file list text for the prompt
    fileListText = filesToReview.map((f) => `- ${f.path}`).join('\n');

    // Combine all file contents
    for (const file of filesToReview) {
      combinedContent += `// File: ${file.path}\n${file.content}\n\n`;
    }
  }

  // Max content size limit (100KB)
  const MAX_CONTENT_SIZE = 100 * 1024;

  const { content: processedContent, isTruncated } = checkContentSize(
    combinedContent,
    MAX_CONTENT_SIZE,
  );

  if (isTruncated) {
    logInfo('Combined content exceeds 100KB limit, truncating.');
  }

  combinedContent = processedContent;

  // Get current model name
  const modelName =
    typeof config.model === 'string' ? config.model : 'default-model';

  // Load project guidelines (from --rule option)
  const projectGuidelines = loadReviewRules(ruleArg, cwd);

  // Rule path or text (for metadata)
  const ruleInfo = ruleArg || null;

  // Record start time
  const startTime = new Date();
  const startTimeUtc = formatDate(startTime);

  try {
    // Call LLM with the review prompt
    const result = await askQuery({
      systemPrompt: [getSystemReviewPrompt(projectGuidelines)],
      prompt: `
      #Files being reviewed:
      ${fileListText}
      #CodeContent:
      ${combinedContent}
      `,
      context: opts.context,
    });

    // Parse the findings from the LLM response
    let finalResponse;
    try {
      // Try to parse as JSON if the model returned valid JSON

      const jsonContent = result.trim().replace(/^```json\n|\n```$/g, '');
      const llmResponse = JSON.parse(jsonContent);

      // Generate metadata
      const metadata = generateMetadata(
        startTimeUtc,
        modelName,
        ruleInfo,
        finalOutputPath,
        generateFindingsSummary(llmResponse.findings),
      );

      // Construct the final response
      finalResponse = JSON.stringify(
        {
          metadata,
          findings: llmResponse.findings || [],
        },
        null,
        2,
      );
    } catch (parseError: any) {
      // If parsing fails, return the raw response with a generated metadata
      logError({
        error: `Failed to parse LLM response as JSON: ${parseError.message}`,
      });

      const metadata = generateMetadata(
        startTimeUtc,
        modelName,
        ruleInfo,
        finalOutputPath,
        '0 issues found',
        `Failed to parse LLM response as JSON: ${parseError.message}`,
      );

      finalResponse = JSON.stringify(
        {
          metadata,
          rawResponse: result,
          findings: [],
        },
        null,
        2,
      );
    }

    // Write to file
    const writeResult = writeReviewResultToFile(finalResponse, finalOutputPath);

    if (writeResult.success) {
      logAction({
        message: `[Save] Review results saved to: ${finalOutputPath}`,
      });
    } else {
      logError({
        error:
          writeResult.errorMessage || 'Unknown error writing results to file',
      });
    }
  } catch (error: any) {
    const errorMessage = `Error querying LLM: ${error.message}`;
    logError({ error: errorMessage });

    // Write error info to file
    const writeResult = writeReviewResultToFile(errorMessage, finalOutputPath);

    if (writeResult.success) {
      logInfo(`Error report saved to: ${finalOutputPath}`);
    } else {
      logError({
        error:
          writeResult.errorMessage ||
          'Unknown error writing error report to file',
      });
    }
  }
}

function getSystemReviewPrompt(projectGuidelines: string): string {
  return `
You are an expert code reviewer. Analyze the 'Primary Code' based on the specified 'Review Focus Areas'. Use the 'Contextual Code' and 'Project Guidelines' for deeper understanding and consistency checks.

**Project Guidelines:**
${projectGuidelines || 'No specific project guidelines provided for this basic review.'}

**Contextual Code:**
No contextual code provided for this basic review.

**Output Format Instructions:**
Your output MUST be a single JSON object following this exact schema:

{
  "findings": [
    {
      "level": "error",
      "severity": "high",
      "message": "Detailed description of the issue found",
      "locations": [
        {
          "uri": "src/utils/helper.ts",
          "region": {
            "startLine": 42,
            "endLine": 42,
            "snippet": "const fullName = user.profile.name;"
          }
        }
      ],
      "suggestions": [
        "Add a null check for user.profile before accessing .name: const fullName = user.profile?.name ?? 'Default Name';"
      ]
    },
    {
      "level": "note",
      "severity": "low",
      "message": "Variable name 'tmp' is not descriptive.",
      "locations": [
        {
          "uri": "src/utils/calculation.ts",
          "region": {
            "startLine": 105,
            "endLine": 105,
            "snippet": "let tmp = calculateIntermediate(value);"
          }
        }
      ],
      "suggestions": [
        "Consider renaming 'tmp' to 'intermediateResult' for clarity."
      ]
    }
  ]
}

IMPORTANT: 
- Do NOT wrap your response in any Markdown code block (like \`\`\` or any other format). 
- Your entire response will be saved directly to a .json file, so it MUST be valid JSON with no extra text.
- Do not include any explanations, introductions, or conclusions outside the JSON object.
- Return ONLY the pure JSON object itself, with no surrounding text of any kind.

Follow these guidelines:
1. Use "level" of "error", "warning", or "note" for each finding
2. Use "severity" of "critical", "high", "medium", "low", or "info" for each finding
3. Include the exact code snippet in the region.snippet field
4. Always include at least one suggestion for improvement for each finding
5. Keep suggestions as simple strings with clear instructions
6. Ensure the JSON structure exactly matches the schema above
7. Don't be too critical
8. Use {language} to generate suggestions or description message


The example above is just for illustration. Your actual response should contain real findings from your code review.
`;
}
