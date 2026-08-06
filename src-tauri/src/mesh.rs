use base64::{engine::general_purpose, Engine};
use image::{open, Rgba, RgbaImage};
use rayon::iter::{IndexedParallelIterator, IntoParallelRefIterator, ParallelIterator};
use serde::Deserialize;
use std::io::Cursor;

/// One curved-surface mark: an `rows` x `cols` grid of source control points,
/// laid out row-major (row 0 left-to-right, then row 1, ...).
///
/// `smooth`/`tension` are per-point and optional. They default to empty, which
/// means "no point is smooth" — the exact straight-line behaviour every mark
/// had before curve mode existed, so old payloads keep warping identically.
#[derive(Deserialize, Default)]
pub struct GridMark {
    rows: u32,
    cols: u32,
    points: Vec<f32>,
    #[serde(default)]
    smooth: Vec<bool>,
    #[serde(default)]
    tension: Vec<f32>,
}

/// How many micro-cells each original cell becomes when a mark uses smoothing.
/// The output mesh has to stay one uniform rectangular grid so the triangulation
/// loop can consume it unchanged, so this is global rather than per-cell — sharp
/// cells are simply subdivided linearly, which is a no-op on their geometry.
const SUBDIVISION_STEPS: usize = 8;

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

    if !mark.smooth.is_empty() && mark.smooth.len() != rows * cols {
        return Err(format!(
            "Expected {} smooth flags ({rows}x{cols} grid) but got {}",
            rows * cols,
            mark.smooth.len()
        ));
    }
    if !mark.tension.is_empty() && mark.tension.len() != rows * cols {
        return Err(format!(
            "Expected {} tension values ({rows}x{cols} grid) but got {}",
            rows * cols,
            mark.tension.len()
        ));
    }

    let src = grid_from_flat(&mark.points, rows, cols);
    let (cell_w, cell_h) = average_cell_size(&src, rows, cols);
    let out_width = ((cols - 1) as f32 * cell_w).round().max(1.0) as u32;
    let out_height = ((rows - 1) as f32 * cell_h).round().max(1.0) as u32;

    // Subdividing shrinks the cells but not the mesh, so the output dimensions
    // above stay derived from the original control points either way.
    let (src, dst, rows, cols) = if mark.smooth.iter().any(|&s| s) {
        let smooth = flag_grid(&mark.smooth, rows, cols);
        let tension = tension_grid(&mark.tension, rows, cols);
        let (dense, dense_rows, dense_cols) =
            subdivide_grid(&src, &smooth, &tension, rows, cols, SUBDIVISION_STEPS);
        let steps = SUBDIVISION_STEPS as f32;
        let dense_dst = target_grid(dense_rows, dense_cols, cell_w / steps, cell_h / steps);
        (dense, dense_dst, dense_rows, dense_cols)
    } else {
        let dst = target_grid(rows, cols, cell_w, cell_h);
        (src, dst, rows, cols)
    };

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

fn flag_grid(flags: &[bool], rows: usize, cols: usize) -> Vec<Vec<bool>> {
    (0..rows)
        .map(|i| {
            (0..cols)
                .map(|j| flags.get(i * cols + j).copied().unwrap_or(false))
                .collect()
        })
        .collect()
}

fn tension_grid(values: &[f32], rows: usize, cols: usize) -> Vec<Vec<f32>> {
    (0..rows)
        .map(|i| {
            (0..cols)
                .map(|j| values.get(i * cols + j).copied().unwrap_or(0.0).clamp(0.0, 1.0))
                .collect()
        })
        .collect()
}

/// Densifies the control grid so the triangulation can follow a curve instead of
/// a chord.
///
/// Smoothness is a property of a *segment* in a *single* direction: the run
/// between two horizontally adjacent points curves when both of those two points
/// are flagged smooth, no matter what the points above and below them are flagged
/// as, and the same holds independently for vertical runs. Demanding that a whole
/// 2D neighbourhood agree — the obvious alternative — makes the feature
/// unreachable at the 2x3/3x3 grids the UI actually encourages, because there
/// every cell touches the mark's outer corners, which are precisely the points a
/// user wants left sharp.
///
/// A sharp segment is expressed as full tension rather than as a separate code
/// path, because full tension collapses the Hermite basis onto the plain chord
/// (see `cardinal_1d`). That lets the two per-direction tensions be *blended*
/// across the perpendicular axis, which is what keeps the surface continuous
/// where a smooth run borders a sharp one: the curve fades out toward the sharp
/// side instead of leaving a step in the mesh.
fn subdivide_grid(
    src: &[Vec<(f32, f32)>],
    smooth: &[Vec<bool>],
    tension: &[Vec<f32>],
    rows: usize,
    cols: usize,
    steps: usize,
) -> (Vec<Vec<(f32, f32)>>, usize, usize) {
    let out_rows = (rows - 1) * steps + 1;
    let out_cols = (cols - 1) * steps + 1;

    let mut out = Vec::with_capacity(out_rows);
    for oi in 0..out_rows {
        let (ci, fu) = locate(oi, steps, rows);
        let mut row = Vec::with_capacity(out_cols);
        for oj in 0..out_cols {
            let (cj, fv) = locate(oj, steps, cols);

            let top = segment_tension(smooth, tension, (ci, cj), (ci, cj + 1));
            let bottom = segment_tension(smooth, tension, (ci + 1, cj), (ci + 1, cj + 1));
            let row_tension = top + (bottom - top) * fu;

            let left = segment_tension(smooth, tension, (ci, cj), (ci + 1, cj));
            let right = segment_tension(smooth, tension, (ci, cj + 1), (ci + 1, cj + 1));
            let column_tension = left + (right - left) * fv;

            // Neither direction curves here, so take the exact bilinear result
            // rather than the arithmetically-equal-but-rounded spline one.
            row.push(if row_tension >= 1.0 && column_tension >= 1.0 {
                bilinear_cell(src, ci, cj, fu, fv)
            } else {
                cardinal_patch(
                    src,
                    rows,
                    cols,
                    ci,
                    cj,
                    fu,
                    fv,
                    row_tension,
                    column_tension,
                )
            });
        }
        out.push(row);
    }

    (out, out_rows, out_cols)
}

/// Tension governing the run between two adjacent control points. Both ends have
/// to be flagged smooth for the run to curve at all — one sharp end pins it to
/// the chord, the same way a sharp anchor pins a path segment in a vector editor.
fn segment_tension(
    smooth: &[Vec<bool>],
    tension: &[Vec<f32>],
    a: (usize, usize),
    b: (usize, usize),
) -> f32 {
    if smooth[a.0][a.1] && smooth[b.0][b.1] {
        (tension[a.0][a.1] + tension[b.0][b.1]) / 2.0
    } else {
        1.0
    }
}

/// Maps an output index onto (owning cell, local parameter). The last index of an
/// axis clamps back into the final cell at parameter 1.0 rather than running off
/// the end.
fn locate(idx: usize, steps: usize, count: usize) -> (usize, f32) {
    let cell = (idx / steps).min(count - 2);
    (cell, (idx - cell * steps) as f32 / steps as f32)
}

fn bilinear_cell(src: &[Vec<(f32, f32)>], ci: usize, cj: usize, fu: f32, fv: f32) -> (f32, f32) {
    let lerp = |a: (f32, f32), b: (f32, f32), t: f32| (a.0 + (b.0 - a.0) * t, a.1 + (b.1 - a.1) * t);
    let top = lerp(src[ci][cj], src[ci][cj + 1], fv);
    let bottom = lerp(src[ci + 1][cj], src[ci + 1][cj + 1], fv);
    lerp(top, bottom, fu)
}

/// Tensor-product Cardinal-spline evaluation over the 4x4 neighbourhood around
/// cell `(ci, cj)`, with the two axes damped independently: `row_tension` shapes
/// the curves running along the rows, `column_tension` the one that then blends
/// those curves down the columns. Either at 1.0 leaves that axis linear, so a
/// row-only or column-only smoothing request stays exactly that.
///
/// Neighbours are clamped at the grid edge (the conventional Catmull-Rom
/// endpoint duplication), and they're taken raw — a tangent may reach into a
/// sharp region, which only affects the curve's shape, not whether that
/// neighbouring run itself gets smoothed.
#[allow(clippy::too_many_arguments)]
fn cardinal_patch(
    src: &[Vec<(f32, f32)>],
    rows: usize,
    cols: usize,
    ci: usize,
    cj: usize,
    fu: f32,
    fv: f32,
    row_tension: f32,
    column_tension: f32,
) -> (f32, f32) {
    let at = |i: isize, j: isize| {
        let i = i.clamp(0, rows as isize - 1) as usize;
        let j = j.clamp(0, cols as isize - 1) as usize;
        src[i][j]
    };

    let column: [(f32, f32); 4] = std::array::from_fn(|n| {
        let i = ci as isize + n as isize - 1;
        let row: [(f32, f32); 4] = std::array::from_fn(|m| at(i, cj as isize + m as isize - 1));
        cardinal_point(row, fv, row_tension)
    });

    cardinal_point(column, fu, column_tension)
}

fn cardinal_point(p: [(f32, f32); 4], t: f32, tension: f32) -> (f32, f32) {
    (
        cardinal_1d([p[0].0, p[1].0, p[2].0, p[3].0], t, tension),
        cardinal_1d([p[0].1, p[1].1, p[2].1, p[3].1], t, tension),
    )
}

/// Cubic Hermite between `p[1]` and `p[2]`, with the Catmull-Rom tangents scaled
/// by `(1 - tension)` toward the plain chord. Hermite is linear in its tangents
/// and the chord-tangent case collapses to `(1 - t)p1 + t*p2`, so tension = 1.0
/// is exactly linear interpolation — that identity is what lets a fully damped
/// smooth mark reproduce the un-smoothed result.
fn cardinal_1d(p: [f32; 4], t: f32, tension: f32) -> f32 {
    let chord = p[2] - p[1];
    let scale = 1.0 - tension;
    let m1 = scale * 0.5 * (p[2] - p[0]) + tension * chord;
    let m2 = scale * 0.5 * (p[3] - p[1]) + tension * chord;

    let t2 = t * t;
    let t3 = t2 * t;
    let h00 = 2.0 * t3 - 3.0 * t2 + 1.0;
    let h10 = t3 - 2.0 * t2 + t;
    let h01 = -2.0 * t3 + 3.0 * t2;
    let h11 = t3 - t2;

    h00 * p[1] + h10 * m1 + h01 * p[2] + h11 * m2
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
            ..Default::default()
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
            ..Default::default()
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
            ..Default::default()
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
            ..Default::default()
        };
        let img = coordinate_image(10, 10);
        assert!(warp_mesh(&img, &mark).is_err());
    }

    /// A 3x3 grid with straight, evenly spaced columns but unevenly spaced rows
    /// (y = 10, 70, 100). Every cell is an axis-aligned rectangle, so bilinear
    /// and the two-triangle affine map agree exactly and any difference between
    /// a smoothed and un-smoothed warp is the spline, not a subdivision artefact.
    fn uneven_row_points() -> Vec<f32> {
        let ys = [10.0f32, 70.0, 100.0];
        let mut points = Vec::new();
        for y in ys {
            for j in 0..3 {
                points.push(10.0 + j as f32 * 40.0);
                points.push(y);
            }
        }
        points
    }

    #[test]
    fn no_smooth_points_is_identical_to_the_unsubdivided_warp() {
        let img = coordinate_image(120, 120);
        let plain = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_row_points(),
            ..Default::default()
        };
        let explicitly_sharp = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_row_points(),
            smooth: vec![false; 9],
            tension: vec![0.0; 9],
        };

        let a = warp_mesh(&img, &plain).expect("warp should succeed");
        let b = warp_mesh(&img, &explicitly_sharp).expect("warp should succeed");
        assert_eq!(a.dimensions(), b.dimensions());
        assert_eq!(a.as_raw(), b.as_raw(), "sharp marks must not be subdivided");
    }

    #[test]
    fn full_tension_degenerates_to_the_linear_warp() {
        let img = coordinate_image(120, 120);
        let sharp = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_row_points(),
            ..Default::default()
        };
        let damped = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_row_points(),
            smooth: vec![true; 9],
            tension: vec![1.0; 9],
        };

        let a = warp_mesh(&img, &sharp).expect("warp should succeed");
        let b = warp_mesh(&img, &damped).expect("warp should succeed");
        assert_eq!(a.dimensions(), b.dimensions());

        for (pa, pb) in a.pixels().zip(b.pixels()) {
            for ch in 0..2 {
                assert!(
                    (pa[ch] as i32 - pb[ch] as i32).abs() <= 1,
                    "tension 1.0 should match the linear warp: {pa:?} vs {pb:?}"
                );
            }
        }
    }

    #[test]
    fn smooth_points_bend_the_sampling_off_the_chord() {
        let img = coordinate_image(120, 120);
        let sharp = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_row_points(),
            ..Default::default()
        };
        let smooth = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_row_points(),
            smooth: vec![true; 9],
            tension: vec![0.0; 9],
        };

        let a = warp_mesh(&img, &sharp).expect("warp should succeed");
        let b = warp_mesh(&img, &smooth).expect("warp should succeed");
        assert_eq!(a.dimensions(), (80, 90));
        assert_eq!(b.dimensions(), (80, 90));

        // Halfway down the lower row band, away from the original grid lines.
        // The chord there samples y = 84.7; the spline, pulled by the tighter
        // spacing above, has to reach further down the source than that.
        let chord = a.get_pixel(20, 67);
        let spline = b.get_pixel(20, 67);
        assert!(
            spline[1] as i32 - chord[1] as i32 > 2,
            "expected the spline to sample below the chord: {chord:?} vs {spline:?}"
        );

        // Original grid lines are shared control points, so they still pin the
        // spline to exactly where the chord meets them.
        for (x, y) in [(0u32, 0u32), (40, 45), (79, 89)] {
            let chord = a.get_pixel(x, y);
            let spline = b.get_pixel(x, y);
            for ch in 0..2 {
                assert!(
                    (chord[ch] as i32 - spline[ch] as i32).abs() <= 1,
                    "control point moved at ({x}, {y}): {chord:?} vs {spline:?}"
                );
            }
        }
    }

    #[test]
    fn a_sharp_corner_pins_its_own_edges_while_the_region_beyond_smooths() {
        let img = coordinate_image(120, 120);
        let sharp = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_row_points(),
            ..Default::default()
        };
        // Only the top-left control point is sharp. Both runs leaving it — the
        // first segment of the top row and of the left column — therefore stay
        // straight chords, and the curve fades back in away from them.
        let mut flags = vec![true; 9];
        flags[0] = false;
        let mixed = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_row_points(),
            smooth: flags,
            tension: vec![0.0; 9],
        };

        let a = warp_mesh(&img, &sharp).expect("warp should succeed");
        let b = warp_mesh(&img, &mixed).expect("warp should succeed");

        // The two straight edges meeting at the sharp point (output x 0..40 of
        // the top edge, y 0..45 of the left edge) may not move at all.
        for (x, y) in [(0u32, 0u32), (10, 0), (30, 0), (0, 10), (0, 30)] {
            let pa = a.get_pixel(x, y);
            let pb = b.get_pixel(x, y);
            for ch in 0..2 {
                assert!(
                    (pa[ch] as i32 - pb[ch] as i32).abs() <= 1,
                    "sharp edge moved at ({x}, {y}): {pa:?} vs {pb:?}"
                );
            }
        }

        // The bottom-right region, smooth in both directions, still curves.
        let pa = a.get_pixel(60, 67);
        let pb = b.get_pixel(60, 67);
        assert!(
            pb[1] as i32 - pa[1] as i32 > 2,
            "smooth region should have bent: {pa:?} vs {pb:?}"
        );
    }

    /// Rows at y = 10, 70, 100 with evenly spaced columns, except the middle
    /// row's centre point sits at x = 25 instead of 50. That uneven spacing is
    /// what makes a spline through the row leave the chords a sharp warp
    /// follows, so smoothing the row shows up in the sampled source x.
    fn uneven_middle_row_points() -> Vec<f32> {
        let ys = [10.0f32, 70.0, 100.0];
        let mut points = Vec::new();
        for (i, y) in ys.iter().enumerate() {
            for j in 0..3 {
                points.push(if i == 1 && j == 1 {
                    25.0
                } else {
                    10.0 + j as f32 * 40.0
                });
                points.push(*y);
            }
        }
        points
    }

    /// The transpose of `uneven_middle_row_points`, for checking that column
    /// smoothing is decided as independently as row smoothing is.
    fn uneven_middle_column_points() -> Vec<f32> {
        let xs = [10.0f32, 70.0, 100.0];
        let mut points = Vec::new();
        for i in 0..3 {
            for (j, x) in xs.iter().enumerate() {
                points.push(*x);
                points.push(if j == 1 && i == 1 {
                    25.0
                } else {
                    10.0 + i as f32 * 40.0
                });
            }
        }
        points
    }

    /// The scenario that made the original all-four-corners rule unusable: at
    /// the 3x3 grid the UI encourages, every cell touches an outer corner, so
    /// requiring a whole cell to agree meant an interior row could never curve
    /// without also smoothing corners the user wants left alone.
    #[test]
    fn an_interior_smooth_row_curves_without_touching_the_outer_corners() {
        let img = coordinate_image(120, 120);
        let sharp = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_middle_row_points(),
            ..Default::default()
        };
        let mut flags = vec![false; 9];
        flags[3..6].fill(true);
        let row_smooth = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_middle_row_points(),
            smooth: flags,
            tension: vec![0.0; 9],
        };

        let a = warp_mesh(&img, &sharp).expect("warp should succeed");
        let b = warp_mesh(&img, &row_smooth).expect("warp should succeed");
        assert_eq!(a.dimensions(), (80, 95));
        assert_eq!(b.dimensions(), (80, 95));

        // On the smoothed row the spline pulls the sampled x well off the
        // chord, while y stays put: the curve lives along the row, not across
        // it, because no column run has both ends smooth.
        let chord = a.get_pixel(24, 47);
        let spline = b.get_pixel(24, 47);
        assert!(
            chord[0] as i32 - spline[0] as i32 > 2,
            "smoothed row should have bent: {chord:?} vs {spline:?}"
        );
        assert!(
            (chord[1] as i32 - spline[1] as i32).abs() <= 1,
            "row smoothing must not move sampling across the row: {chord:?} vs {spline:?}"
        );

        // The untouched top and bottom rows — which hold all four of the mark's
        // outer corner points — warp exactly as they did with nothing smoothed.
        for (x, y) in [(0u32, 0u32), (20, 0), (40, 0), (79, 0), (0, 94), (20, 94), (79, 94)] {
            let pa = a.get_pixel(x, y);
            let pb = b.get_pixel(x, y);
            for ch in 0..2 {
                assert!(
                    (pa[ch] as i32 - pb[ch] as i32).abs() <= 1,
                    "sharp row moved at ({x}, {y}): {pa:?} vs {pb:?}"
                );
            }
        }
    }

    #[test]
    fn an_interior_smooth_column_curves_without_touching_the_outer_corners() {
        let img = coordinate_image(120, 120);
        let sharp = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_middle_column_points(),
            ..Default::default()
        };
        let mut flags = vec![false; 9];
        for i in 0..3 {
            flags[i * 3 + 1] = true;
        }
        let column_smooth = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_middle_column_points(),
            smooth: flags,
            tension: vec![0.0; 9],
        };

        let a = warp_mesh(&img, &sharp).expect("warp should succeed");
        let b = warp_mesh(&img, &column_smooth).expect("warp should succeed");
        assert_eq!(a.dimensions(), (95, 80));
        assert_eq!(b.dimensions(), (95, 80));

        let chord = a.get_pixel(47, 24);
        let spline = b.get_pixel(47, 24);
        assert!(
            chord[1] as i32 - spline[1] as i32 > 2,
            "smoothed column should have bent: {chord:?} vs {spline:?}"
        );
        assert!(
            (chord[0] as i32 - spline[0] as i32).abs() <= 1,
            "column smoothing must not move sampling across the column: {chord:?} vs {spline:?}"
        );

        for (x, y) in [(0u32, 0u32), (0, 20), (0, 40), (0, 79), (94, 0), (94, 20), (94, 79)] {
            let pa = a.get_pixel(x, y);
            let pb = b.get_pixel(x, y);
            for ch in 0..2 {
                assert!(
                    (pa[ch] as i32 - pb[ch] as i32).abs() <= 1,
                    "sharp column moved at ({x}, {y}): {pa:?} vs {pb:?}"
                );
            }
        }
    }

    #[test]
    fn rejects_mismatched_smooth_or_tension_length() {
        let img = coordinate_image(120, 120);
        let bad_smooth = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_row_points(),
            smooth: vec![true; 4],
            tension: Vec::new(),
        };
        assert!(warp_mesh(&img, &bad_smooth).is_err());

        let bad_tension = GridMark {
            rows: 3,
            cols: 3,
            points: uneven_row_points(),
            smooth: Vec::new(),
            tension: vec![0.5; 4],
        };
        assert!(warp_mesh(&img, &bad_tension).is_err());
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
