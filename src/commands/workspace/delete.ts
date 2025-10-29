import { render } from 'ink';
import React from 'react';
import type { Context } from '../../context';
import {
  deleteWorktree,
  getGitRoot,
  getWorktreeFromPath,
  listWorktrees,
} from '../../worktree';
import { ConfirmPrompt } from './components';

export async function runDelete(context: Context, argv: any) {
  const cwd = process.cwd();

  try {
    const gitRoot = await getGitRoot(cwd);

    // Get workspace name from args or detect from current directory
    let name = argv._[1] as string | undefined;

    if (!name) {
      // Try to detect from current directory
      try {
        const worktree = await getWorktreeFromPath(cwd);
        name = worktree.name;
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        console.log(
          `\nUsage: ${context.productName.toLowerCase()} workspace delete <name>`,
        );
        process.exit(1);
      }
    }

    // Check if worktree exists
    const worktrees = await listWorktrees(gitRoot);
    const worktree = worktrees.find((w) => w.name === name);

    if (!worktree) {
      console.error(
        `Error: Workspace '${name}' not found. Use 'neo workspace list' to see active workspaces.`,
      );
      process.exit(1);
    }

    // Warn if has uncommitted changes
    if (!worktree.isClean && !argv.force) {
      console.error(`Error: Workspace '${name}' has uncommitted changes.`);
      console.log('Use --force to delete anyway.');
      process.exit(1);
    }

    // Confirm deletion
    const { waitUntilExit } = render(
      React.createElement(ConfirmPrompt, {
        message: `Delete workspace '${name}'?${!worktree.isClean ? ' (has uncommitted changes)' : ''}`,
        onConfirm: async () => {
          try {
            await deleteWorktree(gitRoot, name!, argv.force);

            // Remove from metadata
            const fs = await import('fs');
            const metadataPath = `${gitRoot}/.neovate-workspaces/.metadata`;
            if (fs.existsSync(metadataPath)) {
              try {
                const metadata = JSON.parse(
                  fs.readFileSync(metadataPath, 'utf-8'),
                );
                delete metadata[name!];
                fs.writeFileSync(
                  metadataPath,
                  JSON.stringify(metadata, null, 2),
                );
              } catch {
                // Ignore metadata errors
              }
            }

            console.log(`\nWorkspace '${name}' deleted successfully.`);
            process.exit(0);
          } catch (error: any) {
            console.error(`\nError: ${error.message}`);
            process.exit(1);
          }
        },
        onCancel: () => {
          console.log('\nCancelled.');
          process.exit(0);
        },
      }),
    );

    await waitUntilExit();
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
