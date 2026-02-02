import { useCallback, useState, useRef, useEffect } from "react";
import { TerminalPane } from "./TerminalPane";
import { useSessionStore, SplitDirection } from "../../stores/sessionStore";

interface SplitTerminalViewProps {
  sessionIds: string[];
  direction: SplitDirection;
  activeSessionId: string | null;
  onSessionClick: (id: string) => void;
}

export function SplitTerminalView({
  sessionIds,
  direction,
  activeSessionId,
  onSessionClick,
}: SplitTerminalViewProps) {
  const sessions = useSessionStore((s) => s.sessions);
  const removeFromSplit = useSessionStore((s) => s.removeFromSplit);
  const setSplitDirection = useSessionStore((s) => s.setSplitDirection);
  const disableSplitView = useSessionStore((s) => s.disableSplitView);

  // Track pane sizes as percentages
  const [paneSizes, setPaneSizes] = useState<number[]>(() =>
    sessionIds.map(() => 100 / sessionIds.length)
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);

  // Reset pane sizes when sessions change
  useEffect(() => {
    setPaneSizes(sessionIds.map(() => 100 / sessionIds.length));
  }, [sessionIds.length]);

  const handleMouseDown = useCallback((index: number) => {
    setResizingIndex(index);
  }, []);

  useEffect(() => {
    if (resizingIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const totalSize = direction === "vertical" ? rect.height : rect.width;
      const mousePos = direction === "vertical" ? e.clientY - rect.top : e.clientX - rect.left;
      const mousePercent = (mousePos / totalSize) * 100;

      // Calculate cumulative size up to the resize divider
      let cumulative = 0;
      for (let i = 0; i < resizingIndex; i++) {
        cumulative += paneSizes[i];
      }

      // New size for the pane before the divider
      const newSize = Math.max(10, Math.min(90, mousePercent - cumulative));
      const diff = newSize - paneSizes[resizingIndex];

      // Adjust both adjacent panes
      const newSizes = [...paneSizes];
      newSizes[resizingIndex] = newSize;
      newSizes[resizingIndex + 1] = Math.max(10, paneSizes[resizingIndex + 1] - diff);

      setPaneSizes(newSizes);
    };

    const handleMouseUp = () => {
      setResizingIndex(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingIndex, paneSizes, direction]);

  const isHorizontal = direction === "horizontal";

  return (
    <div className="h-full flex flex-col">
      {/* Split toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">
            Split View ({sessionIds.length} terminals)
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Direction toggle */}
          <button
            className={`p-1.5 rounded hover:bg-[var(--color-surface-hover)] ${
              !isHorizontal ? "bg-[var(--color-surface-active)]" : ""
            }`}
            onClick={() => setSplitDirection("vertical")}
            title="Stack vertically"
          >
            <svg className="w-4 h-4 text-[var(--color-text)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="8" rx="1" />
              <rect x="3" y="13" width="18" height="8" rx="1" />
            </svg>
          </button>
          <button
            className={`p-1.5 rounded hover:bg-[var(--color-surface-hover)] ${
              isHorizontal ? "bg-[var(--color-surface-active)]" : ""
            }`}
            onClick={() => setSplitDirection("horizontal")}
            title="Stack horizontally"
          >
            <svg className="w-4 h-4 text-[var(--color-text)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="8" height="18" rx="1" />
              <rect x="13" y="3" width="8" height="18" rx="1" />
            </svg>
          </button>
          <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
          {/* Exit split */}
          <button
            className="p-1.5 rounded hover:bg-[var(--color-surface-hover)]"
            onClick={disableSplitView}
            title="Exit split view"
          >
            <svg className="w-4 h-4 text-[var(--color-text)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Split panes */}
      <div
        ref={containerRef}
        className={`flex-1 flex ${isHorizontal ? "flex-row" : "flex-col"} overflow-hidden`}
      >
        {sessionIds.map((sessionId, index) => {
          const session = sessions.get(sessionId);
          if (!session) return null;

          const isActive = sessionId === activeSessionId;
          const sizeStyle = isHorizontal
            ? { width: `${paneSizes[index]}%` }
            : { height: `${paneSizes[index]}%` };

          return (
            <div key={sessionId} className="contents">
              {/* Terminal pane */}
              <div
                className={`relative overflow-hidden ${
                  isActive ? "ring-1 ring-[var(--color-accent)] ring-inset" : ""
                }`}
                style={sizeStyle}
                onClick={() => onSessionClick(sessionId)}
              >
                {/* Pane header */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-[var(--color-surface)]/90 backdrop-blur-sm border-b border-[var(--color-border)]">
                  <span className="text-xs text-[var(--color-text)] truncate">
                    {session.name}
                  </span>
                  {sessionIds.length > 2 && (
                    <button
                      className="p-0.5 rounded hover:bg-[var(--color-surface-hover)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromSplit(sessionId);
                      }}
                      title="Remove from split"
                    >
                      <svg className="w-3 h-3 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* Terminal content with padding for header */}
                <div className="h-full pt-6">
                  <TerminalPane sessionId={sessionId} isActive={true} />
                </div>
              </div>

              {/* Resize divider */}
              {index < sessionIds.length - 1 && (
                <div
                  className={`${
                    isHorizontal ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"
                  } bg-[var(--color-border)] hover:bg-[var(--color-accent)] transition-colors shrink-0`}
                  onMouseDown={() => handleMouseDown(index)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
