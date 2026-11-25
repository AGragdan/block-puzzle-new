import { triggerBgFade } from '../effects.js';

export const epicEffect = {
    flash: { color: 0xFF00FF, alpha: 0.7, duration: 550 },
    shake: { intensity: 20, duration: 600 },
    particles: { count: 60, speed: 20, color: 0xFF00FF },
    shockwave: true,
    extra: () => {
        triggerBgFade(0x6600CC, 3000);
    }
};