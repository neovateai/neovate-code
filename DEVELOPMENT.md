# Development Workflow

This document covers the development workflow and best practices for the Neovate Code Maintainers. For technical setup instructions, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Design First

Before implementing any non-trivial feature or change:

1. **Brainstorm** - Use `/spec:brainstorm` command with Claude Opus 4.5 or Sonnet 4.5 to generate a design document. Before designing, conduct competitive research:
   - Check [Claude Code](https://docs.anthropic.com/en/docs/claude-code) for similar features/patterns (primary reference)
   - Review alternatives like Cursor, Aider, Copilot if relevant
   - Understand how competitors solve similar problems to inform our approach
2. **Review** - Post the design to the team group chat or directly to 云谦 for feedback
3. **Iterate** - Refine the design based on feedback before writing code

This approach reduces rework and ensures alignment on implementation direction. Skip this process only for trivial changes (e.g., typo fixes, simple bug fixes).

Design documents are stored in `docs/designs/` with the naming convention `YYYY-MM-DD-feature-name.md`.

## Dogfooding

Use `@neovate/code` for your daily development work. This helps us:

- Identify bugs and usability issues firsthand
- Understand the user experience deeply
- Generate improvement ideas from real usage

Report any issues or ideas you encounter during dogfooding.

## Pull Request Guidelines

### Good First Issues

Issues labeled `good first issue` are reserved for external contributors. Core team members should not work on these issues.

### Keep PRs Small

- Split large features into incremental, reviewable PRs
- Each PR should be focused on a single concern
- Smaller PRs are easier to review and safer to merge

### Content Requirements

- **Never leave PR or issue content empty** - Empty content will not trigger the DingTalk webhook notification (this is a known bug)
- Provide clear description of what and why

### Before Creating PR

1. Run `pnpm run ready` to ensure all checks pass
2. Use `neovate commit` to commit and push your changes

### Git Practices

- **No force push** on shared branches
- Write clear, descriptive commit messages

## Ecosystem Alignment

When designing features, align with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) patterns where applicable:

- Reuse their conventions and ecosystem
- Maintain compatibility where it makes sense
- This reduces learning curve for users familiar with Claude Code

## UI Considerations

When making UI changes in the terminal interface:

- Consider the [Desktop application](https://github.com/neovateai/neovate-code-desktop) implementation
- Ensure changes work well in both CLI and Desktop contexts
- Coordinate with the Desktop team if needed

## Documentation

For every PR, consider whether documentation updates are needed:

- User-facing changes typically require doc updates
- Documentation repo: https://github.com/neovateai/neovateai.dev
- Submit doc PRs alongside or immediately after code PRs
