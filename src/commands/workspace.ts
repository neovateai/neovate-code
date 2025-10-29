import type { Context } from '../context';
import { isGitRepository } from '../worktree';

function printHelp(p: string) {
  console.log(
    `
Usage:
  ${p} workspace [options] [command]

Manage git worktrees for isolated development. (e.g. ${p} workspace create)

Options:
  -h, --help                    Show help

Commands:
  create [options]              Create a new workspace worktree
  list|ls                       List all active workspaces
  delete|rm [options] <name>    Delete a workspace without merging
  complete                      Complete current workspace and merge changes
  help                          Show help

Workflow:
  1. Create a workspace:     ${p} workspace create
  2. Work in isolation:      cd .${p}-workspaces/<name>
  3. When done, complete:    ${p} workspace complete
  4. Or delete without merge: ${p} workspace delete <name>

Examples:
  ${p} workspace create                    Create new workspace with random city name
  ${p} workspace create --name feature-x   Create workspace with custom name
  ${p} workspace create --skip-update      Create without updating main branch
  ${p} workspace list                      Show all active workspaces
  ${p} workspace delete tokyo              Delete workspace named 'tokyo'
  ${p} workspace delete tokyo --force      Delete even with uncommitted changes
  ${p} workspace complete                  Complete and merge current workspace

Notes:
  - Workspaces are stored in .${p}-workspaces/ directory
  - Each workspace is a separate git worktree with its own branch
  - Complete workflow merges back to your original branch
      `.trim(),
  );
}

export async function runWorkspace(context: Context) {
  const { default: yargsParser } = await import('yargs-parser');
  const productName = context.productName;
  const argv = yargsParser(process.argv.slice(3), {
    alias: {
      help: 'h',
      force: 'f',
      verbose: 'v',
    },
    boolean: ['help', 'force', 'verbose', 'skip-update'],
    string: ['name'],
  });
  const command = argv._[0];

  // help
  if (!command || argv.help) {
    printHelp(productName.toLowerCase());
    return;
  }

  const cwd = process.cwd();

  // Check if in git repository
  if (!(await isGitRepository(cwd))) {
    console.error(
      'Error: Not a git repository. Please run this command from a git project.',
    );
    process.exit(1);
  }

  // Route to subcommands
  switch (command) {
    case 'create': {
      const { runCreate } = await import('./workspace/create');
      await runCreate(context, argv);
      break;
    }
    case 'list':
    case 'ls': {
      const { runList } = await import('./workspace/list');
      await runList(context, argv);
      break;
    }
    case 'delete':
    case 'rm': {
      const { runDelete } = await import('./workspace/delete');
      await runDelete(context, argv);
      break;
    }
    case 'complete': {
      const { runComplete } = await import('./workspace/complete');
      await runComplete(context, argv);
      break;
    }
    default: {
      console.error(`Unknown command: ${command}`);
      console.log(
        `\nRun '${productName.toLowerCase()} workspace --help' for usage.`,
      );
      process.exit(1);
    }
  }
}
