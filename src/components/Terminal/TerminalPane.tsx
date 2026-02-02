import { useEffect } from "react";
import "@xterm/xterm/css/xterm.css";
import { useTerminal } from "./useTerminal";

interface TerminalPaneProps {
  sessionId: string;
  isActive: boolean;
}

export function TerminalPane({ sessionId, isActive }: TerminalPaneProps) {
  const { containerRef, focus, fit } = useTerminal({ sessionId });

  // Focus and fit when becoming active
  useEffect(() => {
    if (isActive) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        focus();
        fit();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isActive, focus, fit]);

  return (
    <div
      className={`terminal-container h-full w-full ${isActive ? "" : "hidden"}`}
      style={{ backgroundColor: "#1e1e1e" }}
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
