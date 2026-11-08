export const neonTheme = {
    id: 'neon',
    name: 'Неон',
    background: 0x0a0a14,
    boardBg: 0x12121e,
    gridColor: 0x1a1a2e,
    background: 0x0a0a14,  // остаётся для app.background (на случай, если градиент не отрисуется)
    backgroundGradient: { top: 0x1a3a5a, bottom: 0x050510 },  // от голубого к тёмно-синему

    palette: [0x6ee7ff, 0xf472b6, 0xa3e635, 0xc084fc, 0xfb923c],

block: {
    cornerRadius: 0,
    strokeColor: 0xffffff,
    strokeWidth: 2,
    innerStroke: { color: 0xffffff, width: 1, alpha: 0.4 },
    innerStrokeStyle: 'all',
    shadow: null,
    edgeHighlight: false,
    bevel: false,
},

    highlight: {
        valid:   { color: 0x6ee7ff, alpha: 0.5 },
        invalid: { color: 0xf472b6, alpha: 0.4 },
        line:    { color: 0xffffff, alpha: 0.5, blockColor: 0x6ee7ff, blockAlpha: 0.7 },
    },
    
    floatColor: 0x6ee7ff,
    dieEffect: { type: 'flash', duration: 350, scaleTo: 1.2 },
    flashCells: { color: 0x6ee7ff, alpha: 0.9, duration: 350 },
};