// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::io::SeekFrom;
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use warp::Filter;
use warp::http::Response;

// Global registry to map tokens to file paths securely
static FILE_REGISTRY: Lazy<Arc<Mutex<HashMap<String, PathBuf>>>> =
    Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

// Global variable to store the server port
static SERVER_PORT: Lazy<Arc<Mutex<u16>>> = Lazy::new(|| Arc::new(Mutex::new(0)));

#[derive(serde::Serialize)]
struct FileMetadata {
    name: String,
    size: u64,
}

#[derive(serde::Serialize)]
struct StreamResponse {
    token: String,
    url: String,
}

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
fn read_file_chunk(path: String, offset: u64, length: u64) -> Result<Vec<u8>, String> {
    use std::fs::File;
    use std::io::{Read, Seek};
    
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    file.seek(std::io::SeekFrom::Start(offset)).map_err(|e| e.to_string())?;
    
    let mut buffer = vec![0; length as usize];
    let n = file.read(&mut buffer).map_err(|e| e.to_string())?;
    
    buffer.truncate(n);
    Ok(buffer)
}

#[tauri::command]
fn prepare_pdf_stream(path: String) -> Result<StreamResponse, String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err("File not found".to_string());
    }

    let token = uuid::Uuid::new_v4().to_string();
    
    // Register the file
    FILE_REGISTRY
        .lock()
        .map_err(|_| "Failed to lock registry")?
        .insert(token.clone(), path_buf);

    let port = *SERVER_PORT.lock().unwrap();
    let url = format!("http://localhost:{}/pdf/{}", port, token);

    Ok(StreamResponse { token, url })
}

// Function to serve the file content
async fn serve_file_handler(token: String, range_header: Option<String>) -> Result<impl warp::Reply, warp::Rejection> {
    let path_opt = FILE_REGISTRY
        .lock()
        .ok()
        .and_then(|registry| registry.get(&token).cloned());

    let path = match path_opt {
        Some(p) => p,
        None => return Err(warp::reject::not_found()),
    };

    let mut file = match tokio::fs::File::open(&path).await {
        Ok(f) => f,
        Err(_) => return Err(warp::reject::not_found()),
    };

    let metadata = match file.metadata().await {
        Ok(m) => m,
        Err(_) => return Err(warp::reject::not_found()),
    };
    let len = metadata.len();

    let mut start = 0;
    let mut end = len - 1;
    let mut status_code = 200;

    if let Some(range_val) = range_header {
        if range_val.starts_with("bytes=") {
            let ranges: Vec<&str> = range_val["bytes=".len()..].split('-').collect();
            if ranges.len() == 2 {
                let start_str = ranges[0];
                let end_str = ranges[1];

                if let Ok(s) = start_str.parse::<u64>() {
                    start = s;
                }
                if let Ok(e) = end_str.parse::<u64>() {
                    end = e;
                }
                
                if end < start { end = len - 1; }
                if end >= len { end = len - 1; }
                
                status_code = 206;
            }
        }
    }

    if start >= len {
        return Ok(Response::builder()
            .status(416)
            .header("Content-Range", format!("bytes */{}", len))
            .body(vec![])
            .unwrap());
    }

    let chunk_len = end - start + 1;
    
    if let Err(_) = file.seek(SeekFrom::Start(start)).await {
        return Err(warp::reject::not_found()); // Simple error mapping
    }

    let mut buffer = vec![0; chunk_len as usize];
    if let Err(_) = file.read_exact(&mut buffer).await {
         // Best effort
    }

    let mut builder = Response::builder()
        .status(status_code)
        .header("Access-Control-Allow-Origin", "*") // Important for CORS
        .header("Accept-Ranges", "bytes")
        .header("Content-Length", chunk_len.to_string())
        .header("Content-Type", "application/pdf");

    if status_code == 206 {
        builder = builder.header("Content-Range", format!("bytes {}-{}/{}", start, end, len));
    }

    Ok(builder.body(buffer).unwrap()) 
}

fn main() {
    tauri::async_runtime::spawn(async move {
        let pdf_route = warp::path("pdf")
            .and(warp::path::param::<String>())
            .and(warp::header::optional::<String>("Range"))
            .and_then(serve_file_handler)
            .with(warp::cors().allow_any_origin()); // CORS also on options/wrapper

        // Use bind_ephemeral to let OS pick port
        let (addr, server) = warp::serve(pdf_route)
             .bind_ephemeral(([127, 0, 0, 1], 0));

        println!("Server running on port: {}", addr.port());
        
        *SERVER_PORT.lock().unwrap() = addr.port();
        
        server.await;
    });

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            select_pdf, 
            get_file_metadata, 
            read_file_chunk,
            read_file_chunk,
            prepare_pdf_stream,
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
