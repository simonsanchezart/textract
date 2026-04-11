use base64::{engine::general_purpose, Engine};
use image::{open, GenericImage, RgbaImage};
use imageproc::geometric_transformations::{warp, Interpolation, Projection};
use std::{env, io::Cursor};

use nalgebra::{DMatrix, DVector, Matrix3};

// research: learn how this works properly, is this the best way to estimate the dimensions?
// refactor: extract to module
fn quad_dimensions(q: &[(f64, f64); 4]) -> (f64, f64) {
    let dist = |a: (f64, f64), b: (f64, f64)| ((a.0 - b.0).powi(2) + (a.1 - b.1).powi(2)).sqrt();

    let width = (dist(q[0], q[1]) + dist(q[2], q[3])) * 0.5;
    let height = (dist(q[1], q[2]) + dist(q[3], q[0])) * 0.5;

    (width, height)
}

// research:
// refactor: extract to module
fn homography_from_4pts(src: &[(f64, f64); 4], dst: &[(f64, f64); 4]) -> Option<Matrix3<f64>> {
    let mut a = DMatrix::<f64>::zeros(8, 8);
    let mut b = DVector::<f64>::zeros(8);

    for i in 0..4 {
        let (x, y) = src[i];
        let (u, v) = dst[i];

        let r = 2 * i;

        // x
        a[(r, 0)] = x;
        a[(r, 1)] = y;
        a[(r, 2)] = 1.0;
        a[(r, 6)] = -u * x;
        a[(r, 7)] = -u * y;
        b[r] = u;

        // y
        a[(r + 1, 3)] = x;
        a[(r + 1, 4)] = y;
        a[(r + 1, 5)] = 1.0;
        a[(r + 1, 6)] = -v * x;
        a[(r + 1, 7)] = -v * y;
        b[r + 1] = v;
    }

    let h = a.lu().solve(&b)?;

    Some(Matrix3::new(
        h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0,
    ))
}

// refactor: extract to module
// refactor: optimize by passing all marks from image in a single call
#[tauri::command]
async fn transform_image(img_url: String, points: Vec<f64>) -> Result<String, String> {
    let tr = (points[0], points[1]);
    let tl = (points[2], points[3]);
    let bl = (points[4], points[5]);
    let br = (points[6], points[7]);

    let src = &[tl, tr, br, bl];
    let (width, height) = quad_dimensions(&src);
    let dst = [(0.0, 0.0), (width, 0.0), (width, height), (0.0, height)];

    let h = homography_from_4pts(&src, &dst).unwrap();
    let proj = Projection::from_matrix([
        h[(0, 0)] as f32,
        h[(0, 1)] as f32,
        h[(0, 2)] as f32,
        h[(1, 0)] as f32,
        h[(1, 1)] as f32,
        h[(1, 2)] as f32,
        h[(2, 0)] as f32,
        h[(2, 1)] as f32,
        h[(2, 2)] as f32,
    ])
    .unwrap();

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
