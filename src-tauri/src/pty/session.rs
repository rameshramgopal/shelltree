use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Status of a terminal session
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", content = "message")]
pub enum SessionStatus {
    Running,
    Stopped,
    Error(String),
}

/// A terminal session's metadata (serializable for persistence)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub id: String,
    pub name: String,
    pub group_id: Option<String>,
    pub shell: String,
    pub cwd: PathBuf,
    pub status: SessionStatus,
    pub created_at: i64,
}

impl SessionInfo {
    pub fn new(id: String, name: String, shell: String, cwd: PathBuf) -> Self {
        Self {
            id,
            name,
            group_id: None,
            shell,
            cwd,
            status: SessionStatus::Running,
            created_at: chrono::Utc::now().timestamp(),
        }
    }
}

/// A group for organizing terminal sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionGroup {
    pub id: String,
    pub name: String,
    pub collapsed: bool,
    pub order: i32,
}

impl SessionGroup {
    #[allow(dead_code)]
    pub fn new(id: String, name: String) -> Self {
        Self {
            id,
            name,
            collapsed: false,
            order: 0,
        }
    }
}

/// The persisted application state
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppState {
    pub sessions: Vec<SessionInfo>,
    pub groups: Vec<SessionGroup>,
    pub active_session_id: Option<String>,
}
