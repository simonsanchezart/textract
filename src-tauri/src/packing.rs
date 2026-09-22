use max_rects::{bucket::Bucket, max_rects::MaxRects, packing_box::PackingBox, visualizer};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Rect {
    x: i32,
    y: i32,
    width: i32,
    height: i32,
}

// todo: for mark canvas, target box should be client rect of transformer
// todo: for atlas canvas, if no selection, target box is canvas
// todo: for atlas canvas, if selection, target box is client rect of transformer

#[tauri::command]
pub async fn pack_images(img_rects: Vec<Rect>, target_rect: Rect) -> Result<i32, String> {
    let bins = vec![Bucket::new(
        target_rect.width,
        target_rect.height,
        target_rect.x,
        target_rect.y,
        0,
    )];
    let boxes: Vec<PackingBox> = img_rects.iter().map(|rect| {
        PackingBox::new(rect.width, rect.height)
    }).collect();
    println!("{:?}", target_rect);
    println!("{:?}", boxes);

    let mut pack_problem = MaxRects::new(boxes, bins.clone());
    let (placed, _, _) = pack_problem.place();

    println!("{:?}", placed);
    visualizer::generate_visualization(&placed, &bins);
    Ok(1)
}
