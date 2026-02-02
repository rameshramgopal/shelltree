import { useEffect, useCallback, useState } from "react";
import { useSessionStore } from "./stores/sessionStore";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { TerminalPane } from "./components/Terminal/TerminalPane";

function App() {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const createSession = useSessionStore((s) => s.createSession);
  const createGroup = useSessionStore((s) => s.createGroup);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const saveLayout = useSessionStore((s) => s.saveLayout);
  const loadLayout = useSessionStore((s) => s.loadLayout);

  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);

  // Load layout on mount
  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  // Auto-save layout periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessions.size > 0) {
        saveLayout().catch(console.error);
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [sessions.size, saveLayout]);

  // Save layout before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveLayout().catch(() => {});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveLayout]);

  // Handle new session creation
  const handleNewSession = useCallback(async () => {
    const sessionCount = sessions.size + 1;
    await createSession(`Terminal ${sessionCount}`);
  }, [createSession, sessions.size]);

  // Handle new group creation
  const handleNewGroup = useCallback(async () => {
    await createGroup("New Group");
  }, [createGroup]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+T: New terminal
      if (e.metaKey && e.key === "t") {
        e.preventDefault();
        handleNewSession();
        return;
      }

      // Cmd+G: New group
      if (e.metaKey && e.key === "g") {
        e.preventDefault();
        handleNewGroup();
        return;
      }

      // Cmd+W: Close active terminal
      if (e.metaKey && e.key === "w") {
        e.preventDefault();
        if (activeSessionId) {
          useSessionStore.getState().deleteSession(activeSessionId);
        }
        return;
      }

      // Cmd+Shift+]: Next terminal
      if (e.metaKey && e.shiftKey && e.key === "]") {
        e.preventDefault();
        const sessionIds = Array.from(sessions.keys());
        if (sessionIds.length > 1 && activeSessionId) {
          const currentIndex = sessionIds.indexOf(activeSessionId);
          const nextIndex = (currentIndex + 1) % sessionIds.length;
          setActiveSession(sessionIds[nextIndex]);
        }
        return;
      }

      // Cmd+Shift+[: Previous terminal
      if (e.metaKey && e.shiftKey && e.key === "[") {
        e.preventDefault();
        const sessionIds = Array.from(sessions.keys());
        if (sessionIds.length > 1 && activeSessionId) {
          const currentIndex = sessionIds.indexOf(activeSessionId);
          const prevIndex =
            currentIndex === 0 ? sessionIds.length - 1 : currentIndex - 1;
          setActiveSession(sessionIds[prevIndex]);
        }
        return;
      }

      // Cmd+1-9: Switch to terminal N
      if (e.metaKey && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const sessionIds = Array.from(sessions.keys());
        if (index < sessionIds.length) {
          setActiveSession(sessionIds[index]);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleNewSession,
    handleNewGroup,
    activeSessionId,
    sessions,
    setActiveSession,
  ]);

  // Sidebar resize handling
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(400, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="h-screen flex bg-[var(--color-surface)]">
      {/* Sidebar */}
      <div style={{ width: sidebarWidth }} className="shrink-0">
        <Sidebar onNewSession={handleNewSession} onNewGroup={handleNewGroup} />
      </div>

      {/* Resize handle */}
      <div
        className={`w-1 cursor-col-resize hover:bg-[var(--color-accent)] transition-colors ${
          isResizing ? "bg-[var(--color-accent)]" : "bg-transparent"
        }`}
        onMouseDown={handleMouseDown}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Title bar / drag region */}
        <div className="drag-region h-[52px] flex items-end px-4 pb-2 border-b border-[var(--color-border)]">
          {activeSessionId && (
            <span className="text-sm text-[var(--color-text-muted)]">
              {sessions.get(activeSessionId)?.name}
            </span>
          )}
        </div>

        {/* Terminal area */}
        <div className="flex-1 relative overflow-hidden">
          {Array.from(sessions.values()).map((session) => (
            <TerminalPane
              key={session.id}
              sessionId={session.id}
              isActive={session.id === activeSessionId}
            />
          ))}

          {/* Empty state */}
          {sessions.size === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <polyline points="7 10 10 13 7 16" />
                  <line x1="13" y1="16" x2="17" y2="16" />
                </svg>
                <h2 className="text-lg text-[var(--color-text)] mb-2">
                  Welcome to Terminal Manager
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mb-4">
                  Create a new terminal to get started
                </p>
                <button
                  className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-md hover:bg-[var(--color-accent-hover)] transition-colors"
                  onClick={handleNewSession}
                >
                  New Terminal
                </button>
                <p className="text-xs text-[var(--color-text-muted)] mt-3">
                  or press ⌘T
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
