import { render } from 'ink';
import React from 'react';
import type { Context } from '../../context';
import {
  addToGitExclude,
  createWorktree,
  detectMainBranch,
  ensureCleanWorkingDirectory,
  generateWorkspaceName,
  getCurrentBranch,
  getGitRoot,
  updateMainBranch,
} from '../../worktree';
import { WorkspaceSuccessMessage } from './components';

export async function runCreate(context: Context, argv: any) {
  const cwd = process.cwd();
  const productName = context.productName.toLowerCase();

  try {
    // Step 1: Ensure clean working directory
    await ensureCleanWorkingDirectory(cwd);

    // Step 2: Detect main branch
    const mainBranch = await detectMainBranch(cwd);

    // Step 3: Update main branch from remote (unless --skip-update)
    if (!argv['skip-update']) {
      console.log(`Updating ${mainBranch} branch from remote...`);
      await updateMainBranch(cwd, mainBranch, argv['skip-update']);
    }

    // Step 4: Get current branch to save as original
    const originalBranch = await getCurrentBranch(cwd);

    // Step 5: Generate or use provided workspace name
    const name = argv.name || (await generateWorkspaceName(cwd));

    // Step 6: Create worktree
    console.log(`Creating workspace '${name}'...`);
    const worktree = await createWorktree(cwd, name, {
      baseBranch: mainBranch,
      workspacesDir: `.${productName}-workspaces`,
    });

    // Update worktree object with original branch
    worktree.originalBranch = originalBranch;

    // Step 7: Save metadata for later use
    const gitRoot = await getGitRoot(cwd);
    const metadataPath = `${gitRoot}/.${productName}-workspaces/.metadata`;
    const fs = await import('fs');
    const path = await import('pathe');

    // Read existing metadata
    let metadata: Record<string, any> = {};
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      } catch {
        metadata = {};
      }
    }

    // Add new workspace metadata
    metadata[name] = {
      originalBranch,
      createdAt: new Date().toISOString(),
      baseBranch: mainBranch,
    };

    // Ensure .neovate-workspaces directory exists
    const workspacesDir = path.join(gitRoot, `.${productName}-workspaces`);
    if (!fs.existsSync(workspacesDir)) {
      fs.mkdirSync(workspacesDir, { recursive: true });
    }

    // Write metadata
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Step 8: Add to git exclude
    await addToGitExclude(cwd);

    // Step 9: Show success message
    const { waitUntilExit } = render(
      React.createElement(WorkspaceSuccessMessage, {
        name: worktree.name,
        path: worktree.path,
        originalBranch: worktree.originalBranch,
      }),
    );

    await waitUntilExit();
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
