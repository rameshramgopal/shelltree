use parking_lot::Mutex;
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter};

use super::session::{SessionInfo, SessionStatus};

/// Output event sent to the frontend
#[derive(Clone, serde::Serialize)]
pub struct PtyOutput {
    pub id: String,
    pub data: Vec<u8>,
}

/// Session exit event
#[derive(Clone, serde::Serialize)]
pub struct PtyExit {
    pub id: String,
    pub code: Option<u32>,
}

/// Active PTY session with handles
struct ActiveSession {
    pub info: SessionInfo,
    pub master: Box<dyn MasterPty + Send>,
    pub child: Box<dyn Child + Send + Sync>,
    pub writer: Box<dyn Write + Send>,
}

/// Manages all PTY sessions
pub struct PtyManager {
    sessions: Mutex<HashMap<String, ActiveSession>>,
    app_handle: Option<AppHandle>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            app_handle: None,
        }
    }

    pub fn set_app_handle(&mut self, handle: AppHandle) {
        self.app_handle = Some(handle);
    }

    /// Get app handle reference
    #[allow(dead_code)]
    fn get_app_handle(&self) -> Option<&AppHandle> {
        self.app_handle.as_ref()
    }

    /// Spawn a new terminal session
    pub fn spawn_session(
        &self,
        id: String,
        name: String,
        shell: Option<String>,
        cwd: Option<PathBuf>,
        rows: u16,
        cols: u16,
    ) -> Result<SessionInfo, String> {
        let pty_system = native_pty_system();

        let size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        let pair = pty_system
            .openpty(size)
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        // Determine shell
        let shell_path = shell.unwrap_or_else(|| {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
        });

        // Determine working directory
        let working_dir = cwd.unwrap_or_else(|| {
            dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"))
        });

        // Spawn as login shell to load user's profile (.zshrc, .bash_profile, etc.)
        let mut cmd = CommandBuilder::new(&shell_path);
        cmd.arg("-l"); // Login shell flag
        cmd.cwd(&working_dir);

        // Inherit all environment variables from parent process
        for (key, value) in std::env::vars() {
            cmd.env(key, value);
        }

        // Override specific terminal settings
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("LANG", std::env::var("LANG").unwrap_or_else(|_| "en_US.UTF-8".to_string()));

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;

        let session_info = SessionInfo::new(
            id.clone(),
            name,
            shell_path,
            working_dir,
        );

        // Get a writer for input
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get writer: {}", e))?;

        // Set up reader for output streaming
        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone reader: {}", e))?;

        // Clone for the reader thread
        let session_id = id.clone();
        let app_handle = self.app_handle.clone();

        // Spawn reader thread
        thread::spawn(move || {
            let mut buffer = [0u8; 4096];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => {
                        // EOF - session ended
                        if let Some(handle) = &app_handle {
                            let _ = handle.emit("pty-exit", PtyExit {
                                id: session_id.clone(),
                                code: None,
                            });
                        }
                        break;
                    }
                    Ok(n) => {
                        if let Some(handle) = &app_handle {
                            let _ = handle.emit("pty-output", PtyOutput {
                                id: session_id.clone(),
                                data: buffer[..n].to_vec(),
                            });
                        }
                    }
                    Err(e) => {
                        eprintln!("Read error for session {}: {}", session_id, e);
                        break;
                    }
                }
            }
        });

        let active_session = ActiveSession {
            info: session_info.clone(),
            master: pair.master,
            child,
            writer,
        };

        self.sessions.lock().insert(id, active_session);

        Ok(session_info)
    }

    /// Write input data to a session
    pub fn write_to_session(&self, id: &str, data: &[u8]) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        let session = sessions
            .get_mut(id)
            .ok_or_else(|| format!("Session not found: {}", id))?;

        session
            .writer
            .write_all(data)
            .map_err(|e| format!("Write error: {}", e))?;

        session
            .writer
            .flush()
            .map_err(|e| format!("Flush error: {}", e))?;

        Ok(())
    }

    /// Resize a session's PTY
    pub fn resize_session(&self, id: &str, rows: u16, cols: u16) -> Result<(), String> {
        let sessions = self.sessions.lock();
        let session = sessions
            .get(id)
            .ok_or_else(|| format!("Session not found: {}", id))?;

        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Resize error: {}", e))?;

        Ok(())
    }

    /// Kill and remove a session
    pub fn kill_session(&self, id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        if let Some(mut session) = sessions.remove(id) {
            // Kill the child process
            let _ = session.child.kill();
        }
        Ok(())
    }

    /// Get session info
    pub fn get_session_info(&self, id: &str) -> Option<SessionInfo> {
        self.sessions.lock().get(id).map(|s| s.info.clone())
    }

    /// Get all session infos
    pub fn get_all_sessions(&self) -> Vec<SessionInfo> {
        self.sessions
            .lock()
            .values()
            .map(|s| s.info.clone())
            .collect()
    }

    /// Update session name
    pub fn rename_session(&self, id: &str, name: String) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        let session = sessions
            .get_mut(id)
            .ok_or_else(|| format!("Session not found: {}", id))?;

        session.info.name = name;
        Ok(())
    }

    /// Update session group
    pub fn set_session_group(&self, id: &str, group_id: Option<String>) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        let session = sessions
            .get_mut(id)
            .ok_or_else(|| format!("Session not found: {}", id))?;

        session.info.group_id = group_id;
        Ok(())
    }

    /// Set startup command for a session (to run on restore)
    pub fn set_startup_command(&self, id: &str, command: Option<String>) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        let session = sessions
            .get_mut(id)
            .ok_or_else(|| format!("Session not found: {}", id))?;

        session.info.startup_command = command;
        Ok(())
    }

    /// Run a command in a session (used for startup commands)
    pub fn run_command(&self, id: &str, command: &str) -> Result<(), String> {
        // Write the command followed by Enter
        let command_with_newline = format!("{}\n", command);
        self.write_to_session(id, command_with_newline.as_bytes())
    }

    /// Check if a session exists and is running
    #[allow(dead_code)]
    pub fn is_session_running(&self, id: &str) -> bool {
        let sessions = self.sessions.lock();
        if let Some(session) = sessions.get(id) {
            matches!(session.info.status, SessionStatus::Running)
        } else {
            false
        }
    }
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}

// Thread-safe wrapper for global state
pub type SharedPtyManager = Arc<Mutex<PtyManager>>;

pub fn create_shared_manager() -> SharedPtyManager {
    Arc::new(Mutex::new(PtyManager::new()))
}
