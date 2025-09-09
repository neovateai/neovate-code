import { detect as chardetDetect } from 'chardet';
import { execSync } from 'child_process';
import os from 'os';

type SystemEncoding = string | null;
type CacheState = 'uninitialized' | 'checking' | 'cached';

interface EncodingCache {
  state: CacheState;
  value: SystemEncoding;
}

// Enhanced cache with state tracking to prevent multiple concurrent system calls
let encodingCache: EncodingCache = {
  state: 'uninitialized',
  value: null,
};

// Promise to handle concurrent calls during system encoding detection
let pendingSystemEncodingDetection: Promise<SystemEncoding> | null = null;

/**
 * Windows code page to encoding mapping with comprehensive coverage
 */
const WINDOWS_CODE_PAGE_MAP = new Map<number, string>([
  // DOS code pages
  [437, 'cp437'],
  [850, 'cp850'],
  [852, 'cp852'],
  [866, 'cp866'],

  // Asian code pages
  [874, 'windows-874'], // Thai
  [932, 'shift_jis'], // Japanese
  [936, 'gb2312'], // Simplified Chinese
  [949, 'euc-kr'], // Korean
  [950, 'big5'], // Traditional Chinese

  // Unicode
  [1200, 'utf-16le'],
  [1201, 'utf-16be'],
  [65001, 'utf-8'],

  // Windows code pages
  [1250, 'windows-1250'], // Central European
  [1251, 'windows-1251'], // Cyrillic
  [1252, 'windows-1252'], // Western European
  [1253, 'windows-1253'], // Greek
  [1254, 'windows-1254'], // Turkish
  [1255, 'windows-1255'], // Hebrew
  [1256, 'windows-1256'], // Arabic
  [1257, 'windows-1257'], // Baltic
  [1258, 'windows-1258'], // Vietnamese
]);

/**
 * Common encoding aliases for normalization
 */
const ENCODING_ALIASES = new Map<string, string>([
  ['utf8', 'utf-8'],
  ['ascii', 'ascii'],
  ['latin1', 'iso-8859-1'],
  ['iso88591', 'iso-8859-1'],
]);

/**
 * Reset the encoding cache - useful for testing or when system configuration changes
 */
export function resetEncodingCache(): void {
  encodingCache = {
    state: 'uninitialized',
    value: null,
  };
  pendingSystemEncodingDetection = null;
}

/**
 * Returns the system encoding with caching and fallback to buffer detection.
 * Handles concurrent calls gracefully and provides robust error recovery.
 *
 * @param buffer - Buffer to analyze if system detection fails
 * @returns The detected encoding or 'utf-8' as ultimate fallback
 */
export async function getCachedEncodingForBuffer(
  buffer: Buffer,
): Promise<string> {
  const systemEncoding = await getSystemEncodingCached();

  if (systemEncoding) {
    return systemEncoding;
  }

  // Fallback to buffer-specific detection
  const bufferEncoding = detectEncodingFromBuffer(buffer);
  return bufferEncoding || 'utf-8';
}

/**
 * Synchronous version for backward compatibility
 * Note: This may block on first call if system encoding hasn't been cached
 */
export function getCachedEncodingForBufferSync(buffer: Buffer): string {
  // If we have a cached result, use it
  if (encodingCache.state === 'cached') {
    return encodingCache.value || detectEncodingFromBuffer(buffer) || 'utf-8';
  }

  // If not cached, do synchronous detection
  if (encodingCache.state === 'uninitialized') {
    encodingCache.state = 'cached';
    encodingCache.value = getSystemEncodingSync();
  }

  return encodingCache.value || detectEncodingFromBuffer(buffer) || 'utf-8';
}

/**
 * Get system encoding with caching and concurrent call handling
 */
async function getSystemEncodingCached(): Promise<SystemEncoding> {
  if (encodingCache.state === 'cached') {
    return encodingCache.value;
  }

  if (encodingCache.state === 'checking' && pendingSystemEncodingDetection) {
    return pendingSystemEncodingDetection;
  }

  encodingCache.state = 'checking';
  pendingSystemEncodingDetection = Promise.resolve(getSystemEncodingSync());

  try {
    const result = await pendingSystemEncodingDetection;
    encodingCache.state = 'cached';
    encodingCache.value = result;
    return result;
  } catch (error) {
    encodingCache.state = 'uninitialized';
    console.warn('Failed to detect system encoding:', error);
    return null;
  } finally {
    pendingSystemEncodingDetection = null;
  }
}

/**
 * Detects system encoding based on platform with improved error handling
 *
 * @returns The system encoding or null if detection fails
 */
export function getSystemEncodingSync(): SystemEncoding {
  try {
    return os.platform() === 'win32' ? getWindowsEncoding() : getUnixEncoding();
  } catch (error) {
    console.warn('System encoding detection failed:', error);
    return null;
  }
}

/**
 * Get encoding on Windows systems using chcp command
 */
function getWindowsEncoding(): SystemEncoding {
  try {
    const output = execSync('chcp', {
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
    });

    const match = output.match(/:\s*(\d+)/);
    if (!match) {
      throw new Error(`Cannot parse chcp output: "${output.trim()}"`);
    }

    const codePage = parseInt(match[1], 10);
    if (isNaN(codePage)) {
      throw new Error(`Invalid code page number: "${match[1]}"`);
    }

    return windowsCodePageToEncoding(codePage);
  } catch (error) {
    console.warn(
      `Windows encoding detection failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Get encoding on Unix-like systems using environment variables and locale
 */
function getUnixEncoding(): SystemEncoding {
  const env = process.env;
  let locale = env.LC_ALL || env.LC_CTYPE || env.LANG;

  // Try environment variables first
  if (locale) {
    const encoding = parseLocaleEncoding(locale);
    if (encoding) {
      return encoding;
    }
  }

  // Fallback to locale command
  try {
    locale = execSync('locale charmap', {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'], // Suppress stderr
    })
      .toString()
      .trim();

    return parseLocaleEncoding(locale);
  } catch (error) {
    console.warn('Failed to get locale charmap:', error);
    return null;
  }
}

/**
 * Parse encoding from locale string with better handling of various formats
 */
function parseLocaleEncoding(locale: string): SystemEncoding {
  if (!locale) {
    return null;
  }

  // Handle format like "en_US.UTF-8" or "en_US.utf8"
  const match = locale.match(/\.([^@]+)/);
  if (match && match[1]) {
    return normalizeEncoding(match[1]);
  }

  // Handle cases where locale is just the encoding name
  if (locale && !locale.includes('.') && !locale.includes('_')) {
    return normalizeEncoding(locale);
  }

  return null;
}

/**
 * Normalize encoding name to standard format
 */
function normalizeEncoding(encoding: string): string {
  const normalized = encoding.toLowerCase().replace(/[-_]/g, '');
  const alias = ENCODING_ALIASES.get(normalized);
  return alias || encoding.toLowerCase();
}

/**
 * Convert Windows code page to encoding with comprehensive mapping
 *
 * @param cp - Windows code page number
 * @returns Corresponding encoding name or null if unmapped
 */
export function windowsCodePageToEncoding(cp: number): SystemEncoding {
  const encoding = WINDOWS_CODE_PAGE_MAP.get(cp);

  if (!encoding) {
    console.warn(`Unknown Windows code page: ${cp}`);
    return null;
  }

  return encoding;
}

/**
 * Detect encoding from buffer using chardet with enhanced error handling
 *
 * @param buffer - Buffer to analyze
 * @returns Detected encoding in lowercase or null if detection fails
 */
export function detectEncodingFromBuffer(buffer: Buffer): SystemEncoding {
  if (!buffer || buffer.length === 0) {
    return null;
  }

  try {
    const detected = chardetDetect(buffer);

    if (typeof detected === 'string' && detected.length > 0) {
      return normalizeEncoding(detected);
    }

    return null;
  } catch (error) {
    console.warn('Chardet encoding detection failed:', error);
    return null;
  }
}

// Maintain backward compatibility
export const getSystemEncoding = getSystemEncodingSync;
