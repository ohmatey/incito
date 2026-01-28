// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_updater::UpdaterExt;

// State to track the Claude Code server process
struct ClaudeCodeState {
    process: Mutex<Option<CommandChild>>,
}

#[tauri::command]
async fn start_claude_code_server(
    app: AppHandle,
    state: tauri::State<'_, ClaudeCodeState>,
    executable_path: Option<String>,
) -> Result<u32, String> {
    let mut process_guard = state.process.lock().map_err(|e| e.to_string())?;

    if process_guard.is_some() {
        return Err("Claude Code server is already running".to_string());
    }

    let mut command = app
        .shell()
        .sidecar("claude-code-server")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?;

    // Pass custom executable path as command line argument
    if let Some(ref path) = executable_path {
        if !path.is_empty() {
            command = command
                .env("CLAUDE_CODE_EXECUTABLE_PATH", path)
                .args(["--claude-path", path]);
        }
    }

    let (_, child) = command
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    let pid = child.pid();
    *process_guard = Some(child);

    Ok(pid)
}

#[tauri::command]
async fn stop_claude_code_server(
    state: tauri::State<'_, ClaudeCodeState>,
) -> Result<(), String> {
    let mut process_guard = state.process.lock().map_err(|e| e.to_string())?;

    if let Some(child) = process_guard.take() {
        child.kill().map_err(|e| format!("Failed to kill process: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn get_claude_code_server_status(
    state: tauri::State<'_, ClaudeCodeState>,
) -> Result<bool, String> {
    let process_guard = state.process.lock().map_err(|e| e.to_string())?;
    Ok(process_guard.is_some())
}

#[derive(Clone, serde::Serialize)]
struct UpdateInfo {
    version: String,
    body: Option<String>,
    date: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct ClaudeCodePathResult {
    found: bool,
    path: Option<String>,
    version: Option<String>,
    error: Option<String>,
}

#[tauri::command]
fn find_claude_code_path() -> Result<ClaudeCodePathResult, String> {
    // Try to find claude using 'which' on Unix or 'where' on Windows
    #[cfg(target_os = "windows")]
    let output = std::process::Command::new("where")
        .arg("claude")
        .output();

    #[cfg(not(target_os = "windows"))]
    let output = std::process::Command::new("which")
        .arg("claude")
        .output();

    match output {
        Ok(result) if result.status.success() => {
            let path = String::from_utf8_lossy(&result.stdout)
                .lines()
                .next()
                .unwrap_or("")
                .trim()
                .to_string();

            if path.is_empty() {
                Ok(ClaudeCodePathResult {
                    found: false,
                    path: None,
                    version: None,
                    error: Some("Claude Code not found in system PATH".to_string()),
                })
            } else {
                // Try to get version
                let version = get_claude_version(&path);
                Ok(ClaudeCodePathResult {
                    found: true,
                    path: Some(path),
                    version,
                    error: None,
                })
            }
        }
        Ok(_) => Ok(ClaudeCodePathResult {
            found: false,
            path: None,
            version: None,
            error: Some("Claude Code not found in system PATH".to_string()),
        }),
        Err(e) => Ok(ClaudeCodePathResult {
            found: false,
            path: None,
            version: None,
            error: Some(format!("Failed to search for Claude Code: {}", e)),
        }),
    }
}

#[tauri::command]
fn check_claude_code_path(path: String) -> Result<ClaudeCodePathResult, String> {
    // Check if file exists
    let path_obj = std::path::Path::new(&path);
    if !path_obj.exists() {
        return Ok(ClaudeCodePathResult {
            found: false,
            path: Some(path),
            version: None,
            error: Some("File does not exist".to_string()),
        });
    }

    // Try to get version to verify it's actually Claude Code
    match get_claude_version(&path) {
        Some(version) => Ok(ClaudeCodePathResult {
            found: true,
            path: Some(path),
            version: Some(version),
            error: None,
        }),
        None => Ok(ClaudeCodePathResult {
            found: false,
            path: Some(path),
            version: None,
            error: Some("File exists but does not appear to be Claude Code (could not get version)".to_string()),
        }),
    }
}

fn get_claude_version(path: &str) -> Option<String> {
    use std::process::Stdio;
    use std::time::Duration;

    // Spawn the process
    let mut child = std::process::Command::new(path)
        .arg("--version")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;

    // Wait with a timeout of 5 seconds
    let start = std::time::Instant::now();
    let timeout = Duration::from_secs(5);

    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                if status.success() {
                    let output = child.wait_with_output().ok()?;
                    let version_str = String::from_utf8_lossy(&output.stdout);
                    return Some(version_str.trim().to_string());
                } else {
                    return None;
                }
            }
            Ok(None) => {
                if start.elapsed() > timeout {
                    // Kill the process if it's taking too long
                    let _ = child.kill();
                    return None;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(_) => return None,
        }
    }
}

#[tauri::command]
async fn check_for_updates(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => {
            Ok(Some(UpdateInfo {
                version: update.version.clone(),
                body: update.body.clone(),
                date: update.date.map(|d| d.to_string()),
            }))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn install_update(app: AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => {
            // Download and install the update
            update.download_and_install(|_, _| {}, || {}).await
                .map_err(|e| e.to_string())?;
            Ok(())
        }
        Ok(None) => Err("No update available".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

fn create_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    let app_name = "Incito";

    // App menu (macOS only, but harmless on other platforms)
    let about = MenuItem::with_id(app, "about", format!("About {}", app_name), true, None::<&str>)?;
    let check_updates = MenuItem::with_id(app, "check-updates", "Check for Updates...", true, None::<&str>)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let separator3 = PredefinedMenuItem::separator(app)?;
    let separator4 = PredefinedMenuItem::separator(app)?;
    let services = Submenu::with_id_and_items(app, "services", "Services", true, &[])?;
    let hide = PredefinedMenuItem::hide(app, Some(app_name))?;
    let hide_others = PredefinedMenuItem::hide_others(app, Some("Hide Others"))?;
    let show_all = PredefinedMenuItem::show_all(app, Some("Show All"))?;
    let quit = PredefinedMenuItem::quit(app, Some(&format!("Quit {}", app_name)))?;

    let app_menu = Submenu::with_id_and_items(
        app,
        "app",
        app_name,
        true,
        &[
            &about,
            &separator1,
            &check_updates,
            &separator2,
            &services,
            &separator3,
            &hide,
            &hide_others,
            &show_all,
            &separator4,
            &quit,
        ],
    )?;

    // Edit menu
    let undo = PredefinedMenuItem::undo(app, Some("Undo"))?;
    let redo = PredefinedMenuItem::redo(app, Some("Redo"))?;
    let edit_separator = PredefinedMenuItem::separator(app)?;
    let cut = PredefinedMenuItem::cut(app, Some("Cut"))?;
    let copy = PredefinedMenuItem::copy(app, Some("Copy"))?;
    let paste = PredefinedMenuItem::paste(app, Some("Paste"))?;
    let select_all = PredefinedMenuItem::select_all(app, Some("Select All"))?;

    let edit_menu = Submenu::with_id_and_items(
        app,
        "edit",
        "Edit",
        true,
        &[
            &undo,
            &redo,
            &edit_separator,
            &cut,
            &copy,
            &paste,
            &select_all,
        ],
    )?;

    // Window menu
    let minimize = PredefinedMenuItem::minimize(app, Some("Minimize"))?;
    let maximize = MenuItem::with_id(app, "maximize", "Maximize", true, None::<&str>)?;
    let window_separator = PredefinedMenuItem::separator(app)?;
    let close = PredefinedMenuItem::close_window(app, Some("Close Window"))?;

    let window_menu = Submenu::with_id_and_items(
        app,
        "window",
        "Window",
        true,
        &[
            &minimize,
            &maximize,
            &window_separator,
            &close,
        ],
    )?;

    // Build the complete menu
    Menu::with_items(app, &[&app_menu, &edit_menu, &window_menu])
}

fn main() {
    tauri::Builder::default()
        .manage(ClaudeCodeState {
            process: Mutex::new(None),
        })
        // IMPORTANT: fs must be registered BEFORE persisted-scope
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .setup(|app| {
            // Create and set the menu
            let menu = create_menu(app.handle())?;
            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "check-updates" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-check-updates", ());
                    }
                }
                "about" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-about", ());
                    }
                }
                "maximize" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.maximize();
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            start_claude_code_server,
            stop_claude_code_server,
            get_claude_code_server_status,
            check_for_updates,
            install_update,
            find_claude_code_path,
            check_claude_code_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
