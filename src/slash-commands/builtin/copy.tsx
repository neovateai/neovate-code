import { spawn } from 'node:child_process';
import React from 'react';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

function getClipboardCommand(): string | null {
  const platform = process.platform;
  if (platform === 'darwin') return 'pbcopy';
  if (platform === 'win32') return 'clip';
  return 'xclip -selection clipboard || wl-copy';
}

function getClipboardErrorHint(): string {
  const platform = process.platform;
  if (platform === 'darwin') return 'Make sure `pbcopy` is available.';
  if (platform === 'win32') return 'Make sure `clip` is available.';
  return 'Make sure `xclip` or `wl-copy` is installed.';
}

async function writeToClipboard(text: string): Promise<void> {
  const cmd = getClipboardCommand();
  if (!cmd) throw new Error('No clipboard command available.');

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, { shell: true });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', reject);

    child.stdin.write(text);
    child.stdin.end();
  });
}

function extractTextFromLastAssistantMessage(
  messages: ReturnType<typeof useAppStore.getState>['messages'],
): string | null {
  const assistantMessages = messages.filter((m) => m.role === 'assistant');
  if (assistantMessages.length === 0) return null;
  const last = assistantMessages[assistantMessages.length - 1];
  const content = last.content;
  if (!content) return null;
  if (typeof content === 'string') return content || null;
  if (Array.isArray(content)) {
    const text = content
      .filter(
        (b): b is { type: 'text'; text: string } =>
          b.type === 'text' && 'text' in b,
      )
      .map((b) => b.text)
      .join('\n\n');
    return text || null;
  }
  return null;
}

export const copyCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'copy',
  description: 'Copy the last AI response to clipboard',
  async call(onDone) {
    return React.createElement(() => {
      React.useEffect(() => {
        const messages = useAppStore.getState().messages;
        const text = extractTextFromLastAssistantMessage(messages);
        if (!text) {
          const noMsg = messages.some((m) => m.role === 'assistant')
            ? 'No text content to copy'
            : 'No assistant message to copy';
          onDone(noMsg);
          return;
        }
        writeToClipboard(text)
          .then(() => {
            const lines = text.split('\n').length;
            onDone(
              `Copied to clipboard (${text.length} chars, ${lines} lines)`,
            );
          })
          .catch(() => {
            onDone(`Failed to copy to clipboard. ${getClipboardErrorHint()}`);
          });
      }, []);

      return null;
    });
  },
};
