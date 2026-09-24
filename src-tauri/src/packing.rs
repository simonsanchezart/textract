use binpack2d::{binpack::maxrects::Heuristic, maxrects::MaxRectsBin, Dimension};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Rect {
    x: i32,
    y: i32,
    width: i32,
    height: i32,
}

#[tauri::command]
pub async fn pack_images(
    img_rects: Vec<Rect>,
    target_rect_size: i32,
    padding: i32,
) -> Result<Vec<Rect>, String> {
    let mut bin = MaxRectsBin::new(target_rect_size, target_rect_size);
    let items: Vec<Dimension> = img_rects
        .iter()
        .enumerate()
        .map(|(id, rect)| {
            Dimension::with_id(id.try_into().unwrap(), rect.width, rect.height, padding)
        })
        .collect();

    let (mut placed, _) = bin.insert_list(&items, Heuristic::BottomLeftRule);
    placed.sort_by_key(|rect| rect.id());

    let packed_rects = placed
        .iter()
        .map(|rect| Rect {
            x: rect.x(),
            y: rect.y(),
            width: rect.dim().width(),
            height: rect.dim().height(),
        })
        .collect();

    Ok(packed_rects)
}
