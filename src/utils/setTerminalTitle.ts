export function setTerminalTitle(title: string): void {
  if (process.platform === 'win32') {
    process.title = title ? `${title}` : '';
  } else {
    process.stdout.write(`\x1b]0;${title ? `${title}` : ''}\x07`);
  }
}
