import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { basename, extname, isAbsolute } from 'pathe';

// Error messages for different platforms
function getClipboardErrorMessage(): string {
  const platform = process.platform;
  const messages = {
    darwin:
      'No image found in clipboard. Use Cmd + Ctrl + Shift + 4 to copy a screenshot to clipboard.',
    win32:
      'No image found in clipboard. Use Print Screen to copy a screenshot to clipboard.',
    linux:
      'No image found in clipboard. Use appropriate screenshot tool to copy a screenshot to clipboard.',
  };
  return messages[platform as keyof typeof messages] || messages.linux;
}

export const CLIPBOARD_ERROR_MESSAGE = getClipboardErrorMessage();

// Image format detection based on binary headers (more reliable than base64 prefixes)
export function detectImageType(base64Data: string): string {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length < 4) return 'image/png';

    // PNG file header detection: 137, 80, 78, 71
    if (
      buffer[0] === 137 &&
      buffer[1] === 80 &&
      buffer[2] === 78 &&
      buffer[3] === 71
    ) {
      return 'image/png';
    }

    // JPEG file header detection: 255, 216, 255
    if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
      return 'image/jpeg';
    }

    // GIF file header detection: 71, 73, 70
    if (buffer[0] === 71 && buffer[1] === 73 && buffer[2] === 70) {
      return 'image/gif';
    }

    // WebP file header detection: RIFF...WEBP
    if (
      buffer[0] === 82 &&
      buffer[1] === 73 &&
      buffer[2] === 70 &&
      buffer[3] === 70
    ) {
      if (
        buffer.length >= 12 &&
        buffer[8] === 87 &&
        buffer[9] === 69 &&
        buffer[10] === 66 &&
        buffer[11] === 80
      ) {
        return 'image/webp';
      }
    }

    return 'image/png'; // Default type
  } catch {
    return 'image/png';
  }
}

// Legacy function for backward compatibility
export function detectImageFormat(base64Image: string): string {
  const mediaType = detectImageType(base64Image);
  return mediaType.replace('image/', '');
}

// Cross-platform command configuration
function getPlatformCommands() {
  const platform = process.platform;
  const tempPathMapping = {
    darwin: '/tmp/neovate_cli_latest_screenshot.png',
    linux: '/tmp/neovate_cli_latest_screenshot.png',
    win32: process.env.TEMP
      ? `${process.env.TEMP}\\neovate_cli_latest_screenshot.png`
      : 'C:\\Temp\\neovate_cli_latest_screenshot.png',
  };

  const commandMapping = {
    darwin: {
      checkImage: "osascript -e 'the clipboard as «class PNGf»'",
      saveImage: (path: string) =>
        `osascript -e 'set png_data to (the clipboard as «class PNGf»)' -e 'set fp to open for access POSIX file "${path}" with write permission' -e 'write png_data to fp' -e 'close access fp'`,
      getPath:
        "osascript -e 'get POSIX path of (the clipboard as «class furl»)'",
      deleteFile: (path: string) => `rm -f "${path}"`,
    },
    linux: {
      checkImage:
        'xclip -selection clipboard -t TARGETS -o | grep -E "image/(png|jpeg|jpg|gif|webp)"',
      saveImage: (path: string) =>
        `xclip -selection clipboard -t image/png -o > "${path}" || wl-paste --type image/png > "${path}"`,
      getPath: 'xclip -selection clipboard -t text/plain -o',
      deleteFile: (path: string) => `rm -f "${path}"`,
    },
    win32: {
      checkImage:
        'powershell -Command "(Get-Clipboard -Format Image) -ne $null"',
      saveImage: (path: string) =>
        `powershell -Command "$img = Get-Clipboard -Format Image; if ($img) { $img.Save('${path.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png) }"`,
      getPath: 'powershell -Command "Get-Clipboard"',
      deleteFile: (path: string) => `del /f "${path}"`,
    },
  };

  return {
    commands:
      commandMapping[platform as keyof typeof commandMapping] ||
      commandMapping.linux,
    screenshotPath:
      tempPathMapping[platform as keyof typeof tempPathMapping] ||
      tempPathMapping.linux,
  };
}

// Get clipboard path for relative image path resolution
function getClipboardPath(): string | null {
  const { commands } = getPlatformCommands();
  try {
    return execSync(commands.getPath, { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.error('Failed to get clipboard path:', error);
    return null;
  }
}

// Utility functions for path processing
function removeQuotes(text: string): string {
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function processEscapeCharacters(path: string): string {
  if (process.platform === 'win32') return path;

  const doubleBackslashPlaceholder = '__DOUBLE_BACKSLASH__';
  return path
    .replace(/\\\\/g, doubleBackslashPlaceholder)
    .replace(/\\(.)/g, '$1')
    .replace(new RegExp(doubleBackslashPlaceholder, 'g'), '\\');
}

// Check if text matches image path format
export function isImagePath(text: string): boolean {
  const cleanedText = removeQuotes(text.trim());
  const processedPath = processEscapeCharacters(cleanedText);
  const imageExtensionRegex = /\.(png|jpe?g|gif|webp)$/i;
  return imageExtensionRegex.test(processedPath);
}

// Extract and validate image path from text
function extractImagePath(text: string): string | null {
  const cleanedText = removeQuotes(text.trim());
  const processedPath = processEscapeCharacters(cleanedText);
  if (isImagePath(processedPath)) return processedPath;
  return null;
}

// Process image paste from file path
export async function processImageFromPath(
  pasteContent: string,
): Promise<{ base64: string; mediaType: string; path: string } | null> {
  const imagePath = extractImagePath(pasteContent);
  if (!imagePath) return null;

  let imageData: Buffer;
  try {
    if (isAbsolute(imagePath)) {
      // Read directly for absolute path
      imageData = readFileSync(imagePath);
    } else {
      // For relative path, combine with clipboard path
      const clipboardPath = getClipboardPath();
      if (clipboardPath && imagePath === basename(clipboardPath)) {
        imageData = readFileSync(clipboardPath);
      } else {
        return null;
      }
    }
  } catch (error) {
    console.error('Failed to read image file:', error);
    return null;
  }

  const base64Data = imageData.toString('base64');
  const mediaType = detectImageType(base64Data);

  return { path: imagePath, base64: base64Data, mediaType };
}

// Enhanced clipboard image retrieval with cross-platform support
export async function getImageFromClipboard(): Promise<{
  base64: string;
  mediaType: string;
} | null> {
  const { commands, screenshotPath } = getPlatformCommands();

  try {
    // 1. Check if clipboard contains image
    execSync(commands.checkImage, { stdio: 'ignore' });

    // 2. Save image to temporary file
    execSync(commands.saveImage(screenshotPath), { stdio: 'ignore' });

    // 3. Verify file was created successfully
    if (!existsSync(screenshotPath)) {
      return null;
    }

    // 4. Read image file and convert to base64
    const imageBytes = readFileSync(screenshotPath);
    const base64Data = imageBytes.toString('base64');
    const mediaType = detectImageType(base64Data);

    // 5. Clean up temporary file
    execSync(commands.deleteFile(screenshotPath), { stdio: 'ignore' });

    return { base64: base64Data, mediaType };
  } catch (error) {
    // Clean up any potential temporary files
    try {
      execSync(commands.deleteFile(screenshotPath), { stdio: 'ignore' });
    } catch {
      // Ignore cleanup errors
    }

    return null;
  }
}

// Legacy function for backward compatibility - returns only base64
export function getImageFromClipboardLegacy(): string | null {
  // For non-darwin platforms, return null for now
  if (process.platform !== 'darwin') {
    return null;
  }

  const tempPath = `/tmp/neovate_cli_screenshot_${Date.now()}.png`;

  try {
    // 1. First check if clipboard has image data
    const checkResult = execSync(
      `osascript -e 'try
      the clipboard as «class PNGf»
      return "hasImage"
    on error
      return "noImage"
    end try'`,
      { encoding: 'utf8' },
    ).trim();

    if (checkResult !== 'hasImage') {
      return null;
    }

    // 2. Extract image data with better error handling
    execSync(
      `osascript -e 'try
      set png_data to (the clipboard as «class PNGf»)
      set fp to open for access POSIX file "${tempPath}" with write permission
      write png_data to fp
      close access fp
    on error e
      return "error: " & e as string
    end try'`,
      { stdio: 'ignore' },
    );

    // 3. Verify file was created successfully
    if (!existsSync(tempPath)) {
      return null;
    }

    // Read the image and convert to base64
    const imageBuffer = readFileSync(tempPath);
    const base64Image = imageBuffer.toString('base64');

    // Cleanup temporary file
    execSync(`rm -f "${tempPath}"`, { stdio: 'ignore' });

    return base64Image;
  } catch (error) {
    // Clean up any potential temporary files
    try {
      execSync(`rm -f "${tempPath}"`, { stdio: 'ignore' });
    } catch {
      // Ignore cleanup errors
    }

    console.error('Image paste error:', error);
    return null;
  }
}
