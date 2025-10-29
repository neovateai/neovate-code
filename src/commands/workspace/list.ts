import { render } from 'ink';
import React from 'react';
import type { Context } from '../../context';
import { getGitRoot, listWorktrees } from '../../worktree';
import { WorkspaceList } from './components';

export async function runList(context: Context, argv: any) {
  const cwd = process.cwd();

  try {
    const gitRoot = await getGitRoot(cwd);
    const worktrees = await listWorktrees(gitRoot);

    // Load metadata to get original branches
    const fs = await import('fs');
    const metadataPath = `${gitRoot}/.neovate-workspaces/.metadata`;
    let metadata: Record<string, any> = {};
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      } catch {
        metadata = {};
      }
    }

    // Enrich worktrees with metadata
    const enrichedWorktrees = worktrees.map((wt) => ({
      ...wt,
      originalBranch: metadata[wt.name]?.originalBranch || 'unknown',
      createdAt: metadata[wt.name]?.createdAt,
    }));

    if (enrichedWorktrees.length === 0) {
      console.log('No active workspaces found.');
      console.log(
        `\nCreate a new workspace with: ${context.productName.toLowerCase()} workspace create`,
      );
      return;
    }

    const { waitUntilExit } = render(
      React.createElement(WorkspaceList, {
        worktrees: enrichedWorktrees,
        verbose: argv.verbose,
      }),
    );

    await waitUntilExit();
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
