import { getGrid } from './core.js';
import { BOARD_SIZE } from './layout.js';

function rotate90(cells) {
    let minX = Infinity, minY = Infinity;
    const rotated = cells.map(([x, y]) => {
        const nx = y;
        const ny = -x;
        if (nx < minX) minX = nx;
        if (ny < minY) minY = ny;
        return [nx, ny];
    });
    return rotated.map(([x, y]) => [x - minX, y - minY]);
}

function getRotations(cells) {
    const variants = [];
    let current = cells;
    const seen = new Set();
    for (let i = 0; i < 4; i++) {
        const key = current.map(c => c.join(',')).sort().join('|');
        if (!seen.has(key)) {
            seen.add(key);
            variants.push(current);
        }
        current = rotate90(current);
    }
    return variants;
}

const BASE_SHAPES = {
    dot: [[0,0]],
    line2: [[0,0],[1,0]],
    line3: [[0,0],[1,0],[2,0]],
    line4: [[0,0],[1,0],[2,0],[3,0]],
    line5: [[0,0],[1,0],[2,0],[3,0],[4,0]],
    diag2: [[0,0],[1,1]],
    diag3: [[0,0],[1,1],[2,2]],
    diag4: [[0,0],[1,1],[2,2],[3,3]],
    square2: [[0,0],[1,0],[0,1],[1,1]],
    square3: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],
    rect23: [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
    cross: [[1,0],[0,1],[1,1],[2,1],[1,2]],
    L4: [[0,0],[0,1],[0,2],[1,2]],
    L5: [[0,0],[0,1],[0,2],[1,0],[2,0]],
    T5: [[0,0],[1,0],[2,0],[1,1],[1,2]],
    P5: [[0,0],[1,0],[2,0],[0,1],[2,1]],
    corner3: [[0,0],[0,1],[1,1]],
    complex6: [[0,0],[0,1],[0,2],[1,0],[1,1],[2,0]],
    complex8: [[1,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2],[1,3]],
    
    // НОВЫЕ ФИГУРЫ
    T4: [[1,0],[0,1],[1,1],[2,1]], // Т-образная из 4 клеток (ножка вверх)
    rect24: [[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1]], // 4x2
    complex12: [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2],[2,2],[3,2],[0,3],[1,3],[2,3],[3,3]], // 1,1,0,0 / 1,1,0,0 / 1,1,1,1 / 1,1,1,1
    S4: [[0,0],[0,1],[1,1],[1,2]], // Зигзаг из 4 клеток
};

const SHAPES = [];
function addShape(cells, wEmpty, wMid, wFull) { SHAPES.push({ cells, wEmpty, wMid, wFull }); }
function addRotations(cells, wEmpty, wMid, wFull) {
    for (const rot of getRotations(cells)) addShape(rot, wEmpty, wMid, wFull);
}

addShape(BASE_SHAPES.dot, 1, 10, 30);
addRotations(BASE_SHAPES.line2, 5, 15, 25);
addRotations(BASE_SHAPES.line3, 10, 15, 20);
addRotations(BASE_SHAPES.line4, 15, 10, 10);
addRotations(BASE_SHAPES.line5, 20, 5, 3);
addRotations(BASE_SHAPES.diag2, 5, 12, 15);
addRotations(BASE_SHAPES.diag3, 10, 10, 10);
addRotations(BASE_SHAPES.diag4, 12, 5, 3);
addShape(BASE_SHAPES.square2, 15, 15, 10);
addShape(BASE_SHAPES.square3, 10, 2, 1);
addRotations(BASE_SHAPES.rect23, 10, 5, 2);
addShape(BASE_SHAPES.cross, 10, 8, 5);
addRotations(BASE_SHAPES.L4, 10, 8, 5);
addRotations(BASE_SHAPES.L5, 12, 6, 2);
addRotations(BASE_SHAPES.T5, 10, 5, 2);
addRotations(BASE_SHAPES.P5, 10, 4, 2);
addRotations(BASE_SHAPES.corner3, 5, 10, 15);
addRotations(BASE_SHAPES.complex6, 12, 4, 1);
addRotations(BASE_SHAPES.complex8, 15, 2, 1);

// Добавляем новые
addRotations(BASE_SHAPES.T4, 10, 8, 4);
addRotations(BASE_SHAPES.rect24, 12, 4, 1);
addRotations(BASE_SHAPES.complex12, 15, 2, 1);
addRotations(BASE_SHAPES.S4, 10, 8, 5);

let queue = [];
let nextId = 1;
const QUEUE_MAX = 3;

export const HAMMER_SHAPE = {
    id: -1,
    cells: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],
    colorIndex: 0,
    isHammer: true,
};

function getFillRatio() {
    const grid = getGrid();
    let filled = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (grid[r][c] !== 0) filled++;
        }
    }
    return filled / (BOARD_SIZE * BOARD_SIZE);
}

function pickShape() {
    const fill = getFillRatio();
    let zone = 1;
    let blend = 0;

    if (fill <= 0.3) { zone = 0; blend = fill / 0.3; }
    else if (fill >= 0.7) { zone = 2; blend = (fill - 0.7) / 0.3; }
    else { zone = 1; blend = 0; }

    const weights = SHAPES.map(s => {
        let w1, w2;
        if (zone === 0) { w1 = s.wEmpty; w2 = s.wMid; }
        else if (zone === 1) { return s.wMid; }
        else { w1 = s.wMid; w2 = s.wFull; }
        return w1 + (w2 - w1) * blend;
    });

    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let chosen = SHAPES[0];

    for (let i = 0; i < SHAPES.length; i++) {
        roll -= weights[i];
        if (roll <= 0) { chosen = SHAPES[i]; break; }
    }

    return {
        id: nextId++,
        cells: chosen.cells,
        colorIndex: Math.floor(Math.random() * 5),
    };
}

export function initQueue() {
    queue = [];
    nextId = 1;
    while (queue.length < QUEUE_MAX) queue.push(pickShape());
}

export function getQueue() { return queue; }
export function getAt(index) { return queue[index]; }

export function removeAt(index) {
    queue.splice(index, 1);
    while (queue.length < QUEUE_MAX) queue.push(pickShape());
}

export function replaceWithHammer(index) {
    if (index >= 0 && index < queue.length) {
        queue[index] = { ...HAMMER_SHAPE, id: nextId++ };
    }
}

export function resetQueue() {
    initQueue(); // Просто пересоздаем очередь
}