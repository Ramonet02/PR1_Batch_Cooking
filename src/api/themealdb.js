/**
 * api/themealdb.js
 *
 * TheMealDB API client (free tier — no API key needed).
 * Fetches ~40 recipes across different cuisines and transforms them
 * into the app's internal recipe schema.
 *
 * Used by main.js on first launch to seed the recipe list.
 * Results are persisted via Capacitor Preferences so subsequent
 * launches work fully offline.
 */

const BASE = 'https://www.themealdb.com/api/json/v1/1';

// ── Field mappings ────────────────────────────────────────────────────────

const AREA_TO_COCINA = {
  Italian:     'italiano',
  Spanish:     'mediterraneo',
  Greek:       'mediterraneo',
  Moroccan:    'mediterraneo',
  French:      'mediterraneo',
  Portuguese:  'mediterraneo',
  Croatian:    'mediterraneo',
  Egyptian:    'mediterraneo',
  Tunisian:    'mediterraneo',
  Turkish:     'mediterraneo',
  Japanese:    'asiatico',
  Chinese:     'asiatico',
  Indian:      'asiatico',
  Thai:        'asiatico',
  Vietnamese:  'asiatico',
  Malaysian:   'asiatico',
  Filipino:    'asiatico',
  Pakistani:   'asiatico',
  American:    'internacional',
  Mexican:     'internacional',
  Canadian:    'internacional',
  Jamaican:    'internacional',
  Kenyan:      'internacional',
  Polish:      'internacional',
  Russian:     'internacional',
  Uruguayan:   'internacional',
  Dutch:       'internacional',
  British:     'nacional',
  Irish:       'nacional',
};

const CATEGORY_TO_NUTRI = {
  Beef:          'proteina',
  Chicken:       'proteina',
  Seafood:       'proteina',
  Pork:          'proteina',
  Lamb:          'proteina',
  Goat:          'proteina',
  Pasta:         'carbohidratos',
  Side:          'carbohidratos',
  Bread:         'carbohidratos',
  Vegetarian:    'verdura',
  Vegan:         'verdura',
  Dessert:       'carbohidratos',
  Breakfast:     'mixto',
  Starter:       'mixto',
  Miscellaneous: 'mixto',
};

const CATEGORY_EMOJI = {
  Beef:          '🥩',
  Chicken:       '🍗',
  Seafood:       '🐟',
  Pork:          '🥓',
  Lamb:          '🍖',
  Pasta:         '🍝',
  Vegetarian:    '🥗',
  Vegan:         '🥙',
  Dessert:       '🍰',
  Breakfast:     '🍳',
  Starter:       '🥗',
  Miscellaneous: '🍽',
};

const CALORIA_RANGES = {
  Beef:          [520, 650],
  Chicken:       [400, 540],
  Seafood:       [340, 480],
  Pork:          [480, 620],
  Lamb:          [520, 660],
  Pasta:         [440, 580],
  Vegetarian:    [300, 440],
  Vegan:         [280, 420],
  Dessert:       [380, 540],
  Breakfast:     [340, 500],
  Starter:       [200, 370],
};

// ── Estimation helpers ────────────────────────────────────────────────────

/** Minutes of prep time based on ingredient count */
function estimateTime(n) {
  if (n <= 5)  return 20;
  if (n <= 8)  return 30;
  if (n <= 12) return 40;
  if (n <= 15) return 50;
  return 60;
}

/** Difficulty level based on ingredient count */
function estimateDificultad(n) {
  if (n <= 6)  return 'fácil';
  if (n <= 11) return 'media';
  return 'difícil';
}

/** Estimated calories based on category */
function estimateCalorias(category) {
  const [lo, hi] = CALORIA_RANGES[category] || [360, 500];
  return lo + Math.floor(Math.random() * (hi - lo));
}

/** Days the dish keeps refrigerated */
function estimateDiasNevera(category) {
  if (['Seafood'].includes(category)) return 2;
  if (['Beef', 'Chicken', 'Pork', 'Lamb', 'Goat'].includes(category)) return 4;
  return 5;
}

// ── Transform ─────────────────────────────────────────────────────────────

/**
 * Convert a raw TheMealDB meal object to our app's recipe schema.
 * @param {object} m - raw API meal object (from lookup endpoint)
 * @returns {object} app-format recipe
 */
export function transformMeal(m) {
  // Extract ingredients (API uses strIngredient1..20 / strMeasure1..20)
  const ingredientes = [];
  for (let i = 1; i <= 20; i++) {
    const nombre  = (m[`strIngredient${i}`] || '').trim();
    const medida  = (m[`strMeasure${i}`]    || '').trim();
    if (nombre) {
      ingredientes.push({
        nombre,
        cantidad: medida || 'al gusto',
        precio:   parseFloat((0.5 + Math.random() * 3).toFixed(2)),
      });
    }
  }

  const category = m.strCategory || 'Miscellaneous';
  const area     = m.strArea     || '';
  const n        = ingredientes.length;

  // Parse instructions into clean steps
  const raw = (m.strInstructions || '').trim();
  const instrucciones = raw
    .split(/\r?\n+/)
    .map((s) => s.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((s) => s.length > 8)
    .slice(0, 10)
    .join('\n');

  return {
    id:             `meal_${m.idMeal}`,
    nombre:         m.strMeal,
    emoji:          CATEGORY_EMOJI[category] || '🍽',
    tipoNutricional: CATEGORY_TO_NUTRI[category] || 'mixto',
    tipoCocina:     AREA_TO_COCINA[area] || 'internacional',
    cantidad:       'media',
    diasNevera:     estimateDiasNevera(category),
    calorias:       estimateCalorias(category),
    tiempoPrep:     estimateTime(n),
    dificultad:     estimateDificultad(n),
    fotoUri:        null,
    imagen:         m.strMealThumb || null, // API thumbnail
    ingredientes,
    instrucciones,
  };
}

// ── Network calls ─────────────────────────────────────────────────────────

/** Get a list of meal IDs filtered by area (country). */
async function fetchIdsByArea(area) {
  const res = await fetch(`${BASE}/filter.php?a=${encodeURIComponent(area)}`);
  if (!res.ok) throw new Error(`TheMealDB filter error: ${area}`);
  const data = await res.json();
  return (data.meals || []).map((m) => m.idMeal);
}

/** Get the full detail for a single meal by ID. */
async function fetchDetail(id) {
  const res = await fetch(`${BASE}/lookup.php?i=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`TheMealDB lookup error: ${id}`);
  const data = await res.json();
  return data.meals?.[0] || null;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Fetch ≈80 recipes from TheMealDB spread across cuisines.
 *
 * Plan (total 80):
 *   8 Italian · 7 Spanish · 6 Greek · 6 Moroccan · 6 Mexican
 *   6 Japanese · 6 Indian · 6 Chinese · 5 French · 5 American
 *   5 British · 5 Turkish · 4 Thai · 3 Vietnamese · 2 Canadian
 *
 * @returns {Promise<object[]>} array of app-format recipe objects
 */
export async function fetchTheMealDBRecipes() {
  const PLAN = [
    { area: 'Italian',    count: 8 },
    { area: 'Spanish',    count: 7 },
    { area: 'Greek',      count: 6 },
    { area: 'Moroccan',   count: 6 },
    { area: 'Mexican',    count: 6 },
    { area: 'Japanese',   count: 6 },
    { area: 'Indian',     count: 6 },
    { area: 'Chinese',    count: 6 },
    { area: 'French',     count: 5 },
    { area: 'American',   count: 5 },
    { area: 'British',    count: 5 },
    { area: 'Turkish',    count: 5 },
    { area: 'Thai',       count: 4 },
    { area: 'Vietnamese', count: 3 },
    { area: 'Canadian',   count: 2 },
  ];

  const recipes = [];

  for (const { area, count } of PLAN) {
    try {
      const allIds = await fetchIdsByArea(area);
      // Shuffle and take 'count' ids
      const sample = allIds
        .map((id) => ({ id, _r: Math.random() }))
        .sort((a, b) => a._r - b._r)
        .slice(0, count)
        .map((x) => x.id);

      for (const id of sample) {
        try {
          const detail = await fetchDetail(id);
          if (detail) recipes.push(transformMeal(detail));
        } catch (e) {
          console.warn(`[TheMealDB] meal ${id} failed`, e.message);
        }
      }
    } catch (e) {
      console.warn(`[TheMealDB] area ${area} failed`, e.message);
    }
  }

  console.info(`[TheMealDB] loaded ${recipes.length} recipes`);
  return recipes;
}
