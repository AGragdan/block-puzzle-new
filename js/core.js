import { BOARD_SIZE } from './layout.js';

let grid = [];

export function initBoard() {
    grid = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        const row = [];
        for (let c = 0; c < BOARD_SIZE; c++) row.push(0);
        grid.push(row);
    }
}

export function getGrid() { return grid; }

export function getCell(col, row) {
    if (col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE) return -1;
    return grid[row][col];
}

export function setCell(col, row, value) {
    if (col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE) return false;
    grid[row][col] = value;
    return true;
}

export function isEmpty(col, row) { return getCell(col, row) === 0; }

const NEIGHBORS = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
];

export function calcPlacementScore(cells) {
    const ownCells = new Set();
    for (const [c, r] of cells) ownCells.add(`${c},${r}`);

    const neighborSet = new Set();
    let base = 0;

    for (const [c, r] of cells) {
        base += 1;
        for (const [dc, dr] of NEIGHBORS) {
            const nc = c + dc;
            const nr = r + dr;
            if (nc < 0 || nc >= BOARD_SIZE || nr < 0 || nr >= BOARD_SIZE) continue;
            const key = `${nc},${nr}`;
            if (ownCells.has(key)) continue;
            if (grid[nr][nc] !== 0) neighborSet.add(key);
        }
    }

    const allCells = [];
    for (const [c, r] of cells) allCells.push({ col: c, row: r });
    for (const key of neighborSet) {
        const [c, r] = key.split(',').map(Number);
        allCells.push({ col: c, row: r });
    }

    return { score: base + neighborSet.size, cells: allCells };
}

export function findFullLines() {
    const rows = [];
    const cols = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        let full = true;
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (grid[r][c] === 0) { full = false; break; }
        }
        if (full) rows.push(r);
    }

    for (let c = 0; c < BOARD_SIZE; c++) {
        let full = true;
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (grid[r][c] === 0) { full = false; break; }
        }
        if (full) cols.push(c);
    }

    return { rows, cols };
}

export function wouldClearLines(shape, col, row) {
    const backup = [];
    for (const [dc, dr] of shape.cells) {
        const c = col + dc;
        const r = row + dr;
        if (c < 0 || c >= BOARD_SIZE || r < 0 || r >= BOARD_SIZE) continue;
        backup.push({ c, r, prev: grid[r][c] });
        grid[r][c] = 1;
    }
    const result = findFullLines();
    for (const b of backup) grid[b.r][b.c] = b.prev;
    return result;
}

export function clearLines(rows, cols) {
    const removed = new Set();
    for (const r of rows) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (grid[r][c] !== 0) {
                removed.add(`${c},${r}`);
                grid[r][c] = 0;
            }
        }
    }
    for (const c of cols) {
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (grid[r][c] !== 0) {
                removed.add(`${c},${r}`);
                grid[r][c] = 0;
            }
        }
    }
    return Array.from(removed).map(key => {
        const [c, r] = key.split(',').map(Number);
        return { col: c, row: r };
    });
}

export function canPlaceShape(shape, col, row) {
    for (const [dc, dr] of shape.cells) {
        const c = col + dc;
        const r = row + dr;
        if (c < 0 || c >= BOARD_SIZE || r < 0 || r >= BOARD_SIZE) return false;
        if (grid[r][c] !== 0) return false;
    }
    return true;
}

export function canPlaceAnywhere(shape) {
    if (shape.isHammer) return true; // молоток можно "поставить" всегда
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (canPlaceShape(shape, c, r)) return true;
        }
    }
    return false;
}

// ---------------- СЧЁТ ----------------

let totalScore = 0;
let bestScore = 0;
let comboLines = 0;

export function getTotalScore() { return totalScore; }
export function getBestScore() { return bestScore; }
export function getComboLines() { return comboLines; }

// Загрузка рекорда при старте
export function loadBestScore() {
    const saved = localStorage.getItem('blockPuzzleBest');
    if (saved) {
        bestScore = parseInt(saved, 10) || 0;
    }
}

// Сохранение рекорда
function saveBestScore() {
    localStorage.setItem('blockPuzzleBest', String(bestScore));
}

const SPECIAL_REWARDS = [
    { name: 'СУПЕР', points: 300 },
    { name: 'МЕГА', points: 500 },
    { name: 'УЛЬТРА', points: 1000 },
    { name: 'ПЕРФЕКТО', points: 3000 },
    { name: 'УЛЬТИМА', points: 5000 },
    { name: 'ТАНОС', points: 10000 },
];

export function awardPoints(cellsToPlace, linesCleared, removedCount) {
    const placement = calcPlacementScore(cellsToPlace);
    const base = placement.score + removedCount;
    const scoredCells = placement.cells;

    let multiplier = 1;
    let comboActive = false;
    let comboText = '';
    let bonusPoints = 0;

    let specialActive = false;
    let specialText = '';
    let specialPoints = 0;

    if (linesCleared > 0) {
        comboLines += linesCleared;
        multiplier = 1 + comboLines;
        comboActive = true;
        
        comboText = comboLines === linesCleared ? 'ЛИНИЯ' : 'КОМБО';
        bonusPoints = 100 * (comboLines - 1);

        if (comboLines >= 3) {
            const index = Math.min(comboLines - 3, SPECIAL_REWARDS.length - 1);
            const reward = SPECIAL_REWARDS[index];
            specialActive = true;
            specialText = reward.name;
            specialPoints = reward.points;
        }
    } else {
        comboLines = 0;
    }

    const gained = base * multiplier + bonusPoints + specialPoints;

    totalScore += gained;
    if (totalScore > bestScore) bestScore = totalScore;
    saveBestScore(); // <-- сохраняем при обновлении рекорда

    return {
        base, multiplier, gained, bonusPoints,
        specialActive, specialText, specialPoints,
        comboLines, comboActive, comboText,
        scoredCells, totalScore, bestScore,
    };
}

// ---------------- МОЛОТОК ----------------
let hasHammer = false;

export function getHasHammer() { return hasHammer; }
export function setHasHammer(value) { hasHammer = value; }

// Проверяет, есть ли хоть один ход (не считая молотка)
export function isGameStuck(queue) {
    for (const shape of queue) {
        if (shape.isHammer) continue;
        if (canPlaceAnywhere(shape)) return false;
    }
    return true;
}

// Очищает область 3x3
export function clearArea3x3(centerCol, centerRow) {
    const removed = [];
    for (let r = centerRow - 1; r <= centerRow + 1; r++) {
        for (let c = centerCol - 1; c <= centerCol + 1; c++) {
            if (c >= 0 && c < BOARD_SIZE && r >= 0 && r < BOARD_SIZE) {
                if (grid[r][c] !== 0) {
                    removed.push({ col: c, row: r, val: grid[r][c] });
                    grid[r][c] = 0;
                }
            }
        }
    }
    return removed;
}

export function fillTest() {
    for (let c = 0; c < BOARD_SIZE; c++) setCell(c, 0, 1);
}

// Проверка на конец игры (нет ходов и нет молотка)
export function isGameOver(queue) {
    // Если молоток есть - игра не окончена (можно использовать)
    if (hasHammer) return false;
    
    // Если хоть одна фигура встает - игра не окончена
    for (const shape of queue) {
        if (shape.isHammer) continue;
        if (canPlaceAnywhere(shape)) return false;
    }
    
    return true;
}

// Сброс игры
export function resetGame() {
    totalScore = 0;
    comboLines = 0;
    hasHammer = false;
    initBoard(); // Пересоздаем поле
}