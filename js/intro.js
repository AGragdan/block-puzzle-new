import { Container, Graphics } from '../libs/pixi.min.mjs';
import { app, drawBoard, drawQueue } from './render.js';
import { initBoard, setCell, getGrid } from './core.js';
import { initQueue, getQueue } from './pieces.js';
import { getCurrentTheme } from './theme.js';

// ---------- Стартовая сцена ----------
// 1 — заполнено (голубой), 0 — пусто.
const INTRO_BOARD = [
    [0,0,1,0,0,1,0,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,1,1,1,1,0,0],
    [0,0,1,0,0,1,0,0],
    [0,0,1,0,0,1,0,0],
];

// Три квадрата 3×3, цвет — «красный» из палитры (colorIndex = 5 → 0xEF5350 в paper)
const INTRO_QUEUE = [
    { cells: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]], colorIndex: 5 },
    { cells: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]], colorIndex: 5 },
    { cells: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]], colorIndex: 5 },
];

const INTRO_KEY = 'blockPuzzleIntroDone';

let introActive = false;

function isIntroDone() {
    return localStorage.getItem(INTRO_KEY) === '1';
}

function markIntroDone() {
    localStorage.setItem(INTRO_KEY, '1');
}

export function initScene() {
    if (isIntroDone()) {
        initBoard();
        initQueue();
        introActive = false;
        return false;
    }

    // Заполняем поле сценой (все блоки голубые — colorIndex 2 → val 3)
    initBoard();
    for (let r = 0; r < INTRO_BOARD.length; r++) {
        for (let c = 0; c < INTRO_BOARD[r].length; c++) {
            if (INTRO_BOARD[r][c]) {
                setCell(c, r, 3); // 3 → palette[2] = голубой
            }
        }
    }

    // Заполняем ленту сценой
    const q = getQueue();
    q.length = 0;
    let id = 1;
    for (const s of INTRO_QUEUE) {
        q.push({
            id: id++,
            cells: s.cells,
            colorIndex: s.colorIndex,
            isIntro: true,
        });
    }

    introActive = true;

    drawBoard();
    drawQueue();
    return true;
}

export function checkIntroComplete() {
    if (!introActive) return;
    const q = getQueue();
    const stillHasIntro = q.some(s => s.isIntro);
    if (!stillHasIntro) {
        introActive = false;
        markIntroDone();
    }
}

export function isIntroActive() { return introActive; }

export function getIntroTarget() { return null; }
export function onIntroDragStart() {}
export function onIntroReturned() {}
export function onIntroPlaced() { return false; }