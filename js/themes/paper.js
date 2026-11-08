export const paperTheme = {
    id: 'paper',
    name: 'Бумага',
    background: 0xf5efe0,
    boardBg: 0xe8dfc8,
    gridColor: 0xc0b090,

    // Золотая середина: уже не блекло, но еще не кислотно
    palette: [
        0xf48fb1, // Мягкий, но насыщенный розовый
        0x81c784, // Сочный зеленый
        0xb39ddb, // Глубокий лавандовый
        0xffb74d, // Теплый янтарный
        0x64b5f6  // Ясный голубой
    ],

    block: {
        cornerRadius: 6,
        strokeColor: null,
        strokeWidth: 0,
        alpha: 1,
        // ВОЗВРАЩАЕМ ЭФФЕКТЫ:
        shadow: { color: 0x000000, alpha: 0.2, offsetX: 2, offsetY: 3 }, // Падающая тень
        edgeHighlight: true, // Блик на кромке
        bevel: true,         // Фаска (объем)
        innerStroke: null,
        innerStrokeStyle: null,
    },

    highlight: {
        valid:   { color: 0x8ecae6, alpha: 0.6 },
        invalid: { color: 0xe07a5f, alpha: 0.4 },
        line:    { color: 0xffffff, alpha: 0.45, blockColor: 0xffe066, blockAlpha: 0.6 },
    },

    floatColor: 0xFF66FF,
    dieEffect: { type: 'dissolve', duration: 400, scaleTo: 0.7 },
    flashCells: { color: 0xffe066, alpha: 0.7, duration: 400 },
};