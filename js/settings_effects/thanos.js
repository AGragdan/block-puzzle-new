import { triggerBgFade } from '../effects.js';

export const thanosEffect = {
    flash: { color: 0xff3366, alpha: 0.8, duration: 600 },
    shake: { intensity: 25, duration: 800 }, // Максимальная тряска
    particles: { count: 80, speed: 25, color: 0xff3366 },
    shockwave: true,
    extra: () => {
        triggerBgFade(0x220022, 3000); // Темный фиолетовый
    }
};