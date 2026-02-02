use crate::persistence;
use crate::pty::{AppState, SessionGroup, SessionInfo, SharedPtyManager};
use parking_lot::Mutex;
use std::path::PathBuf;
use tauri::State;

/// State for storing groups (sessions are in PtyManager)
pub struct GroupState {
    pub groups: Mutex<Vec<SessionGroup>>,
    pub active_session_id: Mutex<Option<String>>,
}

impl Default for GroupState {
    fn default() -> Self {
        Self {
            groups: Mutex::new(Vec::new()),
            active_session_id: Mutex::new(None),
        }
    }
}

// ============ Session Commands ============

#[tauri::command]
pub fn create_session(
    pty_manager: State<'_, SharedPtyManager>,
    name: String,
    shell: Option<String>,
    cwd: Option<String>,
    group_id: Option<String>,
    startup_command: Option<String>,
    rows: Option<u16>,
    cols: Option<u16>,
) -> Result<SessionInfo, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let cwd_path = cwd.map(PathBuf::from);
    let rows = rows.unwrap_or(24);
    let cols = cols.unwrap_or(80);

    let manager = pty_manager.lock();
    let mut info = manager.spawn_session(id.clone(), name, shell, cwd_path, rows, cols)?;

    if group_id.is_some() {
        info.group_id = group_id;
    }

    // Set and run startup command if provided
    if let Some(ref cmd) = startup_command {
        info.startup_command = startup_command.clone();
        manager.set_startup_command(&id, Some(cmd.clone()))?;
        // Small delay to let shell initialize, then run the command
        std::thread::spawn({
            let pty_manager = pty_manager.inner().clone();
            let id = id.clone();
            let cmd = cmd.clone();
            move || {
                std::thread::sleep(std::time::Duration::from_millis(500));
                let manager = pty_manager.lock();
                let _ = manager.run_command(&id, &cmd);
            }
        });
    }

    Ok(info)
}

#[tauri::command]
pub fn delete_session(
    pty_manager: State<'_, SharedPtyManager>,
    id: String,
) -> Result<(), String> {
    let manager = pty_manager.lock();
    manager.kill_session(&id)
}

#[tauri::command]
pub fn rename_session(
    pty_manager: State<'_, SharedPtyManager>,
    id: String,
    name: String,
) -> Result<(), String> {
    let manager = pty_manager.lock();
    manager.rename_session(&id, name)
}

#[tauri::command]
pub fn write_to_session(
    pty_manager: State<'_, SharedPtyManager>,
    id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let manager = pty_manager.lock();
    manager.write_to_session(&id, &data)
}

#[tauri::command]
pub fn resize_session(
    pty_manager: State<'_, SharedPtyManager>,
    id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    let manager = pty_manager.lock();
    manager.resize_session(&id, rows, cols)
}

#[tauri::command]
pub fn get_session(
    pty_manager: State<'_, SharedPtyManager>,
    id: String,
) -> Option<SessionInfo> {
    let manager = pty_manager.lock();
    manager.get_session_info(&id)
}

#[tauri::command]
pub fn get_all_sessions(
    pty_manager: State<'_, SharedPtyManager>,
) -> Vec<SessionInfo> {
    let manager = pty_manager.lock();
    manager.get_all_sessions()
}

#[tauri::command]
pub fn set_session_group(
    pty_manager: State<'_, SharedPtyManager>,
    id: String,
    group_id: Option<String>,
) -> Result<(), String> {
    let manager = pty_manager.lock();
    manager.set_session_group(&id, group_id)
}

#[tauri::command]
pub fn set_startup_command(
    pty_manager: State<'_, SharedPtyManager>,
    id: String,
    command: Option<String>,
) -> Result<(), String> {
    let manager = pty_manager.lock();
    manager.set_startup_command(&id, command)
}

// ============ Group Commands ============

#[tauri::command]
pub fn create_group(
    group_state: State<'_, GroupState>,
    name: String,
) -> SessionGroup {
    let id = uuid::Uuid::new_v4().to_string();
    let order = group_state.groups.lock().len() as i32;
    let group = SessionGroup {
        id: id.clone(),
        name,
        collapsed: false,
        order,
    };
    group_state.groups.lock().push(group.clone());
    group
}

#[tauri::command]
pub fn delete_group(
    group_state: State<'_, GroupState>,
    id: String,
) -> Result<(), String> {
    let mut groups = group_state.groups.lock();
    if let Some(pos) = groups.iter().position(|g| g.id == id) {
        groups.remove(pos);
        Ok(())
    } else {
        Err(format!("Group not found: {}", id))
    }
}

#[tauri::command]
pub fn rename_group(
    group_state: State<'_, GroupState>,
    id: String,
    name: String,
) -> Result<(), String> {
    let mut groups = group_state.groups.lock();
    if let Some(group) = groups.iter_mut().find(|g| g.id == id) {
        group.name = name;
        Ok(())
    } else {
        Err(format!("Group not found: {}", id))
    }
}

#[tauri::command]
pub fn toggle_group_collapsed(
    group_state: State<'_, GroupState>,
    id: String,
) -> Result<bool, String> {
    let mut groups = group_state.groups.lock();
    if let Some(group) = groups.iter_mut().find(|g| g.id == id) {
        group.collapsed = !group.collapsed;
        Ok(group.collapsed)
    } else {
        Err(format!("Group not found: {}", id))
    }
}

#[tauri::command]
pub fn get_all_groups(
    group_state: State<'_, GroupState>,
) -> Vec<SessionGroup> {
    group_state.groups.lock().clone()
}

// ============ Active Session Commands ============

#[tauri::command]
pub fn set_active_session(
    group_state: State<'_, GroupState>,
    id: Option<String>,
) {
    *group_state.active_session_id.lock() = id;
}

#[tauri::command]
pub fn get_active_session(
    group_state: State<'_, GroupState>,
) -> Option<String> {
    group_state.active_session_id.lock().clone()
}

// ============ Persistence Commands ============

#[tauri::command]
pub fn save_layout(
    pty_manager: State<'_, SharedPtyManager>,
    group_state: State<'_, GroupState>,
) -> Result<(), String> {
    let sessions = pty_manager.lock().get_all_sessions();
    let groups = group_state.groups.lock().clone();
    let active_id = group_state.active_session_id.lock().clone();

    persistence::save_sessions(&sessions, &groups, active_id)
}

#[tauri::command]
pub fn load_layout() -> Result<AppState, String> {
    persistence::load_state()
}
