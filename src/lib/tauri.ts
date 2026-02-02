import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

// Types matching Rust structs
export type SessionStatus =
  | { type: "Running" }
  | { type: "Stopped" }
  | { type: "Error"; message: string };

export interface SessionInfo {
  id: string;
  name: string;
  group_id: string | null;
  shell: string;
  cwd: string;
  status: SessionStatus;
  created_at: number;
  startup_command: string | null;
}

export interface SessionGroup {
  id: string;
  name: string;
  collapsed: boolean;
  order: number;
}

export interface AppState {
  sessions: SessionInfo[];
  groups: SessionGroup[];
  active_session_id: string | null;
}

export interface PtyOutput {
  id: string;
  data: number[];
}

export interface PtyExit {
  id: string;
  code: number | null;
}

// Session commands
export async function createSession(
  name: string,
  shell?: string,
  cwd?: string,
  groupId?: string,
  startupCommand?: string,
  rows?: number,
  cols?: number
): Promise<SessionInfo> {
  return invoke("create_session", {
    name,
    shell,
    cwd,
    groupId,
    startupCommand,
    rows,
    cols,
  });
}

export async function deleteSession(id: string): Promise<void> {
  return invoke("delete_session", { id });
}

export async function renameSession(id: string, name: string): Promise<void> {
  return invoke("rename_session", { id, name });
}

export async function writeToSession(id: string, data: Uint8Array): Promise<void> {
  return invoke("write_to_session", { id, data: Array.from(data) });
}

export async function resizeSession(id: string, rows: number, cols: number): Promise<void> {
  return invoke("resize_session", { id, rows, cols });
}

export async function getSession(id: string): Promise<SessionInfo | null> {
  return invoke("get_session", { id });
}

export async function getAllSessions(): Promise<SessionInfo[]> {
  return invoke("get_all_sessions");
}

export async function setSessionGroup(id: string, groupId: string | null): Promise<void> {
  return invoke("set_session_group", { id, groupId });
}

export async function setStartupCommand(id: string, command: string | null): Promise<void> {
  return invoke("set_startup_command", { id, command });
}

// Group commands
export async function createGroup(name: string): Promise<SessionGroup> {
  return invoke("create_group", { name });
}

export async function deleteGroup(id: string): Promise<void> {
  return invoke("delete_group", { id });
}

export async function renameGroup(id: string, name: string): Promise<void> {
  return invoke("rename_group", { id, name });
}

export async function toggleGroupCollapsed(id: string): Promise<boolean> {
  return invoke("toggle_group_collapsed", { id });
}

export async function getAllGroups(): Promise<SessionGroup[]> {
  return invoke("get_all_groups");
}

// Active session
export async function setActiveSession(id: string | null): Promise<void> {
  return invoke("set_active_session", { id });
}

export async function getActiveSession(): Promise<string | null> {
  return invoke("get_active_session");
}

// Persistence
export async function saveLayout(): Promise<void> {
  return invoke("save_layout");
}

export async function loadLayout(): Promise<AppState> {
  return invoke("load_layout");
}

// Event listeners
export function onPtyOutput(callback: (output: PtyOutput) => void): Promise<UnlistenFn> {
  return listen<PtyOutput>("pty-output", (event) => callback(event.payload));
}

export function onPtyExit(callback: (exit: PtyExit) => void): Promise<UnlistenFn> {
  return listen<PtyExit>("pty-exit", (event) => callback(event.payload));
}
