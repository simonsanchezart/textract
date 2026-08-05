use base64::{engine::general_purpose, Engine};
use image::{open, Rgba, RgbaImage};
use rayon::iter::{IndexedParallelIterator, IntoParallelRefIterator, ParallelIterator};
use serde::Deserialize;
use std::io::Cursor;

/// One curved-surface mark: an `rows` x `cols` grid of source control points,
/// laid out row-major (row 0 left-to-right, then row 1, ...).
#[derive(Deserialize)]
pub struct GridMark {
    rows: u32,
    cols: u32,
    points: Vec<f32>,
}

#[tauri::command]
pub async fn transform_image_mesh(
    img_path: String,
    marks: Vec<GridMark>,
) -> Result<Vec<String>, String> {
    log::info!("Processing {} grid marks for {img_path}", marks.len());

    let img = open(&img_path).map_err(|e| e.to_string())?.to_rgba8();
    let img_name = crate::utils::get_filename_or_invalid(&img_path);

    let buffers: Result<Vec<String>, String> = marks
        .par_iter()
        .enumerate()
        .map(|(i, mark)| {
            let result = warp_mesh(&img, mark)?;
            log::info!("Finished processing grid mark #{} for {}", (i + 1), img_name);
            image_to_base_64(&result)
        })
        .collect();

    log::info!("Finished processing all grid marks for {}", img_name);
    buffers
}

fn warp_mesh(img: &RgbaImage, mark: &GridMark) -> Result<RgbaImage, String> {
    let rows = mark.rows as usize;
    let cols = mark.cols as usize;

    if rows < 2 || cols < 2 {
        return Err("Grid mark needs at least a 2x2 grid of points".to_string());
    }
    if mark.points.len() != rows * cols * 2 {
        return Err(format!(
            "Expected {} point values ({rows}x{cols} grid) but got {}",
            rows * cols * 2,
            mark.points.len()
        ));
    }

    let src = grid_from_flat(&mark.points, rows, cols);
    let (cell_w, cell_h) = average_cell_size(&src, rows, cols);
    let out_width = ((cols - 1) as f32 * cell_w).round().max(1.0) as u32;
    let out_height = ((rows - 1) as f32 * cell_h).round().max(1.0) as u32;

    let dst = target_grid(rows, cols, cell_w, cell_h);

    let mut out = RgbaImage::new(out_width, out_height);

    for i in 0..rows - 1 {
        for j in 0..cols - 1 {
            // Two triangles per grid cell, split along the same diagonal on
            // both the source and target side so the mapping stays 1:1.
            let src_tl = src[i][j];
            let src_tr = src[i][j + 1];
            let src_bl = src[i + 1][j];
            let src_br = src[i + 1][j + 1];

            let dst_tl = dst[i][j];
            let dst_tr = dst[i][j + 1];
            let dst_bl = dst[i + 1][j];
            let dst_br = dst[i + 1][j + 1];

            warp_triangle(img, &mut out, (src_tl, src_tr, src_bl), (dst_tl, dst_tr, dst_bl));
            warp_triangle(img, &mut out, (src_br, src_bl, src_tr), (dst_br, dst_bl, dst_tr));
        }
    }

    Ok(out)
}

fn grid_from_flat(points: &[f32], rows: usize, cols: usize) -> Vec<Vec<(f32, f32)>> {
    let mut grid = Vec::with_capacity(rows);
    for i in 0..rows {
        let mut row = Vec::with_capacity(cols);
        for j in 0..cols {
            let idx = (i * cols + j) * 2;
            row.push((points[idx], points[idx + 1]));
        }
        grid.push(row);
    }
    grid
}

/// Average horizontal/vertical spacing across the source grid, used as the
/// uniform cell size for the flattened output grid.
fn average_cell_size(src: &[Vec<(f32, f32)>], rows: usize, cols: usize) -> (f32, f32) {
    let dist = |a: (f32, f32), b: (f32, f32)| ((a.0 - b.0).powi(2) + (a.1 - b.1).powi(2)).sqrt();

    let mut width_sum: f32 = 0.0;
    let mut width_count: f32 = 0.0;
    for row in src.iter().take(rows) {
        for j in 0..cols - 1 {
            width_sum += dist(row[j], row[j + 1]);
            width_count += 1.0;
        }
    }

    let mut height_sum: f32 = 0.0;
    let mut height_count: f32 = 0.0;
    for j in 0..cols {
        for i in 0..rows - 1 {
            height_sum += dist(src[i][j], src[i + 1][j]);
            height_count += 1.0;
        }
    }

    (
        (width_sum / width_count.max(1.0)).max(1.0),
        (height_sum / height_count.max(1.0)).max(1.0),
    )
}

fn target_grid(rows: usize, cols: usize, cell_w: f32, cell_h: f32) -> Vec<Vec<(f32, f32)>> {
    (0..rows)
        .map(|i| {
            (0..cols)
                .map(|j| (j as f32 * cell_w, i as f32 * cell_h))
                .collect()
        })
        .collect()
}

/// Backward-maps every destination pixel inside the target triangle to its
/// source-triangle location via barycentric coordinates, then bilinear-samples
/// the source image. Iterating destination pixels (rather than pushing source
/// pixels forward) is what guarantees no gaps/cracks between triangles.
fn warp_triangle(
    src_img: &RgbaImage,
    out: &mut RgbaImage,
    src_tri: ((f32, f32), (f32, f32), (f32, f32)),
    dst_tri: ((f32, f32), (f32, f32), (f32, f32)),
) {
    let (out_w, out_h) = out.dimensions();
    let (d0, d1, d2) = dst_tri;

    let min_x = d0.0.min(d1.0).min(d2.0).floor().max(0.0) as u32;
    let max_x = d0.0.max(d1.0).max(d2.0).ceil().min(out_w as f32 - 1.0) as u32;
    let min_y = d0.1.min(d1.1).min(d2.1).floor().max(0.0) as u32;
    let max_y = d0.1.max(d1.1).max(d2.1).ceil().min(out_h as f32 - 1.0) as u32;

    if max_x < min_x || max_y < min_y {
        return;
    }

    let (s0, s1, s2) = src_tri;

    for y in min_y..=max_y {
        for x in min_x..=max_x {
            // Index-space, not pixel-center — matches imageproc's own
            // warp_inner/interpolate_bilinear convention (see transformation.rs),
            // so a flat/no-op mesh warp doesn't introduce a half-pixel shift.
            let p = (x as f32, y as f32);
            if let Some((a, b, c)) = barycentric(p, d0, d1, d2) {
                if inside_triangle((a, b, c)) {
                    let src_x = a * s0.0 + b * s1.0 + c * s2.0;
                    let src_y = a * s0.1 + b * s1.1 + c * s2.1;
                    let pixel = sample_bilinear(src_img, src_x, src_y);
                    out.put_pixel(x, y, pixel);
                }
            }
        }
    }
}

fn barycentric(
    p: (f32, f32),
    a: (f32, f32),
    b: (f32, f32),
    c: (f32, f32),
) -> Option<(f32, f32, f32)> {
    let denom = (b.1 - c.1) * (a.0 - c.0) + (c.0 - b.0) * (a.1 - c.1);
    if denom.abs() < 1e-6 {
        return None;
    }
    let alpha = ((b.1 - c.1) * (p.0 - c.0) + (c.0 - b.0) * (p.1 - c.1)) / denom;
    let beta = ((c.1 - a.1) * (p.0 - c.0) + (a.0 - c.0) * (p.1 - c.1)) / denom;
    let gamma = 1.0 - alpha - beta;
    Some((alpha, beta, gamma))
}

fn inside_triangle(bary: (f32, f32, f32)) -> bool {
    // A small negative tolerance keeps shared triangle edges filled on both
    // sides instead of leaving a hairline gap due to float rounding.
    const EPS: f32 = -1e-3;
    bary.0 >= EPS && bary.1 >= EPS && bary.2 >= EPS
}

fn sample_bilinear(img: &RgbaImage, x: f32, y: f32) -> Rgba<u8> {
    let (w, h) = img.dimensions();
    if w == 0 || h == 0 || x < 0.0 || y < 0.0 || x > (w - 1) as f32 || y > (h - 1) as f32 {
        return Rgba([0, 0, 0, 0]);
    }

    let x0 = x.floor() as u32;
    let y0 = y.floor() as u32;
    let x1 = (x0 + 1).min(w - 1);
    let y1 = (y0 + 1).min(h - 1);
    let fx = x - x0 as f32;
    let fy = y - y0 as f32;

    let p00 = img.get_pixel(x0, y0).0;
    let p10 = img.get_pixel(x1, y0).0;
    let p01 = img.get_pixel(x0, y1).0;
    let p11 = img.get_pixel(x1, y1).0;

    let mut out = [0u8; 4];
    for ch in 0..4 {
        let top = p00[ch] as f32 * (1.0 - fx) + p10[ch] as f32 * fx;
        let bottom = p01[ch] as f32 * (1.0 - fx) + p11[ch] as f32 * fx;
        out[ch] = (top * (1.0 - fy) + bottom * fy).round() as u8;
    }
    Rgba(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Source image where each pixel encodes its own coordinates in R/G, so
    /// warp correctness can be checked by comparing output color back to the
    /// expected source (x, y) rather than eyeballing an image.
    fn coordinate_image(w: u32, h: u32) -> RgbaImage {
        RgbaImage::from_fn(w, h, |x, y| Rgba([x as u8, y as u8, 100, 255]))
    }

    #[test]
    fn flat_grid_matches_a_plain_crop() {
        let img = coordinate_image(100, 60);
        // A perfectly rectangular 3x3 grid over [10,10]..[90,50] has no
        // actual curvature, so it should behave like extracting that crop.
        let mut points = Vec::new();
        for i in 0..3 {
            for j in 0..3 {
                points.push(10.0 + j as f32 * 40.0);
                points.push(10.0 + i as f32 * 20.0);
            }
        }
        let mark = GridMark {
            rows: 3,
            cols: 3,
            points,
        };

        let out = warp_mesh(&img, &mark).expect("warp should succeed");
        assert_eq!(out.dimensions(), (80, 40));

        // Top-left corner of the crop should sample back near source (10, 10).
        let corner = out.get_pixel(0, 0);
        assert!((corner[0] as i32 - 10).abs() <= 1, "unexpected R at corner: {corner:?}");
        assert!((corner[1] as i32 - 10).abs() <= 1, "unexpected G at corner: {corner:?}");

        // Bottom-right corner should sample back near source (90, 50).
        let corner = out.get_pixel(79, 39);
        assert!((corner[0] as i32 - 90).abs() <= 1, "unexpected R at br corner: {corner:?}");
        assert!((corner[1] as i32 - 50).abs() <= 1, "unexpected G at br corner: {corner:?}");

        // Center of the crop should sample back near source (50, 30).
        let center = out.get_pixel(40, 20);
        assert!((center[0] as i32 - 50).abs() <= 1, "unexpected R at center: {center:?}");
        assert!((center[1] as i32 - 30).abs() <= 1, "unexpected G at center: {center:?}");
    }

    #[test]
    fn curved_grid_bows_the_middle_row_outward() {
        let img = coordinate_image(100, 100);
        // Middle row bows downward (curved surface), top/bottom rows stay straight.
        let mut points = Vec::new();
        for i in 0..3u32 {
            for j in 0..3u32 {
                let x = 10.0 + j as f32 * 40.0;
                let bow = if i == 1 { 15.0 } else { 0.0 };
                let y = 10.0 + i as f32 * 40.0 + bow;
                points.push(x);
                points.push(y);
            }
        }
        let mark = GridMark {
            rows: 3,
            cols: 3,
            points,
        };

        let out = warp_mesh(&img, &mark).expect("warp should succeed");
        // Output is still a flat rectangle despite the curved input mesh.
        // Row spacing averages back to 40 (10->65 then 65->90 -> mean 40),
        // same as the unbowed case, since the output uses a uniform target grid.
        assert_eq!(out.dimensions(), (80, 80));
    }

    #[test]
    fn rejects_mismatched_point_count() {
        let mark = GridMark {
            rows: 3,
            cols: 3,
            points: vec![0.0, 0.0, 1.0, 1.0], // way too few for a 3x3 grid
        };
        let img = coordinate_image(10, 10);
        assert!(warp_mesh(&img, &mark).is_err());
    }

    #[test]
    fn rejects_grid_smaller_than_2x2() {
        let mark = GridMark {
            rows: 1,
            cols: 3,
            points: vec![0.0, 0.0, 1.0, 0.0, 2.0, 0.0],
        };
        let img = coordinate_image(10, 10);
        assert!(warp_mesh(&img, &mark).is_err());
    }
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
