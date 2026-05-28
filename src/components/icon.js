/**
 * components/icon.js
 *
 * Sistema de iconos de Mesa Mediterránea.
 *
 *  - Comida / ingredientes → **pack PNG propio** (ilustraciones pintadas a mano,
 *    en /public/icons). Es la capa preferente y funciona OFFLINE (sin CDN).
 *    Se resuelve por dos vías:
 *      1. Nombre directo del pack       → foodIcon('ramen')
 *      2. Emoji mapeado al pack         → foodIcon('🍗')  → pollo.png
 *
 *  - Si un emoji no tiene PNG propio, cae a **Iconify** (streamline-emojis /
 *    openmoji) para no dejar huecos. Esta capa depende del CDN de Iconify.
 *
 *  - UI line icons (atrás, cámara, compartir…) usan **iconoir** (MIT) vía uiIcon().
 *
 *  - Último recurso: el carácter crudo, para que la UI nunca quede en blanco.
 *
 * Uso:
 *   import { foodIcon, uiIcon } from '../components/icon.js';
 *   `${foodIcon('ramen', { size: 56 })}`   // pack: /icons/ramen.png
 *   `${foodIcon('🍗', { size: 22 })}`       // pack: /icons/pollo.png
 *   `${foodIcon('🍕', { size: 22 })}`       // fallback iconify (sin PNG propio)
 *   `${uiIcon('camera', { size: 18 })}`     // iconoir:camera
 */

// ── Pack PNG propio ────────────────────────────────────────────────────────
// Ruta base donde Vite sirve /public. Los nombres coinciden con los archivos
// de /public/icons (sin la extensión .png).

const ICON_BASE = '/icons/';

/** Nombres de archivo disponibles en /public/icons (sin .png). */
const PACK = new Set([
  // Proteínas
  'pollo', 'solomillo', 'jamon', 'bacon', 'embutidos', 'pescado', 'lata_atun', 'huevo',
  // Lácteos
  'leche', 'queso', 'mantequilla', 'yogur', 'nata',
  // Pan / cereales / pasta
  'pan', 'croissant', 'harina', 'arroz', 'pasta', 'espaguettis', 'legumbres',
  'frutos_secos', 'levadura',
  // Verduras
  'lechuga', 'espinacas', 'brocoli', 'zanahoria', 'tomates', 'pimiento', 'calabacin',
  'calabaza', 'berengena', 'cebolla', 'ajo', 'ajos_tiernos', 'champinones', 'chiles',
  'pepinillos', 'aguacate', 'patatas',
  // Fruta
  'limon', 'manzana', 'pera', 'platanos', 'uvas', 'mango',
  // Despensa / condimentos / dulce
  'tomate_frito', 'bote_garbanzos', 'tarro_olivas', 'salsa_soja', 'aceite', 'vinagre',
  'sal', 'azucar', 'pimienta', 'chocolate',
  // Bebidas
  'vino_tinto', 'vino_blanco',
  // Platos preparados
  'ramen', 'taco', 'hamburguesa', 'gyozas', 'tempura', 'pad_thai', 'croquetas',
  'focaccia', 'cous_cous', 'arroz_tres_delicias', 'guiso_carne', 'crema_calabaza',
]);

// ── Emoji → archivo del pack ───────────────────────────────────────────────
// Permite que los datos existentes (que guardan un emoji unicode) se pinten con
// el icono PNG correspondiente sin migrar nada.

const EMOJI_TO_PNG = {
  // Proteínas
  '🍗': 'pollo',
  '🥩': 'solomillo',
  '🥓': 'bacon',
  '🐟': 'pescado',
  '🐠': 'pescado',
  '🍤': 'tempura',
  '🥚': 'huevo',
  '🍳': 'huevo',

  // Lácteos
  '🥛': 'leche',
  '🧀': 'queso',
  '🧈': 'mantequilla',
  '🍶': 'salsa_soja',

  // Pan / cereales / pasta
  '🍞': 'pan',
  '🥖': 'pan',
  '🥐': 'croissant',
  '🌾': 'harina',
  '🫓': 'focaccia',
  '🍚': 'arroz',
  '🍝': 'espaguettis',

  // Legumbres / frutos secos
  '🫘': 'legumbres',
  '🥜': 'frutos_secos',
  '🌰': 'frutos_secos',

  // Verduras
  '🥗': 'lechuga',
  '🥬': 'espinacas',
  '🥦': 'brocoli',
  '🥕': 'zanahoria',
  '🍅': 'tomates',
  '🥒': 'calabacin',
  '🌶': 'chiles',
  '🌶️': 'chiles',
  '🫑': 'pimiento',
  '🍆': 'berengena',
  '🧄': 'ajo',
  '🧅': 'cebolla',
  '🥑': 'aguacate',
  '🥔': 'patatas',
  '🫒': 'tarro_olivas',
  '🎃': 'calabaza',

  // Fruta
  '🍋': 'limon',
  '🍎': 'manzana',
  '🍏': 'manzana',
  '🍐': 'pera',
  '🍇': 'uvas',
  '🍌': 'platanos',
  '🥭': 'mango',

  // Despensa / condimentos / dulce
  '🥫': 'tomate_frito',
  '🍫': 'chocolate',
  '🧂': 'sal',

  // Bebidas
  '🍷': 'vino_tinto',
  '🥂': 'vino_blanco',

  // Platos preparados
  '🍔': 'hamburguesa',
  '🌮': 'taco',
  '🥟': 'gyozas',
  '🍜': 'ramen',
  '🍛': 'arroz_tres_delicias',
  '🥘': 'guiso_carne',
  '🍲': 'guiso_carne',
  '🥣': 'crema_calabaza',
};

// ── Listas para los selectores de icono (orden curado) ─────────────────────
// Se usan en los pickers de receta-nueva / nevera / home. Guardamos el nombre
// del pack en el campo `emoji` existente (foodIcon entiende ambos formatos).

export const ICON_PLATOS = [
  'ramen', 'taco', 'hamburguesa', 'gyozas', 'tempura', 'pad_thai', 'croquetas',
  'focaccia', 'cous_cous', 'arroz_tres_delicias', 'guiso_carne', 'crema_calabaza',
];

export const ICON_INGREDIENTES = [
  // Proteínas
  'pollo', 'solomillo', 'jamon', 'bacon', 'embutidos', 'pescado', 'lata_atun', 'huevo',
  // Lácteos
  'leche', 'queso', 'mantequilla', 'yogur', 'nata',
  // Pan / cereales / pasta
  'pan', 'croissant', 'harina', 'arroz', 'pasta', 'espaguettis', 'legumbres',
  'frutos_secos', 'levadura',
  // Verduras
  'lechuga', 'espinacas', 'brocoli', 'zanahoria', 'tomates', 'pimiento', 'calabacin',
  'calabaza', 'berengena', 'cebolla', 'ajo', 'ajos_tiernos', 'champinones', 'chiles',
  'pepinillos', 'aguacate', 'patatas',
  // Fruta
  'limon', 'manzana', 'pera', 'platanos', 'uvas', 'mango',
  // Despensa / condimentos / dulce
  'tomate_frito', 'bote_garbanzos', 'tarro_olivas', 'salsa_soja', 'aceite', 'vinagre',
  'sal', 'azucar', 'pimienta', 'chocolate',
  // Bebidas
  'vino_tinto', 'vino_blanco',
];

/** Pack completo (platos primero) para selectores generales. */
export const ICON_PICK_ALL = [...ICON_PLATOS, ...ICON_INGREDIENTES];

// ── Fallback Iconify · emojis sin PNG propio ───────────────────────────────
// Solo se consultan cuando el pack no cubre el emoji. Nombres validados contra
// la API de Iconify. (Esta capa requiere conexión: carga desde el CDN.)

const TO_STREAMLINE = {
  '🍖': 'streamline-emojis:meat-on-bone',
  '🍙': 'streamline-emojis:rice-ball',
  '🍕': 'streamline-emojis:pizza-1',
  '🍟': 'streamline-emojis:french-fries',
  '🍣': 'streamline-emojis:sushi',
  '🍯': 'streamline-emojis:honey-pot',
  '🍊': 'streamline-emojis:tangerine',
  '🍓': 'streamline-emojis:strawberry-1',
  '🍒': 'streamline-emojis:cherries',
  '🍑': 'streamline-emojis:peach',
  '🍉': 'streamline-emojis:watermelon-1',
  '🍈': 'streamline-emojis:melon-1',
  '🍪': 'streamline-emojis:cookie',
  '🍦': 'streamline-emojis:soft-ice-cream-1',
  '🍨': 'streamline-emojis:shaved-ice',
  '🍰': 'streamline-emojis:shortcake-1',
  '🎂': 'streamline-emojis:birthday-cake-1',
  '🍮': 'streamline-emojis:custard',
  '🍩': 'streamline-emojis:doughnut-1',
  '🍬': 'streamline-emojis:candy',
  '☕': 'streamline-emojis:hot-beverage-1',
  '🍵': 'streamline-emojis:teacup-without-handle',
  '🍺': 'streamline-emojis:beer-mug',
  '🍻': 'streamline-emojis:clinking-beer-mugs',
  '🍾': 'streamline-emojis:bottle-with-popping-cork',
  '🍸': 'streamline-emojis:cocktail-glass',
  '🍹': 'streamline-emojis:tropical-drink',
  '🍼': 'streamline-emojis:baby-bottle',
  '🥃': 'streamline-emojis:clinking-glasses-2',
};

const TO_OPENMOJI = {
  '🦐': 'openmoji:shrimp',
  '🦞': 'openmoji:lobster',
  '🦀': 'openmoji:crab',
  '🥨': 'openmoji:pretzel',
  '🥝': 'openmoji:kiwi-fruit',
  '🍍': 'openmoji:pineapple',
  '🥥': 'openmoji:coconut',
  '🌽': 'openmoji:ear-of-corn',
  '🍱': 'openmoji:bento-box',
  '🥪': 'openmoji:sandwich',
  '🌭': 'openmoji:hot-dog',
  '🌯': 'openmoji:burrito',
  '🥙': 'openmoji:stuffed-flatbread',
  '🥠': 'openmoji:fortune-cookie',
  '🥡': 'openmoji:takeout-box',
  '🍽': 'openmoji:fork-and-knife-with-plate',
  '🍽️': 'openmoji:fork-and-knife-with-plate',
  '🥢': 'openmoji:chopsticks',
  '🍴': 'openmoji:fork-and-knife',
  '🥄': 'openmoji:spoon',
  '🍿': 'openmoji:popcorn',
  '🥧': 'openmoji:pie',
  '🧊': 'openmoji:ice-cube',
  '🛒': 'openmoji:shopping-cart',
  '📅': 'openmoji:calendar',
  '🗓': 'openmoji:spiral-calendar',
  '🗓️': 'openmoji:spiral-calendar',
};

// ── UI emoji → iconoir mapping ─────────────────────────────────────────────

const UI_NAMES = {
  camera:       'iconoir:camera',
  share:        'iconoir:share-android',
  edit:         'iconoir:edit-pencil',
  trash:        'iconoir:trash',
  plus:         'iconoir:plus',
  check:        'iconoir:check',
  back:         'iconoir:arrow-left',
  refresh:      'iconoir:refresh',
  close:        'iconoir:xmark',
  play:         'iconoir:play',
  pause:        'iconoir:pause',
  clock:        'iconoir:clock',
  flame:        'iconoir:flame',
  euro:         'iconoir:euro',
  calendar:     'iconoir:calendar',
  warning:      'iconoir:warning-circle',
  sparkles:     'iconoir:sparks',
  shake:        'iconoir:smartphone-shake',
  bell:         'iconoir:bell',
  search:       'iconoir:search',
  dots:         'iconoir:more-horiz',
  chevron:      'iconoir:nav-arrow-right',
};

// ── API ────────────────────────────────────────────────────────────────────

/**
 * Resuelve el nombre de archivo del pack a partir de un valor que puede ser
 * un nombre del pack ('ramen') o un emoji ('🍗'). Devuelve null si no hay PNG.
 */
function packName(value) {
  if (PACK.has(value)) return value;
  const mapped = EMOJI_TO_PNG[value];
  return mapped && PACK.has(mapped) ? mapped : null;
}

/**
 * Renderiza un icono de comida / ingrediente.
 *
 *   1. Pack PNG propio (por nombre o por emoji mapeado) — preferente, offline.
 *   2. Fallback Iconify (streamline / openmoji) — emojis sin PNG propio.
 *   3. Carácter crudo — para lo desconocido.
 *
 * @param {string} value  Nombre del pack ('ramen') o emoji ('🍗')
 * @param {{ size?: number, class?: string, color?: string }} opts
 * @returns {string} HTML listo para innerHTML / template literals
 */
export function foodIcon(value, opts = {}) {
  if (!value) return '';
  const { size = 24, class: cls = '', color } = opts;

  // 1) Pack PNG propio
  const name = packName(value);
  if (name) {
    return `<img class="ico-food ${cls}" src="${ICON_BASE}${name}.png" width="${size}" height="${size}" alt="" aria-hidden="true" loading="lazy" decoding="async" style="object-fit:contain;display:inline-block;vertical-align:middle" />`;
  }

  // 2) Fallback Iconify
  const iconName = TO_STREAMLINE[value] || TO_OPENMOJI[value];
  if (iconName) {
    const colorStyle = color ? `;color:${color}` : '';
    return `<iconify-icon class="ico-food ${cls}" icon="${iconName}" width="${size}" height="${size}" aria-hidden="true" style="display:inline-flex;vertical-align:middle${colorStyle}"></iconify-icon>`;
  }

  // 3) Carácter crudo
  return `<span class="emoji-fallback ${cls}" aria-hidden="true" style="font-size:${size}px;line-height:1;display:inline-flex;align-items:center;justify-content:center">${value}</span>`;
}

/**
 * Renderiza un icono de línea de UI (iconoir). Acepta una clave semántica de
 * UI_NAMES o un id completo de iconify (p.ej. "iconoir:bell"). Usa currentColor.
 *
 * @param {string} key   Nombre semántico o id iconify completo
 * @param {{ size?: number, class?: string, color?: string }} opts
 */
export function uiIcon(key, opts = {}) {
  if (!key) return '';
  const { size = 20, class: cls = '', color } = opts;
  const iconName = key.includes(':') ? key : UI_NAMES[key];
  if (!iconName) return '';
  const colorStyle = color ? `;color:${color}` : '';
  return `<iconify-icon class="ico-ui ${cls}" icon="${iconName}" width="${size}" height="${size}" aria-hidden="true" style="display:inline-flex;vertical-align:middle${colorStyle}"></iconify-icon>`;
}

/**
 * Normaliza un valor a su clave de icono canónica: si es un emoji con PNG
 * propio devuelve el nombre del pack; si ya es un nombre del pack lo deja
 * igual. Útil para marcar el icono seleccionado en los pickers cuando los
 * datos antiguos guardaban un emoji unicode.
 *
 * @param {string} value
 * @returns {string}
 */
export function iconKey(value) {
  if (!value) return value;
  if (PACK.has(value)) return value;
  if (EMOJI_TO_PNG[value]) return EMOJI_TO_PNG[value];
  return value;
}

/** True si tenemos algún icono (pack PNG o iconify) para el valor dado. */
export function hasFoodIcon(value) {
  return !!(packName(value) || TO_STREAMLINE[value] || TO_OPENMOJI[value]);
}
