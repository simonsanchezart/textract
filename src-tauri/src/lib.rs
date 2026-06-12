mod transformation;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Debug)
                .level_for("tao::platform_impl", log::LevelFilter::Error)
                .level_for("tauri_plugin_updater::updater", log::LevelFilter::Warn)
                .level_for("reqwest::connect", log::LevelFilter::Warn)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![transformation::transform_image,])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
