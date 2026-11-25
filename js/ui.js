import { Container, Text, Graphics } from '../libs/pixi.min.mjs';
import { app } from './render.js';
import { getLayout } from './layout.js';
import { getTotalScore, getBestScore, getHasHammer, getComboLines, SPECIAL_REWARDS } from './core.js';

export const uiLayer = new Container();

let scoreText = null;
let bestText = null;
let hammerIcon = null;
let panelBg = null;
let comboText = null;
let comboLabel = '';
let comboTween = null;
let gameOverLayer = null;
let gameOverCallback = null;
let rescueCallback = null;

// --- Новый рекорд ---
let recordStar = null;
let recordHighlightEnd = 0;
let recordTween = null;

let displayScore = 0;
let targetDisplayScore = 0;
let uiTickerAdded = false;

export function initUI(onRestart, onRescue) {
    gameOverCallback = onRestart;
    rescueCallback = onRescue;

    if (!uiLayer.parent) app.stage.addChild(uiLayer);
    uiLayer.removeChildren();

    buildUI();
    buildGameOverScreen();

    if (!uiTickerAdded) {
        app.ticker.add(animateUI);
        uiTickerAdded = true;
    }
}

export function animateHammerToPanel() {
    if (!hammerIcon) return;
    const l = getLayout();

    const big = new Container();
    const bigSize = l.cellSize * 3.5;
    const g = new Graphics();
    g.roundRect(bigSize * 0.4, bigSize * 0.3, bigSize * 0.2, bigSize * 0.6, bigSize * 0.1);
    g.fill(0x8B4513);
    g.roundRect(bigSize * 0.1, bigSize * 0.1, bigSize * 0.8, bigSize * 0.3, bigSize * 0.1);
    g.fill(0xffaa00);
    g.roundRect(bigSize * 0.15, bigSize * 0.12, bigSize * 0.7, bigSize * 0.08, bigSize * 0.04);
    g.fill({ color: 0xffffff, alpha: 0.5 });
    big.addChild(g);

    big.pivot.set(bigSize / 2, bigSize / 2);
    big.x = l.screenW / 2;
    big.y = l.screenH / 2;
    big.scale.set(0);
    big.alpha = 0;
    uiLayer.addChild(big);

    const startX = l.screenW / 2;
    const startY = l.screenH / 2;
    const endX = hammerIcon.x;
    const endY = hammerIcon.y;
    const endScale = (l.cellSize * 0.8) / bigSize;

    const t0 = performance.now();
    const POP_IN = 120;
    const SETTLE = 100;
    const FLY = 450;
    const BUMP = 80;
    const total = POP_IN + SETTLE + FLY + BUMP;

    const tick = () => {
        const now = performance.now();
        const elapsed = now - t0;
        const t = Math.min(elapsed / total, 1);

        if (elapsed < POP_IN) {
            const k = elapsed / POP_IN;
            big.scale.set(1.2 * k);
            big.alpha = k;
            return;
        }
        if (elapsed < POP_IN + SETTLE) {
            const k = (elapsed - POP_IN) / SETTLE;
            big.scale.set(1.2 - 0.2 * k);
            big.alpha = 1;
            return;
        }
        if (elapsed < POP_IN + SETTLE + FLY) {
            const k = (elapsed - POP_IN - SETTLE) / FLY;
            const e = k < 0.5
                ? 2 * k * k
                : 1 - Math.pow(-2 * k + 2, 2) / 2;
            big.x = startX + (endX - startX) * e;
            big.y = startY + (endY - startY) * e;
            big.scale.set(1 + (endScale - 1) * e);
            return;
        }
        const k = (elapsed - POP_IN - SETTLE - FLY) / BUMP;
        const s = endScale * (1 + 0.15 * Math.sin(k * Math.PI));
        big.scale.set(s);

        if (t >= 1) {
            uiLayer.removeChild(big);
            big.destroy({ children: true });
            app.ticker.remove(tick);
        }
    };

    app.ticker.add(tick);
}

function buildUI() {
    const l = getLayout();

    // --- Панель HUD (по ширине поля) ---
    const panelMargin = l.cellSize * 0.4;
    const panelH = l.cellSize * 1.8;
    const panelY = panelMargin;
    const panelX = l.boardX - panelMargin;
    const panelW = l.boardPixelSize + panelMargin * 2;

    panelBg = new Graphics();
    panelBg.roundRect(panelX, panelY, panelW, panelH, panelH * 0.3);
    panelBg.fill({ color: 0x000000, alpha: 0.18 });
    uiLayer.addChild(panelBg);

    // Крупный счёт (по центру панели)
    scoreText = new Text({
        text: '0',
        style: {
            fontFamily: 'Pacifico',
            fontSize: l.cellSize * 0.95,
            fill: 0xffffff,
            align: 'center',
            fontWeight: 'bold',
            dropShadow: {
                color: 0x000000,
                alpha: 0.6,
                blur: 4,
                distance: 2,
                angle: Math.PI / 4,
            },
        },
    });
    scoreText.anchor.set(0.5, 0.5);
    scoreText.x = panelX + panelW / 2;
    scoreText.y = panelY + panelH / 2;
    uiLayer.addChild(scoreText);

    // Рекорд (слева в панели)
    bestText = new Text({
        text: 'Рекорд: 0',
        style: {
            fontFamily: 'Pacifico',
            fontSize: l.cellSize * 0.3,
            fill: 0xffffff,
            align: 'left',
            fontWeight: 'bold',
            dropShadow: {
                color: 0x000000,
                alpha: 0.6,
                blur: 3,
                distance: 1,
                angle: Math.PI / 4,
            },
        },
    });
    bestText.anchor.set(0, 0.5);
    bestText.x = panelX + l.cellSize * 0.3;
    bestText.y = panelY + panelH * 0.15;
    uiLayer.addChild(bestText);

    // Звезда нового рекорда (скрыта по умолчанию)
    recordStar = new Text({
        text: '★',
        style: {
            fontFamily: 'Pacifico',
            fontSize: l.cellSize * 0.35,
            fill: 0xFFD54F,
            align: 'left',
            dropShadow: {
                color: 0x000000,
                alpha: 0.5,
                blur: 2,
                distance: 1,
                angle: Math.PI / 4,
            },
        },
    });
    recordStar.anchor.set(0, 0.5);
    recordStar.visible = false;
    uiLayer.addChild(recordStar);

    // Иконка молотка (слева под рекордом)
    hammerIcon = new Container();
    const iconSize = l.cellSize * 0.8;

    const hg = new Graphics();
    hg.roundRect(iconSize * 0.4, iconSize * 0.3, iconSize * 0.2, iconSize * 0.6, iconSize * 0.1);
    hg.fill(0x8B4513);
    hg.roundRect(iconSize * 0.1, iconSize * 0.1, iconSize * 0.8, iconSize * 0.3, iconSize * 0.1);
    hg.fill(0xffaa00);
    hg.roundRect(iconSize * 0.15, iconSize * 0.12, iconSize * 0.7, iconSize * 0.08, iconSize * 0.04);
    hg.fill({ color: 0xffffff, alpha: 0.5 });

    hammerIcon.addChild(hg);

    hammerIcon.x = panelX + l.cellSize * 0.3 + iconSize * 0.5;
    hammerIcon.y = panelY + panelH * 0.72;
    hammerIcon.pivot.set(iconSize * 0.5, iconSize * 0.5);
    hammerIcon.alpha = 0;
    uiLayer.addChild(hammerIcon);

    // Индикатор комбо (справа в панели) — уменьшенный шрифт + ограничение ширины
    comboText = new Text({
        text: '',
        style: {
            fontFamily: 'Pacifico',
            fontSize: l.cellSize * 0.4,
            fill: 0xFFD54F,
            align: 'right',
            dropShadow: {
                color: 0x000000,
                alpha: 0.5,
                blur: 3,
                distance: 1,
                angle: Math.PI / 4,
            },
        },
    });
    comboText.anchor.set(1, 0.5);
    comboText.x = panelX + panelW - l.cellSize * 0.3;
    comboText.y = panelY + panelH / 2;
    comboText.visible = false;
    comboText._maxWidth = panelW * 0.32;
    comboText._fitScale = 1;
    uiLayer.addChild(comboText);

    comboLabel = '';
    comboTween = null;

    displayScore = getTotalScore();
    targetDisplayScore = getTotalScore();
    scoreText.text = String(Math.round(displayScore));
    bestText.text = 'Рекорд: ' + getBestScore();
}

function buildGameOverScreen() {
    const l = getLayout();

    gameOverLayer = new Container();
    gameOverLayer.visible = false;

    const fieldCenterX = l.boardX + l.boardPixelSize / 2;
    const fieldWidth = l.boardPixelSize;
    const fieldCenterY = l.boardY + l.boardPixelSize / 2;

    const overlay = new Graphics();
    overlay.rect(0, 0, l.screenW, l.screenH);
    overlay.fill({ color: 0x1a1a2e, alpha: 0.85 });
    gameOverLayer.addChild(overlay);

    const panelRadius = fieldWidth * 0.45;
    const panel = new Graphics();
    panel.circle(fieldCenterX + 4, fieldCenterY + 4, panelRadius);
    panel.fill({ color: 0x000000, alpha: 0.3 });
    panel.circle(fieldCenterX, fieldCenterY, panelRadius);
    panel.fill(0xffffff);
    panel.stroke({ color: 0xffaa00, width: 4 });
    gameOverLayer.addChild(panel);

    const title = new Text({
        text: 'ОЙ!',
        style: {
            fontFamily: 'Pacifico',
            fontSize: fieldWidth * 0.14,
            fill: 0xff3366,
            align: 'center',
            dropShadow: {
                color: 0x000000,
                alpha: 0.4,
                blur: 4,
                distance: 2,
                angle: Math.PI / 4,
            },
        },
    });
    title.anchor.set(0.5);
    title.x = fieldCenterX;
    title.y = fieldCenterY - panelRadius * 0.55;
    gameOverLayer.addChild(title);

    const subtitle = new Text({
        text: 'Места больше нет',
        style: {
            fontFamily: 'Pacifico',
            fontSize: fieldWidth * 0.045,
            fill: 0x666666,
            align: 'center',
        },
    });
    subtitle.anchor.set(0.5);
    subtitle.x = fieldCenterX;
    subtitle.y = fieldCenterY - panelRadius * 0.3;
    gameOverLayer.addChild(subtitle);

    const scoreLabel = new Text({
        text: 'ВАШ СЧЁТ',
        style: {
            fontFamily: 'Pacifico',
            fontSize: fieldWidth * 0.035,
            fill: 0x999999,
            align: 'center',
        },
    });
    scoreLabel.anchor.set(0.5);
    scoreLabel.x = fieldCenterX;
    scoreLabel.y = fieldCenterY - panelRadius * 0.05;
    gameOverLayer.addChild(scoreLabel);

    const scoreValue = new Text({
        text: '0',
        style: {
            fontFamily: 'Pacifico',
            fontSize: fieldWidth * 0.12,
            fill: 0xffaa00,
            align: 'center',
            dropShadow: {
                color: 0x000000,
                alpha: 0.3,
                blur: 4,
                distance: 1,
                angle: Math.PI / 4,
            },
        },
    });
    scoreValue.anchor.set(0.5);
    scoreValue.x = fieldCenterX;
    scoreValue.y = fieldCenterY + panelRadius * 0.15;
    gameOverLayer.addChild(scoreValue);
    gameOverLayer._scoreValue = scoreValue;

    const btn = new Container();
    const btnWidth = fieldWidth * 0.65;
    const btnHeight = fieldWidth * 0.13;
    const btnBg = new Graphics();
    btnBg.roundRect(-btnWidth / 2 + 3, -btnHeight / 2 + 3, btnWidth, btnHeight, btnHeight / 2);
    btnBg.fill({ color: 0x000000, alpha: 0.2 });
    btnBg.roundRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, btnHeight / 2);
    btnBg.fill(0x4caf50);
    btnBg.stroke({ color: 0xffffff, width: 3 });
    btn.addChild(btnBg);

    const btnText = new Text({
        text: 'ИГРАТЬ СНОВА',
        style: {
            fontFamily: 'Pacifico',
            fontSize: btnHeight * 0.4,
            fill: 0xffffff,
            align: 'center',
            dropShadow: {
                color: 0x000000,
                alpha: 0.5,
                blur: 2,
                distance: 1,
                angle: Math.PI / 4,
            },
        },
    });
    btnText.anchor.set(0.5);
    btn.addChild(btnText);

    btn.x = fieldCenterX;
    btn.y = fieldCenterY + panelRadius * 0.55;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    btn.on('pointerdown', (e) => e.stopPropagation());
    btn.on('pointerup', (e) => {
        e.stopPropagation();
        if (gameOverCallback) gameOverCallback();
    });
    gameOverLayer.addChild(btn);

    const rescueBtn = new Container();
    const rescueWidth = fieldWidth * 0.65;
    const rescueHeight = fieldWidth * 0.13;
    const rescueBg = new Graphics();
    rescueBg.roundRect(-rescueWidth / 2 + 3, -rescueHeight / 2 + 3, rescueWidth, rescueHeight, rescueHeight / 2);
    rescueBg.fill({ color: 0x000000, alpha: 0.2 });
    rescueBg.roundRect(-rescueWidth / 2, -rescueHeight / 2, rescueWidth, rescueHeight, rescueHeight / 2);
    rescueBg.fill(0xffaa00);
    rescueBg.stroke({ color: 0xffffff, width: 3 });
    rescueBtn.addChild(rescueBg);

    const iconSize = rescueHeight * 0.4;
    const iconX = -rescueWidth / 2 + rescueHeight * 0.6;
    const playIcon = new Graphics();
    playIcon.moveTo(iconX, -iconSize / 2);
    playIcon.lineTo(iconX + iconSize, 0);
    playIcon.lineTo(iconX, iconSize / 2);
    playIcon.fill(0x000000);
    rescueBtn.addChild(playIcon);

    const rescueText = new Text({
        text: 'ПОЛУЧИТЬ МОЛОТОК',
        style: {
            fontFamily: 'Pacifico',
            fontSize: rescueHeight * 0.3,
            fill: 0x000000,
            align: 'center',
            dropShadow: {
                color: 0xffffff,
                alpha: 0.5,
                blur: 2,
                distance: 1,
                angle: Math.PI / 4,
            },
        },
    });
    rescueText.anchor.set(0.5);
    rescueText.x = iconSize * 0.8;
    rescueBtn.addChild(rescueText);

    rescueBtn.x = fieldCenterX;
    rescueBtn.y = fieldCenterY + panelRadius * 0.55 + btnHeight * 1.3;
    rescueBtn.eventMode = 'static';
    rescueBtn.cursor = 'pointer';

    rescueBtn.on('pointerdown', (e) => e.stopPropagation());
    rescueBtn.on('pointerup', (e) => {
        e.stopPropagation();
        if (rescueCallback) rescueCallback();
    });
    gameOverLayer.addChild(rescueBtn);

    const rescueHint = new Text({
        text: 'Доступно один раз',
        style: {
            fontFamily: 'Pacifico',
            fontSize: fieldWidth * 0.03,
            fill: 0x999999,
            align: 'center',
        },
    });
    rescueHint.anchor.set(0.5);
    rescueHint.x = fieldCenterX;
    rescueHint.y = rescueBtn.y + rescueHeight * 0.7;
    gameOverLayer.addChild(rescueHint);

    gameOverLayer._rescueBtn = rescueBtn;
    gameOverLayer._rescueHint = rescueHint;

    uiLayer.addChild(gameOverLayer);
}

export function showGameOver(score, canRescue) {
    if (!gameOverLayer) return;
    gameOverLayer._scoreValue.text = String(score);

    if (gameOverLayer._rescueBtn) {
        gameOverLayer._rescueBtn.visible = canRescue;
    }
    if (gameOverLayer._rescueHint) {
        gameOverLayer._rescueHint.visible = canRescue;
    }

    gameOverLayer.visible = true;
}

export function hideGameOver() {
    if (gameOverLayer) gameOverLayer.visible = false;
}

export function isGameOverVisible() {
    return gameOverLayer && gameOverLayer.visible;
}

export function showNewRecord() {
    if (!bestText) return;
    const l = getLayout();

    // 1. Звезда + подсветка рекорда на 3 секунды
    if (recordStar) {
        recordStar.visible = true;
        recordStar.alpha = 0;
        recordStar.scale.set(0.5);
        recordStar.x = bestText.x + bestText.width + l.cellSize * 0.12;
        recordStar.y = bestText.y;
    }
    recordHighlightEnd = performance.now() + 3000;
    recordTween = { startTime: performance.now(), duration: 400 };

    // 2. Крупная надпись в центре
    const centerX = l.screenW / 2;
    const centerY = l.screenH * 0.35;

    const big = new Text({
        text: 'НОВЫЙ РЕКОРД!',
        style: {
            fontFamily: 'Pacifico',
            fontSize: l.cellSize * 1.0,
            fill: 0xFFD54F,
            align: 'center',
            dropShadow: {
                color: 0x000000,
                alpha: 0.6,
                blur: 6,
                distance: 2,
                angle: Math.PI / 4,
            },
        },
    });
    big.anchor.set(0.5);
    big.x = centerX;
    big.y = centerY;
    big.scale.set(0);
    big.alpha = 0;
    uiLayer.addChild(big);

    const startTime = performance.now();
    const total = 1800;

    const tick = () => {
        const now = performance.now();
        const elapsed = now - startTime;
        const t = elapsed / total;
        if (t >= 1) {
            uiLayer.removeChild(big);
            big.destroy();
            app.ticker.remove(tick);
            return;
        }
        if (t < 0.2) {
            const k = t / 0.2;
            big.scale.set(1.15 * k);
            big.alpha = k;
        } else if (t < 0.75) {
            big.scale.set(1.15 - 0.15 * ((t - 0.2) / 0.55));
            big.alpha = 1;
        } else {
            const k = (t - 0.75) / 0.25;
            big.alpha = 1 - k;
            big.y = centerY - l.cellSize * 1.5 * k;
            big.scale.set(1 + 0.2 * k);
        }
    };
    app.ticker.add(tick);
}

function animateUI() {
    if (Math.abs(targetDisplayScore - displayScore) < 0.5) {
        displayScore = targetDisplayScore;
    } else {
        displayScore += (targetDisplayScore - displayScore) * 0.15;
    }

    if (scoreText) {
        scoreText.text = String(Math.round(displayScore));
    }

    if (hammerIcon) {
        if (getHasHammer()) {
            hammerIcon.alpha = 1;
            const t = performance.now() / 400;
            const scale = 1 + Math.sin(t) * 0.1;
            hammerIcon.scale.set(scale);
        } else {
            hammerIcon.alpha = 0;
        }
    }

    if (comboText && comboText.visible) {
        const base = comboText._fitScale || 1;
        if (comboTween) {
            const t = Math.min((performance.now() - comboTween.startTime) / comboTween.duration, 1);
            let s;
            if (t < 0.5) s = 0.6 + (1.15 - 0.6) * (t / 0.5);
            else s = 1.15 - 0.15 * ((t - 0.5) / 0.5);
            comboText.scale.set(s * base);
            if (t >= 1) {
                comboText.scale.set(base);
                comboTween = null;
            }
        } else {
            const t = performance.now() / 700;
            const s = base * (1 + Math.sin(t) * 0.05);
            comboText.scale.set(s);
        }
    }

    // Звезда и подсветка нового рекорда
    if (recordStar && recordStar.visible) {
        if (recordTween) {
            const t = Math.min((performance.now() - recordTween.startTime) / recordTween.duration, 1);
            const s = 0.5 + (1.15 - 0.5) * t;
            recordStar.scale.set(s);
            recordStar.alpha = t;
            if (t >= 1) {
                recordStar.scale.set(1);
                recordStar.alpha = 1;
                recordTween = null;
            }
        }
        const pulse = 1 + Math.sin(performance.now() / 300) * 0.15;
        recordStar.scale.set(pulse);

        if (performance.now() < recordHighlightEnd) {
            bestText.style.fill = 0xFFD54F;
        } else {
            bestText.style.fill = 0xffffff;
            recordStar.visible = false;
        }
    }
}

export function drawUI() {
    if (!scoreText) return;
    targetDisplayScore = getTotalScore();
    bestText.text = 'Рекорд: ' + getBestScore();

    if (recordStar && recordStar.visible) {
        const l = getLayout();
        recordStar.x = bestText.x + bestText.width + l.cellSize * 0.12;
        recordStar.y = bestText.y;
    }

    const combo = getComboLines();
    let label = '';
    if (combo === 2) label = 'КОМБО';
    else if (combo >= 3) {
        const idx = Math.min(combo - 3, SPECIAL_REWARDS.length - 1);
        const reward = SPECIAL_REWARDS[idx];
        if (reward) label = reward.name;
    }

    if (comboText) {
        if (label === '') {
            comboText.visible = false;
            comboLabel = '';
            comboText._fitScale = 1;
        } else if (label !== comboLabel) {
            comboLabel = label;
            comboText.text = label;
            comboText.visible = true;
            const maxW = comboText._maxWidth || 200;
            const fit = comboText.width > maxW ? maxW / comboText.width : 1;
            comboText._fitScale = fit;
            comboText.scale.set(fit);
            comboTween = { startTime: performance.now(), duration: 250 };
        }
    }
}