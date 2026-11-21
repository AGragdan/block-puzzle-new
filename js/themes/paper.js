export const paperTheme = {
    id: 'paper',
    name: 'Бумага',
    background: 0xf4e8d0, // Оставляем твой спокойный фон
    boardBg: 0xe8dcc0,
    gridColor: 0xc0b090,

    // Чистые цвета, как тайлы Gardenscapes
    palette: [
        0x15b678, //зеленый
       // #d6837a, //персик
        0xeea621, //апельсин
        0x52a1fc, //небо
        0xEE82EE, //фиолет
        0xA52A2A,  //дерево
        0xe9492d, // красный
        0x8b0385 //пурпур
          // #A52A2A 
    ],

    block: {
        cornerRadius:0.15,
        strokeColor: null,
        strokeWidth: 0,
        alpha: 1,
        shadow: { color: 0x000000, alpha: 0.15, offsetX: 2, offsetY: 3 },
        edgeHighlight: true,
        //bevel: true,
        innerStroke: null,
        innerStrokeStyle: null,
    },

    highlight: {
        valid:   { color: 0x4da0c7, alpha: 0.4 },
        invalid: { color: 0xe07a5f, alpha: 0.4 },
        line:    { color: 0xffffff, alpha: 0.45, blockColor: 0xffe066, blockAlpha: 0.6 },
    },

    floatColor: 0xFFD54F, // Яркий золотисто-жёлтый (как груша)
    dieEffect: { type: 'dissolve', duration: 400, scaleTo: 0.7 },
    flashCells: { color: 0xffe066, alpha: 0.7, duration: 400 },
};