import { initRender, onResize, app, drawBoard, drawQueue, drawBackground } from './render.js';
import { updateLayout } from './layout.js';
import { initBoard, getHasHammer, isGameStuck, loadBestScore, isGameOver, resetGame, getTotalScore } from './core.js';
import { initQueue, getQueue, replaceWithHammer, resetQueue } from './pieces.js';
import { initDrag } from './drag.js';
import { 
    initEffects, 
    blockFlickerActive, 
    blockFlickerJustEnded, 
    resetBlockFlickerEnded, 
    bgOverrideColor,
    updateBackgroundEffect,
    startGrayWave,
    updateGrayWave,
    isGrayWaveActive
} from './effects.js';
import { initUI, drawUI, uiLayer, showGameOver, hideGameOver } from './ui.js';
import { getCurrentTheme } from './theme.js';

async function loadFont() {
    const font = new FontFace('Pacifico', 'url(js/fonts/SOROKA_0.ttf)');
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
    await initRender();
    initBoard();
    loadBestScore();
    initQueue();

    updateLayout(app.screen.width, app.screen.height);
    drawBackground();
    drawBoard();
    drawQueue();

    initEffects();
    
    // Коллбэк для перезапуска
    const onRestart = () => {
        hideGameOver();
        resetGame();
        resetQueue();
        drawBoard();
        drawQueue();
        drawUI();
        checkStuck();
    };

    initUI(onRestart);
    drawUI();

    const checkStuck = () => {
        const queue = getQueue();
        if (getHasHammer() && isGameStuck(queue) && !queue[0].isHammer) {
            replaceWithHammer(0);
            drawQueue();
        }
        
        // Проверка на Game Over
        if (isGameOver(queue)) {
            // Запускаем волну серости
            startGrayWave();
            // Через 1.5 секунды показываем экран
            setTimeout(() => {
                showGameOver(getTotalScore());
            }, 1500);
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
        const bgChanged = updateBackgroundEffect();
        if (bgChanged) {
            drawBackground();
        }
                // Волна серости
        if (isGrayWaveActive()) {
            updateGrayWave();
            drawBoard(); // Перерисовываем поле с новой "серостью"
        }
    });

    onResize((w, h) => {
        updateLayout(w, h);
        drawBackground();
        drawBoard();
        drawQueue();

        uiLayer.removeChildren();
        initUI(onRestart); // Передаем коллбэк
        drawUI();
    });
}

start();