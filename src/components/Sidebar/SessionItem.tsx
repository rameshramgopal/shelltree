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
}

export function SessionItem({
  session,
  isActive,
  isInSplit = false,
  onSelect,
  onRename,
  onDelete,
  onAddToSplit,
}: SessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
    // Could implement context menu here
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

      {/* Name */}
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
        <span className="flex-1 text-sm text-[var(--color-text)] truncate">
          {session.name}
        </span>
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
    </div>
  );
}
