import path from 'pathe';

/**
 * Check if a file path is a plan file
 * @param filePath - The file path to check
 * @param plansDir - The plans directory path
 * @returns Whether the file is a plan file
 */
export function isPlanFile(
  filePath: string | undefined | null,
  plansDir: string,
): boolean {
  // Type guard
  if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
    return false;
  }

  // Normalize paths
  const normalizedPath = path.resolve(filePath);
  const normalizedPlansDir = path.resolve(plansDir);

  // Check if file is under plans directory
  return normalizedPath.startsWith(normalizedPlansDir);
}
