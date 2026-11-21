import { initRender, onResize, app, drawBoard, drawQueue, drawBackground, getCellColor } from './render.js';
import { updateLayout } from './layout.js';
import { initBoard, getHasHammer, isGameStuck, loadBestScore, isGameOver, resetGame, getTotalScore, findRescueCells } from './core.js';
import { initQueue, getQueue, replaceWithHammer, resetQueue, giveGuaranteedShape } from './pieces.js';
import { initDrag } from './drag.js';
import { initSound, playGameOver } from './sound.js';
import { 
    initEffects, 
    blockFlickerActive, 
    blockFlickerJustEnded, 
    resetBlockFlickerEnded, 
    bgOverrideColor,
    updateBackgroundEffect,
    startGrayWave,
    updateGrayWave,
    isGrayWaveActive,
    blockDie
} from './effects.js';
import { initUI, drawUI, uiLayer, showGameOver, hideGameOver } from './ui.js';
import { getCurrentTheme } from './theme.js';
import { initYSDK, gameReady, showRewardAd, showInterstitial } from './ysdk.js';

async function loadFont() {
    const font = new FontFace('Pacifico', 'url(fonts/russo_one.ttf)');
    document.fonts.add(font);
    try {
        await font.load();
        console.log('Шрифт Pacifico загружен');
    } catch (e) {
        console.error('Ошибка загрузки шрифта:', e);
    }
}

async function start() {
    await loadFont();
        initSound();
    await initYSDK();

    await initRender();
    initBoard();
    loadBestScore();
    initQueue();

    updateLayout(app.screen.width, app.screen.height);
    drawBackground();
    drawBoard();
    drawQueue();

    initEffects();

    let justRescued = false;
    let rescueAdUsed = false; // Флаг: реклама за молоток использована в этой игре
    let guaranteedGiven = 0;  // Сколько гарантированных фигур выдано в текущей серии застревания (0..3)

    const onRestart = () => {
        // Показываем интерстишл, потом начинаем новую игру
        showInterstitial(() => {
            hideGameOver();
            resetGame();
            resetQueue();
            justRescued = false;
            rescueAdUsed = false; // Сбрасываем флаг для новой игры
            guaranteedGiven = 0;  // Сбрасываем серию гарантированных фигур
            drawBoard();
            drawQueue();
            drawUI();
            checkStuck();
        });
    };

    const onRescue = () => {
        // Если реклама уже использована в этой игре — игнорируем
        if (rescueAdUsed) return;

        // Вызываем рекламу
        showRewardAd(
            () => {
                // Успех: даём молоток
                rescueAdUsed = true; // Запоминаем, что использовал
                hideGameOver();
                
                const queue = getQueue();
                let hasHammerInQueue = false;
                for (const shape of queue) {
                    if (shape.isHammer) {
                        hasHammerInQueue = true;
                        break;
                    }
                }
                
                if (!hasHammerInQueue && queue.length > 0) {
                    replaceWithHammer(0);
                }
                
                justRescued = true;
                drawBoard();
                drawQueue();
                drawUI();
            },
            () => {
                console.log('Не удалось показать рекламу');
            }
        );
    };

    initUI(onRestart, onRescue);
    drawUI();

    gameReady();

    const checkStuck = () => {
        const queue = getQueue();
        if (getHasHammer() && isGameStuck(queue) && !queue[0].isHammer) {
            replaceWithHammer(0);
            drawQueue();
        }
        
        if (justRescued) {
            let hasHammerInQueue = false;
            for (const shape of queue) {
                if (shape.isHammer) {
                    hasHammerInQueue = true;
                    break;
                }
            }
            if (hasHammerInQueue) {
                return;
            }
            justRescued = false;
        }
        
        if (isGameOver(queue)) {
            // «Второй шанс»: до 3 гарантированных фигур подряд, если молотка нет и реклама уже израсходована
            if (!getHasHammer() && rescueAdUsed && guaranteedGiven < 2) {
                guaranteedGiven++;
                giveGuaranteedShape();
                drawQueue();
                return;
            }

            playGameOver(); // <-- Звук проигрыша
            startGrayWave();
            setTimeout(() => {
                showGameOver(getTotalScore(), !rescueAdUsed);
            }, 1500);
        } else {
            // Ходы появились — серия застревания прервана
            guaranteedGiven = 0;
        }
    };

    checkStuck();

    initDrag((result) => {
        drawBoard();
        drawQueue();
        drawUI();
        checkStuck();
    });

    app.ticker.add(() => {
        if (blockFlickerActive) {
            drawBoard();
        }
        if (blockFlickerJustEnded) {
            drawBoard();
            resetBlockFlickerEnded();
        }
        
        if (isGrayWaveActive()) {
            updateGrayWave();
            drawBoard();
        }
        
        const bgChanged = updateBackgroundEffect();
        if (bgChanged) {
            drawBackground();
        }
    });

    onResize((w, h) => {
        updateLayout(w, h);
        drawBackground();
        drawBoard();
        drawQueue();

        uiLayer.removeChildren();
        initUI(onRestart, onRescue);
        drawUI();
    });
}

start();