# How to Use the `commit` Command

The `takumi commit` command helps you generate intelligent and conventional commit messages based on your staged changes. It uses AI to analyze the diff and suggest a message that follows best practices.

## Prerequisites

Before using the `commit` command, please ensure you have the following set up:

1.  **Git is installed**: The command relies on Git. You can check if it's installed by running `git --version`.
2.  **You are in a Git repository**: The command must be run from the root of a Git repository or any subdirectory within it.
3.  **Git user is configured**: Your Git user name and email must be configured. You can set them up with:
    ```bash
    git config --global user.name "Your Name"
    git config --global user.email "your.email@example.com"
    ```

## Basic Usage

The simplest way to use the command is to run it without any arguments:

```bash
takumi commit
```

This will trigger the interactive mode. It will first analyze your staged changes and generate a commit message. Then, it will present you with a list of actions you can take.

If you have no staged changes, you can use the `-s` or `--stage` flag to stage all current changes before generating the message:

```bash
takumi commit -s
```

## Interactive Mode

When you run `takumi commit` in interactive mode, you'll see the generated commit message and be prompted to choose what to do next. The options are:

-   **Copy to clipboard**: Copies the generated commit message to your clipboard.
-   **Commit changes**: Commits the staged changes with the generated message.
-   **Commit and push changes**: Commits the changes and then pushes them to the remote repository. You will be asked if you want to skip pre-commit hooks.
-   **Create branch and commit**: Generates a branch name based on the commit message, creates and checks out the new branch, and then commits the changes. You can edit the suggested branch name.
-   **Edit commit message**: Allows you to modify the generated commit message before deciding on the next action.
-   **Cancel**: Aborts the operation.

## Command-Line Options

You can use various flags to control the behavior of the `commit` command from the command line, bypassing the interactive mode.

| Option                     | Alias | Description                                                        |
| -------------------------- | ----- | ------------------------------------------------------------------ |
| `--help`                   | `-h`  | Show the help message.                                             |
| `--stage`                  | `-s`  | Stage all changes before generating the message.                   |
| `--commit`                 | `-c`  | Commit the changes automatically with the generated message.       |
| `--no-verify`              | `-n`  | Skip pre-commit hooks when committing.                             |
| `--interactive`            | `-i`  | Force interactive mode. This is the default behavior.              |
| `--model <model>`          | `-m`  | Specify the AI model to use for generation.                        |
| `--language <language>`    |       | Set the language for the commit message (e.g., 'chinese').         |
| `--copy`                   |       | Copy the generated commit message to the clipboard.                |
| `--push`                   |       | Push the changes to the remote repository after committing.        |
| `--follow-style`           |       | Generate a message that follows the style of recent commits in the repository. |
| `--ai`                     |       | Add an `[AI]` suffix to the commit message.                        |
| `--checkout`               |       | Create a new branch and commit the changes.                        |

## Examples

Here are some common scenarios and how to handle them with the `commit` command.

**Generate a commit message and decide what to do next:**

```bash
takumi commit
```

**Stage all changes and commit them with a generated message:**

```bash
takumi commit -s -c
```

**Generate a message and copy it to the clipboard:**

```bash
takumi commit --copy
```

**Stage, commit, and push all changes in one command:**

```bash
takumi commit -s -c --push
```

**Generate a message that matches your repository's existing commit style:**

```bash
takumi commit --follow-style
```

**Generate a message and add an `[AI]` suffix to indicate it was AI-generated:**

```bash
takumi commit --ai
```

**Automatically create a new feature branch and commit the changes:**

This is useful when starting a new task.

```bash
takumi commit --checkout
```

This will generate a commit message, then generate a branch name from that message (e.g., `feat/add-user-authentication`), create the branch, and finally commit your changes to it.
