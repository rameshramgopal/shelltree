import { useState, useRef, useEffect } from "react";
import { SessionGroup, Session } from "../../stores/sessionStore";
import { SessionItem } from "./SessionItem";

interface GroupItemProps {
  group: SessionGroup;
  sessions: Session[];
  activeSessionId: string | null;
  splitSessionIds: string[];
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onSelectSession: (id: string) => void;
  onRenameSession: (id: string, name: string) => void;
  onDeleteSession: (id: string) => void;
  onSplitGroup: () => void;
  onAddToSplit: (id: string) => void;
}

export function GroupItem({
  group,
  sessions,
  activeSessionId,
  splitSessionIds,
  onToggle,
  onRename,
  onDelete,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onSplitGroup,
  onAddToSplit,
}: GroupItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    if (editName.trim() && editName !== group.name) {
      onRename(editName.trim());
    } else {
      setEditName(group.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setEditName(group.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="mb-1">
      {/* Group header */}
      <div
        className="group flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-[var(--color-surface-hover)] rounded-md mx-1"
        onClick={onToggle}
      >
        {/* Collapse arrow */}
        <svg
          className={`w-3 h-3 text-[var(--color-text-muted)] transition-transform ${
            group.collapsed ? "" : "rotate-90"
          }`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M8 5l8 7-8 7V5z" />
        </svg>

        {/* Folder icon */}
        <svg
          className="w-4 h-4 text-[var(--color-warning)]"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
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
          <span
            className="flex-1 text-sm font-medium text-[var(--color-text)] truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {group.name}
          </span>
        )}

        {/* Session count */}
        <span className="text-xs text-[var(--color-text-muted)]">
          {sessions.length}
        </span>

        {/* Split group button */}
        {sessions.length >= 2 && (
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[var(--color-surface-hover)] rounded transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onSplitGroup();
            }}
            title="Split all terminals in group"
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

        {/* Delete button */}
        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[var(--color-surface-hover)] rounded transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete group"
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

      {/* Sessions */}
      {!group.collapsed && (
        <div className="ml-4">
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              isInSplit={splitSessionIds.includes(session.id)}
              onSelect={() => onSelectSession(session.id)}
              onRename={(name) => onRenameSession(session.id, name)}
              onDelete={() => onDeleteSession(session.id)}
              onAddToSplit={() => onAddToSplit(session.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
