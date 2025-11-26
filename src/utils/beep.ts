export function beep() {
  process.stdout.write('\u0007');
  process.stdout.write('\x07');
}
