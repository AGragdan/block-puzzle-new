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

// Может ли фигура закрыть хотя бы одну линию на текущем поле (в любой позиции)
export function shapeCanClearLine(shape) {
    if (!shape || shape.isHammer) return false;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (!canPlaceShape(shape, c, r)) continue;
            const { rows, cols } = wouldClearLines(shape, c, r);
            if (rows.length + cols.length > 0) return true;
        }
    }
    return false;
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
    if (shape.isHammer) return true;
    for (const [dc, dr] of shape.cells) {
        const c = col + dc;
        const r = row + dr;
        if (c < 0 || c >= BOARD_SIZE || r < 0 || r >= BOARD_SIZE) return false;
        if (grid[r][c] !== 0) return false;
    }
    return true;
}

export function canPlaceAnywhere(shape) {
    if (shape.isHammer) return true;
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

export function loadBestScore() {
    const saved = localStorage.getItem('blockPuzzleBest');
    if (saved) {
        bestScore = parseInt(saved, 10) || 0;
    }
}

function saveBestScore() {
    localStorage.setItem('blockPuzzleBest', String(bestScore));
}

export const SPECIAL_REWARDS = [
    { name: 'СУПЕР',    points: 100 },    // comboLines = 3
    { name: 'МЕГА',     points: 200 },    // comboLines = 4
    { name: 'УЛЬТРА',   points: 500 },    // comboLines = 5
    { name: 'ХИТ',      points: 1000 },   // comboLines = 6
    { name: 'ПЕРФЕКТО', points: 3000 },   // comboLines = 7
    { name: 'УЛЬТИМА',  points: 5000 },   // comboLines = 8
    { name: 'РЕКОРД',   points: 10000 },  // comboLines = 9
    { name: 'ТАНОС',    points: 50000 },  // comboLines = 10+
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
        bonusPoints = 10 * (comboLines - 1);

        if (comboLines >= 3) {
            const index = comboLines;
            const reward = SPECIAL_REWARDS[index - 3];
            specialActive = true;
            specialText = reward.name;
            specialPoints = reward.points;
            console.log(reward.points);
            
        }
    } else {
        comboLines = 0;
    }

    const gained = base * multiplier + bonusPoints + specialPoints; // <-- ВОТ ЗДЕСЬ

    totalScore += gained;
    if (totalScore > bestScore) {
        bestScore = totalScore;
        saveBestScore();
    }

    return {
        base,
        multiplier,
        gained,
        bonusPoints,
        specialActive,
        specialText,
        specialPoints,
        comboLines,
        comboActive,
        comboText,
        scoredCells,
        totalScore,
        bestScore,
    };
}

// ---------------- МОЛОТОК ----------------
let hasHammer = false;

export function getHasHammer() { return hasHammer; }
export function setHasHammer(value) { hasHammer = value; }

export function isGameStuck(queue) {
    for (const shape of queue) {
        if (shape.isHammer) continue;
        if (canPlaceAnywhere(shape)) return false;
    }
    return true;
}

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

// ---------------- КОНЕЦ ИГРЫ ----------------
export function isGameOver(queue) {
    if (hasHammer) return false;

    for (const shape of queue) {
        if (shape.isHammer) continue;
        if (canPlaceAnywhere(shape)) return false;
    }

    return true;
}

export function resetGame() {
    totalScore = 0;
    comboLines = 0;
    hasHammer = false;
    initBoard();
}

// ---------------- СПАСЕНИЕ ИГРЫ ----------------
export function findRescueCells(queue) {
    // 1. Собираем фигуры из очереди (без молотка)
    const shapes = queue.filter(s => !s.isHammer);
    if (shapes.length === 0) return [];

    // 2. Создаём "виртуальное" пустое поле
    const tempGrid = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        tempGrid.push(new Array(BOARD_SIZE).fill(0));
    }

    // 3. Пытаемся разместить каждую фигуру на пустом поле
    const placements = []; // { shape, col, row, cells: [{col, row}] }

    for (const shape of shapes) {
        let placed = false;

        // Пробуем много раз, чтобы найти место (на пустом поле всегда есть)
        for (let attempt = 0; attempt < 100 && !placed; attempt++) {
            // Случайная позиция
            const maxC = BOARD_SIZE - Math.max(...shape.cells.map(c => c[0])) - 1;
            const maxR = BOARD_SIZE - Math.max(...shape.cells.map(c => c[1])) - 1;
            if (maxC < 0 || maxR < 0) continue;

            const col = Math.floor(Math.random() * (maxC + 1));
            const row = Math.floor(Math.random() * (maxR + 1));

            // Проверяем, что все клетки свободны в tempGrid
            let canPlace = true;
            const cells = [];
            for (const [dc, dr] of shape.cells) {
                const c = col + dc;
                const r = row + dr;
                if (c < 0 || c >= BOARD_SIZE || r < 0 || r >= BOARD_SIZE) {
                    canPlace = false;
                    break;
                }
                if (tempGrid[r][c] !== 0) {
                    canPlace = false;
                    break;
                }
                cells.push({ col: c, row: r });
            }

            if (canPlace) {
                // Ставим фигуру на виртуальное поле
                for (const cell of cells) {
                    tempGrid[cell.row][cell.col] = 1;
                }
                placements.push({ shape, col, row, cells });
                placed = true;
            }
        }

        if (!placed) {
            // Не смогли разместить (маловероятно на пустом поле)
            return [];
        }
    }

    // 4. Теперь у нас есть placements — три фигуры на виртуальном поле.
    //    Собираем все клетки, которые они занимают.
    const cellsToClear = new Set();
    for (const p of placements) {
        for (const cell of p.cells) {
            cellsToClear.add(`${cell.col},${cell.row}`);
        }
    }

    // 5. Проходим по реальному полю и собираем клетки, которые надо очистить
    const rescued = [];
    for (const key of cellsToClear) {
        const [c, r] = key.split(',').map(Number);
        if (grid[r][c] !== 0) {
            rescued.push({ col: c, row: r, val: grid[r][c] });
            grid[r][c] = 0; // Очищаем сразу
        }
    }

    return rescued;
}

export function fillTest() {
    for (let c = 0; c < BOARD_SIZE; c++) setCell(c, 0, 1);
    setCell(3, 4, 2);
    setCell(4, 4, 2);
}