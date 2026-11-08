import { triggerBgFlicker } from '../effects.js';

export const ultraEffect = {
    flash: { color: 0xffe066, alpha: 0.5, duration: 400 },
    shake: { intensity: 10, duration: 400 },
    particles: { count: 30, speed: 15, color: 0xffe066 },
    shockwave: false,
    // Мерцание фона 3 раза
    extra: () => {
        triggerBgFlicker(0xff00ff, 3, 600);
    }
};