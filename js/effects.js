import { Graphics, Text } from 'https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.mjs';
import { app, effectsLayer, floatLayer, boardLayer } from './render.js';
import { getLayout, cellToPixel } from './layout.js';
import { getCurrentTheme } from './theme.js';

const dying = [];
const floaters = []; // для +X (летят вверх)
const textQueue = []; // очередь для новых надписей
const particles = [];
const flashes = [];
const shockwaves = [];

// ---- ТРЯСКА СЦЕНЫ ----
let shakeTime = 0;
let shakeIntensity = 0;
const shakeBase = { x: 0, y: 0 };
let shakeInitialized = false;

export function screenShake(intensity, duration) {
    if (!shakeInitialized) {
        shakeBase.x = app.stage.x;
        shakeBase.y = app.stage.y;
        shakeInitialized = true;
    }
    shakeTime = duration;
    shakeIntensity = Math.max(shakeIntensity, intensity);
}

// ---- ВСПЫШКА ЭКРАНА ----
export function screenFlash(color, alpha, duration) {
    const g = new Graphics();
    g.rect(0, 0, app.screen.width, app.screen.height);
    g.fill({ color, alpha });
    effectsLayer.addChild(g);

    flashes.push({
        gfx: g,
        startTime: performance.now(),
        life: duration,
    });
}

// ---- ЧАСТИЦЫ (взрыв) ----
export function burstParticles(x, y, color, count = 20, speed = 10) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.5 + Math.random() * 1.5);
        const p = new Graphics();
        const size = 4 + Math.random() * 6;
        p.rect(-size/2, -size/2, size, size);
        p.fill(color);
        p.x = x;
        p.y = y;
        
        effectsLayer.addChild(p);

        particles.push({
            gfx: p,
            startTime: performance.now(),
            life: 600 + Math.random() * 400,
            vx: Math.cos(angle) * v,
            vy: Math.sin(angle) * v,
            rotation: (Math.random() - 0.5) * 0.3,
        });
    }
}

// ---- УДАРНАЯ ВОЛНА ----
export function shockwave(x, y, color) {
    const g = new Graphics();
    g.circle(0, 0, 10);
    g.stroke({ color, width: 4, alpha: 0.8 });
    g.x = x;
    g.y = y;
    
    effectsLayer.addChild(g);

    shockwaves.push({
        gfx: g,
        startTime: performance.now(),
        life: 500,
        maxRadius: 300,
    });
}

// ---- МЕРЦАНИЕ БЛОКОВ ----
export let blockFlickerActive = false;
export let blockFlickerJustEnded = false;
let blockFlickerEndTime = 0;

export function startBlockFlicker(duration) {
    blockFlickerActive = true;
    blockFlickerJustEnded = false;
    blockFlickerEndTime = performance.now() + duration;
}

export function resetBlockFlickerEnded() {
    blockFlickerJustEnded = false;
}

export function updateExtras() {
    const now = performance.now();
    if (blockFlickerActive && now > blockFlickerEndTime) {
        blockFlickerActive = false;
        blockFlickerJustEnded = true;
    }
}

// ---- УПРАВЛЕНИЕ ФОНОМ ----
export let bgOverrideColor = null;
export let bgOverrideAlpha = 1;

let bgEffect = null;

export function triggerBgFlicker(color, times, duration) {
    bgEffect = {
        type: 'flicker',
        color,
        times,
        duration,
        startTime: performance.now(),
    };
}

export function triggerBgFade(color, duration) {
    bgEffect = {
        type: 'fade',
        color,
        duration,
        startTime: performance.now(),
    };
}

export function updateBackgroundEffect() {
    if (!bgEffect) {
        if (bgOverrideColor !== null) {
            bgOverrideColor = null;
            bgOverrideAlpha = 1;
            return true;
        }
        return false;
    }

    const now = performance.now();
    const elapsed = now - bgEffect.startTime;

    if (bgEffect.type === 'flicker') {
        const totalDuration = bgEffect.duration;
        if (elapsed >= totalDuration) {
            bgOverrideColor = null;
            bgOverrideAlpha = 1;
            bgEffect = null;
            return true;
        }

        const phaseDuration = totalDuration / (bgEffect.times * 2);
        const phase = Math.floor(elapsed / phaseDuration) % 2;

        if (phase === 0) {
            bgOverrideColor = bgEffect.color;
            bgOverrideAlpha = 0.6;
        } else {
            bgOverrideColor = null;
            bgOverrideAlpha = 1;
        }
        return true;
    }

    if (bgEffect.type === 'fade') {
        const totalDuration = bgEffect.duration;
        if (elapsed >= totalDuration) {
            bgOverrideColor = null;
            bgOverrideAlpha = 1;
            bgEffect = null;
            return true;
        }

        const fadeIn = totalDuration * 0.3;
        const hold = totalDuration * 0.1;

        if (elapsed < fadeIn) {
            bgOverrideColor = bgEffect.color;
            bgOverrideAlpha = elapsed / fadeIn;
        } else if (elapsed < fadeIn + hold) {
            bgOverrideColor = bgEffect.color;
            bgOverrideAlpha = 1;
        } else {
            const outElapsed = elapsed - fadeIn - hold;
            const outDuration = totalDuration - fadeIn - hold;
            bgOverrideColor = bgEffect.color;
            bgOverrideAlpha = Math.max(0, 1 - outElapsed / outDuration);
        }
        return true;
    }

    return false;
}

// ---- ВОЛНА СЕРОСТИ ----
export let grayWaveActive = false;
let grayWaveStartTime = 0;
let grayWaveDuration = 2000;

export function startGrayWave() {
    grayWaveActive = true;
    grayWaveStartTime = performance.now();
}

export function isGrayWaveActive() {
    return grayWaveActive;
}

export function getGrayFactor(row) {
    if (!grayWaveActive) return 0;
    const elapsed = performance.now() - grayWaveStartTime;
    const t = elapsed / grayWaveDuration;
    
    const rowThreshold = row / 8; 
    const fadeDuration = 0.3;
    const localT = (t - rowThreshold) / fadeDuration;
    
    if (localT <= 0) return 0;
    if (localT >= 1) return 1;
    return localT;
}

export function updateGrayWave() {
    if (!grayWaveActive) return;
    const elapsed = performance.now() - grayWaveStartTime;
    if (elapsed >= grayWaveDuration) {
        grayWaveActive = false;
    }
}

// ---------- БЛОКИ ----------
export function blockDie(col, row, color) {
    const l = getLayout();
    const { x, y } = cellToPixel(col, row);
    const g = new Graphics();
    g.roundRect(2, 2, l.cellSize - 4, l.cellSize - 4, 6);
    g.fill(color);
    g.pivot.set(l.cellSize / 2, l.cellSize / 2);
    g.x = x + l.cellSize / 2;
    g.y = y + l.cellSize / 2;
    effectsLayer.addChild(g);
    const startTime = performance.now();
    const life = 350;
    dying.push({ gfx: g, startTime, life, rotationDir: Math.random() < 0.5 ? -1 : 1 });
}

export function flashCells(cells, color = 0xffffff) {
    const l = getLayout();
    for (const cell of cells) {
        const { x, y } = cellToPixel(cell.col, cell.row);
        const g = new Graphics();
        g.roundRect(x + 2, y + 2, l.cellSize - 4, l.cellSize - 4, 6);
        g.fill({ color, alpha: 0.8 });
        effectsLayer.addChild(g);
        const startTime = performance.now();
        const life = 400;
        dying.push({ gfx: g, startTime, life, rotationDir: 0, isFlash: true });
    }
}

// ---------- НОВАЯ СИСТЕМА НАДПИСЕЙ ----------

// +X (летит вверх от фигуры) — без изменений
export function floatText(x, y, text, color = 0xffffff) {
    const l = getLayout();
    const t = new Text({
        text,
        style: {
            fontFamily: 'Pacifico',
            fontSize: l.cellSize * 0.85,
            fill: color,
            dropShadow: {
                color: 0x000000,
                alpha: 0.6,
                blur: 4,
                distance: 2,
                angle: Math.PI / 4,
            },
        },
    });
    t.anchor.set(0.5);
    t.x = x;
    t.y = y;
    t.alpha = 1;
    t.scale.set(0.6);
    floatLayer.addChild(t);

    const startTime = performance.now();
    const life = 1000;

    const topLimit = l.boardY - l.cellSize * 0.5;
    const maxRise = Math.max(0, y - topLimit);
    const riseDist = Math.min(l.cellSize * 2.2, maxRise);

    floaters.push({
        gfx: t,
        startTime,
        life,
        startY: y,
        riseDist,
        topLimit,
    });
}

// Очередь появления текстов (последовательная)
let globalTextTimer = 0;

// Основная функция добавления текста в очередь
// type: 'line' | 'special' | 'bonus'
// posY: смещение по Y от центра (для special)
// zone: 0..4 (для bonus)
export function addTextToQueue(text, color, type, delay, extra = {}) {
    const l = getLayout();
    const centerX = l.boardX + l.boardPixelSize / 2;
    const centerY = l.boardY + l.boardPixelSize / 2;
    
    let x, y;
    let offsetX = 0, offsetY = 0;
    
    if (type === 'line') {
        x = centerX;
        y = centerY;
    } else if (type === 'special') {
        x = centerX;
        y = centerY - l.cellSize * 1.5; // выше комбо
    } else if (type === 'bonus') {
        // 5 зон
        const padding = l.cellSize * 1.5;
        const left = l.boardX + padding;
        const right = l.boardX + l.boardPixelSize - padding;
        const top = l.boardY + padding;
        const bottom = l.boardY + l.boardPixelSize - padding;
        
        const zones = [
            { x: centerX, y: centerY },
            { x: left, y: top },
            { x: right, y: top },
            { x: left, y: bottom },
            { x: right, y: bottom },
        ];
        
        const zone = extra.zone !== undefined ? extra.zone : Math.floor(Math.random() * 5);
        const spawnPos = zones[zone];
        x = spawnPos.x;
        y = spawnPos.y;
        
        // Вектор от центра картинки к середине надписи
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        offsetX = (dx / dist) * l.cellSize * 1.5; // медленное смещение
        offsetY = (dy / dist) * l.cellSize * 1.5;
    }
    
    const startTime = performance.now() + delay;
    
    textQueue.push({
        text,
        color,
        x, y,
        offsetX, offsetY,
        startTime,
        duration: 1200, // 2 секунды на анимацию
        type,
    });
}

// Обновление очереди текстов
function updateTextQueue() {
    const now = performance.now();
    
    for (let i = textQueue.length - 1; i >= 0; i--) {
        const item = textQueue[i];
        
        if (now < item.startTime) continue;
        
        if (!item.gfx) {
            const l = getLayout();
            const t = new Text({
                text: item.text,
                style: {
                    fontFamily: 'Pacifico',
                    fontSize: l.cellSize * 1.0,
                    fill: item.color,
                    align: 'center',
                    dropShadow: {
                        color: 0x000000,
                        alpha: 0.6,
                        blur: 4,
                        distance: 2,
                        angle: Math.PI / 4,
                    },
                },
            });
            t.anchor.set(0.5);
            t.x = item.x;
            t.y = item.y;
            t.alpha = 0;
            t.scale.set(0.8); // <-- Начальный размер больше
            floatLayer.addChild(t);
            item.gfx = t;
        }
        
        const elapsed = now - item.startTime;
        const t = elapsed / item.duration; // item.duration теперь 1200
        
        if (t >= 1) {
            floatLayer.removeChild(item.gfx);
            item.gfx.destroy();
            textQueue.splice(i, 1);
            continue;
        }
        
        // Анимация: быстрый "поп" (первые 20% времени), потом плавное уменьшение
        let scale;
        if (t < 0.2) {
            // Быстрый рост от 0.8 до 1.3 за 240 мс
            scale = 0.8 + (1.3 - 0.8) * (t / 0.2);
        } else {
            // Медленное уменьшение от 1.3 до 1.0 (чтобы не исчезало резко)
            const localT = (t - 0.2) / 0.8;
            scale = 1.3 - 0.3 * localT;
        }
        item.gfx.scale.set(scale);
        
        // Смещение для bonus
        if (item.type === 'bonus') {
            item.gfx.x = item.x + item.offsetX * t;
            item.gfx.y = item.y + item.offsetY * t;
        }
        
        // Прозрачность: держим до 60%, потом быстро таем
        if (t < 0.6) {
            item.gfx.alpha = 1;
        } else {
            item.gfx.alpha = 1 - (t - 0.6) / 0.4;
        }
    }
}

// ---------- ОБНОВЛЕНИЕ ЭФФЕКТОВ ----------
function updateDying() {
    const now = performance.now();
    for (let i = dying.length - 1; i >= 0; i--) {
        const d = dying[i];
        const t = (now - d.startTime) / d.life;
        if (t >= 1) {
            effectsLayer.removeChild(d.gfx);
            d.gfx.destroy();
            dying.splice(i, 1);
            continue;
        }
        if (d.isFlash) {
            d.gfx.alpha = 0.8 * (1 - t);
            continue;
        }
        const e = 1 - Math.pow(1 - t, 3);
        d.gfx.rotation = d.rotationDir * e * Math.PI * 0.5;
        const s = 1 - e * 0.85;
        d.gfx.scale.x = s;
        d.gfx.scale.y = s;
        d.gfx.alpha = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;
    }
}

function updateFloaters() {
    const now = performance.now();
    for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        const t = (now - f.startTime) / f.life;
        if (t >= 1) {
            floatLayer.removeChild(f.gfx);
            f.gfx.destroy();
            floaters.splice(i, 1);
            continue;
        }

        const e = 1 - Math.pow(1 - t, 2);
        f.gfx.y = Math.max(f.topLimit, f.startY - f.riseDist * e);

        const elapsed = now - f.startTime;
        let s;
        if (elapsed < 150) s = 0.6 + (1.15 - 0.6) * (elapsed / 150);
        else s = 1.15 - 0.15 * Math.min((elapsed - 150) / 250, 1);
        f.gfx.scale.set(s);

        if (t < 0.55) f.gfx.alpha = 1;
        else f.gfx.alpha = 1 - (t - 0.55) / 0.45;
    }
}

function updateParticles() {
    const now = performance.now();
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const t = (now - p.startTime) / p.life;
        if (t >= 1) {
            effectsLayer.removeChild(p.gfx);
            p.gfx.destroy();
            particles.splice(i, 1);
            continue;
        }
        p.gfx.x += p.vx;
        p.gfx.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.gfx.rotation += p.rotation;
        p.gfx.alpha = 1 - t;
    }
}

function updateShake() {
    if (!shakeInitialized) return;
    if (shakeTime > 0) {
        shakeTime -= app.ticker.deltaMS;
        if (shakeTime > 0) {
            app.stage.x = shakeBase.x + (Math.random() - 0.5) * shakeIntensity;
            app.stage.y = shakeBase.y + (Math.random() - 0.5) * shakeIntensity;
        } else {
            app.stage.x = shakeBase.x;
            app.stage.y = shakeBase.y;
            shakeIntensity = 0;
        }
    }
}

function updateFlashes() {
    const now = performance.now();
    for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        const t = (now - f.startTime) / f.life;
        if (t >= 1) {
            effectsLayer.removeChild(f.gfx);
            f.gfx.destroy();
            flashes.splice(i, 1);
            continue;
        }
        f.gfx.alpha = 1 - t;
    }
}

function updateShockwaves() {
    const now = performance.now();
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const s = shockwaves[i];
        const t = (now - s.startTime) / s.life;
        if (t >= 1) {
            effectsLayer.removeChild(s.gfx);
            s.gfx.destroy();
            shockwaves.splice(i, 1);
            continue;
        }
        const radius = 10 + s.maxRadius * t;
        s.gfx.clear();
        s.gfx.circle(0, 0, radius);
        s.gfx.stroke({ color: 0xffffff, width: 6 * (1 - t), alpha: 1 - t });
    }
}

export function initEffects() {
    app.ticker.add(updateDying);
    app.ticker.add(updateFloaters);
    app.ticker.add(updateTextQueue); // <-- новая функция
    app.ticker.add(updateParticles);
    app.ticker.add(updateShake);
    app.ticker.add(updateFlashes);
    app.ticker.add(updateShockwaves);
    app.ticker.add(updateExtras);
}