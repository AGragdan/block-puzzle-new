import { Container, Text, Graphics } from 'https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.mjs';
import { app } from './render.js';
import { getLayout } from './layout.js';
import { getTotalScore, getBestScore, getHasHammer } from './core.js';

export const uiLayer = new Container();

let scoreText = null;
let bestText = null;
let hammerIcon = null;
let gameOverLayer = null;
let gameOverCallback = null;

let displayScore = 0;
let targetDisplayScore = 0;

export function initUI(onRestart) {
    gameOverCallback = onRestart;
    app.stage.addChild(uiLayer);
    buildUI();
    buildGameOverScreen();
}

function buildUI() {
    const l = getLayout();

    // Крупный счёт (опущен ниже)
    scoreText = new Text({
        text: '0',
        style: {
            fontFamily: 'Pacifico',
            fontSize: l.cellSize * 1.2,
            fill: 0x99FF99,
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

    // Рекорд (слева вверху, по краю поля)
    bestText = new Text({
        text: 'Рекорд: 0',
        style: {
            fontFamily: 'Pacifico',
            fontSize: l.cellSize * 0.4,
            fill: 0xFF99FF,
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

    // Иконка молотка (слева, на уровне счёта)
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
    
    const overlay = new Graphics();
    overlay.rect(0, 0, l.screenW, l.screenH);
    overlay.fill({ color: 0x000000, alpha: 0.75 });
    gameOverLayer.addChild(overlay);
    
    const fieldCenterX = l.boardX + l.boardPixelSize / 2;
    const fieldWidth = l.boardPixelSize;
    
    // Заголовок
    const title = new Text({
        text: 'ИГРА ОКОНЧЕНА',
        style: {
            fontFamily: 'Pacifico',
            fontSize: fieldWidth * 0.07,
            fill: 0xff3366,
            align: 'center',
            dropShadow: {
                color: 0x000000,
                alpha: 0.6,
                blur: 5,
                distance: 2,
                angle: Math.PI / 4,
            },
        },
    });
    title.anchor.set(0.5);
    title.x = fieldCenterX;
    title.y = l.screenH * 0.3;
    gameOverLayer.addChild(title);
    
    // "ВАШ СЧЁТ:"
    const scoreLabel = new Text({
        text: 'ВАШ СЧЁТ:',
        style: {
            fontFamily: 'Pacifico',
            fontSize: fieldWidth * 0.04,
            fill: 0xffffff,
            align: 'center',
            dropShadow: {
                color: 0x000000,
                alpha: 0.6,
                blur: 4,
                distance: 1,
                angle: Math.PI / 4,
            },
        },
    });
    scoreLabel.anchor.set(0.5);
    scoreLabel.x = fieldCenterX;
    scoreLabel.y = l.screenH * 0.42;
    gameOverLayer.addChild(scoreLabel);
    
    // Число счёта
    const scoreValue = new Text({
        text: '0',
        style: {
            fontFamily: 'Pacifico',
            fontSize: fieldWidth * 0.09,
            fill: 0xffe066,
            align: 'center',
            dropShadow: {
                color: 0x000000,
                alpha: 0.6,
                blur: 5,
                distance: 2,
                angle: Math.PI / 4,
            },
        },
    });
    scoreValue.anchor.set(0.5);
    scoreValue.x = fieldCenterX;
    scoreValue.y = l.screenH * 0.49;
    gameOverLayer.addChild(scoreValue);
    gameOverLayer._scoreValue = scoreValue;
    
    // Кнопка
    const btn = new Container();
    const btnWidth = fieldWidth * 0.6;
    const btnHeight = fieldWidth * 0.12;
    const btnBg = new Graphics();
    btnBg.roundRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, btnHeight / 2);
    btnBg.fill(0x8ecae6);
    btnBg.stroke({ color: 0xffffff, width: 2 });
    btn.addChild(btnBg);
    
    const btnText = new Text({
        text: 'ИГРАТЬ СНОВА',
        style: {
            fontFamily: 'Pacifico',
            fontSize: btnHeight * 0.4,
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
    btnText.anchor.set(0.5);
    btn.addChild(btnText);
    
    btn.x = fieldCenterX;
    btn.y = l.screenH * 0.65;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    
    btn.on('pointerdown', (e) => e.stopPropagation());
    btn.on('pointerup', (e) => {
        e.stopPropagation();
        if (gameOverCallback) gameOverCallback();
    });
    
    gameOverLayer.addChild(btn);
    uiLayer.addChild(gameOverLayer);
}

export function showGameOver(score) {
    if (!gameOverLayer) return;
    gameOverLayer._scoreValue.text = String(score);
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