use base64::{engine::general_purpose, Engine};
use image::{open, GenericImage, RgbaImage};
use imageproc::geometric_transformations::{warp, Interpolation, Projection};
use std::{io::Cursor, path::Path};

fn get_quad_dimensions(points: &[(f32, f32); 4]) -> (f32, f32) {
    let dist = |a: (f32, f32), b: (f32, f32)| ((a.0 - b.0).powi(2) + (a.1 - b.1).powi(2)).sqrt();
    let width = (dist(points[0], points[1]) + dist(points[2], points[3])) * 0.5;
    let height = (dist(points[1], points[2]) + dist(points[3], points[0])) * 0.5;

    (width, height)
}

#[tauri::command]
pub async fn transform_image(img_path: String, points: Vec<f32>) -> Result<Vec<String>, String> {
    let mut buffers: Vec<String> = Vec::new();
    let img = open(&img_path).unwrap().to_rgba8();
    let img_name = Path::new(&img_path).file_name().and_then(|n| n.to_str()).unwrap_or("invalid");

    let point_count = points.len();
    let mark_count = point_count/8;

    log::info!("Processing {mark_count} marks for {img_path}");
    for i in (0..point_count).step_by(8) {
        let tr = (points[i], points[i + 1]);
        let tl = (points[i + 2], points[i + 3]);
        let bl = (points[i + 4], points[i + 5]);
        let br = (points[i + 6], points[i + 7]);

        let src = [tl, tr, br, bl];
        let (width, height) = get_quad_dimensions(&src);
        let dst = [(0.0, 0.0), (width, 0.0), (width, height), (0.0, height)];
        log::debug!("\n\tSource: {:?}\n\tDestination: {:?}", src, dst);

        let proj = Projection::from_control_points(src, dst).unwrap();
        let mut result: RgbaImage = warp(
            &img,
            &proj,
            Interpolation::Bilinear, // todo: pass interpolation as parameter
            image::Rgba([0, 0, 0, 0]),
        );

        let crop_result = result.sub_image(0, 0, width as u32, height as u32);
        let mut crop_buffer: Vec<u8> = Vec::new();
        crop_result
            .to_image()
            .write_to(&mut Cursor::new(&mut crop_buffer), image::ImageFormat::Png)
            .unwrap();

        let base64 = format!(
            "data:image/png;base64,{}",
            general_purpose::STANDARD.encode(crop_buffer)
        );

        buffers.push(base64);
        log::info!("Finished processing mark #{} for {}", ((i/8)+1), img_name);
    }

    log::info!("Finished processing all marks for {}", img_name);
    Ok(buffers)
}
