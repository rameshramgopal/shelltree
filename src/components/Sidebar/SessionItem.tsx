import { useState, useRef, useEffect } from "react";
import { Session } from "../../stores/sessionStore";

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  isInSplit?: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddToSplit?: () => void;
  onSetStartupCommand?: (command: string | null) => void;
}

export function SessionItem({
  session,
  isActive,
  isInSplit = false,
  onSelect,
  onRename,
  onDelete,
  onAddToSplit,
  onSetStartupCommand,
}: SessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [editCommand, setEditCommand] = useState(session.startupCommand || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (showCommandDialog && commandInputRef.current) {
      commandInputRef.current.focus();
      commandInputRef.current.select();
    }
  }, [showCommandDialog]);

  useEffect(() => {
    setEditCommand(session.startupCommand || "");
  }, [session.startupCommand]);

  const handleSubmit = () => {
    if (editName.trim() && editName !== session.name) {
      onRename(editName.trim());
    } else {
      setEditName(session.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setEditName(session.name);
      setIsEditing(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowCommandDialog(true);
  };

  const handleCommandSubmit = () => {
    if (onSetStartupCommand) {
      onSetStartupCommand(editCommand.trim() || null);
    }
    setShowCommandDialog(false);
  };

  const handleCommandKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCommandSubmit();
    } else if (e.key === "Escape") {
      setEditCommand(session.startupCommand || "");
      setShowCommandDialog(false);
    }
  };

  const statusColor = {
    running: "bg-[var(--color-success)]",
    stopped: "bg-[var(--color-text-muted)]",
    error: "bg-[var(--color-error)]",
  }[session.status];

  return (
    <div
      className={`session-item group flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-md mx-1 ${
        isActive
          ? "bg-[var(--color-surface-active)]"
          : isInSplit
          ? "bg-[var(--color-accent)]/20"
          : "hover:bg-[var(--color-surface-hover)]"
      }`}
      onClick={onSelect}
      onDoubleClick={() => setIsEditing(true)}
      onContextMenu={handleContextMenu}
    >
      {/* Status indicator */}
      <div className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />

      {/* Terminal icon */}
      <svg
        className="w-4 h-4 shrink-0 text-[var(--color-text-muted)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>

      {/* Name and startup command indicator */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-[var(--color-surface)] text-[var(--color-text)] text-sm px-1 py-0.5 rounded border border-[var(--color-accent)] outline-none min-w-0"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex-1 min-w-0">
          <span className="text-sm text-[var(--color-text)] truncate block">
            {session.name}
          </span>
          {session.startupCommand && (
            <span className="text-[10px] text-[var(--color-text-muted)] truncate block opacity-70">
              → {session.startupCommand}
            </span>
          )}
        </div>
      )}

      {/* Set startup command button */}
      {onSetStartupCommand && (
        <button
          className={`opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-surface-hover)] rounded transition-opacity ${
            session.startupCommand ? "text-[var(--color-accent)]" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setShowCommandDialog(true);
          }}
          title={session.startupCommand ? `Startup: ${session.startupCommand}` : "Set startup command"}
        >
          <svg
            className="w-3.5 h-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Add to split button */}
      {onAddToSplit && !isInSplit && (
        <button
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-surface-hover)] rounded transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onAddToSplit();
          }}
          title="Add to split view"
        >
          <svg
            className="w-3.5 h-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="8" rx="1" />
            <rect x="3" y="13" width="18" height="8" rx="1" />
          </svg>
        </button>
      )}

      {/* Split indicator */}
      {isInSplit && (
        <span className="text-xs text-[var(--color-accent)]" title="In split view">
          ⊞
        </span>
      )}

      {/* Delete button */}
      <button
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-surface-hover)] rounded transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete session"
      >
        <svg
          className="w-3.5 h-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Startup command dialog */}
      {showCommandDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCommandDialog(false)}
        >
          <div
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 w-96 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
              Startup Command for "{session.name}"
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              This command will auto-run when the session is restored (e.g., ssh user@host)
            </p>
            <input
              ref={commandInputRef}
              type="text"
              value={editCommand}
              onChange={(e) => setEditCommand(e.target.value)}
              onKeyDown={handleCommandKeyDown}
              placeholder="ssh user@server or npm run dev"
              className="w-full bg-[var(--color-surface-hover)] text-[var(--color-text)] text-sm px-3 py-2 rounded border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)] font-mono"
            />
            <div className="flex justify-end gap-2 mt-4">
              {session.startupCommand && (
                <button
                  className="px-3 py-1.5 text-xs text-[var(--color-error)] hover:bg-[var(--color-surface-hover)] rounded"
                  onClick={() => {
                    if (onSetStartupCommand) {
                      onSetStartupCommand(null);
                    }
                    setShowCommandDialog(false);
                  }}
                >
                  Clear
                </button>
              )}
              <button
                className="px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] rounded"
                onClick={() => {
                  setEditCommand(session.startupCommand || "");
                  setShowCommandDialog(false);
                }}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-xs bg-[var(--color-accent)] text-white rounded hover:opacity-90"
                onClick={handleCommandSubmit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
