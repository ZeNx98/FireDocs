// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]


// Global registry and server port removed
// static FILE_REGISTRY...
// static SERVER_PORT...

#[derive(serde::Serialize)]
struct FileMetadata {
    name: String,
    size: u64,
}

// Struct StreamResponse removed

#[tauri::command]
async fn select_pdf(app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    
    let path = app.dialog().file().add_filter("PDF Files", &["pdf"]).blocking_pick_file();
    path.and_then(|p| p.as_path().map(|v| v.to_string_lossy().to_string()))
}

#[tauri::command]
fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    println!("Metadata request for: {}", path);
    let metadata = std::fs::metadata(&path).map_err(|e| {
        println!("Metadata error: {}", e);
        e.to_string()
    })?;
    let name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    println!("Metadata success: {} ({} bytes)", name, metadata.len());
    Ok(FileMetadata {
        name,
        size: metadata.len(),
    })
}

#[tauri::command]
fn read_file_chunk(path: String, offset: u64, length: u64) -> Result<String, String> {
    println!("Chunk request: {} (offset={}, len={})", path, offset, length);
    use std::fs::File;
    use std::io::{Read, Seek};
    use base64::{Engine as _, engine::general_purpose};
    
    // Safety cap: Limit chunk size to 5MB to prevent memory issues
    let safe_length = std::cmp::min(length, 5 * 1024 * 1024);
    
    let mut file = File::open(path).map_err(|e| {
        println!("Chunk open error: {}", e);
        e.to_string()
    })?;
    file.seek(std::io::SeekFrom::Start(offset)).map_err(|e| e.to_string())?;
    
    let mut buffer = vec![0; safe_length as usize];
    let n = file.read(&mut buffer).map_err(|e| e.to_string())?;
    
    buffer.truncate(n);
    
    let b64 = general_purpose::STANDARD.encode(&buffer);
    Ok(b64)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            select_pdf, 
            get_file_metadata, 
            read_file_chunk,
            save_pdf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn save_pdf(app: tauri::AppHandle, filename: String, data: Vec<u8>) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let path_opt = app.dialog()
        .file()
        .set_file_name(&filename)
        .add_filter("PDF", &["pdf"])
        .blocking_save_file();
    
    if let Some(path) = path_opt {
        if let Some(path_buf) = path.as_path() {
            std::fs::write(path_buf, data).map_err(|e| e.to_string())?;
            return Ok(path_buf.to_string_lossy().to_string());
        }
    }
    
    Err("Cancelled".to_string())
}
