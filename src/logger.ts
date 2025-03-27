import pc from 'picocolors';

export function logError(message: string) {
  console.error(pc.red(message));
}

export function logPrompt(message: string) {
  console.log(pc.green(pc.bold(`> ${message}`)));
}

export function logDebug(message: string) {
  if (process.env.DEBUG) {
    console.log(pc.gray(`>>> ${message}`));
  }
}

export function logTool(message: string) {
  console.log(pc.blue(message));
}

export function logAction(message: string) {
  console.log(pc.white(message));
}

export function logInfo(message: string) {
  console.log(pc.white(message));
}
