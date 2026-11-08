import { triggerBgFade } from '../effects.js';

export const perfectoEffect = {
    flash: { color: 0xffaa00, alpha: 0.5, duration: 450 },
    shake: { intensity: 15, duration: 500 }, // Усилили тряску
    particles: { count: 40, speed: 18, color: 0xffaa00 },
    shockwave: true,
    // Плавная смена фона
    extra: () => {
        triggerBgFade(0x4400aa, 3000); // 3 секунды
    }
};