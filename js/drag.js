import { Graphics } from 'https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.mjs';
import { app, queueLayer, drawHighlight, clearHighlight, getShapeColor, getCellColor, drawQueue } from './render.js';
import { getLayout, pixelToCell, BOARD_SIZE, QUEUE_SLOTS } from './layout.js';
import { getAt, removeAt, getQueue, replaceWithHammer } from './pieces.js';
import { getCell, setCell, findFullLines, clearLines, awardPoints, wouldClearLines, getHasHammer, setHasHammer, isGameStuck, clearArea3x3, getComboLines } from './core.js';
import { blockDie, floatText, addTextToQueue, flashCells, screenShake, screenFlash, burstParticles, shockwave } from './effects.js';
import { getCurrentTheme } from './theme.js';
import { EFFECTS } from './settings_effects/index.js';
import { isGameOverVisible } from './ui.js';

let ghost = null;
let dragging = false;
let returning = false;
let dragIndex = -1;
let dragShape = null;

let ghostScale = 1;
let ghostTargetScale = 1;

let rising = false;
let riseStartX = 0;
let riseStartY = 0;
let riseStartScale = 0;
let riseTargetX = 0;
let riseTargetY = 0;
let riseStartTime = 0;

let pointerX = 0;
let pointerY = 0;

const LIFT = 60;
const RETURN_DURATION = 200;
const RISE_DURATION = 120;

function canPlace(shape, col, row) {
    if (shape.isHammer) return true;
    for (const [dc, dr] of shape.cells) {
        const c = col + dc;
        const r = row + dr;
        if (c < 0 || c >= BOARD_SIZE || r < 0 || r >= BOARD_SIZE) return false;
        if (getCell(c, r) !== 0) return false;
    }
    return true;
}

function createGhost(shape, cellSize, color) {
    const g = new Graphics();
    if (shape.isHammer) {
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                g.roundRect(c * cellSize + 2, r * cellSize + 2, cellSize - 4, cellSize - 4, 6);
                g.fill(0x555555);
            }
        }
        const size = cellSize * 3;
        g.roundRect(size * 0.4, size * 0.3, size * 0.2, size * 0.6, size * 0.1);
        g.fill(0x8B4513);
        g.roundRect(size * 0.1, size * 0.1, size * 0.8, size * 0.3, size * 0.1);
        g.fill(0xffaa00);
        g.roundRect(size * 0.15, size * 0.12, size * 0.7, size * 0.08, size * 0.04);
        g.fill({ color: 0xffffff, alpha: 0.5 });
    } else {
        for (const [c, r] of shape.cells) {
            g.roundRect(c * cellSize + 2, r * cellSize + 2, cellSize - 4, cellSize - 4, 6);
            g.fill(color);
        }
    }
    g.alpha = 0.9;
    return g;
}

function getShapePixelSize(shape, cellSize) {
    if (shape.isHammer) return { w: 3 * cellSize, h: 3 * cellSize };
    let maxC = 0, maxR = 0;
    for (const [c, r] of shape.cells) {
        if (c > maxC) maxC = c;
        if (r > maxR) maxR = r;
    }
    return { w: (maxC + 1) * cellSize, h: (maxR + 1) * cellSize };
}

function getQueueSlotTransform(index, shape) {
    const l = getLayout();
    const slotW = l.boardPixelSize / QUEUE_SLOTS;
    const cell = l.queueCellSize;
    const centerX = l.boardX + slotW * index + slotW / 2;
    const centerY = l.queueY + cell * 2;
    const scale = cell / l.cellSize;
    return { x: centerX, y: centerY, scale };
}

function getSlotIndex(x, y) {
    const l = getLayout();
    if (y < l.queueY - l.cellSize * 0.5) return -1;
    if (y > l.queueY + l.cellSize * 4) return -1;
    const slotW = l.boardPixelSize / QUEUE_SLOTS;
    const relX = x - l.boardX;
    if (relX < 0 || relX > l.boardPixelSize) return -1;
    const index = Math.floor(relX / slotW);
    if (index < 0 || index >= QUEUE_SLOTS) return -1;
    return index;
}

function getGhostPos(px, py) {
    const l = getLayout();
    const { w, h } = getShapePixelSize(dragShape, l.cellSize);
    return { x: px - w / 2, y: py - h - LIFT };
}

function getGhostCell() {
    if (!ghost) return { col: 0, row: 0 };
    const l = getLayout();
    const { w } = getShapePixelSize(dragShape, l.cellSize);
    
    if (dragShape.isHammer) {
        const cellX = Math.floor((ghost.x + w/2 - l.boardX) / l.cellSize);
        const cellY = Math.floor((ghost.y + w/2 - l.boardY) / l.cellSize);
        return { col: cellX - 1, row: cellY - 1 };
    }

    // Базовые координаты (по левому верхнему углу)
    let baseCol = Math.floor((ghost.x - l.boardX) / l.cellSize);
    let baseRow = Math.floor((ghost.y - l.boardY) / l.cellSize);

    // Если фигура влезает — отлично
    if (canPlace(dragShape, baseCol, baseRow)) {
        return { col: baseCol, row: baseRow };
    }

    // Иначе ищем ближайшую свободную позицию в радиусе 1 клетки
    let bestCol = baseCol;
    let bestRow = baseRow;
    let minDist = Infinity;

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const testCol = baseCol + dc;
            const testRow = baseRow + dr;
            if (canPlace(dragShape, testCol, testRow)) {
                // Вычисляем расстояние от центра фигуры до центра этой клетки
                const targetX = l.boardX + testCol * l.cellSize + w / 2;
                const targetY = l.boardY + testRow * l.cellSize + w / 2; // грубо
                const dx = (ghost.x + w/2) - targetX;
                const dy = (ghost.y + w/2) - targetY;
                const dist = dx*dx + dy*dy;
                if (dist < minDist) {
                    minDist = dist;
                    bestCol = testCol;
                    bestRow = testRow;
                }
            }
        }
    }

    return { col: bestCol, row: bestRow };
}

function updateHighlight() {
    if (!dragShape || !ghost || rising) {
        clearHighlight();
        return;
    }
    const { col, row } = getGhostCell();
    
    if (dragShape.isHammer) {
        drawHighlight(dragShape, col + 1, row + 1, 'valid');
        return;
    }

    const overBoard = col > -BOARD_SIZE && col < BOARD_SIZE * 2
                   && row > -BOARD_SIZE && row < BOARD_SIZE * 2;
    if (!overBoard) {
        clearHighlight();
        return;
    }
    const valid = canPlace(dragShape, col, row);
    if (!valid) {
        drawHighlight(dragShape, col, row, 'invalid');
        return;
    }
    const { rows, cols } = wouldClearLines(dragShape, col, row);
    const willClear = rows.length > 0 || cols.length > 0;
    if (willClear) drawHighlight(dragShape, col, row, 'line', { rows, cols });
    else drawHighlight(dragShape, col, row, 'valid');
}

function animateReturn(onDone) {
    if (!ghost) return;
    returning = true;
    const l = getLayout();
    const startX = ghost.x;
    const startY = ghost.y;
    const startScale = ghostScale;
    const target = getQueueSlotTransform(dragIndex, dragShape);
    const startTime = performance.now();
    const { w, h } = getShapePixelSize(dragShape, l.cellSize);
    const endX = target.x - (w * target.scale) / 2;
    const endY = target.y - (h * target.scale) / 2;
    const endScale = target.scale;

    const tick = () => {
        if (!returning) return;
        const t = Math.min((performance.now() - startTime) / RETURN_DURATION, 1);
        const e = 1 - Math.pow(1 - t, 3);
        const s = startScale + (endScale - startScale) * e;
        ghostScale = s;
        ghost.scale.x = s;
        ghost.scale.y = s;
        ghost.x = startX + (endX - startX) * e;
        ghost.y = startY + (endY - startY) * e;
        if (t < 1) requestAnimationFrame(tick);
        else { returning = false; onDone(); }
    };
    requestAnimationFrame(tick);
}

function startRise() {
    if (!ghost || !dragShape) return;
    rising = true;
    riseStartTime = performance.now();
    riseStartX = ghost.x;
    riseStartY = ghost.y;
    riseStartScale = ghostScale;
    const pos = getGhostPos(pointerX, pointerY);
    riseTargetX = pos.x;
    riseTargetY = pos.y;
}

function animateRise() {
    if (!rising || !ghost) return;
    const t = Math.min((performance.now() - riseStartTime) / RISE_DURATION, 1);
    const e = 1 - Math.pow(1 - t, 3);
    ghost.x = riseStartX + (riseTargetX - riseStartX) * e;
    ghost.y = riseStartY + (riseTargetY - riseStartY) * e;
    const s = riseStartScale + (1 - riseStartScale) * e;
    ghostScale = s;
    ghost.scale.x = s;
    ghost.scale.y = s;
    if (t >= 1) {
        rising = false;
        updateHighlight();
    }
}

function animateGhost() {
    if (!ghost) return;
    if (rising) { animateRise(); return; }
    ghostScale += (ghostTargetScale - ghostScale) * 0.25;
    ghost.scale.x = ghostScale;
    ghost.scale.y = ghostScale;
}

export function initDrag(onPlaced) {
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.ticker.add(animateGhost);

    app.stage.on('pointerdown', (e) => {
        if (isGameOverVisible()) return;
        if (dragging || returning) return;

        const queue = getQueue();
        if (getHasHammer() && isGameStuck(queue) && !queue[0].isHammer) {
            replaceWithHammer(0);
            drawQueue();
        }

        const index = getSlotIndex(e.global.x, e.global.y);
        if (index < 0) return;
        const shape = getAt(index);
        if (!shape) return;

        dragging = true;
        dragIndex = index;
        dragShape = shape;
        pointerX = e.global.x;
        pointerY = e.global.y;

        const l = getLayout();
        const color = shape.isHammer ? 0xffaa00 : getShapeColor(shape);
        ghost = createGhost(shape, l.cellSize, color);
        ghost.alpha = 0.9;
        ghost.x = e.global.x;
        ghost.y = e.global.y;
        ghostScale = 0.3;
        ghostTargetScale = 1;
        ghost.scale.x = ghostScale;
        ghost.scale.y = ghostScale;
        queueLayer.addChild(ghost);
        startRise();
    });

    app.stage.on('pointermove', (e) => {
        if (!dragging) return;
        pointerX = e.global.x;
        pointerY = e.global.y;
        if (rising) {
            const pos = getGhostPos(pointerX, pointerY);
            riseTargetX = pos.x;
            riseTargetY = pos.y;
            return;
        }
        const pos = getGhostPos(pointerX, pointerY);
        ghost.x = pos.x;
        ghost.y = pos.y;
        updateHighlight();
    });

    app.stage.on('pointerup', (e) => {
        if (!dragging) return;
        if (rising) {
            rising = false;
            const pos = getGhostPos(pointerX, pointerY);
            ghost.x = pos.x;
            ghost.y = pos.y;
            ghostScale = 1;
            ghost.scale.x = 1;
            ghost.scale.y = 1;
        }
        dragging = false;
        const { col, row } = getGhostCell();
        clearHighlight();

        if (dragShape.isHammer) {
            const centerCol = col + 1;
            const centerRow = row + 1;
            const removed = clearArea3x3(centerCol, centerRow);
            
            const l = getLayout();
            for (const cell of removed) {
                blockDie(cell.col, cell.row, getCellColor(cell.val));
            }
            screenShake(12, 400);
            screenFlash(0xffffff, 0.5, 400);
            burstParticles(l.boardX + l.boardPixelSize/2, l.boardY + l.boardPixelSize/2, 0xffaa00, 40, 20);
            
            setHasHammer(false);
            removeAt(dragIndex);
            
            queueLayer.removeChild(ghost);
            ghost.destroy();
            ghost = null;
            dragIndex = -1;
            dragShape = null;
            onPlaced();
            return;
        }

        if (canPlace(dragShape, col, row)) {
            const cellValue = dragShape.colorIndex + 1;
            const placedCells = [];
            for (const [dc, dr] of dragShape.cells) {
                const c = col + dc;
                const r = row + dr;
                setCell(c, r, cellValue);
                placedCells.push([c, r]);
            }
            removeAt(dragIndex);

            const { rows, cols } = findFullLines();
            const lineCount = rows.length + cols.length;
            
            // Проверяем, дадут ли спецприз
            let willGetSpecial = false;
            if (lineCount > 0) {
                const tempComboLines = getComboLines() + lineCount;
                if (tempComboLines >= 5) {
                    willGetSpecial = true;
                }
            }

            // Выдаем молоток
            if ((rows.length > 0 && cols.length > 0) || willGetSpecial) {
                setHasHammer(true);
                const l = getLayout();
                floatText(l.boardX + l.boardPixelSize/2, l.boardY + l.boardPixelSize/2, "МОЛОТОК!", 0xFF33FF);
            }

            const colorsBefore = [];
            for (const r of rows) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    const v = getCell(c, r);
                    if (v !== 0) colorsBefore.push({ col: c, row: r, val: v });
                }
            }
            for (const c of cols) {
                for (let r = 0; r < BOARD_SIZE; r++) {
                    const v = getCell(c, r);
                    if (v !== 0) colorsBefore.push({ col: c, row: r, val: v });
                }
            }

            let removedCount = 0;
            if (lineCount > 0) {
                const removed = clearLines(rows, cols);
                removedCount = removed.length;
            }

            const result = awardPoints(placedCells, lineCount, removedCount);

            flashCells(result.scoredCells, getCurrentTheme().flashCells.color);

            for (const cell of colorsBefore) {
                blockDie(cell.col, cell.row, getCellColor(cell.val));
            }

            const l = getLayout();
            let minC = Infinity, maxC = -Infinity, minR = Infinity;
            for (const [dc, dr] of dragShape.cells) {
                const c = col + dc;
                const r = row + dr;
                if (c < minC) minC = c;
                if (c > maxC) maxC = c;
                if (r < minR) minR = r;
            }
            const floatX = l.boardX + ((minC + maxC + 1) / 2) * l.cellSize;
            const floatY = l.boardY + minR * l.cellSize - l.cellSize * 0.4;
            
            // 1. Очки за установку
            floatText(floatX, floatY, `+${result.gained}`, getCurrentTheme().floatColor);

            // 2. Надписи (ЛИНИЯ / КОМБО / СУПЕР и т.д.)
            let textDelay = 400;
            if (result.comboActive) {
                const isMultiLine = lineCount > 1;
                const word = isMultiLine ? 'КОМБО' : result.comboText;
                
                addTextToQueue(
                    `${word}! Х${result.multiplier}`,
                    getCurrentTheme().floatColor,
                    'line',
                    textDelay
                );
                textDelay += 400;

                if (result.specialActive) {
                    addTextToQueue(
                        `${result.specialText}!`,
                        0xff3366,
                        'special',
                        textDelay
                    );
                    textDelay += 400;
                    
                    addTextToQueue(
                        `+${result.specialPoints}`,
                        0xffd700,
                        'bonus',
                        textDelay,
                        { zone: Math.floor(Math.random() * 5) }
                    );
                    textDelay += 400;
                }

                if (result.bonusPoints > 0) {
                    addTextToQueue(
                        `+${result.bonusPoints}`,
                        0xffd700,
                        'bonus',
                        textDelay,
                        { zone: Math.floor(Math.random() * 5) }
                    );
                }
            }

            // 3. СПЕЦЭФФЕКТЫ (вибрации, вспышки, частицы)
            if (result.specialActive) {
                const fx = EFFECTS[result.specialText];
                if (fx) {
                    if (fx.flash) screenFlash(fx.flash.color, fx.flash.alpha, fx.flash.duration);
                    if (fx.shake) screenShake(fx.shake.intensity, fx.shake.duration);
                    if (fx.particles) {
                        const cx = l.boardX + l.boardPixelSize / 2;
                        const cy = l.boardY + l.boardPixelSize / 2;
                        burstParticles(cx, cy, fx.particles.color, fx.particles.count, fx.particles.speed);
                    }
                    if (fx.shockwave) {
                        const cx = l.boardX + l.boardPixelSize / 2;
                        const cy = l.boardY + l.boardPixelSize / 2;
                        shockwave(cx, cy, 0xffffff);
                    }
                    if (fx.extra) fx.extra();
                }
            }

            queueLayer.removeChild(ghost);
            ghost.destroy();
            ghost = null;
            dragIndex = -1;
            dragShape = null;
            onPlaced(result);
        } else {
            animateReturn(() => {
                queueLayer.removeChild(ghost);
                ghost.destroy();
                ghost = null;
                dragIndex = -1;
                dragShape = null;
            });
        }
    });
}