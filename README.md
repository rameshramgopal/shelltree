# 🌲 ShellTree

**Stop losing your terminals.**

ShellTree is a GUI-first terminal session manager for macOS that lets you run, group, and switch between multiple terminals using a persistent tree-style sidebar.

![ShellTree](./docs/screenshot.png)

## Why ShellTree?

Ever find yourself with 10+ terminal tabs, hunting for that one running your dev server? ShellTree fixes terminal chaos by giving you a visual, organized way to manage all your shells in one window.

## Features

- **🌳 Tree-Style Sidebar**: Organize terminals in a hierarchical tree view
- **📁 Session Groups**: Group terminals by project (Backend, Frontend, Logs, etc.)
- **⚡ Instant Switching**: Click to switch — no process restarts
- **💾 Persistent Layout**: Groups and sessions survive app restarts
- **🎨 Native macOS Design**: Dark mode, overlay title bar, native styling
- **⌨️ Keyboard Shortcuts**: Power user shortcuts for quick navigation

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘T | New terminal |
| ⌘W | Close active terminal |
| ⌘⇧] | Next terminal |
| ⌘⇧[ | Previous terminal |
| ⌘1-9 | Switch to terminal N |

## Installation

### Download

Download the latest `.dmg` from [Releases](https://github.com/rameshbishukarma/shelltree/releases).

### Build from Source

```bash
# Prerequisites: Node.js 18+, Rust 1.70+, macOS 11+

git clone https://github.com/rameshbishukarma/shelltree.git
cd shelltree
npm install
npm run tauri build
```

The built app will be at `src-tauri/target/release/bundle/macos/ShellTree.app`

## Development

```bash
npm install
npm run tauri dev
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | [Tauri 2](https://tauri.app/) |
| Frontend | React 18 + TypeScript + Vite |
| Terminal | [xterm.js](https://xtermjs.org/) + WebGL |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| PTY | portable-pty (Rust) |

## Project Structure

```
├── src/                    # Frontend (React)
│   ├── components/
│   │   ├── Sidebar/        # Tree view navigation
│   │   └── Terminal/       # xterm.js wrapper
│   ├── stores/             # Zustand state
│   └── lib/                # Tauri IPC wrappers
├── src-tauri/              # Backend (Rust)
│   └── src/
│       ├── pty/            # PTY management
│       ├── commands.rs     # IPC commands
│       └── persistence.rs  # State save/load
```

## Data Storage

Session layout persists to:
```
~/Library/Application Support/ShellTree/state.json
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

**Ramesh Bishukarma**

## License

MIT License - see the [LICENSE](LICENSE) file for details.
