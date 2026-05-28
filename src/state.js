/**
 * state.js
 *
 * Single source of truth for the app. All screens read from here; all mutations
 * go through the helper functions so we can persist on change.
 *
 * Architecture note: we keep state as a plain object exported as `state`.
 * Components import it, read directly, and call mutators. Mutators trigger
 * subscribers (used by p5.js canvases to know when to redraw).
 *
 * PR2 will add an API module that pushes external data into this same state —
 * the existing screens won't need to change.
 */

// ── Sample/seed data ───────────────────────────────────────────────────────
// Used on first launch when storage is empty. Replace with real user data
// as soon as the user starts editing.

const SEED_TUPPERS = [
  {
    id: 'tupper_lun',
    dia: 'lunes',
    semana: '2025-W20',
    recetaId: 'rec_pollo_limon',
    nombre: 'Pollo al limón con arroz',
    tipoNutricional: 'proteina',
    tipoCocina: 'mediterraneo',
    cantidad: 'media',
    diasNevera: 4,
    calorias: 520,
    tiempoPrep: 40,
    notas: '',
    fotoUri: null,
    preparado: true,
  },
  {
    id: 'tupper_mar',
    dia: 'martes',
    semana: '2025-W20',
    recetaId: 'rec_garbanzos',
    nombre: 'Garbanzos con espinacas',
    tipoNutricional: 'verdura',
    tipoCocina: 'nacional',
    cantidad: 'media',
    diasNevera: 5,
    calorias: 410,
    tiempoPrep: 30,
    notas: '',
    fotoUri: null,
    preparado: true,
  },
  {
    id: 'tupper_mie',
    dia: 'miercoles',
    semana: '2025-W20',
    recetaId: 'rec_pollo_limon',
    nombre: 'Pollo al limón con arroz',
    tipoNutricional: 'proteina',
    tipoCocina: 'mediterraneo',
    cantidad: 'media',
    diasNevera: 4,
    calorias: 520,
    tiempoPrep: 40,
    notas: 'Sin sal el jueves',
    fotoUri: null,
    preparado: false,
  },
  {
    id: 'tupper_jue',
    dia: 'jueves',
    semana: '2025-W20',
    recetaId: 'rec_risotto',
    nombre: 'Risotto de calabaza',
    tipoNutricional: 'carbohidratos',
    tipoCocina: 'italiano',
    cantidad: 'media',
    diasNevera: 3,
    calorias: 540,
    tiempoPrep: 40,
    notas: '',
    fotoUri: null,
    preparado: false,
  },
  {
    id: 'tupper_vie',
    dia: 'viernes',
    semana: '2025-W20',
    recetaId: 'rec_salmon',
    nombre: 'Salmón con verduras al horno',
    tipoNutricional: 'proteina',
    tipoCocina: 'mediterraneo',
    cantidad: 'media',
    diasNevera: 3,
    calorias: 460,
    tiempoPrep: 35,
    notas: '',
    fotoUri: null,
    preparado: false,
  },
];

const SEED_RECETAS = [
  {
    id: 'rec_pollo_limon',
    nombre: 'Pollo al limón con quinoa',
    tipoNutricional: 'proteina',
    tipoCocina: 'mediterraneo',
    cantidad: 'media',
    diasNevera: 4,
    calorias: 485,
    tiempoPrep: 45,
    dificultad: 'fácil',
    emoji: '🍗',
    fotoUri: null,
    ingredientes: [
      { nombre: 'Pechuga de pollo', cantidad: '300g', precio: 4.50 },
      { nombre: 'Limón', cantidad: '2 ud', precio: 1.20 },
      { nombre: 'Ajo', cantidad: '3 dientes', precio: 0.80 },
      { nombre: 'Aceite de oliva', cantidad: '3 cdas', precio: 6.50 },
      { nombre: 'Romero', cantidad: 'al gusto', precio: 1.50 },
    ],
    instrucciones: 'Marinar el pollo con limón y ajo 30 min.\nCalentar aceite en sartén a fuego medio-alto.\nCocinar el pollo 15 min por cada lado hasta dorar.\nServir con quinoa cocida.',
  },
  {
    id: 'rec_garbanzos',
    nombre: 'Garbanzos con espinacas',
    tipoNutricional: 'verdura',
    tipoCocina: 'nacional',
    cantidad: 'media',
    diasNevera: 5,
    calorias: 410,
    tiempoPrep: 30,
    dificultad: 'fácil',
    emoji: '🫘',
    fotoUri: null,
    ingredientes: [
      { nombre: 'Garbanzos cocidos', cantidad: '2 botes', precio: 1.65 },
      { nombre: 'Espinacas frescas', cantidad: '300g', precio: 2.20 },
      { nombre: 'Ajo', cantidad: '2 dientes', precio: 0.80 },
      { nombre: 'Comino molido', cantidad: '1 cdta', precio: 1.40 },
    ],
    instrucciones: 'Sofreír el ajo en aceite de oliva.\nAñadir las espinacas hasta que reduzcan.\nIncorporar los garbanzos escurridos y el comino.\nSalpimentar y servir.',
  },
  {
    id: 'rec_farro',
    nombre: 'Farro y boniato asado',
    tipoNutricional: 'mixto',
    tipoCocina: 'mediterraneo',
    cantidad: 'media',
    diasNevera: 4,
    calorias: 520,
    tiempoPrep: 50,
    dificultad: 'media',
    emoji: '🥗',
    fotoUri: null,
    ingredientes: [
      { nombre: 'Farro', cantidad: '250g', precio: 3.80 },
      { nombre: 'Boniato', cantidad: '1 grande', precio: 1.90 },
      { nombre: 'Aceite de oliva', cantidad: '3 cdas', precio: 6.50 },
    ],
    instrucciones: 'Cocer el farro en agua salada 25 min.\nCortar el boniato en cubos, regar con aceite y asar a 200°C 30 min.\nMezclar farro y boniato. Salpimentar al gusto.',
  },
  {
    id: 'rec_risotto',
    nombre: 'Risotto de calabaza',
    tipoNutricional: 'carbohidratos',
    tipoCocina: 'italiano',
    cantidad: 'media',
    diasNevera: 3,
    calorias: 540,
    tiempoPrep: 40,
    dificultad: 'media',
    emoji: '🍚',
    fotoUri: null,
    ingredientes: [
      { nombre: 'Arroz arborio', cantidad: '250g', precio: 2.95 },
      { nombre: 'Calabaza', cantidad: '400g', precio: 2.50 },
      { nombre: 'Cebolla', cantidad: '1 ud', precio: 0.65 },
      { nombre: 'Caldo de verduras', cantidad: '1L', precio: 1.80 },
    ],
    instrucciones: 'Sofreír la cebolla y la calabaza troceada.\nAñadir el arroz y tostar 2 min.\nIr añadiendo caldo caliente poco a poco, removiendo constantemente.\nTerminar con parmesano rallado.',
  },
  {
    id: 'rec_salmon',
    nombre: 'Salmón con verduras al horno',
    tipoNutricional: 'proteina',
    tipoCocina: 'mediterraneo',
    cantidad: 'media',
    diasNevera: 3,
    calorias: 460,
    tiempoPrep: 35,
    dificultad: 'fácil',
    emoji: '🐟',
    fotoUri: null,
    ingredientes: [
      { nombre: 'Salmón fresco', cantidad: '400g', precio: 7.80 },
      { nombre: 'Calabacín', cantidad: '1 ud', precio: 1.45 },
      { nombre: 'Pimiento rojo', cantidad: '1 ud', precio: 1.30 },
      { nombre: 'Limón', cantidad: '1 ud', precio: 1.20 },
    ],
    instrucciones: 'Cortar las verduras en tiras y disponerlas en bandeja con aceite.\nColocar el salmón encima. Rociar con zumo de limón.\nHornear 25 min a 200°C.',
  },
];

const SEED_NEVERA = [
  { id: 'n1', nombre: 'Pechuga de pollo', cantidad: '600 g',  emoji: '🍗', categoria: 'proteina', diasRestantes: 3, nota: 'abierta hace 2 días' },
  { id: 'n2', nombre: 'Leche entera',     cantidad: '750 ml', emoji: '🥛', categoria: 'proteina', diasRestantes: 1, nota: 'abierta hace 3 días' },
  { id: 'n3', nombre: 'Brócoli',          cantidad: '1 ud',   emoji: '🥦', categoria: 'verdura',  diasRestantes: 5, nota: 'recién comprado' },
  { id: 'n4', nombre: 'Quinoa cocida',    cantidad: '300 g',  emoji: '🌾', categoria: 'carbohidratos', diasRestantes: 4, nota: 'tupper de cristal' },
  { id: 'n5', nombre: 'Huevos camperos',  cantidad: '6 ud',   emoji: '🥚', categoria: 'proteina', diasRestantes: 12, nota: '' },
  { id: 'n6', nombre: 'Tomate cherry',    cantidad: '300 g',  emoji: '🍅', categoria: 'verdura',  diasRestantes: 6, nota: '' },
];

// ── State object ───────────────────────────────────────────────────────────

export const state = {
  user: {
    nombre: 'Ramón Pérez',
    iniciales: 'RM',
    fotoUri: '/tupper.png',
    email: null,
    idioma: 'es',
  },
  semana: '2025-W20',
  selectedDay: 'miercoles',
  tuppers: SEED_TUPPERS,
  recetas: SEED_RECETAS,
  nevera: SEED_NEVERA,
  // Modo Batch — timers paralelos para la sesión de cocina actual.
  // Diseño basado en timestamps (no en tick): el estado solo muta en play/
  // pause/reset/complete. La UI calcula getTimerRemaining() en cada frame.
  timers: [
    { id: 't_pollo', label: 'Pollo al horno',     emoji: '🍗', totalSec: 900, pausedRemaining: 900, running: false, startedAt: null, completed: false },
    { id: 't_arroz', label: 'Arroz basmati',      emoji: '🍚', totalSec: 1200, pausedRemaining: 1200, running: false, startedAt: null, completed: false },
    { id: 't_broco', label: 'Brócoli al vapor',   emoji: '🥦', totalSec: 510, pausedRemaining: 510, running: false, startedAt: null, completed: false },
  ],
  // Lista de la compra — precios, comprados (persistente) y extras manuales.
  // Las llaves de prices/comprados son nombres en lower-case trimmed para
  // que coincidan con las cantidades derivadas de receta.
  compra: {
    // Precios seed: cubrimos todos los ingredientes de las recetas seed con
    // precios realistas de supermercado español. El usuario los puede editar
    // desde la pantalla de compra.
    prices: {
      'pechuga de pollo':     4.50,
      'limón':                1.20,
      'ajo':                  0.80,
      'aceite de oliva':      6.50,
      'romero':               1.50,
      'garbanzos cocidos':    1.65,
      'espinacas frescas':    2.20,
      'comino molido':        1.40,
      'farro':                3.80,
      'boniato':              1.90,
      'arroz arborio':        2.95,
      'calabaza':             2.50,
      'cebolla':              0.65,
      'caldo de verduras':    1.80,
      'salmón fresco':        7.80,
      'calabacín':            1.45,
      'pimiento rojo':        1.30,
    },
    comprados: {},   // { 'pechuga de pollo': true }
    extras: [],      // [{ id, nombre, cantidad, categoria, precio }]
  },
  // Histórico semanal del coste medio por tupper. Se usa para la gráfica
  // de líneas en Home > Stats. La semana actual se calcula al vuelo desde
  // los precios + tuppers vigentes, así que aquí solo guardamos las pasadas.
  history: [
    { week: '2025-W15', avgCost: 2.45, totalCost: 12.25, tuppers: 5 },
    { week: '2025-W16', avgCost: 3.10, totalCost: 15.50, tuppers: 5 },
    { week: '2025-W17', avgCost: 2.85, totalCost: 14.25, tuppers: 5 },
    { week: '2025-W18', avgCost: 3.30, totalCost: 16.50, tuppers: 5 },
    { week: '2025-W19', avgCost: 2.95, totalCost: 14.75, tuppers: 5 },
  ],
};

/** Defensive accessor — old persisted states may not have state.compra. */
function compraSlice() {
  if (!state.compra) state.compra = { prices: {}, comprados: {}, extras: [] };
  if (!state.compra.prices)    state.compra.prices = {};
  if (!state.compra.comprados) state.compra.comprados = {};
  if (!state.compra.extras)    state.compra.extras = [];
  return state.compra;
}

function compraKey(nombre) {
  return (nombre || '').toLowerCase().trim();
}

// ── Subscribers (used by p5.js canvases and live UI updates) ───────────────

const subscribers = new Set();

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function notify() {
  subscribers.forEach((fn) => {
    try { fn(state); } catch (err) { console.error('[state] subscriber error', err); }
  });
}

// ── Mutators ──────────────────────────────────────────────────────────────
// Every change to state goes through one of these. They persist + notify.

import { saveState } from './storage.js';

export async function setSelectedDay(dia) {
  state.selectedDay = dia;
  notify();
  await saveState(state);
}

export async function toggleTupperPreparado(id) {
  const t = state.tuppers.find((x) => x.id === id);
  if (!t) return;
  t.preparado = !t.preparado;
  notify();
  await saveState(state);
}

export async function setTupperNotas(id, notas) {
  const t = state.tuppers.find((x) => x.id === id);
  if (!t) return;
  t.notas = notas;
  notify();
  await saveState(state);
}

export async function setTupperFoto(id, fotoUri) {
  const t = state.tuppers.find((x) => x.id === id);
  if (!t) return;
  t.fotoUri = fotoUri;
  notify();
  await saveState(state);
}

export async function addRecetaToWeek(recetaId, dia) {
  const receta = state.recetas.find((r) => r.id === recetaId);
  if (!receta) return;
  const existing = state.tuppers.find((t) => t.dia === dia);
  if (existing) {
    Object.assign(existing, {
      recetaId,
      nombre: receta.nombre,
      emoji: receta.emoji,
      tipoNutricional: receta.tipoNutricional,
      tipoCocina: receta.tipoCocina,
      cantidad: receta.cantidad,
      diasNevera: receta.diasNevera,
      calorias: receta.calorias,
      tiempoPrep: receta.tiempoPrep,
      preparado: false,
    });
  } else {
    state.tuppers.push({
      id: `tupper_${dia}_${Date.now()}`,
      dia,
      semana: state.semana,
      recetaId,
      nombre: receta.nombre,
      emoji: receta.emoji,
      tipoNutricional: receta.tipoNutricional,
      tipoCocina: receta.tipoCocina,
      cantidad: receta.cantidad,
      diasNevera: receta.diasNevera,
      calorias: receta.calorias,
      tiempoPrep: receta.tiempoPrep,
      notas: '',
      fotoUri: null,
      preparado: false,
    });
  }
  state.selectedDay = dia;
  notify();
  await saveState(state);
}

export async function removeTupper(id) {
  state.tuppers = state.tuppers.filter((t) => t.id !== id);
  notify();
  await saveState(state);
}

/**
 * Create or replace a "comida libre" tupper for a day — no recipe attached.
 * The user can type whatever they're eating (e.g. "Macarrones con tomate y
 * una manzana") and pick basic metadata.
 */
export async function setManualTupper({
  dia, nombre, emoji,
  tipoNutricional, tipoCocina, cantidad,
  calorias, tiempoPrep, diasNevera,
}) {
  const data = {
    recetaId: null,
    nombre: (nombre || '').trim() || 'Comida libre',
    emoji: emoji || '🍱',
    tipoNutricional: tipoNutricional || 'mixto',
    tipoCocina: tipoCocina || 'nacional',
    cantidad: cantidad || 'media',
    diasNevera: Number(diasNevera) || 3,
    calorias: Number(calorias) || 0,
    tiempoPrep: Number(tiempoPrep) || 0,
    preparado: false,
  };
  const existing = state.tuppers.find((t) => t.dia === dia);
  if (existing) {
    Object.assign(existing, data);
  } else {
    state.tuppers.push({
      id: `tupper_${dia}_${Date.now()}`,
      dia,
      semana: state.semana,
      notas: '',
      fotoUri: null,
      ...data,
    });
  }
  state.selectedDay = dia;
  notify();
  await saveState(state);
}

/**
 * Update an existing recipe. Also propagates the visible fields to every
 * tupper that references this recipe so the week's plan stays in sync —
 * but preserves per-tupper state (notas, fotoUri, preparado).
 */
export async function updateReceta(id, fields) {
  const r = state.recetas.find((x) => x.id === id);
  if (!r) return;
  // Normalise numeric inputs that may arrive as strings from form controls
  const next = {
    ...fields,
    diasNevera: fields.diasNevera != null ? Number(fields.diasNevera) || 0 : r.diasNevera,
    calorias:   fields.calorias   != null ? Number(fields.calorias)   || 0 : r.calorias,
    tiempoPrep: fields.tiempoPrep != null ? Number(fields.tiempoPrep) || 0 : r.tiempoPrep,
  };
  Object.assign(r, next);

  // Propagate to existing tuppers without overriding per-tupper state
  state.tuppers.forEach((t) => {
    if (t.recetaId !== id) return;
    Object.assign(t, {
      nombre: r.nombre,
      emoji: r.emoji,
      tipoNutricional: r.tipoNutricional,
      tipoCocina: r.tipoCocina,
      cantidad: r.cantidad,
      diasNevera: r.diasNevera,
      calorias: r.calorias,
      tiempoPrep: r.tiempoPrep,
    });
  });

  notify();
  await saveState(state);
  return id;
}

export async function addReceta(receta) {
  const id = `rec_${Date.now()}`;
  const nueva = {
    id,
    nombre: receta.nombre?.trim() || 'Receta sin nombre',
    tipoNutricional: receta.tipoNutricional || 'mixto',
    tipoCocina: receta.tipoCocina || 'mediterraneo',
    cantidad: receta.cantidad || 'media',
    diasNevera: Number(receta.diasNevera) || 3,
    calorias: Number(receta.calorias) || 0,
    tiempoPrep: Number(receta.tiempoPrep) || 0,
    dificultad: receta.dificultad || 'media',
    emoji: receta.emoji || '🍽',
    fotoUri: null,
    ingredientes: Array.isArray(receta.ingredientes) ? receta.ingredientes : [],
    instrucciones: receta.instrucciones || '',
  };
  state.recetas.push(nueva);
  notify();
  await saveState(state);
  return id;
}

/**
 * Called after fetching recipes from TheMealDB. Merges API recipes with any
 * user-created recipes (those whose ids do NOT start with 'meal_').
 * Only runs once per install — subsequent launches load from Preferences.
 */
export async function loadTheMealDBRecipes(apiRecipes) {
  if (!Array.isArray(apiRecipes) || apiRecipes.length === 0) return;
  const userCreated = state.recetas.filter((r) => !r.id.startsWith('meal_'));
  state.recetas = [...userCreated, ...apiRecipes];
  notify();
  await saveState(state);
}

export async function addNeveraItem(item) {
  state.nevera.push({ id: `n${Date.now()}`, ...item });
  notify();
  await saveState(state);
}

export async function removeNeveraItem(id) {
  state.nevera = state.nevera.filter((x) => x.id !== id);
  notify();
  await saveState(state);
}

// ── Compra · mutators ────────────────────────────────────────────────────

export async function setItemPrice(nombre, precio) {
  const c = compraSlice();
  const key = compraKey(nombre);
  if (precio == null || precio === '' || Number.isNaN(Number(precio))) {
    delete c.prices[key];
  } else {
    c.prices[key] = Math.round(Number(precio) * 100) / 100;
  }
  // Also reflect on any manual extra with that nombre
  c.extras.forEach((e) => {
    if (compraKey(e.nombre) === key) e.precio = c.prices[key] ?? null;
  });
  notify();
  await saveState(state);
}

export async function toggleItemComprado(nombre) {
  const c = compraSlice();
  const key = compraKey(nombre);
  if (c.comprados[key]) delete c.comprados[key];
  else c.comprados[key] = true;
  notify();
  await saveState(state);
}

export async function addCompraExtra({ nombre, cantidad, categoria, precio }) {
  const c = compraSlice();
  const id = `cex${Date.now()}`;
  const p = (precio == null || precio === '' || Number.isNaN(Number(precio)))
    ? null
    : Math.round(Number(precio) * 100) / 100;
  c.extras.push({
    id,
    nombre: (nombre || '').trim(),
    cantidad: (cantidad || '').trim(),
    categoria: categoria || 'otros',
    precio: p,
  });
  if (p != null) c.prices[compraKey(nombre)] = p;
  notify();
  await saveState(state);
  return id;
}

export async function removeCompraExtra(id) {
  const c = compraSlice();
  c.extras = c.extras.filter((x) => x.id !== id);
  notify();
  await saveState(state);
}

// ── Selectors / derived values ────────────────────────────────────────────

/**
 * Returns analytics on the current week's tuppers used by the Home stats
 * canvas and the recommendations engine.
 */
export function getWeekStats() {
  const counts = {
    proteina: 0,
    carbohidratos: 0,
    verdura: 0,
    mixto: 0,
  };
  const cocinas = {};
  let totalKcal = 0;
  let preparados = 0;

  state.tuppers.forEach((t) => {
    if (t.tipoNutricional && counts[t.tipoNutricional] != null) {
      counts[t.tipoNutricional] += 1;
    }
    if (t.tipoCocina) {
      cocinas[t.tipoCocina] = (cocinas[t.tipoCocina] || 0) + 1;
    }
    totalKcal += t.calorias || 0;
    if (t.preparado) preparados += 1;
  });

  return {
    nutricional: counts,
    cocinas,
    totalKcal,
    preparados,
    total: state.tuppers.length,
  };
}

/**
 * Generates context-aware recommendations based on the week's plan.
 */
export function getRecommendations() {
  const stats = getWeekStats();
  const recs = [];

  if (stats.nutricional.verdura === 0) {
    recs.push({ kind: 'warn', text: 'Sin verdura esta semana' });
  }
  const cuisineCounts = Object.values(stats.cocinas);
  const maxCuisine = cuisineCounts.length ? Math.max(...cuisineCounts) : 0;
  if (maxCuisine >= 2) {
    const dominant = Object.entries(stats.cocinas).find(([, v]) => v === maxCuisine);
    if (dominant && maxCuisine >= 2) {
      recs.push({ kind: 'warn', text: `Cocina ${dominant[0]} repetida ${maxCuisine} veces` });
    }
  }
  const portions = new Set(state.tuppers.map((t) => t.cantidad));
  if (portions.size === 1 && state.tuppers.length >= 3) {
    recs.push({ kind: 'ok', text: 'Raciones equilibradas a lo largo de la semana' });
  }

  return recs;
}

/**
 * Builds the shopping list: ingredients from the week's recipes minus
 * what's already in Mi Nevera, PLUS user-added extras (manual: true).
 * Each item carries .precio (€) and .comprado (boolean) from state.compra.
 */
export function getShoppingList() {
  const c = compraSlice();
  const neveraNames = new Set(
    state.nevera.map((n) => n.nombre.toLowerCase().trim())
  );

  const grouped = { proteinas: [], verduras: [], otros: [] };
  const seen = new Set();

  state.tuppers.forEach((t) => {
    const receta = state.recetas.find((r) => r.id === t.recetaId);
    if (!receta) return;
    receta.ingredientes.forEach((ing) => {
      const key = compraKey(ing.nombre);
      if (seen.has(key)) return;
      seen.add(key);
      const inNevera = neveraNames.has(key);
      const item = {
        nombre: ing.nombre,
        cantidad: ing.cantidad,
        inNevera,
        precio: c.prices[key] ?? null,
        comprado: !!c.comprados[key],
        manual: false,
      };
      grouped[categoryFor(key)].push(item);
    });
  });

  // User-added extras
  c.extras.forEach((ex) => {
    const key = compraKey(ex.nombre);
    seen.add(key);
    grouped[ex.categoria || 'otros'].push({
      id: ex.id,
      nombre: ex.nombre,
      cantidad: ex.cantidad,
      inNevera: false,
      precio: ex.precio ?? c.prices[key] ?? null,
      comprado: !!c.comprados[key],
      manual: true,
    });
  });

  return grouped;
}

function categoryFor(key) {
  if (/(pollo|salmón|huevos|garbanzos|salmon|carne|atún|ternera|cerdo|jamón|queso|leche|yogur|huevo)/.test(key)) return 'proteinas';
  if (/(broc|espinac|tomate|cebolla|limón|limon|calabac|pimient|calabaza|lechuga|zanahoria|ajo|patata|pepino|berenjena|champiñ|setas|manzana|plátano|naranja|fresa|fruta|verdura)/.test(key)) return 'verduras';
  return 'otros';
}

/**
 * High-level numbers for the Compra header + Home cost preview.
 */
export function getCompraStats() {
  const grouped = getShoppingList();
  let totalCompra = 0;
  let withPrice = 0;
  let totalItems = 0;
  let comprados = 0;
  Object.values(grouped).forEach((g) => g.forEach((item) => {
    totalItems += 1;
    if (item.precio != null && item.precio > 0) {
      totalCompra += item.precio;
      withPrice += 1;
    }
    if (item.comprado || item.inNevera) comprados += 1;
  }));
  const numTuppers = state.tuppers.length;
  const costePorTupperMedio = numTuppers > 0 ? totalCompra / numTuppers : 0;
  return {
    totalCompra: Math.round(totalCompra * 100) / 100,
    costePorTupperMedio: Math.round(costePorTupperMedio * 100) / 100,
    totalItems,
    withPrice,
    pendientes: totalItems - comprados,
    numTuppers,
  };
}

/**
 * Cost-per-tupper history for the line chart in Home > Stats.
 * Returns the persisted history (state.history) plus a final entry for the
 * current week, computed live from prices + tuppers. The current entry is
 * flagged with `current: true` so the canvas can highlight it.
 */
export function getCostHistory() {
  const past = Array.isArray(state.history) ? state.history : [];
  const current = getCompraStats();
  return [
    ...past,
    {
      week: state.semana,
      avgCost: current.costePorTupperMedio,
      totalCost: current.totalCompra,
      tuppers: current.numTuppers,
      current: true,
    },
  ];
}

/**
 * Estimated cost per tupper: each priced shopping item is divided across
 * the recipes that use it (fair-share allocation, no unit parsing).
 * Returns { [tupperId]: number }.
 */
export function getCostePorTupper() {
  const c = compraSlice();
  const out = {};
  state.tuppers.forEach((t) => { out[t.id] = 0; });

  // For each item with a price, identify which tuppers' recipes use it
  const grouped = getShoppingList();
  Object.values(grouped).flat().forEach((item) => {
    if (!item.precio || item.precio <= 0) return;
    const itemKey = compraKey(item.nombre);
    const tupperIds = state.tuppers.filter((t) => {
      const r = state.recetas.find((x) => x.id === t.recetaId);
      if (!r) return false;
      return r.ingredientes.some((ing) => compraKey(ing.nombre) === itemKey);
    }).map((t) => t.id);
    if (tupperIds.length === 0) return; // unused or manual item
    const share = item.precio / tupperIds.length;
    tupperIds.forEach((id) => { out[id] += share; });
  });

  // Round to cents
  Object.keys(out).forEach((k) => { out[k] = Math.round(out[k] * 100) / 100; });
  return out;
}

/**
 * Returns ingredients used in 2+ different recipes of the current week.
 * The premise: while you have garlic out, chop it for every dish that
 * needs it. Used by Modo Batch.
 */
export function getCommonIngredients() {
  const recetaIds = [...new Set(state.tuppers.map((t) => t.recetaId))];
  const counts = new Map();

  recetaIds.forEach((rid) => {
    const rec = state.recetas.find((r) => r.id === rid);
    if (!rec) return;
    rec.ingredientes.forEach((ing) => {
      const key = ing.nombre.trim();
      const prev = counts.get(key) || { nombre: key, recetas: 0 };
      prev.recetas += 1;
      counts.set(key, prev);
    });
  });

  return [...counts.values()]
    .filter((x) => x.recetas >= 2)
    .sort((a, b) => b.recetas - a.recetas);
}

// ── Timer helpers + mutators ──────────────────────────────────────────────

/**
 * Calculates seconds left for a timer right now. Pure function — does not
 * mutate. p5 canvas and UI call this every frame.
 */
export function getTimerRemaining(timer) {
  if (!timer) return 0;
  if (timer.completed) return 0;
  if (!timer.running) return Math.max(0, Math.round(timer.pausedRemaining));
  const elapsed = (Date.now() - timer.startedAt) / 1000;
  return Math.max(0, Math.round(timer.pausedRemaining - elapsed));
}

export async function addTimer({ label, emoji = '🍳', totalSec }) {
  const id = `t_${Date.now()}`;
  state.timers.push({
    id, label, emoji,
    totalSec, pausedRemaining: totalSec,
    running: false, startedAt: null, completed: false,
  });
  notify();
  await saveState(state);
  return id;
}

export async function removeTimer(id) {
  state.timers = state.timers.filter((t) => t.id !== id);
  notify();
  await saveState(state);
}

export async function startTimer(id) {
  const t = state.timers.find((x) => x.id === id);
  if (!t || t.completed) return;
  if (t.running) return;
  t.running = true;
  t.startedAt = Date.now();
  notify();
  await saveState(state);
}

export async function pauseTimer(id) {
  const t = state.timers.find((x) => x.id === id);
  if (!t || !t.running) return;
  const elapsed = (Date.now() - t.startedAt) / 1000;
  t.pausedRemaining = Math.max(0, t.pausedRemaining - elapsed);
  t.running = false;
  t.startedAt = null;
  notify();
  await saveState(state);
}

export async function resetTimer(id) {
  const t = state.timers.find((x) => x.id === id);
  if (!t) return;
  t.running = false;
  t.startedAt = null;
  t.pausedRemaining = t.totalSec;
  t.completed = false;
  notify();
  await saveState(state);
}

export async function completeTimer(id) {
  const t = state.timers.find((x) => x.id === id);
  if (!t || t.completed) return;
  t.running = false;
  t.startedAt = null;
  t.pausedRemaining = 0;
  t.completed = true;
  notify();
  await saveState(state);
}

/**
 * Apply state loaded from storage. Called once on app start.
 *
 * After hydrating, timers that were "running" when the app was closed are
 * paused — we don't carry on running them in absentia. The user has to tap
 * play again if they want to continue.
 */
export function hydrate(saved) {
  if (!saved || typeof saved !== 'object') return;
  Object.assign(state, saved);
  if (Array.isArray(state.timers)) {
    state.timers.forEach((t) => {
      if (t.running) {
        // Convert what was running into a paused state with the remaining
        // time it had when the app got persisted.
        const elapsed = t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0;
        t.pausedRemaining = Math.max(0, t.pausedRemaining - elapsed);
        t.running = false;
        t.startedAt = null;
      }
    });
  }
}

// Internal helper for testing / debug
if (typeof window !== 'undefined') {
  window.__state = state;
}
