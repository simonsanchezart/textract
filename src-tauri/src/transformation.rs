use base64::{engine::general_purpose, Engine};
use image::{open, RgbaImage};
use imageproc::geometric_transformations::{warp_into, Interpolation, Projection};
use rayon::{
    iter::{IndexedParallelIterator, ParallelIterator},
    slice::ParallelSlice,
};
use std::{
    io::Cursor,
};

#[tauri::command]
pub async fn transform_image(
    img_path: String,
    points: Vec<f32>,
) -> Result<Vec<String>, String> {
    let mark_count = points.len() / 8;
    log::info!("Processing {mark_count} marks for {img_path}");

    let img = open(&img_path).unwrap().to_rgba8();
    let img_name = crate::utils::get_filename_or_invalid(&img_path);

    let buffers: Result<Vec<String>, String> = points
        .par_chunks(8)
        .enumerate()
        .map(|(i, chunk)| {
            let tr = (chunk[0], chunk[1]);
            let tl = (chunk[2], chunk[3]);
            let bl = (chunk[4], chunk[5]);
            let br = (chunk[6], chunk[7]);

            let src = [tl, tr, br, bl];
            let (width, height) = get_quad_dimensions(&src);
            let dst = [(0.0, 0.0), (width, 0.0), (width, height), (0.0, height)];
            log::debug!("\n\tSource: {:?}\n\tDestination: {:?}", src, dst);

            let proj = Projection::from_control_points(src, dst)
                .ok_or_else(|| "Failed projection".to_string())?;

            let mut result = RgbaImage::new(width as u32, height as u32);
            warp_into(
                &img,
                &proj,
                Interpolation::Bilinear, // todo: pass interpolation as parameter
                image::Rgba([0, 0, 0, 0]),
                &mut result,
            );

            log::info!("Finished processing mark #{} for {}", (i + 1), img_name);

            let base64 = image_to_base_64(&result)?;
            Ok(base64)
        })
        .collect();

    log::info!("Finished processing all marks for {}", img_name);
    buffers
}

fn get_quad_dimensions(points: &[(f32, f32); 4]) -> (f32, f32) {
    let dist = |a: (f32, f32), b: (f32, f32)| ((a.0 - b.0).powi(2) + (a.1 - b.1).powi(2)).sqrt();
    let width = (dist(points[0], points[1]) + dist(points[2], points[3])) * 0.5;
    let height = (dist(points[1], points[2]) + dist(points[3], points[0])) * 0.5;

    (width, height)
}

fn image_to_base_64(image: &RgbaImage) -> Result<String, String> {
    let mut buffer: Vec<u8> = Vec::new();
    image
        .write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(format!(
        "data:image/png;base64,{}",
        general_purpose::STANDARD.encode(buffer)
    ))
}
