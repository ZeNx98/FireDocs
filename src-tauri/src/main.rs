// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;

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
async fn select_pdf() -> Option<String> {
    let (tx, rx) = tokio::sync::oneshot::channel::<Option<String>>();
    
    tauri::api::dialog::FileDialogBuilder::new()
        .add_filter("PDF Files", &["pdf"])
        .pick_file(move |path| {
            let _ = tx.send(path.map(|p| p.to_string_lossy().to_string()));
        });
        
    rx.await.unwrap_or(None)
}

#[tauri::command]
fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    Ok(FileMetadata {
        name,
        size: metadata.len(),
    })
}

#[tauri::command]
fn read_file_chunk(path: String, offset: u64, length: u64) -> Result<String, String> {
    use std::fs::File;
    use std::io::{Read, Seek};
    use base64::{Engine as _, engine::general_purpose};
    
    // Safety cap: Limit chunk size to 5MB to prevent memory issues
    let safe_length = std::cmp::min(length, 5 * 1024 * 1024);
    
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    file.seek(std::io::SeekFrom::Start(offset)).map_err(|e| e.to_string())?;
    
    let mut buffer = vec![0; safe_length as usize];
    let n = file.read(&mut buffer).map_err(|e| e.to_string())?;
    
    buffer.truncate(n);
    
    // Return base64 string which is safer for Tauri v1 IPC
    let b64 = general_purpose::STANDARD.encode(&buffer);
    Ok(b64)
}

// prepare_pdf_stream removed

// serve_file_handler removed

fn main() {
    // warp server spawn removed

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            select_pdf, 
            get_file_metadata, 
            read_file_chunk,
            // prepare_pdf_stream, (removed)
            save_pdf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn save_pdf(filename: String, data: Vec<u8>) -> Result<String, String> {
    let (tx, rx) = tokio::sync::oneshot::channel::<Option<PathBuf>>();
    
    tauri::api::dialog::FileDialogBuilder::new()
        .set_file_name(&filename)
        .add_filter("PDF", &["pdf"])
        .save_file(move |path| {
            let _ = tx.send(path);
        });
    
    let path_opt = rx.await.map_err(|e| e.to_string())?;
    
    if let Some(path) = path_opt {
        std::fs::write(&path, data).map_err(|e| e.to_string())?;
        return Ok(path.to_string_lossy().to_string());
    }
    
    Err("Cancelled".to_string())
}
