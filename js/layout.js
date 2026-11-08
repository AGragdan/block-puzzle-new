export const BOARD_SIZE = 8;
export const QUEUE_SLOTS = 3;

const layout = {
    screenW: 0,
    screenH: 0,
    cellSize: 0,
    boardX: 0,
    boardY: 0,
    boardPixelSize: 0,
    queueY: 0,
    queueCellSize: 0,
};

export function updateLayout(w, h) {
    layout.screenW = w;
    layout.screenH = h;

    const maxByW = w * 0.9;
    const maxByH = h * 0.5;   // было 0.55 — чуть меньше, чтобы освободить место сверху
    layout.boardPixelSize = Math.min(maxByW, maxByH);
    layout.cellSize = layout.boardPixelSize / BOARD_SIZE;

    layout.boardX = (w - layout.boardPixelSize) / 2;
    layout.boardY = h * 0.16//б   0.08 — сдвинули поле вниз

    layout.queueY = layout.boardY + layout.boardPixelSize + h * 0.05;
    layout.queueCellSize = layout.cellSize * 0.6;

    return layout;
}

export function getLayout() {
    return layout;
}

export function cellToPixel(col, row) {
    return {
        x: layout.boardX + col * layout.cellSize,
        y: layout.boardY + row * layout.cellSize,
    };
}

export function pixelToCell(x, y) {
    const col = Math.floor((x - layout.boardX) / layout.cellSize);
    const row = Math.floor((y - layout.boardY) / layout.cellSize);
    return { col, row };
}