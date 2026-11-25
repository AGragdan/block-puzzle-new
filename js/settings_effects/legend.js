import { triggerBgFade } from '../effects.js';

export const legendEffect = {
    flash: { color: 0xFFD700, alpha: 0.85, duration: 650 },
    shake: { intensity: 25, duration: 700 },
    particles: { count: 70, speed: 22, color: 0xFFD700 },
    shockwave: true,
    extra: () => {
        triggerBgFade(0xAA8800, 3000);
    }
};