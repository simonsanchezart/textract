use std::path::Path;

pub fn get_filename_or_invalid(filepath: &String) -> &str {
    Path::new(filepath)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("invalid")
}
