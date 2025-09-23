#!/usr/bin/env node
import readline from 'readline';
import type { MessageHandler } from '../../messageBus';
import { MessageBus } from '../../messageBus';
import { WebSocketTransport } from './websocketTransport';

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

class WebClient {
  private transport: WebSocketTransport | null = null;
  private messageBus: MessageBus | null = null;
  private rl: readline.Interface;
  private wsUrl = 'ws://localhost:7001/ws';
  private cwd = '/tmp';
  private sessionId: string | undefined;
  private currentSessionId: string | undefined;
  private isConnected = false;
  private disconnectMessageShown = false;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `${colors.cyan}takumi> ${colors.reset}`,
    });

    this.setupEventHandlers();
    this.printWelcome();
    this.showMenu();
  }

  private printWelcome() {
    console.log(`${colors.bright}${colors.magenta}
╔════════════════════════════════════════╗
║     🚀 Takumi Web Client (Node.js)     ║
╚════════════════════════════════════════╝
${colors.reset}`);
    console.log(
      `${colors.dim}Type 'help' for available commands${colors.reset}\n`,
    );
  }

  private showMenu() {
    this.rl.prompt();
  }

  private setupEventHandlers() {
    this.rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) {
        this.showMenu();
        return;
      }

      const [command, ...args] = input.split(' ');
      const arg = args.join(' ');

      try {
        switch (command.toLowerCase()) {
          case 'help':
          case 'h':
            this.showHelp();
            break;
          case 'connect':
          case 'c':
            await this.connect(arg || this.wsUrl);
            break;
          case 'disconnect':
          case 'd':
            await this.disconnect();
            break;
          case 'init':
          case 'i':
            await this.initialize();
            break;
          case 'send':
          case 's':
            await this.sendMessage(arg || 'Hello, how can I help you today?');
            break;
          case 'cancel':
            await this.cancel();
            break;
          case 'status':
            await this.executeCommand('getStatus', {
              cwd: this.cwd,
              sessionId: this.currentSessionId || this.sessionId || 'default',
            });
            break;
          case 'sessions':
            await this.executeCommand('getAllSessions', { cwd: this.cwd });
            break;
          case 'models':
            await this.executeCommand('getModels', { cwd: this.cwd });
            break;
          case 'outputs':
            await this.executeCommand('getOutputStyles', { cwd: this.cwd });
            break;
          case 'commands':
            await this.executeCommand('getSlashCommands', { cwd: this.cwd });
            break;
          case 'mcp':
            await this.executeCommand('getMcpStatus', { cwd: this.cwd });
            break;
          case 'paths':
            await this.executeCommand('getPaths', { cwd: this.cwd });
            break;
          case 'seturl':
            this.wsUrl = arg || 'ws://localhost:3000/ws';
            console.log(
              `${colors.green}✓${colors.reset} WebSocket URL set to: ${this.wsUrl}`,
            );
            break;
          case 'setcwd':
            this.cwd = arg || '/tmp';
            console.log(
              `${colors.green}✓${colors.reset} Working directory set to: ${this.cwd}`,
            );
            break;
          case 'setsession':
            this.sessionId = arg || undefined;
            console.log(
              `${colors.green}✓${colors.reset} Session ID ${arg ? `set to: ${this.sessionId}` : 'cleared'}`,
            );
            break;
          case 'request':
          case 'r':
            await this.customRequest(arg);
            break;
          case 'clear':
            console.clear();
            this.printWelcome();
            break;
          case 'info':
            this.showInfo();
            break;
          case 'exit':
          case 'quit':
          case 'q':
            await this.exit();
            break;
          default:
            console.log(
              `${colors.red}Unknown command: ${command}${colors.reset}`,
            );
            console.log(
              `${colors.dim}Type 'help' for available commands${colors.reset}`,
            );
        }
      } catch (error: any) {
        console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      }

      this.showMenu();
    });

    this.rl.on('close', () => {
      this.exit();
    });
  }

  private showHelp() {
    console.log(`
${colors.bright}Available Commands:${colors.reset}

${colors.cyan}Connection:${colors.reset}
  ${colors.green}connect [url]${colors.reset}      Connect to WebSocket server
  ${colors.green}disconnect${colors.reset}         Disconnect from server
  ${colors.green}init${colors.reset}               Initialize session

${colors.cyan}Messaging:${colors.reset}
  ${colors.green}send [message]${colors.reset}     Send a message
  ${colors.green}cancel${colors.reset}             Cancel current operation

${colors.cyan}Information:${colors.reset}
  ${colors.green}status${colors.reset}             Get status
  ${colors.green}sessions${colors.reset}           List all sessions
  ${colors.green}models${colors.reset}             Get available models
  ${colors.green}outputs${colors.reset}            Get output styles
  ${colors.green}commands${colors.reset}           Get slash commands
  ${colors.green}mcp${colors.reset}                Get MCP status
  ${colors.green}paths${colors.reset}              Get file paths

${colors.cyan}Configuration:${colors.reset}
  ${colors.green}seturl [url]${colors.reset}       Set WebSocket URL
  ${colors.green}setcwd [path]${colors.reset}      Set working directory
  ${colors.green}setsession [id]${colors.reset}    Set session ID

${colors.cyan}Advanced:${colors.reset}
  ${colors.green}request <json>${colors.reset}     Send custom request
                     Example: request {"method":"getStatus","params":{"cwd":"/tmp"}}

${colors.cyan}Utility:${colors.reset}
  ${colors.green}info${colors.reset}               Show connection info
  ${colors.green}clear${colors.reset}              Clear screen
  ${colors.green}help${colors.reset}               Show this help
  ${colors.green}exit${colors.reset}               Exit the client

${colors.dim}Shortcuts: c=connect, d=disconnect, i=init, s=send, r=request, q=quit${colors.reset}
`);
  }

  private showInfo() {
    console.log(`
${colors.bright}Connection Info:${colors.reset}
  ${colors.cyan}Status:${colors.reset}      ${this.isConnected ? colors.green + 'Connected' : colors.red + 'Disconnected'}${colors.reset}
  ${colors.cyan}URL:${colors.reset}         ${this.wsUrl}
  ${colors.cyan}CWD:${colors.reset}         ${this.cwd}
  ${colors.cyan}Session ID:${colors.reset}  ${this.sessionId || '(none)'}
`);
  }

  private async connect(url?: string) {
    if (this.isConnected) {
      console.log(`${colors.yellow}Already connected${colors.reset}`);
      return;
    }

    const wsUrl = url || this.wsUrl;
    console.log(`${colors.cyan}Connecting to ${wsUrl}...${colors.reset}`);

    try {
      this.disconnectMessageShown = false; // Reset flag for new connection
      this.transport = new WebSocketTransport(wsUrl);
      this.messageBus = new MessageBus();

      this.transport.onClose(() => {
        if (!this.disconnectMessageShown) {
          console.log(`\n${colors.red}Disconnected from server${colors.reset}`);
          this.disconnectMessageShown = true;
        }
        this.isConnected = false;
      });

      this.transport.onError((error) => {
        console.error(
          `${colors.red}Transport error: ${error.message}${colors.reset}`,
        );
      });

      // Set up event handlers
      this.messageBus.onEvent('connected', (data) => {
        console.log(
          `${colors.green}Server event:${colors.reset}`,
          JSON.stringify(data, null, 2),
        );
      });

      this.messageBus.onEvent('message', (data) => {
        console.log(
          `${colors.blue}Message event:${colors.reset}`,
          JSON.stringify(data, null, 2),
        );
      });

      this.messageBus.onEvent('textDelta', (data) => {
        process.stdout.write(data.text);
      });

      this.messageBus.onEvent('chunk', (data) => {
        // Silently handle chunks to avoid spam
      });

      // Handle tool approval requests
      const toolApprovalHandler: MessageHandler = async (params) => {
        console.log(
          `\n${colors.yellow}Tool approval requested: ${params.toolUse.name}${colors.reset}`,
        );

        return new Promise((resolve) => {
          this.rl.question('Approve? (y/n): ', (answer) => {
            const approved = answer.toLowerCase() === 'y';
            console.log(
              approved
                ? `${colors.green}Approved${colors.reset}`
                : `${colors.red}Denied${colors.reset}`,
            );
            resolve({ approved });
          });
        });
      };
      this.messageBus.registerHandler('toolApproval', toolApprovalHandler);

      // Set transport first
      this.messageBus!.setTransport(this.transport!);

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        const checkConnection = setInterval(() => {
          if (this.transport!.isConnected()) {
            clearInterval(checkConnection);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });

      this.isConnected = true;
      console.log(`${colors.green}✓ Connected successfully${colors.reset}`);
    } catch (error: any) {
      console.error(
        `${colors.red}Failed to connect: ${error.message}${colors.reset}`,
      );
      this.transport = null;
      this.messageBus = null;
      this.isConnected = false;
    }
  }

  private async disconnect() {
    if (!this.isConnected) {
      console.log(`${colors.yellow}Not connected${colors.reset}`);
      return;
    }

    try {
      if (this.transport) {
        await this.transport.close();
      }
      this.transport = null;
      this.messageBus = null;
      this.isConnected = false;
      console.log(`${colors.green}✓ Disconnected${colors.reset}`);
    } catch (error: any) {
      console.error(
        `${colors.red}Failed to disconnect: ${error.message}${colors.reset}`,
      );
    }
  }

  private async initialize() {
    if (!this.isConnected) {
      console.log(
        `${colors.red}Not connected. Use 'connect' first.${colors.reset}`,
      );
      return;
    }

    try {
      console.log(`${colors.cyan}Initializing...${colors.reset}`);
      const result = await this.messageBus!.request('initialize', {
        cwd: this.cwd,
        sessionId: this.sessionId,
      });

      if (result.success) {
        console.log(
          `${colors.green}✓ Initialized: ${result.data.productName} v${result.data.version}${colors.reset}`,
        );
        console.log(
          `${colors.cyan}Model: ${result.data.model || 'default'}${colors.reset}`,
        );
      } else {
        console.log(`${colors.red}Initialization failed${colors.reset}`);
      }
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(
        `${colors.red}Failed to initialize: ${error.message}${colors.reset}`,
      );
    }
  }

  private async sendMessage(message: string) {
    if (!this.isConnected) {
      console.log(
        `${colors.red}Not connected. Use 'connect' first.${colors.reset}`,
      );
      return;
    }

    try {
      console.log(`${colors.cyan}Sending message...${colors.reset}`);
      const result = await this.messageBus!.request('send', {
        message,
        cwd: this.cwd,
        sessionId: this.sessionId,
        planMode: false,
      });

      if (this.sessionId) {
        this.currentSessionId = this.sessionId;
      }

      console.log(`${colors.green}Response received:${colors.reset}`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(
        `${colors.red}Failed to send message: ${error.message}${colors.reset}`,
      );
    }
  }

  private async cancel() {
    if (!this.isConnected) {
      console.log(
        `${colors.red}Not connected. Use 'connect' first.${colors.reset}`,
      );
      return;
    }

    const sessionId = this.currentSessionId || this.sessionId;
    if (!sessionId) {
      console.log(
        `${colors.red}No session ID available to cancel${colors.reset}`,
      );
      return;
    }

    try {
      const result = await this.messageBus!.request('cancel', {
        cwd: this.cwd,
        sessionId,
      });
      console.log(`${colors.green}✓ Operation cancelled${colors.reset}`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(
        `${colors.red}Failed to cancel: ${error.message}${colors.reset}`,
      );
    }
  }

  private async executeCommand(method: string, params: any) {
    if (!this.isConnected) {
      console.log(
        `${colors.red}Not connected. Use 'connect' first.${colors.reset}`,
      );
      return;
    }

    try {
      console.log(`${colors.cyan}Executing ${method}...${colors.reset}`);
      const result = await this.messageBus!.request(method, params);
      console.log(`${colors.green}Result:${colors.reset}`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(
        `${colors.red}Failed to execute ${method}: ${error.message}${colors.reset}`,
      );
    }
  }

  private async customRequest(jsonStr: string) {
    if (!this.isConnected) {
      console.log(
        `${colors.red}Not connected. Use 'connect' first.${colors.reset}`,
      );
      return;
    }

    try {
      const { method, params } = JSON.parse(jsonStr);

      // Add cwd if not present and method likely requires it
      if (!params.cwd && this.requiresCwd(method)) {
        params.cwd = this.cwd;
      }

      console.log(
        `${colors.cyan}Sending custom request: ${method}${colors.reset}`,
      );
      const result = await this.messageBus!.request(method, params);
      console.log(`${colors.green}Result:${colors.reset}`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error(
        `${colors.red}Failed to send custom request: ${error.message}${colors.reset}`,
      );
      console.log(
        `${colors.dim}Example: request {"method":"getStatus","params":{"cwd":"/tmp"}}${colors.reset}`,
      );
    }
  }

  private requiresCwd(method: string): boolean {
    return [
      'initialize',
      'send',
      'cancel',
      'getStatus',
      'setConfig',
      'getOutputStyles',
      'getAllSessions',
      'resumeSession',
      'getModels',
      'getSlashCommands',
      'getSlashCommand',
      'executeSlashCommand',
      'query',
      'getPaths',
      'compact',
      'getMcpStatus',
      'reconnectMcpServer',
    ].includes(method);
  }

  private async exit() {
    console.log(`\n${colors.cyan}Shutting down...${colors.reset}`);

    if (this.isConnected && this.transport) {
      await this.transport.close();
    }

    this.rl.close();
    process.exit(0);
  }

  public start() {
    this.rl.prompt();
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log(
    `\n${colors.cyan}Received SIGINT, shutting down gracefully...${colors.reset}`,
  );
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(
    `\n${colors.cyan}Received SIGTERM, shutting down gracefully...${colors.reset}`,
  );
  process.exit(0);
});

// Start the client
const client = new WebClient();
client.start();
