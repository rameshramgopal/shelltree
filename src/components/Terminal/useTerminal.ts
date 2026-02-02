import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { writeToSession, resizeSession, onPtyOutput, onPtyExit } from "../../lib/tauri";
import { useSessionStore } from "../../stores/sessionStore";

export interface UseTerminalOptions {
  sessionId: string;
  onReady?: (terminal: Terminal) => void;
}

export function useTerminal({ sessionId, onReady }: UseTerminalOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const setSessionTerminal = useSessionStore((s) => s.setSessionTerminal);
  const updateSessionStatus = useSessionStore((s) => s.updateSessionStatus);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: '"SF Mono", "Menlo", "Monaco", "Courier New", monospace',
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#ffffff",
        cursorAccent: "#1e1e1e",
        selectionBackground: "#264f78",
        selectionForeground: "#ffffff",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#ffffff",
      },
      allowProposedApi: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.open(containerRef.current);

    // Try to load WebGL addon for better performance
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      terminal.loadAddon(webglAddon);
    } catch (e) {
      console.warn("WebGL addon failed to load:", e);
    }

    // Initial fit
    requestAnimationFrame(() => {
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims) {
        resizeSession(sessionId, dims.rows, dims.cols).catch(console.error);
      }
    });

    // Handle user input
    terminal.onData((data) => {
      const encoder = new TextEncoder();
      writeToSession(sessionId, encoder.encode(data)).catch(console.error);
    });

    // Store terminal reference
    setSessionTerminal(sessionId, terminal);

    if (onReady) {
      onReady(terminal);
    }

    return () => {
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, setSessionTerminal, onReady]);

  // Listen for PTY output
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    onPtyOutput((output) => {
      if (output.id === sessionId && terminalRef.current) {
        terminalRef.current.write(new Uint8Array(output.data));
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [sessionId]);

  // Listen for PTY exit
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    onPtyExit((exit) => {
      if (exit.id === sessionId) {
        updateSessionStatus(sessionId, "stopped");
        if (terminalRef.current) {
          terminalRef.current.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [sessionId, updateSessionStatus]);

  // Handle resize
  const handleResize = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current) {
      fitAddonRef.current.fit();
      const dims = fitAddonRef.current.proposeDimensions();
      if (dims) {
        resizeSession(sessionId, dims.rows, dims.cols).catch(console.error);
      }
    }
  }, [sessionId]);

  // Observe container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(container);

    // Also listen for window resize
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  // Focus terminal when it becomes visible
  const focus = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  return {
    containerRef,
    terminal: terminalRef.current,
    focus,
    fit: handleResize,
  };
}
