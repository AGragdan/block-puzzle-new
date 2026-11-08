import { THEMES } from './themes/index.js';

let currentIndex = 0;

export function getCurrentTheme() {
    return THEMES[currentIndex];
}

export function nextTheme() {
    currentIndex = (currentIndex + 1) % THEMES.length;
    return getCurrentTheme();
}

export function resetTheme() {
    currentIndex = 0;
    return getCurrentTheme();
}