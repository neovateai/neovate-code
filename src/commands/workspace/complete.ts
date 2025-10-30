import { exec } from 'child_process';
import { render } from 'ink';
import React from 'react';
import { promisify } from 'util';
import type { Context } from '../../context';
import {
  detectMainBranch,
  getGitRoot,
  getWorktreeFromPath,
  mergeWorktree,
} from '../../worktree';
import { CompletionChoice } from './components';

const execAsync = promisify(exec);

export async function runComplete(context: Context, argv: any) {
  const cwd = process.cwd();

  try {
    // Detect worktree from current directory
    const worktree = await getWorktreeFromPath(cwd);
    const gitRoot = await getGitRoot(cwd);

    // Load metadata to get original branch
    const fs = await import('fs');
    const metadataPath = `${gitRoot}/.${context.productName.toLowerCase()}-workspaces/.metadata`;
    let metadata: Record<string, any> = {};
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      } catch {
        metadata = {};
      }
    }

    const originalBranch =
      metadata[worktree.name]?.originalBranch ||
      (await detectMainBranch(gitRoot));
    worktree.originalBranch = originalBranch;

    // Warn if has uncommitted changes
    if (!worktree.isClean) {
      console.log(
        '\nWarning: Workspace has uncommitted changes. These will be included in the merge/PR.\n',
      );
    }

    // Show completion options
    const { waitUntilExit } = render(
      React.createElement(CompletionChoice, {
        originalBranch,
        worktreeName: worktree.name,
        onMerge: async () => {
          try {
            console.log(
              `\nMerging workspace '${worktree.name}' to '${originalBranch}'...`,
            );
            await mergeWorktree(gitRoot, worktree);

            // Remove from metadata
            if (fs.existsSync(metadataPath)) {
              try {
                const updatedMetadata = JSON.parse(
                  fs.readFileSync(metadataPath, 'utf-8'),
                );
                delete updatedMetadata[worktree.name];
                fs.writeFileSync(
                  metadataPath,
                  JSON.stringify(updatedMetadata, null, 2),
                );
              } catch {
                // Ignore metadata errors
              }
            }

            console.log(
              `\nWorkspace '${worktree.name}' merged successfully to '${originalBranch}'.`,
            );
            console.log(`You are now on branch '${originalBranch}'.`);
            process.exit(0);
          } catch (error: any) {
            console.error(`\nError: ${error.message}`);
            process.exit(1);
          }
        },
        onPR: async () => {
          try {
            console.log(`\nPushing branch '${worktree.branch}' to remote...`);

            // Push branch to remote
            await execAsync(`git push -u origin ${worktree.branch}`, {
              cwd: worktree.path,
            });

            // Create PR using gh CLI
            console.log('\nCreating pull request...');
            const prTitle = `Workspace: ${worktree.name}`;
            const prBody = `This PR contains changes from workspace '${worktree.name}'.\n\nOriginal branch: ${originalBranch}`;

            try {
              const { stdout } = await execAsync(
                `gh pr create --title "${prTitle}" --body "${prBody}" --base ${originalBranch}`,
                { cwd: gitRoot },
              );

              console.log('\nPull request created successfully!');
              console.log(stdout.trim());

              // Navigate back to git root
              console.log(`\nNavigating back to repository root...`);
              process.chdir(gitRoot);

              console.log(
                `\nWorkspace '${worktree.name}' is still active. Delete it when PR is merged:`,
              );
              console.log(
                `  ${context.productName.toLowerCase()} workspace delete ${worktree.name}`,
              );

              process.exit(0);
            } catch (error: any) {
              if (error.message?.includes('gh: command not found')) {
                console.error(
                  '\nError: GitHub CLI (gh) not found. Please install it first:',
                );
                console.error('  https://cli.github.com/');
              } else {
                console.error(`\nError creating PR: ${error.message}`);
              }
              process.exit(1);
            }
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
