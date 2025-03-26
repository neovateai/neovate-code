import pc from 'picocolors';

export function logError(message: string) {
  console.error(pc.red(message));
}

export function logPrompt(message: string) {
  console.log(pc.green(pc.bold(`> ${message}`)));
}

export function logMessages(messages: any[]) {
  if (process.env.DEBUG) {
    console.log(pc.gray(`>>> Messages: ${messages}`));
  }
}

export function logQueryResult(result: any) {
  if (process.env.DEBUG) {
    console.log(pc.gray(`<<< Query Result: ${JSON.stringify(result, null, 2)}`));
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
