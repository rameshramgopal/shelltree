use crate::pty::{AppState, SessionGroup, SessionInfo};
use std::fs;
use std::path::PathBuf;

/// Get the app data directory
fn get_app_data_dir() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("TerminalManager")
}

/// Get the state file path
fn get_state_file_path() -> PathBuf {
    get_app_data_dir().join("state.json")
}

/// Ensure the app data directory exists
fn ensure_data_dir() -> Result<(), String> {
    let dir = get_app_data_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create data dir: {}", e))?;
    }
    Ok(())
}

/// Load the application state from disk
pub fn load_state() -> Result<AppState, String> {
    let path = get_state_file_path();
    if !path.exists() {
        return Ok(AppState::default());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read state file: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse state file: {}", e))
}

/// Save the application state to disk
pub fn save_state(state: &AppState) -> Result<(), String> {
    ensure_data_dir()?;
    let path = get_state_file_path();

    let content = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize state: {}", e))?;

    fs::write(&path, content)
        .map_err(|e| format!("Failed to write state file: {}", e))
}

/// Save just the session info list (for quick updates)
pub fn save_sessions(sessions: &[SessionInfo], groups: &[SessionGroup], active_id: Option<String>) -> Result<(), String> {
    let state = AppState {
        sessions: sessions.to_vec(),
        groups: groups.to_vec(),
        active_session_id: active_id,
    };
    save_state(&state)
}
