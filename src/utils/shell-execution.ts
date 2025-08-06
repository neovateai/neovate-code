/**
 * Shell execution implementation with robust output handling and binary detection.
 * This implementation references the shell execution service from Google Gemini CLI,
 * with enhanced encoding detection and binary output handling capabilities.
 *
 * Based on Apache License, thanks to the original work:
 * ref: https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/services/shellExecutionService.ts
 */
import { spawn } from 'child_process';
import os from 'os';
import stripAnsi from 'strip-ansi';
import { TextDecoder } from 'util';
import { getCachedEncodingForBufferSync } from './system-encoding';

const SIGKILL_TIMEOUT_MS = 200;
const MAX_OUTPUT_SIZE = 100 * 1024 * 1024; // 100MB limit to prevent memory overflow
const BINARY_SNIFF_CHUNK_SIZE = 1024; // Process binary detection in smaller chunks

export interface ShellExecutionResult {
  /** The raw, unprocessed output buffer. */
  rawOutput: Buffer;
  /** The combined, decoded stdout and stderr as a string. */
  output: string;
  /** The decoded stdout as a string. */
  stdout: string;
  /** The decoded stderr as a string. */
  stderr: string;
  /** The process exit code, or null if terminated by a signal. */
  exitCode: number | null;
  /** The signal that terminated the process, if any. */
  signal: NodeJS.Signals | null;
  /** An error object if the process failed to spawn. */
  error: Error | null;
  /** The process ID of the spawned shell. */
  pid: number | undefined;
  /** Whether the execution was cancelled due to timeout or manual termination. */
  cancelled: boolean;
}

export interface ShellExecutionHandle {
  /** The process ID of the spawned shell. */
  pid: number | undefined;
  /** A promise that resolves with the complete execution result. */
  result: Promise<ShellExecutionResult>;
}

export type ShellOutputEvent =
  | {
      /** The event contains a chunk of output data. */
      type: 'data';
      /** The stream from which the data originated. */
      stream: 'stdout' | 'stderr';
      /** The decoded string chunk. */
      chunk: string;
    }
  | {
      /** Signals that the output stream has been identified as binary. */
      type: 'binary_detected';
    }
  | {
      /** Provides progress updates for a binary stream. */
      type: 'binary_progress';
      /** The total number of bytes received so far. */
      bytesReceived: number;
    };

const MAX_SNIFF_SIZE = 4096;

export function shellExecute(
  commandToExecute: string,
  cwd: string,
  timeout: number,
  // Reserved for future streaming output
  onOutputEvent?: (event: ShellOutputEvent) => void,
): ShellExecutionHandle {
  const isWindows = os.platform() === 'win32';
  const shell = isWindows ? 'cmd.exe' : 'bash';
  const shellArgs = [isWindows ? '/c' : '-c', commandToExecute];

  const child = spawn(shell, shellArgs, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: !isWindows, // Use process groups on non-Windows for robust killing
    env: {
      ...process.env,
      TAKUMI_AI_CLI: '1',
    },
  });

  const result = new Promise<ShellExecutionResult>((resolve) => {
    // Use decoders to handle multi-byte characters safely (for streaming output).
    let stdoutDecoder: TextDecoder | null = null;
    let stderrDecoder: TextDecoder | null = null;

    // Use arrays to collect chunks, then join at the end for better performance
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const outputChunks: Buffer[] = [];
    let totalOutputSize = 0;
    let error: Error | null = null;
    let exited = false;
    let cancelled = false;

    let isStreamingRawContent = true;
    let binaryDetected = false;
    let sniffBuffer = Buffer.alloc(0);
    let sniffedBytes = 0;

    const handleOutput = (data: Buffer, stream: 'stdout' | 'stderr') => {
      // Check memory limit to prevent overflow
      totalOutputSize += data.length;
      if (totalOutputSize > MAX_OUTPUT_SIZE) {
        cancelled = true;
        abortHandler();
        return;
      }

      if (!stdoutDecoder || !stderrDecoder) {
        const encoding = getCachedEncodingForBufferSync(data);
        try {
          stdoutDecoder = new TextDecoder(encoding);
          stderrDecoder = new TextDecoder(encoding);
        } catch {
          // If the encoding is not supported, fall back to utf-8.
          // This can happen on some platforms for certain encodings like 'utf-32le'.
          stdoutDecoder = new TextDecoder('utf-8');
          stderrDecoder = new TextDecoder('utf-8');
        }
      }

      outputChunks.push(data);

      // Optimized binary detection - avoid repeated Buffer.concat operations
      if (
        !binaryDetected &&
        isStreamingRawContent &&
        sniffedBytes < MAX_SNIFF_SIZE
      ) {
        const remainingSniffSize = Math.min(
          MAX_SNIFF_SIZE - sniffedBytes,
          BINARY_SNIFF_CHUNK_SIZE,
        );
        const dataToSniff = data.subarray(
          0,
          Math.min(data.length, remainingSniffSize),
        );

        if (dataToSniff.length > 0) {
          sniffBuffer = Buffer.concat([sniffBuffer, dataToSniff]);
          sniffedBytes = sniffBuffer.length;

          if (isBinary(sniffBuffer)) {
            binaryDetected = true;
            isStreamingRawContent = false;
            onOutputEvent?.({ type: 'binary_detected' });
          }
        }
      }

      const decodedChunk =
        stream === 'stdout'
          ? stdoutDecoder.decode(data, { stream: true })
          : stderrDecoder.decode(data, { stream: true });
      const strippedChunk = stripAnsi(decodedChunk);

      // Collect chunks in arrays instead of string concatenation
      if (stream === 'stdout') {
        stdoutChunks.push(strippedChunk);
      } else {
        stderrChunks.push(strippedChunk);
      }

      if (isStreamingRawContent) {
        onOutputEvent?.({ type: 'data', stream, chunk: strippedChunk });
      } else {
        // Use cached totalOutputSize instead of reduce
        onOutputEvent?.({
          type: 'binary_progress',
          bytesReceived: totalOutputSize,
        });
      }
    };

    child.stdout.on('data', (data) => handleOutput(data, 'stdout'));
    child.stderr.on('data', (data) => handleOutput(data, 'stderr'));
    child.on('error', (err) => {
      error = err;
    });

    const abortHandler = async () => {
      if (child.pid && !exited) {
        if (isWindows) {
          spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t']);
        } else {
          try {
            // Kill the entire process group (negative PID).
            // SIGTERM first, then SIGKILL if it doesn't die.
            process.kill(-child.pid, 'SIGTERM');
            await new Promise((res) => setTimeout(res, SIGKILL_TIMEOUT_MS));
            if (!exited) {
              process.kill(-child.pid, 'SIGKILL');
            }
          } catch (_e) {
            // Fall back to killing just the main process if group kill fails.
            if (!exited) child.kill('SIGKILL');
          }
        }
      }
    };

    // Set up timeout
    const timeoutId = setTimeout(() => {
      cancelled = true;
      abortHandler();
    }, timeout);

    child.on('exit', (code, signal) => {
      exited = true;
      clearTimeout(timeoutId);

      // Flush any remaining decoder content
      if (stdoutDecoder) {
        const finalStdoutChunk = stripAnsi(stdoutDecoder.decode());
        if (finalStdoutChunk) {
          stdoutChunks.push(finalStdoutChunk);
        }
      }
      if (stderrDecoder) {
        const finalStderrChunk = stripAnsi(stderrDecoder.decode());
        if (finalStderrChunk) {
          stderrChunks.push(finalStderrChunk);
        }
      }

      // Join chunks efficiently at the end
      const stdout = stdoutChunks.join('');
      const stderr = stderrChunks.join('');
      const finalBuffer =
        outputChunks.length > 0 ? Buffer.concat(outputChunks) : Buffer.alloc(0);

      resolve({
        rawOutput: finalBuffer,
        output: stdout + (stderr ? `\n${stderr}` : ''),
        stdout,
        stderr,
        exitCode: code,
        signal,
        error,
        pid: child.pid,
        cancelled,
      });
    });
  });

  return { pid: child.pid, result };
}

export function isBinary(
  data: Buffer | null | undefined,
  sampleSize = 512,
): boolean {
  if (!data || data.length === 0) {
    return false;
  }

  const sample = data.length > sampleSize ? data.subarray(0, sampleSize) : data;

  // Use indexOf for faster null byte detection
  // This is significantly faster than iterating through each byte
  return sample.indexOf(0) !== -1;
}
