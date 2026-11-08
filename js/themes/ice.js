export const iceTheme = {
    id: 'ice',
    name: 'Лёд',
    background: 0xd8eef5,
    boardBg: 0xc0e0ec,
    gridColor: 0x90c0d0,

    palette: [0xa8d8f0],

    block: {
        cornerRadius: 10,
        strokeColor: 0xffffff,
        strokeWidth: 1,
        alpha: 0.85,
        shadow: { color: 0x4080a0, alpha: 0.25, offsetX: 0, offsetY: 2 },
        edgeHighlight: true,
        bevel: false,
        innerStroke: null,
        innerStrokeStyle: null,
    },

    highlight: {
        valid:   { color: 0xffffff, alpha: 0.6 },
        invalid: { color: 0xe07a5f, alpha: 0.4 },
        line:    { color: 0xffffff, alpha: 0.5, blockColor: 0xffffff, blockAlpha: 0.7 },
    },

    floatColor: 0x4080a0,
    dieEffect: { type: 'melt', duration: 450, scaleTo: 0.5 },
    flashCells: { color: 0xffffff, alpha: 0.8, duration: 400 },
};