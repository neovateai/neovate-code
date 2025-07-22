import createDebug from 'debug';
import { appendFileSync, mkdirSync } from 'fs';
import path from 'path';

export interface PatchConsoleOptions {
  logFile?: string;
  silent?: boolean;
}

export interface ConsolePatcher {
  restore: () => void;
}

export function patchConsole(
  options: PatchConsoleOptions = {},
): ConsolePatcher {
  const { logFile, silent = false } = options;

  // Store original console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  const originalConsoleDebug = console.debug;

  // Helper function to strip ANSI color codes
  const stripColors = (str: string): string => {
    return str.replace(/\u001b\[[0-9;]*m/g, '');
  };

  // Helper function to write to log file
  const writeToLogFile = (type: string, args: any[]) => {
    if (!logFile) return;

    try {
      // Ensure directory exists
      const logDir = path.dirname(logFile);
      mkdirSync(logDir, { recursive: true });

      const timestamp = new Date().toISOString();
      const message = args
        .map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
        )
        .join(' ');

      // Strip color codes from the message
      const cleanMessage = stripColors(message);
      const logEntry = `[${timestamp}] [${type}] ${cleanMessage}\n`;

      appendFileSync(logFile, logEntry);
    } catch (error) {
      // Silently ignore file write errors to avoid infinite loops
    }
  };

  // Store original debug function if DEBUG env var is set
  let originalDebugFunction: any = null;
  if (process.env.DEBUG && logFile) {
    try {
      // Try to get the debug package if it's available
      if (createDebug && typeof createDebug.log === 'function') {
        originalDebugFunction = createDebug.log;
        createDebug.log = (...args: any[]) => {
          // Call original debug log
          // originalDebugFunction(...args);
          // Also write to our log file
          writeToLogFile('DEBUG', args);
        };
      }
    } catch (error) {
      // Debug package not available, continue without patching
    }
  }

  // Patch console.log
  console.log = (...args: any[]) => {
    if (!silent) {
      originalConsoleLog(...args);
    }
    if (logFile) {
      writeToLogFile('LOG', args);
    }
  };

  // Patch console.error
  console.error = (...args: any[]) => {
    if (!silent) {
      originalConsoleError(...args);
    }
    if (logFile) {
      writeToLogFile('ERROR', args);
    }
  };

  // Patch console.warn
  console.warn = (...args: any[]) => {
    if (!silent) {
      originalConsoleWarn(...args);
    }
    if (logFile) {
      writeToLogFile('WARN', args);
    }
  };

  // Patch console.info
  console.info = (...args: any[]) => {
    if (!silent) {
      originalConsoleInfo(...args);
    }
    if (logFile) {
      writeToLogFile('INFO', args);
    }
  };

  // Patch console.debug
  console.debug = (...args: any[]) => {
    if (!silent) {
      originalConsoleDebug(...args);
    }
    if (logFile) {
      writeToLogFile('DEBUG', args);
    }
  };

  // Return restore function
  return {
    restore: () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.info = originalConsoleInfo;
      console.debug = originalConsoleDebug;

      // Restore debug function if it was patched
      if (originalDebugFunction) {
        try {
          createDebug.log = originalDebugFunction;
        } catch (error) {
          // Ignore error if debug module is not available
        }
      }
    },
  };
}
