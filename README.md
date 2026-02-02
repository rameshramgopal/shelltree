# Terminal Manager

A visual terminal session manager for macOS, built with Tauri, React, and xterm.js.

![Terminal Manager](./docs/screenshot.png)

## Features

- **Visual Session Management**: Left sidebar with hierarchical tree view of terminal sessions
- **Session Groups**: Organize terminals into collapsible groups (Backend, Frontend, Logs, etc.)
- **Multiple Concurrent Terminals**: Run and manage multiple shell sessions simultaneously
- **Instant Switching**: Click to switch between terminals without process restarts
- **Session Persistence**: Layout and groups persist across app restarts
- **Native macOS Experience**: Dark mode, overlay title bar, native styling
- **Keyboard Shortcuts**: Power user shortcuts for quick navigation

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘T | New terminal |
| ⌘W | Close active terminal |
| ⌘⇧] | Next terminal |
| ⌘⇧[ | Previous terminal |
| ⌘1-9 | Switch to terminal N |

## Tech Stack

- **Framework**: [Tauri 2](https://tauri.app/) (Rust + WebView)
- **Frontend**: React 18 + TypeScript + Vite
- **Terminal**: [xterm.js](https://xtermjs.org/) with WebGL addon
- **Styling**: Tailwind CSS v4
- **State**: Zustand
- **PTY**: portable-pty (Rust)

## Development

### Prerequisites

- Node.js 18+
- Rust 1.70+
- macOS 11+ (Big Sur or later)

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Project Structure

```
├── src/                    # Frontend (React)
│   ├── components/         # UI components
│   │   ├── Sidebar/        # Session tree view
│   │   └── Terminal/       # xterm.js wrapper
│   ├── stores/             # Zustand state management
│   ├── lib/                # Tauri command wrappers
│   └── styles/             # Global CSS + Tailwind
├── src-tauri/              # Backend (Rust)
│   └── src/
│       ├── pty/            # PTY management
│       │   ├── manager.rs  # Session spawning/IO
│       │   └── session.rs  # Session data models
│       ├── commands.rs     # Tauri IPC commands
│       ├── persistence.rs  # State save/load
│       └── lib.rs          # App entry point
```

## Build Output

After running `npm run tauri build`:

- **App**: `src-tauri/target/release/bundle/macos/Terminal Manager.app`
- **DMG**: `src-tauri/target/release/bundle/dmg/Terminal Manager_X.X.X_aarch64.dmg`

## Data Storage

Session layout is persisted to:
```
~/Library/Application Support/TerminalManager/state.json
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

**Ramesh Bishukarma**

## License

MIT License - see the [LICENSE](LICENSE) file for details.
