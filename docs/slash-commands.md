# Slash Commands

Slash commands provide a powerful way to extend Takumi with custom functionality that users can execute directly from the chat interface. By typing commands that start with `/`, users can trigger predefined actions, generate AI prompts, or interact with custom React components.

## Overview

Slash commands are executed by typing `/` followed by the command name and optional arguments:

```
/help
/clear
/status
/review src/main.ts
```

Takumi supports three types of slash commands:

1. **Local Commands** - Execute immediately and return text
2. **Local JSX Commands** - Return interactive React components  
3. **Prompt Commands** - Generate AI prompts for further processing

## Built-in Commands

Takumi includes several built-in slash commands:

### `/help`
Shows all available slash commands with their descriptions.

```
/help
```

### `/clear`
Clears the chat history.

```
/clear
```

## Creating Custom Commands

Custom slash commands are registered through plugins using the `command` hook. Each command must specify its type, name, description, and implementation.

### Local Commands

Local commands execute immediately and return a text result:

```ts
export const myPlugin = {
  name: 'status-plugin',
  command() {
    return [
      {
        type: 'local',
        name: 'status',
        description: 'Show project status',
        async call(args, context) {
          const cwd = context.cwd;
          const gitStatus = context.git;
          const hasGit = gitStatus !== null;
          
          return [
            `📁 Project: ${cwd}`,
            `🔧 Git: ${hasGit ? 'Repository' : 'Not a git repository'}`,
            `📝 Args: ${args || 'none'}`
          ].join('\n');
        }
      }
    ];
  }
};
```

**Usage:** `/status` or `/status some arguments`

### Local JSX Commands

Local JSX commands return interactive React components that can update the UI:

```ts
export const progressPlugin = {
  name: 'progress-plugin',
  command() {
    return [
      {
        type: 'local-jsx',
        name: 'countdown',
        description: 'Start a countdown timer',
        async call(onDone, context) {
          const React = require('react');
          const { useState, useEffect } = React;
          const { Box, Text } = require('ink');
          
          return React.createElement(() => {
            const [seconds, setSeconds] = useState(10);
            
            useEffect(() => {
              if (seconds === 0) {
                onDone('Countdown finished! 🎉');
                return;
              }
              
              const timer = setTimeout(() => {
                setSeconds(s => s - 1);
              }, 1000);
              
              return () => clearTimeout(timer);
            }, [seconds]);
            
            return React.createElement(Box, {
              borderStyle: 'round',
              borderColor: 'yellow',
              padding: 1
            }, React.createElement(Text, { 
              color: seconds <= 3 ? 'red' : 'yellow' 
            }, `⏱️  Countdown: ${seconds} seconds`));
          });
        }
      }
    ];
  }
};
```

**Key points:**
- Use `onDone(result)` to signal completion and provide a final message
- The component will be removed from the UI when `onDone` is called
- Use React.createElement for compatibility
- Access Ink components like Box, Text for terminal UI

**Usage:** `/countdown`

### Prompt Commands

Prompt commands generate AI prompts that are then processed by the normal AI pipeline:

```ts
export const aiPlugin = {
  name: 'ai-helper-plugin',
  command() {
    return [
      {
        type: 'prompt',
        name: 'explain',
        description: 'Explain a concept or code',
        argNames: ['concept'],
        progressMessage: 'Generating explanation...',
        async getPromptForCommand(args) {
          if (!args.trim()) {
            throw new Error('Please provide something to explain');
          }
          
          return [
            {
              role: 'user',
              content: `Please provide a clear, beginner-friendly explanation of: ${args.trim()}`
            }
          ];
        }
      },
      {
        type: 'prompt',
        name: 'review',
        description: 'Review code in a file',
        argNames: ['file'],
        progressMessage: 'Reviewing code...',
        async getPromptForCommand(args) {
          const [file] = args.split(' ');
          if (!file) {
            throw new Error('Please specify a file to review');
          }
          
          return [
            {
              role: 'user',
              content: `Please review the code in ${file} and provide:
1. Code quality assessment
2. Potential bugs or issues
3. Suggestions for improvement
4. Best practices recommendations`
            }
          ];
        }
      }
    ];
  }
};
```

**Key points:**
- Return an array of message objects with `role` and `content`
- Use `progressMessage` to show status while AI processes the prompt
- `argNames` is optional but helps with documentation
- Thrown errors will be displayed to the user

**Usage:** `/explain React hooks` or `/review src/utils.ts`

## Context Access

All slash commands receive the full Takumi context object, providing access to:

```ts
async call(args, context) {
  // File system
  context.cwd              // Current working directory
  
  // Configuration  
  context.config           // Takumi configuration
  context.argvConfig       // Command-line arguments
  
  // Git information
  context.git              // Git status (null if not a git repo)
  
  // History and state
  context.history          // Chat history array
  
  // Plugin system
  context.pluginManager    // Plugin manager instance
  context.slashCommands    // Command registry
  
  // Development tools
  context.ide              // IDE integration (if available)
  
  // Metadata
  context.productName      // Product name
  context.version          // Version string
  context.generalInfo      // General info object
  context.paths            // Config paths
}
```

## Error Handling

Commands should handle errors gracefully:

```ts
{
  type: 'local',
  name: 'risky',
  description: 'Command that might fail',
  async call(args, context) {
    try {
      // Risky operation
      const result = await someOperation();
      return `Success: ${result}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }
}
```

For prompt commands, thrown errors are displayed to the user:

```ts
{
  type: 'prompt',
  name: 'validate',
  description: 'Validate input',
  async getPromptForCommand(args) {
    if (!args.trim()) {
      throw new Error('Input is required');
    }
    // ... generate prompt
  }
}
```

## Command Discovery

Users can discover available commands using:

- `/help` - Shows all available commands
- Tab completion (in supporting terminals)
- Plugin documentation

## Best Practices

### Command Design

1. **Clear naming**: Use descriptive, action-oriented names
2. **Good descriptions**: Write helpful descriptions for `/help`
3. **Argument validation**: Validate and provide helpful error messages
4. **Consistent behavior**: Follow similar patterns across commands

### Performance

1. **Async operations**: Use async/await for I/O operations
2. **Error boundaries**: Handle errors gracefully
3. **Resource cleanup**: Clean up timers, listeners in JSX commands

### User Experience

1. **Progress indication**: Use `progressMessage` for slow operations
2. **Helpful feedback**: Provide clear success/error messages
3. **Argument hints**: Use `argNames` to document expected arguments

## Examples

### File System Command

```ts
{
  type: 'local',
  name: 'ls',
  description: 'List files in current directory',
  async call(args, context) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const dir = args.trim() || context.cwd;
      const files = fs.readdirSync(dir);
      return files.join('\n');
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }
}
```

### Git Command

```ts
{
  type: 'local',
  name: 'branch',
  description: 'Show current git branch',
  async call(args, context) {
    const { execSync } = require('child_process');
    
    try {
      const branch = execSync('git branch --show-current', {
        cwd: context.cwd,
        encoding: 'utf8'
      }).trim();
      return `Current branch: ${branch}`;
    } catch (error) {
      return 'Not a git repository';
    }
  }
}
```

### Interactive Menu

```ts
{
  type: 'local-jsx',
  name: 'menu',
  description: 'Show interactive menu',
  async call(onDone, context) {
    const React = require('react');
    const { useState } = React;
    const { Box, Text } = require('ink');
    
    return React.createElement(() => {
      const [selected, setSelected] = useState(0);
      const items = ['Option 1', 'Option 2', 'Option 3'];
      
      // Handle input (simplified example)
      React.useEffect(() => {
        const handler = (data) => {
          if (data === '\r') { // Enter key
            onDone(`Selected: ${items[selected]}`);
          }
        };
        process.stdin.on('data', handler);
        return () => process.stdin.off('data', handler);
      }, [selected]);
      
      return React.createElement(Box, {
        flexDirection: 'column'
      }, items.map((item, i) =>
        React.createElement(Text, {
          key: i,
          color: i === selected ? 'blue' : 'white'
        }, `${i === selected ? '>' : ' '} ${item}`)
      ));
    });
  }
}
```

## Plugin Integration

Register multiple commands in a single plugin:

```ts
export default {
  name: 'my-awesome-plugin',
  command() {
    return [
      // Local command
      {
        type: 'local',
        name: 'hello',
        description: 'Say hello',
        async call(args, context) {
          return `Hello, ${args || 'World'}!`;
        }
      },
      
      // Prompt command
      {
        type: 'prompt',
        name: 'ask',
        description: 'Ask AI a question',
        progressMessage: 'Thinking...',
        async getPromptForCommand(args) {
          return [
            {
              role: 'user',
              content: args
            }
          ];
        }
      }
    ];
  }
};
```

## Troubleshooting

### Command Not Found

If your command doesn't appear:

1. Check plugin is loaded correctly
2. Verify `command` hook returns an array
3. Ensure command objects have required properties
4. Check for JavaScript errors in plugin

### JSX Component Issues

For Local JSX commands:

1. Use `React.createElement` instead of JSX syntax
2. Import React and Ink components correctly
3. Always call `onDone()` to complete the command
4. Handle cleanup in useEffect return functions

### Context Access Issues

If context properties are undefined:

1. Check Takumi version compatibility
2. Verify context is passed to command correctly
3. Some properties may be null (e.g., `context.git` in non-git repos)

## Migration Guide

If upgrading from older versions:

### Hook Name Change

The hook name changed from `slashCommands` to `command`:

```ts
// Old (deprecated)
slashCommands() {
  return [/* commands */];
}

// New
command() {
  return [/* commands */];
}
```