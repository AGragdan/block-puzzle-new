import { startBlockFlicker } from '../effects.js';

export const megaEffect = {
    flash: { color: 0xffe066, alpha: 0.4, duration: 350 },
    shake: { intensity: 8, duration: 350 },
    particles: { count: 15, speed: 10, color: 0xffe066 },
    shockwave: false,
    // Добавляем мерцание блоков
    extra: () => {
        startBlockFlicker(500); // 500 мс мерцания
    }
};