use base64::{engine::general_purpose, Engine};
use image::{open, GenericImage, RgbaImage};
use imageproc::geometric_transformations::{warp, Interpolation, Projection};
use std::{env, io::Cursor};

// research: learn how this works properly, is this the best way to estimate the dimensions?
// refactor: extract to module
fn quad_dimensions(q: &[(f32, f32); 4]) -> (f32, f32) {
    let dist = |a: (f32, f32), b: (f32, f32)| ((a.0 - b.0).powi(2) + (a.1 - b.1).powi(2)).sqrt();

    let width = (dist(q[0], q[1]) + dist(q[2], q[3])) * 0.5;
    let height = (dist(q[1], q[2]) + dist(q[3], q[0])) * 0.5;

    (width, height)
}

// refactor: extract to module
// refactor: optimize by passing all marks from image in a single call
#[tauri::command]
async fn transform_image(img_url: String, points: Vec<f32>) -> Result<String, String> {
    let tr = (points[0], points[1]);
    let tl = (points[2], points[3]);
    let bl = (points[4], points[5]);
    let br = (points[6], points[7]);

    let src = [tl, tr, br, bl];
    let (width, height) = quad_dimensions(&src);
    let dst = [(0.0, 0.0), (width, 0.0), (width, height), (0.0, height)];

    let proj = Projection::from_control_points(src, dst).unwrap();
    let img = open(img_url).unwrap().to_rgba8();
    let mut result: RgbaImage = warp(
        &img,
        &proj,
        Interpolation::Bilinear, // refactor: pass interpolation as parameter
        image::Rgba([0, 0, 0, 0]),
    );

    let crop_result = result.sub_image(0, 0, width as u32, height as u32);

    let mut crop_buffer: Vec<u8> = Vec::new();
    crop_result
        .to_image()
        .write_to(&mut Cursor::new(&mut crop_buffer), image::ImageFormat::Png)
        .unwrap();

    // research: is there a better way to pass this data to the front-end other than base-64?
    let base64 = format!(
        "data:image/png;base64,{}",
        general_purpose::STANDARD.encode(crop_buffer)
    );

    Ok(base64)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![transform_image,])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
