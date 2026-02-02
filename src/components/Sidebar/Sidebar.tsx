import { useSessionStore } from "../../stores/sessionStore";
import { SessionItem } from "./SessionItem";
import { GroupItem } from "./GroupItem";

interface SidebarProps {
  onNewSession: () => void;
  onNewGroup: () => void;
}

export function Sidebar({ onNewSession, onNewGroup }: SidebarProps) {
  const sessions = useSessionStore((s) => s.sessions);
  const groups = useSessionStore((s) => s.groups);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const splitView = useSessionStore((s) => s.splitView);

  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const renameSession = useSessionStore((s) => s.renameSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const renameGroup = useSessionStore((s) => s.renameGroup);
  const deleteGroup = useSessionStore((s) => s.deleteGroup);
  const toggleGroupCollapsed = useSessionStore((s) => s.toggleGroupCollapsed);
  const getSessionsInGroup = useSessionStore((s) => s.getSessionsInGroup);
  const splitGroup = useSessionStore((s) => s.splitGroup);
  const addToSplit = useSessionStore((s) => s.addToSplit);

  // Get ungrouped sessions
  const ungroupedSessions = getSessionsInGroup(null);
  const splitSessionIds = splitView.sessionIds;

  // Sort groups by order
  const sortedGroups = Array.from(groups.values()).sort(
    (a, b) => a.order - b.order
  );

  return (
    <div className="sidebar-vibrancy h-full flex flex-col border-r border-[var(--color-border)]">
      {/* Header with drag region - traffic lights need ~70px on left */}
      <div className="drag-region h-[52px] flex items-end px-3 pb-2 pl-[70px]">
        <h1 className="text-sm font-semibold text-[var(--color-text)] no-drag">
          Terminals
        </h1>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--color-border)]">
        <button
          className="no-drag flex items-center gap-1.5 px-2 py-1 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] rounded-md transition-colors"
          onClick={onNewSession}
          title="New Terminal (⌘T)"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New
        </button>
        <button
          className="no-drag flex items-center gap-1.5 px-2 py-1 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] rounded-md transition-colors"
          onClick={onNewGroup}
          title="New Group (⌘G)"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
          Group
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Groups */}
        {sortedGroups.map((group) => (
          <GroupItem
            key={group.id}
            group={group}
            sessions={getSessionsInGroup(group.id)}
            activeSessionId={activeSessionId}
            splitSessionIds={splitSessionIds}
            onToggle={() => toggleGroupCollapsed(group.id)}
            onRename={(name) => renameGroup(group.id, name)}
            onDelete={() => deleteGroup(group.id)}
            onSelectSession={setActiveSession}
            onRenameSession={renameSession}
            onDeleteSession={deleteSession}
            onSplitGroup={() => splitGroup(group.id)}
            onAddToSplit={addToSplit}
          />
        ))}

        {/* Ungrouped sessions */}
        {ungroupedSessions.length > 0 && (
          <div className="mt-1">
            {sortedGroups.length > 0 && (
              <div className="px-3 py-1 text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                Ungrouped
              </div>
            )}
            {ungroupedSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                isInSplit={splitSessionIds.includes(session.id)}
                onSelect={() => setActiveSession(session.id)}
                onRename={(name) => renameSession(session.id, name)}
                onDelete={() => deleteSession(session.id)}
                onAddToSplit={() => addToSplit(session.id)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {sessions.size === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <svg
              className="w-12 h-12 text-[var(--color-text-muted)] mb-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <polyline points="7 10 10 13 7 16" />
              <line x1="13" y1="16" x2="17" y2="16" />
            </svg>
            <p className="text-sm text-[var(--color-text-muted)] mb-1">
              No terminals yet
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Click "New" or press ⌘T
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
