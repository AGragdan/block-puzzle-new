import { Container, Text, Graphics } from '../libs/pixi.min.mjs';
import { app } from './render.js';
import { getLayout } from './layout.js';
import { getTotalScore, getBestScore, getHasHammer } from './core.js';

export const uiLayer = new Container();

let scoreText = null;
let bestText = null;
let hammerIcon = null;
let gameOverLayer = null;
let gameOverCallback = null;
let rescueCallback = null;

let displayScore = 0;
let targetDisplayScore = 0;

export function initUI(onRestart, onRescue) {
    gameOverCallback = onRestart;
    rescueCallback = onRescue;
    app.stage.addChild(uiLayer);
    buildUI();
    buildGameOverScreen();
}

function buildUI() {
    const l = getLayout();

    // Крупный счёт
    scoreText = new Text({
        text: '0',
        style: {
            fontFamily: 'Pacifico',
            fontSize: l.cellSize * 1.2,
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
    scoreText.x = l.boardX + l.boardPixelSize / 2;
    scoreText.y = l.boardY * 0.65;
    uiLayer.addChild(scoreText);

    // Рекорд
    bestText = new Text({
        text: 'Рекорд: 0',
        style: {
            fontFamily: 'Pacifico',
            fontSize: l.cellSize * 0.4,
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
    bestText.anchor.set(0, 0);
    bestText.x = l.boardX;
    bestText.y = l.boardY * 0.15;
    uiLayer.addChild(bestText);

    // Иконка молотка
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

    hammerIcon.x = l.boardX + iconSize * 0.5;
    hammerIcon.y = l.boardY * 0.65;
    hammerIcon.pivot.set(iconSize * 0.5, iconSize * 0.5);
    hammerIcon.alpha = 0;
    uiLayer.addChild(hammerIcon);

    displayScore = getTotalScore();
    targetDisplayScore = getTotalScore();
    scoreText.text = String(Math.round(displayScore));
    bestText.text = 'Рекорд: ' + getBestScore();

    app.ticker.add(animateUI);
}

function buildGameOverScreen() {
    const l = getLayout();
    
    gameOverLayer = new Container();
    gameOverLayer.visible = false;
    
    const fieldCenterX = l.boardX + l.boardPixelSize / 2;
    const fieldWidth = l.boardPixelSize;
    const fieldCenterY = l.boardY + l.boardPixelSize / 2;
    
    // 1. Затемнение (полупрозрачное, в тон)
    const overlay = new Graphics();
    overlay.rect(0, 0, l.screenW, l.screenH);
    overlay.fill({ color: 0x1a1a2e, alpha: 0.85 }); // Тёмно-фиолетовый, не чёрный
    gameOverLayer.addChild(overlay);
    
    // 2. Круглая панель (белая, с тенью)
    const panelRadius = fieldWidth * 0.45;
    const panel = new Graphics();
    // Тень
    panel.circle(fieldCenterX + 4, fieldCenterY + 4, panelRadius);
    panel.fill({ color: 0x000000, alpha: 0.3 });
    // Сама панель
    panel.circle(fieldCenterX, fieldCenterY, panelRadius);
    panel.fill(0xffffff);
    panel.stroke({ color: 0xffaa00, width: 4 });
    gameOverLayer.addChild(panel);
    
    // 3. Заголовок "ОЙ!"
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
    
    // 4. Подзаголовок "Места больше нет"
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
    
    // 5. Счёт (крупно, с золотым цветом)
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
    
    // 6. Кнопка "ИГРАТЬ СНОВА" (крупная, зелёная, с тенью)
    const btn = new Container();
    const btnWidth = fieldWidth * 0.65;
    const btnHeight = fieldWidth * 0.13;
    const btnBg = new Graphics();
    // Тень
    btnBg.roundRect(-btnWidth / 2 + 3, -btnHeight / 2 + 3, btnWidth, btnHeight, btnHeight / 2);
    btnBg.fill({ color: 0x000000, alpha: 0.2 });
    // Кнопка
    btnBg.roundRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, btnHeight / 2);
    btnBg.fill(0x4caf50); // Зелёный
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
    
    // 7. Кнопка "ПОЛУЧИТЬ МОЛОТОК" (оранжевая, с иконкой play)
    const rescueBtn = new Container();
    const rescueWidth = fieldWidth * 0.65;
    const rescueHeight = fieldWidth * 0.13;
    const rescueBg = new Graphics();
    // Тень
    rescueBg.roundRect(-rescueWidth / 2 + 3, -rescueHeight / 2 + 3, rescueWidth, rescueHeight, rescueHeight / 2);
    rescueBg.fill({ color: 0x000000, alpha: 0.2 });
    // Кнопка
    rescueBg.roundRect(-rescueWidth / 2, -rescueHeight / 2, rescueWidth, rescueHeight, rescueHeight / 2);
    rescueBg.fill(0xffaa00);
    rescueBg.stroke({ color: 0xffffff, width: 3 });
    rescueBtn.addChild(rescueBg);
    
    // Иконка play
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
    
    // 8. Подпись "Доступно один раз"
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
    
    // Показываем или скрываем кнопку "Получить молоток" и подпись
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
}

export function drawUI() {
    if (!scoreText) return;
    targetDisplayScore = getTotalScore();
    bestText.text = 'Рекорд: ' + getBestScore();
}