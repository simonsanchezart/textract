use image::{open, GenericImage, RgbaImage};
use imageproc::geometric_transformations::{warp, Interpolation, Projection};
use path_clean::PathClean;
use std::env;

use nalgebra::{DMatrix, DVector, Matrix3};

fn order_quad(points: &[(f64, f64); 4]) -> [(f64, f64); 4] {
    let cx = points.iter().map(|p| p.0).sum::<f64>() / 4.0;
    let cy = points.iter().map(|p| p.1).sum::<f64>() / 4.0;

    let mut pts = points.clone();
    pts.sort_by(|a, b| {
        let aa = (a.1 - cy).atan2(a.0 - cx);
        let bb = (b.1 - cy).atan2(b.0 - cx);
        aa.partial_cmp(&bb).unwrap()
    });

    // rotate so first point is top-left
    let idx = pts
        .iter()
        .enumerate()
        .min_by(|(_, a), (_, b)| (a.0 + a.1).partial_cmp(&(b.0 + b.1)).unwrap())
        .unwrap()
        .0;

    pts.rotate_left(idx);
    pts
}

fn quad_dimensions(q: &[(f64, f64); 4]) -> (f64, f64) {
    let dist = |a: (f64, f64), b: (f64, f64)| ((a.0 - b.0).powi(2) + (a.1 - b.1).powi(2)).sqrt();

    let width = (dist(q[0], q[1]) + dist(q[2], q[3])) * 0.5;
    let height = (dist(q[1], q[2]) + dist(q[3], q[0])) * 0.5;

    (width, height)
}

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

// #[tauri::command]
// fn print_points(img_url: String, points: Vec<i32>) {
//     println!("{}", img_url);
//     for number in &points {
//         println!("{}", number);
//     }
// }

#[tauri::command]
fn transform_image(img_url: String, points: Vec<f64>) -> Result<String, String> {
    // let p0 = (168., 740.);
    // let p1 = (160., 670.);
    // let p2 = (243., 660.);
    // let p3 = (255., 730.);

    let p0 = (points[0], points[1]);
    let p1 = (points[2], points[3]);
    let p2 = (points[4], points[5]);
    let p3 = (points[6], points[7]);
    // println!("{:?} -> {:?}", p0, p0_a);
    // println!("{:?} -> {:?}", p1, p1_a);
    // println!("{:?} -> {:?}", p2, p2_a);
    // println!("{:?} -> {:?}", p3, p3_a);
    // Ok(())

    let src = order_quad(&[p0, p1, p2, p3]);
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

    let img = open(img_url).unwrap().into_rgba8();

    let mut result: RgbaImage = warp(
        &img,
        &proj,
        Interpolation::Bilinear,
        image::Rgba([0, 0, 0, 0]),
    );

    let a = result.sub_image(0, 0, width as u32, height as u32);
    let _ = a.to_image().save("../output.png");

    let absolute_output = env::current_dir()
        .map_err(|e| e.to_string())?
        .join("../output.png")
        .clean();
    Ok(absolute_output.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![transform_image,])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
