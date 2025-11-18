import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'pathe';

/**
 * Generate a unique temporary file path
 * @param prefix - Filename prefix (default: "takumi-prompt")
 * @param extension - File extension (default: ".md")
 * @returns Full path to temporary file
 */
function getTempFilePath(
  prefix: string = 'takumi-prompt',
  extension: string = '.md',
): string {
  const timestamp = Date.now();
  return path.join(os.tmpdir(), `${prefix}-${timestamp}${extension}`);
}

/**
 * Check if a command exists in PATH
 * @param command - Command to check
 * @returns true if command exists, false otherwise
 */
function commandExists(command: string): boolean {
  try {
    const result =
      process.platform === 'win32'
        ? execSync(`where ${command}`, { stdio: 'pipe' })
        : execSync(`command -v ${command}`, { stdio: 'pipe' });
    return result.toString().trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the editor command to use
 * Priority:
 * 1. $VISUAL environment variable
 * 2. $EDITOR environment variable
 * 3. On Windows: start /wait notepad
 * 4. On Unix: First available from code, vi, nano
 * @returns Editor command or null if none found
 */
function getEditorCommand(): string | null {
  // Check environment variables
  if (process.env.VISUAL?.trim()) {
    return process.env.VISUAL.trim();
  }
  if (process.env.EDITOR?.trim()) {
    return process.env.EDITOR.trim();
  }

  // Platform-specific defaults
  if (process.platform === 'win32') {
    return 'start /wait notepad';
  }

  // Try common editors on Unix-like systems
  const candidates = ['code', 'cursor', 'vi', 'nano'];
  for (const editor of candidates) {
    if (commandExists(editor)) {
      return editor;
    }
  }

  return null;
}

/**
 * Clear the screen and prepare for external editor
 * @returns Promise that resolves when screen is cleared
 */
function clearScreen(): Promise<void> {
  return new Promise((resolve) => {
    // Clear screen, reset attributes, show cursor
    process.stdout.write('\x1B[0m\x1B[?25h\x1B[2J\x1B[H', () => {
      resolve();
    });
  });
}

/**
 * Open an external editor with the given text
 * @param text - Initial text to edit
 * @returns Modified text or null if cancelled/error
 */
export async function openExternalEditor(text: string): Promise<string | null> {
  const tempFilePath = getTempFilePath();

  try {
    // Write current text to temporary file
    fs.writeFileSync(tempFilePath, text, { encoding: 'utf-8', flag: 'w' });

    // Get editor command
    const editorCommand = getEditorCommand();
    if (!editorCommand) {
      return null;
    }

    // Prepare command with proper flags
    let command = editorCommand;
    if (['code', 'cursor'].includes(editorCommand)) {
      command = `${editorCommand} -w`; // -w flag waits for window to close
    }

    // Switch to alternate screen buffer
    process.stdout.write('\x1B[?1049h');

    // Clear screen
    await clearScreen();

    // Launch editor and wait for it to close
    spawnSync(`${command} "${tempFilePath}"`, {
      stdio: 'inherit',
      shell: true,
    });

    // Restore original screen buffer
    process.stdout.write('\x1B[?1049l');

    // Read modified content
    let modifiedText = fs.readFileSync(tempFilePath, { encoding: 'utf-8' });

    // Remove single trailing newline if present (but not double newlines)
    if (modifiedText.endsWith('\n') && !modifiedText.endsWith('\n\n')) {
      modifiedText = modifiedText.slice(0, -1);
    }

    return modifiedText;
  } catch (error) {
    // Ensure we restore the screen even on error
    try {
      process.stdout.write('\x1B[?1049l');
    } catch {
      // Ignore restoration errors
    }
    return null;
  } finally {
    // Clean up temporary file
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get a human-readable name for the editor
 * @returns Editor name for display
 */
export function getEditorName(): string {
  const command = getEditorCommand();
  if (!command) {
    return 'editor';
  }
  // Extract first word of command (the actual editor name)
  const editorName = command.split(' ')[0];
  return editorName || 'editor';
}
