import { Application, Graphics, Container, FillGradient } from 'https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.mjs';
import { BOARD_SIZE, QUEUE_SLOTS, getLayout, cellToPixel } from './layout.js';
import { getGrid, getHasHammer, canPlaceAnywhere } from './core.js';
import { getQueue } from './pieces.js';
import { getCurrentTheme } from './theme.js';
import { blockFlickerActive, bgOverrideColor, bgOverrideAlpha, getGrayFactor } from './effects.js';

export const app = new Application();
export const bgLayer = new Container();
export const boardLayer = new Container();
export const highlightLayer = new Container();
export const effectsLayer = new Container();
export const floatLayer = new Container();
export const queueLayer = new Container();

const shapeContainers = new Map();

export async function initRender() {
    const theme = getCurrentTheme();
    await app.init({
        resizeTo: window,
        background: theme.background,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });
    document.body.appendChild(app.canvas);
    app.stage.addChild(bgLayer);
    app.stage.addChild(boardLayer);
    app.stage.addChild(highlightLayer);
    app.stage.addChild(effectsLayer);
    app.stage.addChild(floatLayer);
    app.stage.addChild(queueLayer);
    app.ticker.add(animateQueue);
}

export function onResize(callback) {
    window.addEventListener('resize', () => callback(app.screen.width, app.screen.height));
}

export function drawBackground() {
    bgLayer.removeChildren();
    const theme = getCurrentTheme();

    if (bgOverrideColor !== null) {
        const g = new Graphics();
        g.rect(0, 0, app.screen.width, app.screen.height);
        g.fill({ color: bgOverrideColor, alpha: bgOverrideAlpha });
        bgLayer.addChild(g);
        return;
    }

    if (!theme.backgroundGradient) return;

    const { top, bottom } = theme.backgroundGradient;

    const gradient = new FillGradient({
        type: 'linear',
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
        colorStops: [
            { offset: 0, color: top },
            { offset: 1, color: bottom },
        ],
        textureSpace: 'local',
    });

    const g = new Graphics();
    g.rect(0, 0, app.screen.width, app.screen.height);
    g.fill(gradient);
    bgLayer.addChild(g);
}

export function getShapeColor(shape) {
    if (shape.isHammer) return 0xffaa00; // Молоток всегда золотой
    const palette = getCurrentTheme().palette;
    return palette[shape.colorIndex % palette.length] || palette[0];
}

export function getCellColor(val) {
    const palette = getCurrentTheme().palette;
    return palette[(val - 1) % palette.length] || palette[0];
}

function lerpColor(a, b, t) {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return (r << 16) | (g << 8) | bl;
}

function drawBlock(gfx, x, y, size, color, theme) {
    const b = theme.block || {};
    const r = b.cornerRadius || 6;
    const alpha = b.alpha !== undefined ? b.alpha : 1;

    if (b.shadow) {
        const s = b.shadow;
        gfx.roundRect(x + (s.offsetX || 0), y + (s.offsetY || 0), size, size, r);
        gfx.fill({ color: s.color || 0x000000, alpha: s.alpha || 0.2 });
    }

    gfx.roundRect(x, y, size, size, r);
    gfx.fill({ color, alpha });

    if (b.strokeColor !== null && b.strokeColor !== undefined) {
        gfx.stroke({ color: b.strokeColor, width: b.strokeWidth || 1 });
    }

    if (b.bevel) {
        const bevelH = size * 0.15;
        gfx.roundRect(x + 3, y + 2, size - 6, bevelH, Math.max(2, r - 3));
        gfx.fill({ color: 0xffffff, alpha: 0.15 });
        gfx.roundRect(x + 3, y + size - bevelH - 2, size - 6, bevelH, Math.max(2, r - 3));
        gfx.fill({ color: 0x000000, alpha: 0.1 });
    }

    if (b.edgeHighlight) {
        gfx.roundRect(x + 2, y + 2, size - 4, size - 4, Math.max(2, r - 2));
        gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
    }

    if (b.innerStroke) {
        const s = b.innerStroke;
        const inset = 3;
        gfx.roundRect(x + inset, y + inset, size - inset * 2, size - inset * 2, Math.max(0, r - inset));
        gfx.stroke({ color: s.color || 0xffffff, width: s.width || 1, alpha: s.alpha || 0.4 });
    }
}

export function drawHammer(gfx, x, y, size, color = 0xffaa00) {
    gfx.roundRect(x + size * 0.4, y + size * 0.3, size * 0.2, size * 0.6, size * 0.1);
    gfx.fill(0x8B4513);
    gfx.roundRect(x + size * 0.1, y + size * 0.1, size * 0.8, size * 0.3, size * 0.1);
    gfx.fill(color);
    gfx.roundRect(x + size * 0.15, y + size * 0.12, size * 0.7, size * 0.08, size * 0.04);
    gfx.fill({ color: 0xffffff, alpha: 0.5 });
}

function getSlotTarget(index) {
    const l = getLayout();
    const slotW = l.boardPixelSize / QUEUE_SLOTS;
    const cell = l.queueCellSize;
    return {
        x: l.boardX + slotW * index + slotW / 2,
        y: l.queueY + cell * 2,
        scale: 1,
        cell,
        alpha: index === 0 ? 1 : 0.9,
    };
}

function getSpawnTarget() {
    const l = getLayout();
    const slotW = l.boardPixelSize / QUEUE_SLOTS;
    return {
        x: l.boardX + l.boardPixelSize + slotW,
        y: l.queueY + l.queueCellSize * 2,
    };
}

function animateQueue() {
    const speed = 0.2;
    for (const c of shapeContainers.values()) {
        c.x += (c._targetX - c.x) * speed;
        c.y += (c._targetY - c.y) * speed;
        c.scale.x += (c._targetScale - c.scale.x) * speed;
        c.scale.y = c.scale.x;
    }
}

function renderShapeInContainer(container, shape, cellSize, color, alpha) {
    container.removeChildren();
    const theme = getCurrentTheme();

    if (shape.isHammer) {
        // Цветные квадраты под молотком
        const bgColor = theme.palette[0]; // Первый цвет темы
        
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const g = new Graphics();
                drawBlock(g, c * cellSize - cellSize * 1.5 + 2, r * cellSize - cellSize * 1.5 + 2, cellSize - 4, bgColor, theme);
                g.alpha = 0.6; // Полупрозрачность, чтобы молоток выделялся
                container.addChild(g);
            }
        }
        
        // Молоток поверх
        const h = new Graphics();
        drawHammer(h, -cellSize * 1.5, -cellSize * 1.5, cellSize * 3);
        container.addChild(h);
        return;
    }

    let maxC = 0, maxR = 0;
    for (const [c, r] of shape.cells) {
        if (c > maxC) maxC = c;
        if (r > maxR) maxR = r;
    }
    const offsetX = -((maxC + 1) * cellSize) / 2;
    const offsetY = -((maxR + 1) * cellSize) / 2;

    for (const [c, r] of shape.cells) {
        const g = new Graphics();
        drawBlock(g, offsetX + c * cellSize + 2, offsetY + r * cellSize + 2, cellSize - 4, color, theme);
        g.alpha = alpha;
        container.addChild(g);
    }
}

export function drawQueue() {
    const queue = getQueue();
    const visibleIds = new Set();
    for (let i = 0; i < QUEUE_SLOTS; i++) if (queue[i]) visibleIds.add(queue[i].id);

    for (const [id, c] of shapeContainers.entries()) {
        if (!visibleIds.has(id)) {
            queueLayer.removeChild(c);
            c.destroy();
            shapeContainers.delete(id);
        }
    }

    for (let i = 0; i < QUEUE_SLOTS; i++) {
        const shape = queue[i];
        if (!shape) continue;

        const target = getSlotTarget(i);
        const canPlace = canPlaceAnywhere(shape);
        
        let color = getShapeColor(shape); 
        let alpha = target.alpha;
        
        if (!canPlace && !shape.isHammer) {
            color = 0x555555;
            alpha = 0.5;
        }

        let c = shapeContainers.get(shape.id);
        const isNew = !c;

        if (isNew) {
            c = new Container();
            shapeContainers.set(shape.id, c);
            queueLayer.addChild(c);
            const spawn = getSpawnTarget();
            c.x = spawn.x;
            c.y = spawn.y;
            c._targetX = spawn.x;
            c._targetY = spawn.y;
            c._targetScale = 1;
            c.scale.x = 1;
            c.scale.y = 1;
        }

        if (isNew || c._lastCell !== target.cell || c._lastColor !== color || c._lastIsHammer !== shape.isHammer || c._lastAlpha !== alpha) {
            renderShapeInContainer(c, shape, target.cell, color, alpha);
            c._lastCell = target.cell;
            c._lastColor = color;
            c._lastIsHammer = shape.isHammer;
            c._lastAlpha = alpha;
        }

        c._targetX = target.x;
        c._targetY = target.y;
        c._targetScale = target.scale;
    }
}

export function drawBoard() {
    boardLayer.removeChildren();
    const l = getLayout();
    const grid = getGrid();
    const theme = getCurrentTheme();

    const bg = new Graphics();
    bg.rect(l.boardX, l.boardY, l.boardPixelSize, l.boardPixelSize);
    bg.fill(theme.boardBg);
    boardLayer.addChild(bg);

    const gridGfx = new Graphics();
    for (let i = 0; i <= BOARD_SIZE; i++) {
        const x = l.boardX + i * l.cellSize;
        const y = l.boardY + i * l.cellSize;
        gridGfx.moveTo(x, l.boardY);
        gridGfx.lineTo(x, l.boardY + l.boardPixelSize);
        gridGfx.moveTo(l.boardX, y);
        gridGfx.lineTo(l.boardX + l.boardPixelSize, y);
    }
    gridGfx.stroke({ width: 1, color: theme.gridColor });
    boardLayer.addChild(gridGfx);

    let flickerPhase = 0;
    if (blockFlickerActive) {
        flickerPhase = Math.floor(performance.now() / 200) % 2;
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const val = grid[r][c];
            if (val === 0) continue;
            const { x, y } = cellToPixel(c, r);
            const block = new Graphics();
            
            let color = getCellColor(val);
            
            if (blockFlickerActive && flickerPhase === 1) {
                const seed = (c * 7 + r * 13) % 10;
                if (seed < 4) color = 0xffffff;
            }
            
            // ВОЛНА СЕРОСТИ (плавная)
            const grayFactor = getGrayFactor(r);
            if (grayFactor > 0) {
                color = lerpColor(color, 0x555555, grayFactor);
            }
            
            drawBlock(block, x + 2, y + 2, l.cellSize - 4, color, theme);
            boardLayer.addChild(block);
        }
    }
}

export function drawHighlight(shape, col, row, mode, lines) {
    highlightLayer.removeChildren();
    if (!shape) return;
    const l = getLayout();
    const theme = getCurrentTheme();
    
    if (shape.isHammer) {
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                const cc = col + c;
                const rr = row + r;
                if (cc < 0 || cc >= BOARD_SIZE || rr < 0 || rr >= BOARD_SIZE) continue;
                const { x, y } = cellToPixel(cc, rr);
                const g = new Graphics();
                g.roundRect(x + 2, y + 2, l.cellSize - 4, l.cellSize - 4, 6);
                g.fill({ color: 0xffaa00, alpha: 0.5 });
                highlightLayer.addChild(g);
            }
        }
        return;
    }

    let hl;
    if (mode === 'line') hl = theme.highlight.line;
    else if (mode === 'valid') hl = theme.highlight.valid;
    else hl = theme.highlight.invalid;

    for (const [dc, dr] of shape.cells) {
        const c = col + dc;
        const r = row + dr;
        if (c < 0 || c >= BOARD_SIZE || r < 0 || r >= BOARD_SIZE) continue;
        const { x, y } = cellToPixel(c, r);
        const g = new Graphics();
        g.roundRect(x + 2, y + 2, l.cellSize - 4, l.cellSize - 4, 6);
        g.fill({ color: hl.blockColor || hl.color, alpha: hl.blockAlpha || hl.alpha });
        if (mode === 'line') g.stroke({ color: hl.color, width: 3 });
        highlightLayer.addChild(g);
    }

    if (mode === 'line' && lines) {
        for (const r of lines.rows) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const { x, y } = cellToPixel(c, r);
                const g = new Graphics();
                g.roundRect(x + 2, y + 2, l.cellSize - 4, l.cellSize - 4, 6);
                g.fill({ color: hl.color, alpha: hl.alpha });
                highlightLayer.addChild(g);
            }
        }
        for (const c of lines.cols) {
            for (let r = 0; r < BOARD_SIZE; r++) {
                const { x, y } = cellToPixel(c, r);
                const g = new Graphics();
                g.roundRect(x + 2, y + 2, l.cellSize - 4, l.cellSize - 4, 6);
                g.fill({ color: hl.color, alpha: hl.alpha });
                highlightLayer.addChild(g);
            }
        }
    }
}

export function clearHighlight() {
    highlightLayer.removeChildren();
}