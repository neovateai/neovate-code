# Neovate Desktop

Desktop application for Neovate AI coding assistant built with Electron, React, and Tailwind CSS.

## Architecture

This desktop app uses a **client-server architecture**:

- **Main Process**: Starts the Neovate WebSocket server (from `src/commands/servernext/server.ts`) and manages the Electron window
- **Renderer Process**: React UI that connects to the WebSocket server as a client
- **Communication**: WebSocket protocol using `MessageBus` and `WebSocketTransport`

This approach reuses the existing server infrastructure with zero code duplication.

## Development

```bash
# Install dependencies (from root)
pnpm install

# Start development mode
pnpm desktop:dev

# This runs:
# - Main process: compiles TypeScript and starts Electron
# - Renderer process: starts Vite dev server on port 3000
```

## Building

```bash
# Build for production
pnpm desktop:build

# Package as distributable app
pnpm desktop:package
```

## Project Structure

```
desktop/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts             # Entry point
│   │   ├── preload.ts          # IPC bridge
│   │   ├── app/
│   │   │   ├── window.ts       # Window management
│   │   │   └── lifecycle.ts    # App lifecycle
│   │   └── server/
│   │       └── index.ts        # Neovate server wrapper
│   │
│   └── renderer/                # React UI
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   └── ChatInterface.tsx
│       └── hooks/
│           └── useWebSocket.ts
│
├── package.json
├── tsconfig.json               # Renderer TypeScript config
├── tsconfig.main.json          # Main process TypeScript config
├── vite.config.ts              # Vite configuration
└── tailwind.config.js          # Tailwind CSS configuration
```

## Key Features

- ✅ Minimal boilerplate based on emdash
- ✅ Reuses existing Neovate server (`server.ts`)
- ✅ WebSocket communication via `MessageBus`
- ✅ Tailwind CSS 4 for styling
- ✅ TypeScript throughout
- ✅ Hot reloading in development

## Scripts (from root)

- `pnpm desktop:dev` - Start development mode
- `pnpm desktop:build` - Build for production
- `pnpm desktop:package` - Create distributable packages
- `pnpm desktop:typecheck` - Type check all code

## Technologies

- **Electron 28** - Desktop app framework
- **React 19** - UI library
- **Vite 5** - Build tool and dev server
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Styling
- **WebSocket** - Communication protocol
