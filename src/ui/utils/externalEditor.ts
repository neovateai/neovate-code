import { execSync, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Configuration constants
const EDITOR_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const COMMAND_CHECK_TIMEOUT_MS = 5000; // 5 seconds
const TEMP_FILE_PERMISSIONS = 0o600; // Read/write for owner only

/**
 * Options for opening content in an external editor
 */
export interface ExternalEditorOptions {
  /** The content to edit */
  content: string;
  /** Optional filename (used for temp file naming and syntax highlighting) */
  fileName?: string;
  /** File extension to use if fileName doesn't have one */
  fileExtension?: string;
  /** Original content for diff comparison (required when showDiff is true) */
  originalContent?: string;
  /** Whether to show diff view in supported editors (VS Code) */
  showDiff?: boolean;
}

/**
 * Opens content in an external editor and returns the modified content
 */
export async function openInExternalEditor({
  content,
  fileName,
  fileExtension = '.txt',
  originalContent,
  showDiff = false,
}: ExternalEditorOptions): Promise<string> {
  // Input validation
  if (typeof content !== 'string') {
    throw new Error('Content must be a string');
  }

  if (showDiff && typeof originalContent !== 'string') {
    throw new Error('Original content must be provided when showDiff is true');
  }
  const tempDir = os.tmpdir();
  const baseFileName = fileName
    ? path.parse(fileName).name.replace(/[^a-zA-Z0-9.-]/g, '_') // Sanitize filename
    : 'takumi-edit';
  const extension = fileName
    ? path.extname(fileName) || fileExtension
    : fileExtension;

  const timestamp = Date.now();
  const processId = process.pid; // More deterministic than random
  const tempFileName = `${baseFileName}-edit-${timestamp}-${processId}${extension}`;
  const tempFilePath = path.join(tempDir, tempFileName);

  try {
    // Get editor command
    const editor = getEditorCommand();

    if (
      supportsDiffView(editor.command) &&
      showDiff &&
      originalContent !== undefined
    ) {
      // For VS Code, create both original and new files for diff comparison
      const originalFileName = `${baseFileName}-original-${timestamp}${extension}`;
      const originalFilePath = path.join(tempDir, originalFileName);

      try {
        // Write both files with error handling
        writeSecureFile(originalFilePath, originalContent);
        writeSecureFile(tempFilePath, content);
      } catch (error) {
        // Clean up on write failure
        try {
          fs.unlinkSync(originalFilePath);
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        throw error; // Re-throw the original error
      }

      // Open VS Code diff view
      const diffArgs = ['--diff', originalFilePath, tempFilePath, '--wait'];

      try {
        await spawnWithTimeout(editor.command, diffArgs, {
          stdio: 'ignore',
          shell: false,
          detached: false,
        });
      } finally {
        // Clean up original file
        try {
          fs.unlinkSync(originalFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    } else {
      // For other editors or single file mode, add helpful header
      let contentToEdit = content;

      if (showDiff && originalContent !== undefined) {
        const header = `// TAKUMI EDIT MODE\n// Original file: ${fileName || 'untitled'}\n// Instructions: Edit the content below. Save and close to apply changes.\n// Remove this header if desired.\n\n`;
        contentToEdit = header + content;
      }

      // Write content to temporary file with secure permissions
      writeSecureFile(tempFilePath, contentToEdit);

      // Open editor and wait for it to close
      const spawnOptions = {
        stdio: isVisualEditor(editor.command)
          ? ('ignore' as const)
          : ('inherit' as const),
        shell: false,
        detached: false,
      };

      await spawnWithTimeout(
        editor.command,
        [...editor.args, tempFilePath],
        spawnOptions,
      );
    }

    // Read the modified content with validation
    let modifiedContent: string;
    try {
      modifiedContent = fs.readFileSync(tempFilePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read modified file: ${error}`);
    }

    // Validate that content was actually modified or at least exists
    if (typeof modifiedContent !== 'string') {
      throw new Error('Modified content is not a valid string');
    }

    // Remove header if it was added
    if (
      !supportsDiffView(editor.command) &&
      showDiff &&
      originalContent !== undefined
    ) {
      const headerEnd = '// Remove this header if desired.\n\n';
      const headerIndex = modifiedContent.indexOf(headerEnd);
      if (headerIndex !== -1) {
        modifiedContent = modifiedContent.substring(
          headerIndex + headerEnd.length,
        );
      }
    }

    // Additional validation: ensure content is not suspiciously large
    if (modifiedContent.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `Modified content is too large (${modifiedContent.length} bytes). Maximum allowed: ${MAX_FILE_SIZE_BYTES} bytes`,
      );
    }

    return modifiedContent;
  } finally {
    // Clean up temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get the editor command based on environment variables and platform
 */
function getEditorCommand(): { command: string; args: string[] } {
  // Always try VS Code first if available (most common case)
  if (commandExists('code')) {
    return { command: 'code', args: ['--wait'] };
  }

  // Check environment variables
  const visualEditor = process.env.VISUAL;
  const editor = process.env.EDITOR;

  if (visualEditor) {
    return parseEditorCommand(visualEditor);
  }

  if (editor) {
    return parseEditorCommand(editor);
  }

  // Try other popular visual editors
  const visualEditors = [
    'code-insiders', // VS Code Insiders
    'atom',
    'subl', // Sublime Text
    'gedit',
  ];

  for (const editorName of visualEditors) {
    if (commandExists(editorName)) {
      const result =
        editorName === 'code-insiders'
          ? { command: editorName, args: ['--wait'] }
          : { command: editorName, args: [] };

      return result;
    }
  }

  // Platform-specific defaults as fallback
  const platform = os.platform();

  switch (platform) {
    case 'darwin': // macOS
      return { command: 'open', args: ['-a', 'TextEdit', '-W'] }; // Force TextEdit specifically
    case 'win32': // Windows
      return { command: 'notepad', args: [] };
    default: // Linux and others
      // Try terminal editors as last resort
      const terminalEditors = ['nano', 'vim', 'vi', 'emacs'];
      for (const editorName of terminalEditors) {
        if (commandExists(editorName)) {
          return { command: editorName, args: [] };
        }
      }
      throw new Error(
        'No suitable editor found. Please set EDITOR or VISUAL environment variable.',
      );
  }
}

/**
 * Parse editor command string into command and args
 */
function parseEditorCommand(editorString: string): {
  command: string;
  args: string[];
} {
  const parts = editorString.trim().split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);
  return { command, args };
}

/**
 * Check if an editor is a visual (GUI) editor
 */
function isVisualEditor(editorCommand: string): boolean {
  return ['code', 'code-insiders', 'atom', 'subl', 'gedit'].includes(
    editorCommand,
  );
}

/**
 * Check if an editor supports diff view
 */
function supportsDiffView(editorCommand: string): boolean {
  return ['code', 'code-insiders'].includes(editorCommand);
}

/**
 * Safely write content to a file with secure permissions
 */
function writeSecureFile(filePath: string, content: string): void {
  try {
    fs.writeFileSync(filePath, content, {
      encoding: 'utf8',
      mode: TEMP_FILE_PERMISSIONS,
    });
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

/**
 * Create a timeout-enabled process spawn wrapper
 */
function spawnWithTimeout(
  command: string,
  args: string[],
  options: any,
  timeoutMs: number = EDITOR_TIMEOUT_MS,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const process = spawn(command, args, options);

    const timeout = setTimeout(() => {
      process.kill('SIGTERM');
      reject(new Error(`Process timed out after ${timeoutMs / 60000} minutes`));
    }, timeoutMs);

    process.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    process.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start process: ${error.message}`));
    });
  });
}

/**
 * Check if a command exists in the system PATH
 */
function commandExists(command: string): boolean {
  // Input validation
  if (!command || typeof command !== 'string' || command.trim().length === 0) {
    return false;
  }

  // Sanitize command name to prevent injection
  const sanitizedCommand = command.trim().replace(/[^a-zA-Z0-9._-]/g, '');
  if (sanitizedCommand !== command.trim()) {
    return false; // Command contains suspicious characters
  }

  try {
    const platform = os.platform();

    let result: string;
    if (platform === 'win32') {
      result = execSync(`where ${sanitizedCommand}`, {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: COMMAND_CHECK_TIMEOUT_MS,
      });
    } else {
      result = execSync(`which ${sanitizedCommand}`, {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: COMMAND_CHECK_TIMEOUT_MS,
      });
    }

    return result.trim().length > 0;
  } catch (error) {
    return false;
  }
}
