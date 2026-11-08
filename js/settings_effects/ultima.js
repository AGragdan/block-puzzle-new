import { triggerBgFade } from '../effects.js';

export const ultimaEffect = {
    flash: { color: 0xffffff, alpha: 0.6, duration: 500 },
    shake: { intensity: 18, duration: 600 }, // Еще сильнее
    particles: { count: 50, speed: 20, color: 0xff3366 },
    shockwave: true,
    extra: () => {
        triggerBgFade(0xaa0044, 3000);
    }
};