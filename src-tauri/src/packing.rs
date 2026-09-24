use binpack2d::{bin_new, BinType, Dimension};
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

// check these : https://docs.rs/binpack2d/latest/binpack2d/binpack/maxrects/enum.Heuristic.html
// bug: doesn't work properly with overlapping images before packing
#[tauri::command]
pub async fn pack_images(img_rects: Vec<Rect>, target_rect: Rect) -> Result<Vec<Rect>, String> {
    let mut bin = bin_new(BinType::MaxRects, target_rect.width, target_rect.height);
    let items: Vec<Dimension> = img_rects
        .iter()
        .enumerate()
        .map(|(id, rect)| Dimension::with_id(id.try_into().unwrap(), rect.width, rect.height, 0))
        .collect();

    let (mut placed, _) = bin.insert_list(&items);
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
