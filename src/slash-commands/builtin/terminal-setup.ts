import { execFile } from 'child_process';
import fs from 'fs';
import { EOL, homedir, platform } from 'os';
import path from 'pathe';
import type { LocalCommand } from '../types';

type VSCodeKeybinding = {
  key: string;
  command: string;
  args: { text: string };
  when: string;
};

const terminal = process.env.TERM_PROGRAM;
const isVSCode = terminal === 'vscode';

export function createTerminalSetupCommand(): LocalCommand {
  return {
    type: 'local',
    name: 'terminal-setup',
    isEnabled:
      (platform() === 'darwin' && terminal === 'iTerm.app') || isVSCode,
    description:
      'Install Shift+Enter key binding to support line breaks (iTerm2 and VSCode only)',
    async call() {
      let result = '';

      try {
        switch (terminal) {
          case 'iTerm.app':
            result = await installBindingsForITerm2();
            break;
          // TODO support Cursor
          case 'vscode':
            result = installBindingsForVSCodeTerminal();
            break;
        }
        return result;
      } catch (error) {
        return `Failed to install key binding: ${error instanceof Error ? error.message : String(error)}${EOL}`;
      }
    },
  };
}

async function installBindingsForITerm2(): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'defaults',
      [
        'write',
        'com.googlecode.iterm2',
        'GlobalKeyMap',
        '-dict-add',
        '0xd-0x20000-0x24',
        `<dict>
      <key>Text</key>
      <string>\\n</string>
      <key>Action</key>
      <integer>12</integer>
      <key>Version</key>
      <integer>1</integer>
      <key>Keycode</key>
      <integer>13</integer>
      <key>Modifiers</key>
      <integer>131072</integer>
    </dict>`,
      ],
      { timeout: 10000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(`Failed to install iTerm2 key binding: ${error.message}`),
          );
          return;
        }
        resolve(
          `✅ iTerm2 Shift+Enter key binding installed${EOL}💡 Please check iTerm2 → Preferences → Keys to confirm settings${EOL}`,
        );
      },
    );
  });
}

function installBindingsForVSCodeTerminal(): string {
  const vscodeKeybindingsPath = path.join(
    homedir(),
    platform() === 'win32'
      ? path.join('AppData', 'Roaming', 'Code', 'User')
      : platform() === 'darwin'
        ? path.join('Library', 'Application Support', 'Code', 'User')
        : path.join('.config', 'Code', 'User'),
    'keybindings.json',
  );

  try {
    // Ensure directory exists
    const dir = path.dirname(vscodeKeybindingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let keybindings: VSCodeKeybinding[] = [];

    // Read existing key binding file
    if (fs.existsSync(vscodeKeybindingsPath)) {
      const content = fs.readFileSync(vscodeKeybindingsPath, 'utf-8');
      try {
        keybindings = JSON.parse(content) || [];
      } catch {
        keybindings = [];
      }
    }

    // Check if key binding already exists
    const existingBinding = keybindings.find(
      (binding) =>
        binding.key === 'shift+enter' &&
        binding.command === 'workbench.action.terminal.sendSequence' &&
        binding.when === 'terminalFocus',
    );

    if (existingBinding) {
      return `⚠️  VSCode terminal already has Shift+Enter key binding${EOL}💡 To reconfigure, please delete existing binding first${EOL}📂 File location: ${vscodeKeybindingsPath}${EOL}`;
    }

    // Add new key binding
    keybindings.push({
      key: 'shift+enter',
      command: 'workbench.action.terminal.sendSequence',
      args: { text: '\\\r\n' },
      when: 'terminalFocus',
    });

    // Write to file
    fs.writeFileSync(
      vscodeKeybindingsPath,
      JSON.stringify(keybindings, null, 2),
      'utf-8',
    );

    return `✅ VSCode terminal Shift+Enter key binding installed${EOL}📂 File location: ${vscodeKeybindingsPath}${EOL}`;
  } catch (error) {
    throw new Error(
      `Failed to install VSCode terminal key binding: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
