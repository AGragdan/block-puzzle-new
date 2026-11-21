import { superEffect } from './super.js';
import { megaEffect } from './mega.js';
import { ultraEffect } from './ultra.js';
import { hitEffect } from './hit.js';        // новое
import { perfectoEffect } from './perfecto.js';
import { ultimaEffect } from './ultima.js';
import { recordEffect } from './record.js';  // новое
import { thanosEffect } from './thanos.js';

export const EFFECTS = {
    'СУПЕР': superEffect,
    'МЕГА': megaEffect,
    'УЛЬТРА': ultraEffect,
    'ХИТ': hitEffect,          // новое
    'ПЕРФЕКТО': perfectoEffect,
    'УЛЬТИМА': ultimaEffect,
    'РЕКОРД': recordEffect,    // новое
    'ТАНОС': thanosEffect,
};