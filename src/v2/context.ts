import { env } from 'process';

interface ContextOpts {
  cwd: string;
  model: string;
  smallModel?: string;
}

export class Context {
  cwd: string;
  model: string;
  smallModel: string;
  constructor(opts: ContextOpts) {
    this.cwd = opts.cwd;
    this.model = opts.model;
    this.smallModel = opts.smallModel || opts.model;
  }

  getContextPrompt() {
    return `
# Environment
Here is useful information about the environment you are running in.
<env>
Working directory: ${this.cwd}
Is directory a git repo: YES
Platform: ${env.platform}
Today's date: ${new Date().toLocaleDateString()}
</env>
    `.trim();
  }
}
