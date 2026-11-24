import { Container, Graphics } from '../libs/pixi.min.mjs';
import { app, drawBoard, drawQueue } from './render.js';
import { initBoard, setCell, getGrid } from './core.js';
import { initQueue, getQueue } from './pieces.js';
import { getCurrentTheme } from './theme.js';

// ---------- Стартовая сцена ----------
// 1 — заполнено, 0 — пусто. Цвета берутся из палитры темы.
const INTRO_BOARD = [
    [0,1,1,1,0,0,0,0],
    [0,0,1,0,0,0,1,0],
    [0,0,0,1,0,0,1,0],
    [1,1,1,1,0,0,1,1],
    [1,0,0,0,0,0,0,0],
    [0,1,0,0,1,1,1,1],
    [0,1,1,1,0,1,0,0],
    [1,1,1,0,0,0,0,0],
];

const INTRO_QUEUE = [
    { cells: [[0,0],[1,0],[0,1],[1,1]], colorIndex: 0 }, // квадрат 2×2
    { cells: [[0,0],[1,0],[2,0],[2,1]], colorIndex: 1 }, // «П» 3×2
    { cells: [[0,0],[1,0],[2,0],[3,0]], colorIndex: 2 }, // линия 4
];

const INTRO_KEY = 'blockPuzzleIntroDone';

let introActive = false;

function isIntroDone() {
    return localStorage.getItem(INTRO_KEY) === '1';
}

function markIntroDone() {
    localStorage.setItem(INTRO_KEY, '1');
}

// Инициализация сцены: либо стартовая (если ещё не пройдена), либо обычная.
// Возвращает true, если применена стартовая сцена.
export function initScene() {
    if (isIntroDone()) {
        initBoard();
        initQueue();
        introActive = false;
        return false;
    }

    // Заполняем поле сценой
    initBoard();
    for (let r = 0; r < INTRO_BOARD.length; r++) {
        for (let c = 0; c < INTRO_BOARD[r].length; c++) {
            if (INTRO_BOARD[r][c]) {
                // Группируем цвета: цвет зависит от «фигуры», к которой относится клетка.
                // Простое правило: по (c + r) % 6, чтобы соседние клетки часто совпадали.
                setCell(c, r, ((c * 3 + r * 2) % 6) + 1);
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

// Проверка: все ли стартовые фигуры разыграны (их больше нет в ленте).
// Вызывать после каждого хода.
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

// Заглушки для совместимости с drag.js (интро больше не блокирует игру)
export function getIntroTarget() { return null; }
export function onIntroDragStart() {}
export function onIntroReturned() {}
export function onIntroPlaced() { return false; }