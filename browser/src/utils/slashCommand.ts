export function parseSlashCommand(input: string): {
  command: string;
  args: string;
} {
  const trimmed = input.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return {
      command: trimmed.slice(1),
      args: '',
    };
  }
  return {
    command: trimmed.slice(1, spaceIndex),
    args: trimmed.slice(spaceIndex + 1).trim(),
  };
}
