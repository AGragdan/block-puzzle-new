import { triggerBgFade, triggerBgFlicker } from '../effects.js';

export const topEffect = {
    flash: { color: 0xFFFFFF, alpha: 0.95, duration: 750 },
    shake: { intensity: 30, duration: 900 },
    particles: { count: 100, speed: 26, color: 0xFFFFFF },
    shockwave: true,
    extra: () => {
        triggerBgFlicker(0xFFFFFF, 3, 600);
        triggerBgFade(0x000000, 2500);
    }
};