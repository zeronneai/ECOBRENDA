/* ============================================================
   BIBLIOTECA DE PLANES "BRENDA"
   Pre-curados por objetivo. Las dietas escalan calorías/macros
   según peso + altura + objetivo usando Mifflin-St Jeor.
   Todo se siente como si Brenda lo hubiera armado a mano.
   ============================================================ */

export const GOALS = {
  perder_grasa:   { id:'perder_grasa',   label:'Perder grasa',        emoji:'🔥', kcalAdj:-0.20, protein:2.0 },
  tonificar:      { id:'tonificar',      label:'Tonificar glúteo',    emoji:'🍑', kcalAdj:-0.05, protein:1.9 },
  ganar_musculo:  { id:'ganar_musculo',  label:'Ganar músculo',       emoji:'💪', kcalAdj:+0.12, protein:2.2 },
  mantener:       { id:'mantener',       label:'Mantenerme fit',      emoji:'✨', kcalAdj:0.00,  protein:1.8 },
}

/* ---- cálculo de macros (Mifflin-St Jeor, mujer, actividad moderada) ---- */
export function buildMacros({ weight, height, age = 27, goal }) {
  const g = GOALS[goal] || GOALS.tonificar
  const bmr = 10 * weight + 6.25 * height - 5 * age - 161      // mujer
  const tdee = bmr * 1.45                                       // actividad moderada
  const kcal = Math.round((tdee * (1 + g.kcalAdj)) / 10) * 10
  const protein = Math.round(weight * g.protein)
  const fat = Math.round((kcal * 0.25) / 9)
  const carbs = Math.round((kcal - (protein * 4 + fat * 9)) / 4)
  return { kcal, protein, carbs, fat, water: Math.round(weight * 0.04 * 10) / 10 }
}

/* ---- RUTINAS por objetivo (5 días, estilo Brenda glúteo/pierna focus) ---- */
export const WORKOUTS = {
  perder_grasa: {
    title:'Quema & Define',
    note:'Brenda combinó fuerza con cardio metabólico para acelerar tu pérdida de grasa sin perder curvas.',
    days:[
      { d:'Lun', focus:'Glúteo + Cardio', min:45, ex:[
        {n:'Hip thrust',s:4,r:'12-15'},{n:'Sentadilla sumo',s:4,r:'15'},
        {n:'Patada de glúteo en cable',s:3,r:'15 c/u'},{n:'Burpees',s:3,r:'12'},
        {n:'Mountain climbers',s:3,r:'40 seg'}]},
      { d:'Mar', focus:'Tren superior + Core', min:40, ex:[
        {n:'Remo con mancuerna',s:4,r:'12'},{n:'Press hombro',s:3,r:'12'},
        {n:'Plancha',s:3,r:'45 seg'},{n:'Russian twist',s:3,r:'20'}]},
      { d:'Mié', focus:'HIIT Cardio', min:30, ex:[
        {n:'Sprints en banda',s:6,r:'30 seg'},{n:'Jumping jacks',s:4,r:'45 seg'},
        {n:'Saltos al cajón',s:4,r:'12'}]},
      { d:'Jue', focus:'Pierna completa', min:45, ex:[
        {n:'Sentadilla búlgara',s:4,r:'12 c/u'},{n:'Peso muerto rumano',s:4,r:'12'},
        {n:'Zancadas caminando',s:3,r:'20'},{n:'Elevación de pantorrilla',s:4,r:'20'}]},
      { d:'Vie', focus:'Glúteo + Abs', min:40, ex:[
        {n:'Hip thrust pesado',s:4,r:'10'},{n:'Puente de glúteo',s:4,r:'20'},
        {n:'Abductores',s:3,r:'20'},{n:'Bicicleta abdominal',s:3,r:'30'}]},
    ]},
  tonificar: {
    title:'Curvas & Firmeza',
    note:'El programa estrella de Brenda: volumen para glúteo y pierna, definición en todo el cuerpo.',
    days:[
      { d:'Lun', focus:'Glúteo intensivo', min:50, ex:[
        {n:'Hip thrust',s:4,r:'12'},{n:'Sentadilla sumo con mancuerna',s:4,r:'15'},
        {n:'Patada de glúteo',s:4,r:'15 c/u'},{n:'Abductor en máquina',s:4,r:'20'}]},
      { d:'Mar', focus:'Tren superior', min:40, ex:[
        {n:'Press pecho mancuerna',s:4,r:'12'},{n:'Remo',s:4,r:'12'},
        {n:'Curl bíceps',s:3,r:'15'},{n:'Plancha lateral',s:3,r:'30 seg c/u'}]},
      { d:'Mié', focus:'Pierna + Glúteo', min:50, ex:[
        {n:'Sentadilla profunda',s:4,r:'12'},{n:'Peso muerto rumano',s:4,r:'12'},
        {n:'Zancada estática',s:3,r:'15 c/u'},{n:'Puente de glúteo a una pierna',s:3,r:'15 c/u'}]},
      { d:'Jue', focus:'Core + Cardio ligero', min:35, ex:[
        {n:'Plancha',s:4,r:'45 seg'},{n:'Elevación de piernas',s:3,r:'15'},
        {n:'Caminadora inclinada',s:1,r:'20 min'}]},
      { d:'Vie', focus:'Glúteo full', min:50, ex:[
        {n:'Hip thrust pesado',s:5,r:'10'},{n:'Sentadilla hack',s:4,r:'12'},
        {n:'Patada de cable',s:4,r:'15'},{n:'Abductor',s:4,r:'20'}]},
    ]},
  ganar_musculo: {
    title:'Fuerza & Volumen',
    note:'Brenda subió las cargas y bajó las reps para que construyas músculo real, semana a semana.',
    days:[
      { d:'Lun', focus:'Pierna pesada', min:55, ex:[
        {n:'Sentadilla con barra',s:5,r:'6-8'},{n:'Prensa',s:4,r:'10'},
        {n:'Peso muerto rumano',s:4,r:'8'},{n:'Pantorrilla',s:5,r:'12'}]},
      { d:'Mar', focus:'Empuje superior', min:45, ex:[
        {n:'Press banca',s:4,r:'8'},{n:'Press militar',s:4,r:'8'},
        {n:'Fondos',s:3,r:'10'},{n:'Extensión tríceps',s:3,r:'12'}]},
      { d:'Mié', focus:'Glúteo pesado', min:55, ex:[
        {n:'Hip thrust con barra',s:5,r:'8'},{n:'Sentadilla sumo',s:4,r:'10'},
        {n:'Zancada con barra',s:4,r:'10 c/u'},{n:'Abductor',s:4,r:'15'}]},
      { d:'Jue', focus:'Jalón superior', min:45, ex:[
        {n:'Dominadas asistidas',s:4,r:'8'},{n:'Remo con barra',s:4,r:'8'},
        {n:'Curl bíceps',s:4,r:'10'},{n:'Face pull',s:3,r:'15'}]},
      { d:'Vie', focus:'Pierna + Core', min:50, ex:[
        {n:'Peso muerto',s:5,r:'6'},{n:'Sentadilla frontal',s:4,r:'8'},
        {n:'Plancha con peso',s:3,r:'45 seg'},{n:'Ab wheel',s:3,r:'10'}]},
    ]},
  mantener: {
    title:'Fit & Equilibrio',
    note:'Brenda diseñó una semana balanceada para mantenerte fuerte, flexible y con energía.',
    days:[
      { d:'Lun', focus:'Full body', min:45, ex:[
        {n:'Sentadilla goblet',s:3,r:'15'},{n:'Hip thrust',s:3,r:'15'},
        {n:'Press hombro',s:3,r:'12'},{n:'Remo',s:3,r:'12'}]},
      { d:'Mar', focus:'Cardio + movilidad', min:35, ex:[
        {n:'Caminata inclinada',s:1,r:'25 min'},{n:'Movilidad de cadera',s:1,r:'10 min'}]},
      { d:'Mié', focus:'Glúteo + Pierna', min:45, ex:[
        {n:'Sentadilla sumo',s:4,r:'15'},{n:'Zancadas',s:3,r:'15 c/u'},
        {n:'Patada de glúteo',s:3,r:'15'},{n:'Pantorrilla',s:3,r:'20'}]},
      { d:'Jue', focus:'Core + Yoga', min:30, ex:[
        {n:'Plancha',s:3,r:'40 seg'},{n:'Flujo de yoga',s:1,r:'20 min'}]},
      { d:'Vie', focus:'Tren completo', min:45, ex:[
        {n:'Hip thrust',s:4,r:'12'},{n:'Press pecho',s:3,r:'12'},
        {n:'Remo',s:3,r:'12'},{n:'Abdominales',s:3,r:'20'}]},
    ]},
}

/* ---- PLANES DE COMIDA por objetivo (las cantidades se escalan a sus kcal) ---- */
export const MEALS = {
  perder_grasa:[
    {t:'Desayuno', n:'Omelette de claras + espinaca + aguacate', tag:'Alto en proteína'},
    {t:'Snack', n:'Yogurt griego natural + frutos rojos', tag:'Bajo en azúcar'},
    {t:'Comida', n:'Pechuga a la plancha + quinoa + verduras', tag:'Balanceado'},
    {t:'Snack', n:'Puño de almendras + té verde', tag:'Saciante'},
    {t:'Cena', n:'Salmón al horno + ensalada grande', tag:'Ligero'},
  ],
  tonificar:[
    {t:'Desayuno', n:'Avena con proteína + plátano + crema de cacahuate', tag:'Energía'},
    {t:'Snack', n:'Huevo cocido + fruta', tag:'Proteína'},
    {t:'Comida', n:'Res magra + arroz integral + brócoli', tag:'Construcción'},
    {t:'Snack', n:'Batido de proteína + avena', tag:'Post-entreno'},
    {t:'Cena', n:'Pollo + camote + espárragos', tag:'Recuperación'},
  ],
  ganar_musculo:[
    {t:'Desayuno', n:'Avena grande + 3 huevos + plátano', tag:'Superávit'},
    {t:'Snack', n:'Sándwich de pavo + queso', tag:'Carbos + proteína'},
    {t:'Comida', n:'Res + pasta integral + aguacate', tag:'Volumen'},
    {t:'Snack', n:'Batido masa: leche + avena + crema cacahuate', tag:'Calórico'},
    {t:'Cena', n:'Salmón + arroz + verduras + aceite de oliva', tag:'Recuperación'},
  ],
  mantener:[
    {t:'Desayuno', n:'Tostadas integrales + huevo + aguacate', tag:'Balance'},
    {t:'Snack', n:'Fruta + puño de nueces', tag:'Natural'},
    {t:'Comida', n:'Pollo + arroz + ensalada', tag:'Completo'},
    {t:'Snack', n:'Yogurt + granola', tag:'Ligero'},
    {t:'Cena', n:'Pescado + verduras al vapor', tag:'Liviano'},
  ],
}

/* ---- selector: dado el perfil, regresa el plan completo "de Brenda" ---- */
export function getBrendaPlan(profile) {
  const goal = profile.goal || 'tonificar'
  return {
    goal: GOALS[goal],
    macros: buildMacros(profile),
    workout: WORKOUTS[goal],
    meals: MEALS[goal],
  }
}
