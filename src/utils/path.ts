import fs from 'fs';
import os from 'os';
import path from 'pathe';

export function relativeToHome(p: string) {
  return p.replace(os.homedir(), '~');
}

export type PathValidationResult =
  | { resultType: 'success'; absolutePath: string }
  | { resultType: 'emptyPath' }
  | { resultType: 'pathNotFound'; directoryPath: string; absolutePath: string }
  | { resultType: 'notADirectory'; directoryPath: string; absolutePath: string }
  | {
      resultType: 'alreadyInWorkingDirectory';
      directoryPath: string;
      workingDir: string;
    };

/**
 * Check if childPath is within parentPath
 */
export function isPathWithin(childPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  // If relative path starts with .., childPath is not within parentPath
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Validate directory path
 * @param inputPath Path input by user
 * @param existingDirectories List of existing working directories (including cwd)
 * @returns Validation result
 */
export function validateDirectoryPath(
  inputPath: string,
  existingDirectories: string[],
): PathValidationResult {
  // Check for empty path
  if (!inputPath || inputPath.trim() === '') {
    return { resultType: 'emptyPath' };
  }

  // Resolve to absolute path
  const absolutePath = path.resolve(inputPath.trim());

  // Check if path exists
  if (!fs.existsSync(absolutePath)) {
    return {
      resultType: 'pathNotFound',
      directoryPath: inputPath,
      absolutePath,
    };
  }

  // Check if it's a directory
  const stats = fs.statSync(absolutePath);
  if (!stats.isDirectory()) {
    return {
      resultType: 'notADirectory',
      directoryPath: inputPath,
      absolutePath,
    };
  }

  // Check if already in existing working directories
  for (const existingDir of existingDirectories) {
    if (isPathWithin(absolutePath, existingDir)) {
      return {
        resultType: 'alreadyInWorkingDirectory',
        directoryPath: inputPath,
        workingDir: existingDir,
      };
    }
  }

  return { resultType: 'success', absolutePath };
}

/**
 * Format validation result into user-friendly message
 */
export function formatValidationMessage(result: PathValidationResult): string {
  switch (result.resultType) {
    case 'emptyPath':
      return 'Please provide a directory path.';
    case 'pathNotFound':
      return `Path ${result.directoryPath} does not exist.`;
    case 'notADirectory': {
      const parentDir = path.dirname(result.absolutePath);
      return `${result.directoryPath} is not a directory. Would you like to add parent directory ${parentDir}?`;
    }
    case 'alreadyInWorkingDirectory':
      return `${result.directoryPath} is already within existing working directory ${result.workingDir}.`;
    case 'success':
      return `Successfully added ${result.absolutePath} as working directory.`;
  }
}
