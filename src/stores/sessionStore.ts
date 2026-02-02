import { create } from "zustand";
import { Terminal } from "@xterm/xterm";
import * as tauri from "../lib/tauri";

export interface Session {
  id: string;
  name: string;
  groupId: string | null;
  shell: string;
  status: "running" | "stopped" | "error";
  terminal: Terminal | null;
}

export interface SessionGroup {
  id: string;
  name: string;
  collapsed: boolean;
  order: number;
}

export type SplitDirection = "horizontal" | "vertical";

export interface SplitView {
  enabled: boolean;
  sessionIds: string[];
  direction: SplitDirection;
}

interface SessionStore {
  sessions: Map<string, Session>;
  groups: Map<string, SessionGroup>;
  activeSessionId: string | null;
  isLoading: boolean;
  splitView: SplitView;

  // Session actions
  createSession: (name: string, groupId?: string) => Promise<string>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, name: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
  setSessionTerminal: (id: string, terminal: Terminal) => void;
  updateSessionStatus: (id: string, status: "running" | "stopped" | "error") => void;
  setSessionGroup: (id: string, groupId: string | null) => Promise<void>;

  // Group actions
  createGroup: (name: string) => Promise<string>;
  deleteGroup: (id: string) => Promise<void>;
  renameGroup: (id: string, name: string) => Promise<void>;
  toggleGroupCollapsed: (id: string) => Promise<void>;

  // Split view actions
  enableSplitView: (sessionIds: string[], direction?: SplitDirection) => void;
  disableSplitView: () => void;
  addToSplit: (sessionId: string) => void;
  removeFromSplit: (sessionId: string) => void;
  setSplitDirection: (direction: SplitDirection) => void;
  splitGroup: (groupId: string, direction?: SplitDirection) => void;

  // Persistence
  saveLayout: () => Promise<void>;
  loadLayout: () => Promise<void>;

  // Getters
  getSessionsInGroup: (groupId: string | null) => Session[];
  getActiveSession: () => Session | null;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: new Map(),
  groups: new Map(),
  activeSessionId: null,
  isLoading: false,
  splitView: {
    enabled: false,
    sessionIds: [],
    direction: "vertical" as SplitDirection,
  },

  createSession: async (name: string, groupId?: string) => {
    const info = await tauri.createSession(name, undefined, undefined, groupId);
    const session: Session = {
      id: info.id,
      name: info.name,
      groupId: info.group_id,
      shell: info.shell,
      status: "running",
      terminal: null,
    };

    set((state) => {
      const sessions = new Map(state.sessions);
      sessions.set(session.id, session);
      return { sessions, activeSessionId: session.id };
    });

    return session.id;
  },

  deleteSession: async (id: string) => {
    await tauri.deleteSession(id);

    set((state) => {
      const sessions = new Map(state.sessions);
      const deleted = sessions.get(id);
      if (deleted?.terminal) {
        deleted.terminal.dispose();
      }
      sessions.delete(id);

      let newActiveId = state.activeSessionId;
      if (state.activeSessionId === id) {
        const remaining = Array.from(sessions.keys());
        newActiveId = remaining.length > 0 ? remaining[0] : null;
      }

      // Also remove from split view
      const newSplitSessionIds = state.splitView.sessionIds.filter((sid) => sid !== id);
      const splitView = newSplitSessionIds.length < 2
        ? { enabled: false, sessionIds: [], direction: "vertical" as SplitDirection }
        : { ...state.splitView, sessionIds: newSplitSessionIds };

      return { sessions, activeSessionId: newActiveId, splitView };
    });
  },

  renameSession: async (id: string, name: string) => {
    await tauri.renameSession(id, name);

    set((state) => {
      const sessions = new Map(state.sessions);
      const session = sessions.get(id);
      if (session) {
        sessions.set(id, { ...session, name });
      }
      return { sessions };
    });
  },

  setActiveSession: (id: string | null) => {
    set({ activeSessionId: id });
    tauri.setActiveSession(id);
  },

  setSessionTerminal: (id: string, terminal: Terminal) => {
    set((state) => {
      const sessions = new Map(state.sessions);
      const session = sessions.get(id);
      if (session) {
        sessions.set(id, { ...session, terminal });
      }
      return { sessions };
    });
  },

  updateSessionStatus: (id: string, status: "running" | "stopped" | "error") => {
    set((state) => {
      const sessions = new Map(state.sessions);
      const session = sessions.get(id);
      if (session) {
        sessions.set(id, { ...session, status });
      }
      return { sessions };
    });
  },

  setSessionGroup: async (id: string, groupId: string | null) => {
    await tauri.setSessionGroup(id, groupId);

    set((state) => {
      const sessions = new Map(state.sessions);
      const session = sessions.get(id);
      if (session) {
        sessions.set(id, { ...session, groupId });
      }
      return { sessions };
    });
  },

  createGroup: async (name: string) => {
    const group = await tauri.createGroup(name);

    set((state) => {
      const groups = new Map(state.groups);
      groups.set(group.id, {
        id: group.id,
        name: group.name,
        collapsed: group.collapsed,
        order: group.order,
      });
      return { groups };
    });

    return group.id;
  },

  deleteGroup: async (id: string) => {
    await tauri.deleteGroup(id);

    // Move sessions to ungrouped
    const sessionsToUpdate = get().getSessionsInGroup(id);
    for (const session of sessionsToUpdate) {
      await get().setSessionGroup(session.id, null);
    }

    set((state) => {
      const groups = new Map(state.groups);
      groups.delete(id);
      return { groups };
    });
  },

  renameGroup: async (id: string, name: string) => {
    await tauri.renameGroup(id, name);

    set((state) => {
      const groups = new Map(state.groups);
      const group = groups.get(id);
      if (group) {
        groups.set(id, { ...group, name });
      }
      return { groups };
    });
  },

  toggleGroupCollapsed: async (id: string) => {
    const collapsed = await tauri.toggleGroupCollapsed(id);

    set((state) => {
      const groups = new Map(state.groups);
      const group = groups.get(id);
      if (group) {
        groups.set(id, { ...group, collapsed });
      }
      return { groups };
    });
  },

  // Split view actions
  enableSplitView: (sessionIds: string[], direction: SplitDirection = "vertical") => {
    if (sessionIds.length < 2) return;
    set({
      splitView: {
        enabled: true,
        sessionIds,
        direction,
      },
      activeSessionId: sessionIds[0],
    });
  },

  disableSplitView: () => {
    const currentSplit = get().splitView;
    set({
      splitView: {
        enabled: false,
        sessionIds: [],
        direction: "vertical",
      },
      activeSessionId: currentSplit.sessionIds[0] || get().activeSessionId,
    });
  },

  addToSplit: (sessionId: string) => {
    const { splitView, sessions } = get();
    if (!sessions.has(sessionId)) return;

    if (!splitView.enabled) {
      // Start a new split with current active + new session
      const activeId = get().activeSessionId;
      if (activeId && activeId !== sessionId) {
        set({
          splitView: {
            enabled: true,
            sessionIds: [activeId, sessionId],
            direction: "vertical",
          },
        });
      }
    } else if (!splitView.sessionIds.includes(sessionId)) {
      set({
        splitView: {
          ...splitView,
          sessionIds: [...splitView.sessionIds, sessionId],
        },
      });
    }
  },

  removeFromSplit: (sessionId: string) => {
    const { splitView } = get();
    const newSessionIds = splitView.sessionIds.filter((id) => id !== sessionId);

    if (newSessionIds.length < 2) {
      // Disable split view if less than 2 sessions
      set({
        splitView: {
          enabled: false,
          sessionIds: [],
          direction: "vertical",
        },
        activeSessionId: newSessionIds[0] || null,
      });
    } else {
      set({
        splitView: {
          ...splitView,
          sessionIds: newSessionIds,
        },
      });
    }
  },

  setSplitDirection: (direction: SplitDirection) => {
    set((state) => ({
      splitView: {
        ...state.splitView,
        direction,
      },
    }));
  },

  splitGroup: (groupId: string, direction: SplitDirection = "vertical") => {
    const sessionsInGroup = get().getSessionsInGroup(groupId);
    if (sessionsInGroup.length < 2) return;

    const sessionIds = sessionsInGroup.map((s) => s.id);
    set({
      splitView: {
        enabled: true,
        sessionIds,
        direction,
      },
      activeSessionId: sessionIds[0],
    });
  },

  saveLayout: async () => {
    await tauri.saveLayout();
  },

  loadLayout: async () => {
    set({ isLoading: true });
    try {
      const state = await tauri.loadLayout();

      if (!state) {
        set({ isLoading: false });
        return;
      }

      // Load groups first
      const groups = new Map<string, SessionGroup>();
      for (const g of state.groups || []) {
        groups.set(g.id, {
          id: g.id,
          name: g.name,
          collapsed: g.collapsed,
          order: g.order,
        });
      }

      set({ groups });

      // Restore sessions from saved state
      const savedSessions = state.sessions || [];
      let firstSessionId: string | null = null;

      for (const savedSession of savedSessions) {
        try {
          // Recreate each session with its saved name and group
          const info = await tauri.createSession(
            savedSession.name,
            undefined, // use default shell
            savedSession.cwd,
            savedSession.group_id || undefined
          );
          
          const session: Session = {
            id: info.id,
            name: info.name,
            groupId: info.group_id,
            shell: info.shell,
            status: "running",
            terminal: null,
          };

          set((s) => {
            const sessions = new Map(s.sessions);
            sessions.set(session.id, session);
            return { sessions };
          });

          if (!firstSessionId) {
            firstSessionId = session.id;
          }
        } catch (err) {
          console.error("Failed to restore session:", savedSession.name, err);
        }
      }

      // Set active session
      set({
        activeSessionId: firstSessionId,
        isLoading: false,
      });
    } catch (e) {
      // Expected to fail in browser environment
      if (typeof window !== 'undefined' && !(window as unknown as { __TAURI__?: unknown }).__TAURI__) {
        console.log("Running in browser mode - Tauri commands unavailable");
      } else {
        console.error("Failed to load layout:", e);
      }
      set({ isLoading: false });
    }
  },

  getSessionsInGroup: (groupId: string | null) => {
    const sessions = Array.from(get().sessions.values());
    return sessions.filter((s) => s.groupId === groupId);
  },

  getActiveSession: () => {
    const { sessions, activeSessionId } = get();
    if (!activeSessionId) return null;
    return sessions.get(activeSessionId) || null;
  },
}));
