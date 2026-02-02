mod commands;
mod persistence;
mod pty;

use commands::GroupState;
use pty::create_shared_manager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pty_manager = create_shared_manager();
    let group_state = GroupState::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(pty_manager.clone())
        .manage(group_state)
        .setup(move |app| {
            // Set the app handle on the PTY manager for event emission
            let handle = app.handle().clone();
            pty_manager.lock().set_app_handle(handle);

            // Load saved layout on startup
            if let Ok(state) = persistence::load_state() {
                let group_state: tauri::State<GroupState> = app.state();
                *group_state.groups.lock() = state.groups;
                *group_state.active_session_id.lock() = state.active_session_id;
                // Note: Sessions will be respawned by frontend if needed
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Session commands
            commands::create_session,
            commands::delete_session,
            commands::rename_session,
            commands::write_to_session,
            commands::resize_session,
            commands::get_session,
            commands::get_all_sessions,
            commands::set_session_group,
            // Group commands
            commands::create_group,
            commands::delete_group,
            commands::rename_group,
            commands::toggle_group_collapsed,
            commands::get_all_groups,
            // Active session
            commands::set_active_session,
            commands::get_active_session,
            // Persistence
            commands::save_layout,
            commands::load_layout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running terminal manager");
}
