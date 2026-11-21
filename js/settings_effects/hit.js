import { triggerBgFlicker } from '../effects.js';

export const hitEffect = {
    flash: { color: 0xff0000, alpha: 0.7, duration: 500 },
    shake: { intensity: 20, duration: 600 }, // Сильная тряска
    particles: { count: 60, speed: 22, color: 0xff0000 },
    shockwave: true,
    extra: () => {
        triggerBgFlicker(0xff0000, 4, 800); // Быстрое мерцание фона
    }
};