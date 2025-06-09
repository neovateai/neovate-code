export class Context {
  cwd: string;
  constructor(opts: { cwd: string }) {
    this.cwd = opts.cwd;
  }
}
