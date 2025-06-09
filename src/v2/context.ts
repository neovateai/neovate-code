import { env } from 'process';

export class Context {
  cwd: string;
  constructor(opts: { cwd: string }) {
    this.cwd = opts.cwd;
  }

  getContextPrompt() {
    return `
====
Context:
<env>
Working directory: ${this.cwd}
Is directory a git repo: YES
Platform: ${env.platform}
Today's date: ${new Date().toLocaleDateString()}
</env>
    `.trim();
  }
}
