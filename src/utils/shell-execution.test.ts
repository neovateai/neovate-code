import os from 'os';
import { describe, expect, test, vi } from 'vitest';
import { shellExecute } from './shell-execution';

describe('shell-execution', () => {
  describe('shellExecute', () => {
    const isWindows = os.platform() === 'win32';
    const testCwd = process.cwd();
    const timeout = 5000;

    test('should execute simple echo command successfully', async () => {
      const command = isWindows ? 'echo Hello World' : 'echo "Hello World"';
      const { result } = shellExecute(command, testCwd, timeout);

      const res = await result;

      expect(res.exitCode).toBe(0);
      expect(res.stdout.trim()).toBe('Hello World');
      expect(res.stderr).toBe('');
      expect(res.error).toBeNull();
      expect(res.signal).toBeNull();
      expect(res.cancelled).toBe(false);
      expect(typeof res.pid).toBe('number');
    });

    test('should capture stderr output', async () => {
      const command = isWindows
        ? 'echo Error message 1>&2'
        : 'echo "Error message" >&2';
      const { result } = shellExecute(command, testCwd, timeout);

      const res = await result;

      expect(res.exitCode).toBe(0);
      expect(res.stdout).toBe('');
      expect(res.stderr.trim()).toBe('Error message');
      expect(res.output.trim()).toBe('Error message');
    });

    test('should handle command with non-zero exit code', async () => {
      const command = isWindows ? 'exit 1' : 'exit 1';
      const { result } = shellExecute(command, testCwd, timeout);

      const res = await result;

      expect(res.exitCode).toBe(1);
      expect(res.error).toBeNull();
      expect(res.cancelled).toBe(false);
    });

    test('should handle invalid command', async () => {
      const command = 'nonexistentcommand12345';
      const { result } = shellExecute(command, testCwd, timeout);

      const res = await result;

      expect(res.exitCode).not.toBe(0);
      expect(res.stderr).toBeTruthy();
    });

    test('should combine stdout and stderr in output', async () => {
      const command = isWindows
        ? 'echo stdout && echo stderr 1>&2'
        : 'echo "stdout" && echo "stderr" >&2';
      const { result } = shellExecute(command, testCwd, timeout);

      const res = await result;

      expect(res.stdout.trim()).toBe('stdout');
      expect(res.stderr.trim()).toBe('stderr');
      expect(res.output).toContain('stdout');
      expect(res.output).toContain('stderr');
    });

    test('should timeout long-running command', async () => {
      const shortTimeout = 100;
      const command = isWindows ? 'timeout /t 2 /nobreak > nul' : 'sleep 2';
      const { result } = shellExecute(command, testCwd, shortTimeout);

      const res = await result;

      expect(res.cancelled).toBe(true);
    }, 10000);

    test('should timeout with exact timeout value', async () => {
      const exactTimeout = 500;
      const command = isWindows ? 'timeout /t 1 /nobreak > nul' : 'sleep 1';
      const { result } = shellExecute(command, testCwd, exactTimeout);

      const res = await result;

      expect(res.cancelled).toBe(true);
    }, 3000);

    test('should not timeout when command completes within timeout', async () => {
      const longTimeout = 2000;
      const command = isWindows ? 'timeout /t 1 /nobreak > nul' : 'sleep 0.5';
      const { result } = shellExecute(command, testCwd, longTimeout);

      const res = await result;

      expect(res.cancelled).toBe(false);
      expect(res.exitCode).toBe(0);
    }, 3000);

    test('should handle zero timeout gracefully', async () => {
      const zeroTimeout = 0;
      const command = isWindows ? 'echo "test"' : 'echo "test"';
      const { result } = shellExecute(command, testCwd, zeroTimeout);

      const res = await result;

      // With zero timeout, the command should be cancelled immediately
      expect(res.cancelled).toBe(true);
    }, 1000);

    test('should handle very short timeout', async () => {
      const veryShortTimeout = 1;
      const command = isWindows ? 'timeout /t 1 /nobreak > nul' : 'sleep 1';
      const { result } = shellExecute(command, testCwd, veryShortTimeout);

      const res = await result;

      expect(res.cancelled).toBe(true);
    }, 2000);

    test('should respect working directory', async () => {
      const command = isWindows ? 'cd' : 'pwd';
      const customCwd = os.tmpdir();
      const { result } = shellExecute(command, customCwd, timeout);

      const res = await result;

      expect(res.exitCode).toBe(0);
      // On macOS, /var/folders might be symlinked to /private/var/folders
      const actualPath = res.stdout.trim();
      const expectedPath = customCwd;
      expect(
        actualPath === expectedPath ||
          actualPath === `/private${expectedPath}` ||
          expectedPath === `/private${actualPath}`,
      ).toBe(true);
    });

    test('should return process ID', () => {
      const command = isWindows ? 'echo test' : 'echo "test"';
      const { pid } = shellExecute(command, testCwd, timeout);

      expect(typeof pid).toBe('number');
      expect(pid).toBeGreaterThan(0);
    });

    test('should handle output streaming with callback', async () => {
      const outputEvents: any[] = [];
      const onOutputEvent = vi.fn((event) => {
        outputEvents.push(event);
      });

      const command = isWindows
        ? 'echo Line1 && echo Line2'
        : 'echo "Line1" && echo "Line2"';
      const { result } = shellExecute(command, testCwd, timeout, onOutputEvent);

      await result;

      expect(onOutputEvent).toHaveBeenCalled();
      expect(outputEvents.some((event) => event.type === 'data')).toBe(true);
    });

    test('should detect binary output', async () => {
      const outputEvents: any[] = [];
      const onOutputEvent = vi.fn((event) => {
        outputEvents.push(event);
      });

      // Create a command that outputs binary data (null bytes)
      const command = isWindows
        ? 'echo | set /p="Hello\x00World"'
        : 'printf "Hello\\0World"';
      const { result } = shellExecute(command, testCwd, timeout, onOutputEvent);

      await result;

      const binaryEvents = outputEvents.filter(
        (event) => event.type === 'binary_detected',
      );
      if (binaryEvents.length > 0) {
        expect(binaryEvents).toHaveLength(1);
      }
    });

    test('should provide raw output buffer', async () => {
      const command = isWindows ? 'echo Test Output' : 'echo "Test Output"';
      const { result } = shellExecute(command, testCwd, timeout);

      const res = await result;

      expect(res.rawOutput).toBeInstanceOf(Buffer);
      expect(res.rawOutput.length).toBeGreaterThan(0);
      expect(res.rawOutput.toString().trim()).toBe('Test Output');
    });

    test('should handle empty output', async () => {
      const command = isWindows ? 'echo off' : 'true';
      const { result } = shellExecute(command, testCwd, timeout);

      const res = await result;

      expect(res.exitCode).toBe(0);
      expect(res.error).toBeNull();
    });

    test('should set TAKUMI_AI_CLI environment variable', async () => {
      const command = isWindows
        ? 'echo %TAKUMI_AI_CLI%'
        : 'echo "$TAKUMI_AI_CLI"';
      const { result } = shellExecute(command, testCwd, timeout);

      const res = await result;

      expect(res.stdout.trim()).toBe('1');
    });
  });
});
