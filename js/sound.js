let audioCtx = null;
let isUnlocked = false;
let isMuted = false;

export function initSound() {
    const unlock = () => {
        if (isUnlocked) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            isUnlocked = true;
            console.log('Звук разблокирован');
            
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
        } catch (e) {
            console.error('Не удалось создать AudioContext:', e);
        }
    };

    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (audioCtx && audioCtx.state === 'running') {
                audioCtx.suspend();
            }
        } else {
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }
    });
}

export function toggleMute() {
    isMuted = !isMuted;
    if (audioCtx) {
        if (isMuted) {
            audioCtx.suspend();
        } else {
            audioCtx.resume();
        }
    }
    return isMuted;
}

export function getMuted() {
    return isMuted;
}

// --- Вспомогательные функции для звука ---

// Чистый тон с плавным затуханием (синусоида — мягкая)
function playTone(freq, duration, volume = 0.3, slideTo = null) {
    if (!audioCtx || isMuted || audioCtx.state !== 'running') return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, audioCtx.currentTime + duration);
    }

    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// Белый шум (для "взрыва" или "удара")
function playNoise(duration, volume = 0.2, filterFreq = 1000) {
    if (!audioCtx || isMuted || audioCtx.state !== 'running') return;

    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    source.start();
}

// --- Звуковые события ---

// Установка фигуры (мягкий "поп")
export function playPlace() {
    playTone(600, 0.08, 0.2, 400);
}

// Удаление линии ("взрыв" + шум)
export function playLine() {
    playTone(300, 0.25, 0.25, 100);
    playNoise(0.15, 0.15, 800);
}

// Комбо (нарастающий "дзынь")
export function playCombo(level) {
    const baseFreq = 500 + (level * 60);
    playTone(baseFreq, 0.2, 0.2, baseFreq * 1.5);
}

// Получение / использование молотка ("удар")
export function playHammer() {
    playTone(150, 0.3, 0.35, 60);
    playNoise(0.1, 0.25, 500);
}

// Game Over (грустный нисходящий тон)
export function playGameOver() {
    playTone(350, 0.8, 0.3, 100);
}