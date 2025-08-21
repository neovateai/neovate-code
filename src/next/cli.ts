import yargsParser from 'yargs-parser';
import { randomUUID } from '../utils/randomUUID';

function parseArgs(argv: any) {
  return yargsParser(argv, {
    alias: {
      model: 'm',
      help: 'h',
      resume: 'r',
      quiet: 'q',
    },
    default: {
      mcp: true,
    },
    array: ['plugin'],
    boolean: ['help', 'quiet', 'mcp'],
    string: [
      'resume',
      'model',
      'smallModel',
      'planModel',
      'systemPrompt',
      'appendSystemPrompt',
      'outputStyle',
    ],
  });
}

function printHelp() {}

type SessionId = string;

class Project {
  cwd: string;
  session: Session;
  constructor(opts: { cwd: string; resume: SessionId }) {
    this.cwd = opts.cwd;
    this.session = opts.resume
      ? new Session({
          id: opts.resume,
          project: this,
        })
      : Session.create({
          project: this,
        });
  }
}

class Context {}

class Config {}

class Session {
  id: SessionId;
  project: Project;
  usage: Usage;
  constructor(opts: { id: SessionId; project: Project }) {
    this.id = opts.id;
    this.project = opts.project;
    this.usage = new Usage();
  }
  async send(message: string) {
    console.log(message);
  }
  static create(opts: { project: Project }) {
    return new Session({
      id: randomUUID(),
      project: opts.project,
    });
  }
}

class Conversation {}

class Usage {
  constructor() {}
}

class Message {}

async function main(opts: { productName: string; version: string }) {
  const argv = parseArgs(process.argv.slice(2));
  if (argv.help) {
    printHelp();
    return;
  }
  const cwd = process.cwd();
  const project = new Project({
    cwd,
    resume: argv.resume,
  });
  await project.session.send('hello');
}

main({
  productName: 'neovate',
  version: '0.0.0',
}).catch((e) => {
  console.error(e);
});
