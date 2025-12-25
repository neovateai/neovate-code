import type { LocalCommand } from '../types';

export const shortcutsCommand: LocalCommand = {
  type: 'local',
  name: 'shortcuts',
  description: 'Show keyboard shortcuts',
  async call() {
    const shortcuts = [
      { keys: ['Escape'], description: 'Cancel AI response / Close help' },
      { keys: ['Ctrl+C'], description: 'Exit (double press)' },
      { keys: ['Ctrl+C'], description: 'Clear input (single press with text)' },
      {
        keys: ['Ctrl+D'],
        description: 'Delete character / Exit (double press)',
      },
      { keys: ['Ctrl+T'], description: 'Toggle thinking mode' },
      { keys: ['Ctrl+G'], description: 'Open external editor' },
      { keys: ['Ctrl+R'], description: 'Reverse search history' },
      { keys: ['Ctrl+V'], description: 'Paste image' },
      { keys: ['Meta+Up'], description: 'Edit queued messages' },
      { keys: ['Double Esc'], description: 'Fork conversation' },
    ];

    const editingShortcuts = [
      { keys: ['Ctrl+A/E'], description: 'Start/End of line' },
      { keys: ['Ctrl+B/F'], description: 'Move cursor left/right' },
      { keys: ['Ctrl+N/P'], description: 'Next/Previous history' },
      { keys: ['Ctrl+H'], description: 'Backspace' },
      { keys: ['Ctrl+K'], description: 'Delete to end of line' },
      { keys: ['Ctrl+U'], description: 'Delete to start of line' },
      { keys: ['Ctrl+L'], description: 'Clear input' },
      { keys: ['Ctrl+W'], description: 'Delete word before' },
      { keys: ['Meta+B/F'], description: 'Move by word' },
    ];

    let result = '⌨️ Keyboard Shortcuts\n\n';
    result += 'General:\n';
    shortcuts.forEach((s) => {
      result += `  ${s.keys.join(' / ').padEnd(20)} ${s.description}\n`;
    });
    result += '\nText Editing:\n';
    editingShortcuts.forEach((s) => {
      result += `  ${s.keys.join(' / ').padEnd(20)} ${s.description}\n`;
    });

    return result.trim();
  },
};
