// data/nutrition.js — Planes de comida, recetas y suplementos (premium).
// Gradientes/acentos en la paleta NUEVA (magenta/lima/dorado/violeta).

const G = {
  magenta: 'linear-gradient(135deg,#ff1f6b,#b8004a)',
  violeta: 'linear-gradient(135deg,#ff1f6b,#7a28ff)',
  lima: 'linear-gradient(135deg,#d8ff3e,#86a30b)',
  dorado: 'linear-gradient(135deg,#f5c451,#b07d17)',
}

// Acento por color de suplemento (re-mapeado a la paleta nueva).
export function supplementColor(key) {
  return {
    magenta: 'var(--magenta)',
    lima: 'var(--lime)',
    dorado: 'var(--gold)',
    violeta: '#7a28ff',
  }[key] || 'var(--magenta)'
}

export function recipeDifficultyColor(d) {
  if (d === 'Difícil') return 'var(--magenta-soft)'
  if (d === 'Media') return 'var(--gold)'
  return 'var(--lime)' // Fácil
}

export const PLANS = [
  {
    id: 'definicion',
    title: 'Definición',
    emoji: '🔥',
    gradient: G.magenta,
    tagline: 'Déficit con alta proteína para bajar grasa sin perder músculo.',
    brendaTip: 'Prioriza proteína en cada comida y verduras a libre demanda. La constancia gana, no el sacrificio.',
    hydration: 'Bebe ~2.5 L de agua al día. Un vaso antes de cada comida ayuda a la saciedad.',
    meals: [
      { time: '07:00', name: 'Desayuno', kcal: 380, foods: [{ name: 'Claras de huevo', qty: '4', kcal: 70 }, { name: 'Avena', qty: '40 g', kcal: 150 }, { name: 'Frutos rojos', qty: '1 taza', kcal: 60 }, { name: 'Crema de cacahuate', qty: '1 cda', kcal: 100 }] },
      { time: '11:00', name: 'Snack', kcal: 180, foods: [{ name: 'Yogurt griego', qty: '150 g', kcal: 130 }, { name: 'Almendras', qty: '10', kcal: 50 }] },
      { time: '14:00', name: 'Comida', kcal: 520, foods: [{ name: 'Pechuga de pollo', qty: '180 g', kcal: 300 }, { name: 'Arroz integral', qty: '100 g', kcal: 130 }, { name: 'Ensalada', qty: 'libre', kcal: 90 }] },
      { time: '17:30', name: 'Snack', kcal: 180, foods: [{ name: 'Batido de proteína', qty: '1 scoop', kcal: 120 }, { name: 'Manzana', qty: '1', kcal: 60 }] },
      { time: '20:30', name: 'Cena', kcal: 420, foods: [{ name: 'Salmón', qty: '150 g', kcal: 300 }, { name: 'Espárragos', qty: '1 taza', kcal: 40 }, { name: 'Aguacate', qty: '1/4', kcal: 80 }] },
    ],
    supplements: ['proteina', 'omega3', 'multivitaminico'],
    tips: ['Come despacio y mastica bien.', 'No te saltes comidas para "ahorrar" calorías.', 'Verduras en comida y cena, sin límite.'],
  },
  {
    id: 'volumen',
    title: 'Volumen Limpio',
    emoji: '💪',
    gradient: G.violeta,
    tagline: 'Superávit controlado para ganar músculo de calidad.',
    brendaTip: 'Sube calorías con carbohidratos buenos alrededor del entreno. Duerme 8 h para crecer.',
    hydration: '~3 L de agua al día; más si entrenas fuerte o hace calor.',
    meals: [
      { time: '07:00', name: 'Desayuno', kcal: 520, foods: [{ name: 'Avena', qty: '80 g', kcal: 300 }, { name: 'Huevos', qty: '3', kcal: 210 }, { name: 'Plátano', qty: '1', kcal: 90 }] },
      { time: '11:00', name: 'Snack', kcal: 330, foods: [{ name: 'Sándwich de pavo', qty: '1', kcal: 250 }, { name: 'Queso', qty: '1 rebanada', kcal: 80 }] },
      { time: '14:00', name: 'Comida', kcal: 680, foods: [{ name: 'Res magra', qty: '200 g', kcal: 380 }, { name: 'Pasta integral', qty: '120 g', kcal: 180 }, { name: 'Aceite de oliva', qty: '1 cda', kcal: 120 }] },
      { time: '17:30', name: 'Snack', kcal: 350, foods: [{ name: 'Batido masa', qty: 'leche+avena+crema', kcal: 350 }] },
      { time: '20:30', name: 'Cena', kcal: 520, foods: [{ name: 'Salmón', qty: '180 g', kcal: 360 }, { name: 'Arroz', qty: '120 g', kcal: 160 }] },
    ],
    supplements: ['proteina', 'creatina', 'multivitaminico'],
    tips: ['Come aunque no tengas mucha hambre.', 'Carbohidratos antes y después de entrenar.', 'Progresa cargas en el gym semana a semana.'],
  },
  {
    id: 'balance',
    title: 'Balance',
    emoji: '✨',
    gradient: G.lima,
    tagline: 'Mantenimiento equilibrado para sostener tu progreso con energía.',
    brendaTip: 'Plato equilibrado: 1/2 verduras, 1/4 proteína, 1/4 carbohidrato. Disfruta sin culpa.',
    hydration: '~2 L de agua al día. Escucha tu sed.',
    meals: [
      { time: '07:30', name: 'Desayuno', kcal: 400, foods: [{ name: 'Tostadas integrales', qty: '2', kcal: 160 }, { name: 'Huevo', qty: '2', kcal: 140 }, { name: 'Aguacate', qty: '1/4', kcal: 80 }] },
      { time: '11:00', name: 'Snack', kcal: 180, foods: [{ name: 'Fruta', qty: '1', kcal: 80 }, { name: 'Nueces', qty: 'puño', kcal: 100 }] },
      { time: '14:00', name: 'Comida', kcal: 500, foods: [{ name: 'Pollo', qty: '150 g', kcal: 250 }, { name: 'Arroz', qty: '100 g', kcal: 130 }, { name: 'Ensalada', qty: 'libre', kcal: 120 }] },
      { time: '17:30', name: 'Snack', kcal: 170, foods: [{ name: 'Yogurt', qty: '150 g', kcal: 120 }, { name: 'Granola', qty: '2 cda', kcal: 50 }] },
      { time: '20:30', name: 'Cena', kcal: 380, foods: [{ name: 'Pescado', qty: '150 g', kcal: 240 }, { name: 'Verduras al vapor', qty: '2 tazas', kcal: 140 }] },
    ],
    supplements: ['multivitaminico', 'omega3'],
    tips: ['Disfruta la comida sin culpa.', 'Mueve el cuerpo a diario.', 'Hidrátate y duerme bien.'],
  },
]

export const RECIPES = [
  {
    id: 'omelette-claras', name: 'Omelette de Claras', emoji: '🍳', category: 'Desayuno', time: 10, difficulty: 'Fácil', kcal: 220,
    ingredients: [{ name: 'Claras de huevo', qty: '4' }, { name: 'Espinaca', qty: '1 taza' }, { name: 'Tomate', qty: '1/2' }, { name: 'Aguacate', qty: '1/4' }],
    steps: ['Bate las claras con sal y pimienta.', 'Saltea la espinaca y el tomate 2 min.', 'Vierte las claras y cocina a fuego medio.', 'Dobla, sirve y agrega el aguacate en rebanadas.'],
  },
  {
    id: 'bowl-pollo', name: 'Bowl de Pollo & Quinoa', emoji: '🥗', category: 'Comida', time: 25, difficulty: 'Media', kcal: 480,
    ingredients: [{ name: 'Pechuga de pollo', qty: '180 g' }, { name: 'Quinoa', qty: '80 g' }, { name: 'Brócoli', qty: '1 taza' }, { name: 'Aceite de oliva', qty: '1 cda' }],
    steps: ['Cocina la quinoa según el empaque.', 'Sella el pollo y córtalo en tiras.', 'Cuece el brócoli al vapor 4 min.', 'Arma el bowl y aliña con aceite, limón y especias.'],
  },
  {
    id: 'salmon-horno', name: 'Salmón al Horno', emoji: '🐟', category: 'Cena', time: 20, difficulty: 'Fácil', kcal: 360,
    ingredients: [{ name: 'Salmón', qty: '150 g' }, { name: 'Espárragos', qty: '1 taza' }, { name: 'Limón', qty: '1/2' }, { name: 'Eneldo', qty: 'al gusto' }],
    steps: ['Precalienta el horno a 200 °C.', 'Coloca el salmón y los espárragos en una bandeja.', 'Rocía limón, sal y eneldo.', 'Hornea 12-14 min.'],
  },
  {
    id: 'batido-proteico', name: 'Batido Proteico', emoji: '🥤', category: 'Bebida', time: 5, difficulty: 'Fácil', kcal: 280,
    ingredients: [{ name: 'Proteína whey', qty: '1 scoop' }, { name: 'Plátano', qty: '1' }, { name: 'Leche', qty: '250 ml' }, { name: 'Avena', qty: '30 g' }],
    steps: ['Pon todo en la licuadora.', 'Licúa 30 segundos.', 'Sirve frío.'],
  },
  {
    id: 'yogurt-bowl', name: 'Yogurt Bowl', emoji: '🫐', category: 'Snack', time: 5, difficulty: 'Fácil', kcal: 210,
    ingredients: [{ name: 'Yogurt griego', qty: '150 g' }, { name: 'Frutos rojos', qty: '1/2 taza' }, { name: 'Granola', qty: '2 cda' }, { name: 'Miel', qty: '1 cdita' }],
    steps: ['Sirve el yogurt en un bowl.', 'Agrega los frutos rojos y la granola.', 'Termina con un hilo de miel.'],
  },
  {
    id: 'res-camote', name: 'Res con Camote', emoji: '🥩', category: 'Comida', time: 30, difficulty: 'Media', kcal: 540,
    ingredients: [{ name: 'Res magra', qty: '180 g' }, { name: 'Camote', qty: '150 g' }, { name: 'Espinaca', qty: '2 tazas' }, { name: 'Ajo', qty: '2 dientes' }],
    steps: ['Hornea el camote en cubos 20 min a 200 °C.', 'Sella la res con ajo 3-4 min por lado.', 'Saltea la espinaca al final.', 'Sirve todo junto.'],
  },
]

export const SUPPLEMENTS = [
  { id: 'proteina', name: 'Proteína Whey', color: 'magenta', emoji: '🥛', dose: '1 scoop (25-30 g)', timing: 'Después de entrenar o entre comidas', desc: 'Ayuda a cubrir tu proteína diaria y a recuperar el músculo.' },
  { id: 'creatina', name: 'Creatina Monohidrato', color: 'lima', emoji: '⚡', dose: '5 g al día', timing: 'A cualquier hora, de forma constante', desc: 'Mejora fuerza y rendimiento. La más estudiada y segura.' },
  { id: 'omega3', name: 'Omega 3', color: 'dorado', emoji: '🐟', dose: '1-2 g (EPA+DHA)', timing: 'Con una comida', desc: 'Apoya la salud cardiovascular y articular.' },
  { id: 'multivitaminico', name: 'Multivitamínico', color: 'violeta', emoji: '💊', dose: '1 al día', timing: 'Con el desayuno', desc: 'Cubre posibles vacíos de micronutrientes en tu dieta.' },
]

export const RECIPE_CATEGORIES = ['Todos', ...Array.from(new Set(RECIPES.map((r) => r.category)))]

export function getPlan(id) { return PLANS.find((p) => p.id === id) }
export function getRecipe(id) { return RECIPES.find((r) => r.id === id) }
export function getSupplement(id) { return SUPPLEMENTS.find((s) => s.id === id) }
