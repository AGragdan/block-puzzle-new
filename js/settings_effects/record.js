import { triggerBgFade } from '../effects.js';

export const recordEffect = {
    flash: { color: 0xffffff, alpha: 0.9, duration: 600 },
    shake: { intensity: 25, duration: 800 }, // Очень сильная тряска
    particles: { count: 80, speed: 25, color: 0xffffff },
    shockwave: true,
    extra: () => {
        triggerBgFade(0x000000, 2000); // Затемнение
    }
};