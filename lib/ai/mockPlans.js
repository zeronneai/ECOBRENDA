/* Planes MOCK de ejemplo — para desarrollar y probar el frontend SIN gastar API.
   Siguen EXACTAMENTE el esquema de lib/ai/prompts.js:
     - workout: { title, note, days:[{ day, focus, warmup, exercises:[{name,sets,reps,rest,tip}] }] }
     - diet:    { title, note, macros:{kcal,protein,carbs,fat}, days:[{ day, meals:[{type,name,kcal,items[]}] }] }
   El "note" lleva la voz retadora de Brenda. Se activan con USE_MOCK_PLANS
   (ver src/lib/aiPlans.js). */

export const MOCK_WORKOUT = {
  title: 'Tu Semana de Glúteo & Fuerza',
  note: 'Analicé tu nivel, tus días y tu objetivo. Esto no es para cualquiera, pero tú no buscas fácil, ¿verdad? Dale con todo. 🔥',
  days: [
    {
      day: 'Lunes',
      focus: 'Glúteo + Pierna',
      warmup: '5 min de caminadora + activación de glúteo con banda (2x15 puentes).',
      exercises: [
        { name: 'Hip thrust con barra', sets: 4, reps: '12', rest: '75s', tip: 'Empuja con el talón y aprieta arriba 1 segundo.' },
        { name: 'Sentadilla sumo con mancuerna', sets: 4, reps: '15', rest: '60s', tip: 'Rodillas hacia afuera, pecho erguido.' },
        { name: 'Zancada búlgara', sets: 3, reps: '12 c/u', rest: '60s', tip: 'El peso en el talón del pie de adelante.' },
        { name: 'Patada de glúteo con banda', sets: 3, reps: '20 c/u', rest: '45s', tip: 'Sube sin arquear la espalda.' },
      ],
    },
    {
      day: 'Martes',
      focus: 'Tren superior + Core',
      warmup: 'Movilidad de hombro 2 min + plancha 30s.',
      exercises: [
        { name: 'Remo con mancuerna', sets: 4, reps: '12', rest: '60s', tip: 'Lleva el codo atrás, aprieta la espalda.' },
        { name: 'Press de hombro', sets: 3, reps: '12', rest: '60s', tip: 'No arquees la baja espalda.' },
        { name: 'Plancha con toque de hombro', sets: 3, reps: '40s', rest: '45s', tip: 'Cadera quieta, no la balancees.' },
        { name: 'Russian twist', sets: 3, reps: '20', rest: '40s', tip: 'Gira desde el tronco, no solo los brazos.' },
      ],
    },
    {
      day: 'Jueves',
      focus: 'Glúteo + Cardio metabólico',
      warmup: '5 min de salto de cuerda suave + sentadilla sin peso 15 reps.',
      exercises: [
        { name: 'Peso muerto rumano', sets: 4, reps: '12', rest: '75s', tip: 'Baja con la espalda recta, siente el isquio.' },
        { name: 'Sentadilla goblet', sets: 4, reps: '15', rest: '60s', tip: 'Baja hasta que los muslos queden paralelos.' },
        { name: 'Abducción de cadera en máquina', sets: 4, reps: '20', rest: '45s', tip: 'Controla la bajada, no rebotes.' },
        { name: 'Burpees', sets: 3, reps: '12', rest: '45s', tip: 'Ritmo constante, respira.' },
      ],
    },
    {
      day: 'Viernes',
      focus: 'Full body + Fuerza',
      warmup: 'Movilidad general 3 min + 10 sentadillas + 10 flexiones.',
      exercises: [
        { name: 'Sentadilla con barra', sets: 4, reps: '10', rest: '90s', tip: 'Talones firmes, sube con fuerza.' },
        { name: 'Hip thrust a una pierna', sets: 3, reps: '12 c/u', rest: '60s', tip: 'Aprieta el glúteo arriba, no uses impulso.' },
        { name: 'Jalón al pecho', sets: 3, reps: '12', rest: '60s', tip: 'Lleva la barra al pecho, no atrás del cuello.' },
        { name: 'Elevación de talón (pantorrilla)', sets: 4, reps: '20', rest: '40s', tip: 'Sube lento, aguanta arriba.' },
      ],
    },
  ],
}

export const MOCK_DIET = {
  title: 'Tu Plan de 7 Días — Definición Vegetariana',
  note: 'Hecho para tu cuerpo y tus metas, cuidando lo que no comes. Yo ya hice mi parte. Ahora: ¿vas a seguirlo o vas a poner excusas? 💪',
  macros: { kcal: 1750, protein: 125, carbs: 165, fat: 55 },
  days: [
    {
      day: 'Lunes',
      meals: [
        { type: 'Desayuno', name: 'Avena proteica con frutos rojos', kcal: 380, items: ['1/2 taza avena', '1 scoop proteína vegetal', '1 taza frutos rojos', '1 cucharada semillas de chía'] },
        { type: 'Snack', name: 'Edamames con limón', kcal: 160, items: ['1 taza edamames', 'limón y sal al gusto'] },
        { type: 'Comida', name: 'Bowl de lentejas y arroz', kcal: 520, items: ['1 taza lentejas cocidas', '3/4 taza arroz integral', '1 taza verduras salteadas', '1 cucharada aceite de oliva'] },
        { type: 'Snack', name: 'Yogurt de coco con granola', kcal: 190, items: ['1 vaso yogurt de coco', '1 puño granola sin azúcar'] },
        { type: 'Cena', name: 'Tofu al sartén con brócoli', kcal: 460, items: ['150g tofu firme', '1 taza brócoli', '1/2 taza quinoa', 'salsa de tamari'] },
      ],
    },
    {
      day: 'Martes',
      meals: [
        { type: 'Desayuno', name: 'Hot cakes de avena y plátano', kcal: 370, items: ['1/2 taza avena molida', '1 plátano', '1 cucharada crema de almendra', 'canela'] },
        { type: 'Snack', name: 'Hummus con pepino', kcal: 150, items: ['1/3 taza hummus', '1 pepino en bastones'] },
        { type: 'Comida', name: 'Tacos de frijol y aguacate', kcal: 530, items: ['3 tortillas de maíz', '1 taza frijoles refritos', '1/2 aguacate', 'pico de gallo'] },
        { type: 'Snack', name: 'Batido verde', kcal: 180, items: ['1 scoop proteína vegetal', '1 taza espinaca', '1/2 taza piña', 'agua'] },
        { type: 'Cena', name: 'Ensalada de garbanzo tibia', kcal: 470, items: ['1 taza garbanzos', 'jitomate y pepino', '1 cucharada aceite de oliva', '1 puño semillas de girasol'] },
      ],
    },
    {
      day: 'Miércoles',
      meals: [
        { type: 'Desayuno', name: 'Tostada de aguacate y tofu revuelto', kcal: 390, items: ['1 pan integral', '1/2 aguacate', '100g tofu revuelto con cúrcuma'] },
        { type: 'Snack', name: 'Manzana con crema de cacahuate', kcal: 200, items: ['1 manzana', '1 cucharada crema de cacahuate'] },
        { type: 'Comida', name: 'Chili sin carne', kcal: 500, items: ['1 taza frijol negro', '1/2 taza elote', 'jitomate y especias', '1/2 taza arroz'] },
        { type: 'Snack', name: 'Edamames', kcal: 150, items: ['1 taza edamames', 'sal de mar'] },
        { type: 'Cena', name: 'Curry de garbanzo con espinaca', kcal: 480, items: ['1 taza garbanzos', '1 taza espinaca', '1/2 taza leche de coco', '1/2 taza arroz basmati'] },
      ],
    },
    {
      day: 'Jueves',
      meals: [
        { type: 'Desayuno', name: 'Smoothie bowl de proteína', kcal: 380, items: ['1 scoop proteína vegetal', '1 plátano congelado', '1/2 taza fresas', '1 puño granola'] },
        { type: 'Snack', name: 'Zanahorias con hummus', kcal: 150, items: ['1 taza zanahoria', '1/3 taza hummus'] },
        { type: 'Comida', name: 'Buddha bowl', kcal: 540, items: ['3/4 taza quinoa', '1 taza garbanzo rostizado', 'kale masajeado', '1 cucharada tahini'] },
        { type: 'Snack', name: 'Pudín de chía', kcal: 190, items: ['2 cucharadas chía', '1 taza leche de almendra', 'frutos rojos'] },
        { type: 'Cena', name: 'Tempeh a la plancha con ejotes', kcal: 460, items: ['120g tempeh', '1 taza ejotes', '1/2 camote horneado'] },
      ],
    },
    {
      day: 'Viernes',
      meals: [
        { type: 'Desayuno', name: 'Omelette de garbanzo (besan)', kcal: 370, items: ['1/2 taza harina de garbanzo', 'espinaca y champiñón', '1 cucharada aceite de oliva'] },
        { type: 'Snack', name: 'Mix de semillas', kcal: 170, items: ['1 puño semillas de calabaza y girasol'] },
        { type: 'Comida', name: 'Pasta integral con lentejas', kcal: 530, items: ['3/4 taza pasta integral', '1 taza lentejas', 'salsa de jitomate', 'albahaca'] },
        { type: 'Snack', name: 'Batido de proteína', kcal: 170, items: ['1 scoop proteína vegetal', '1 taza leche de avena'] },
        { type: 'Cena', name: 'Bowl de tofu teriyaki', kcal: 470, items: ['150g tofu', '1 taza verduras al wok', '1/2 taza arroz integral'] },
      ],
    },
    {
      day: 'Sábado',
      meals: [
        { type: 'Desayuno', name: 'Pan francés integral', kcal: 380, items: ['2 rebanadas pan integral', '1/2 taza leche de almendra', 'canela y plátano'] },
        { type: 'Snack', name: 'Fruta de temporada', kcal: 140, items: ['1 taza papaya', '1 cucharada semillas de chía'] },
        { type: 'Comida', name: 'Enfrijoladas', kcal: 520, items: ['3 tortillas de maíz', '1 taza frijol', 'lechuga y rábano', '1 cucharada aguacate'] },
        { type: 'Snack', name: 'Edamames con chile', kcal: 160, items: ['1 taza edamames', 'chile en polvo y limón'] },
        { type: 'Cena', name: 'Sopa de miso con tofu', kcal: 430, items: ['1 taza caldo de miso', '100g tofu', 'alga wakame', '1/2 taza fideo de arroz'] },
      ],
    },
    {
      day: 'Domingo',
      meals: [
        { type: 'Desayuno', name: 'Chilaquiles verdes de tofu', kcal: 390, items: ['tortilla horneada', 'salsa verde', '100g tofu', '1 cucharada crema vegetal'] },
        { type: 'Snack', name: 'Manzana y almendras', kcal: 190, items: ['1 manzana', '1 puño almendras'] },
        { type: 'Comida', name: 'Bowl mexicano de quinoa', kcal: 540, items: ['3/4 taza quinoa', '1 taza frijol negro', 'elote, jitomate', '1/2 aguacate'] },
        { type: 'Snack', name: 'Batido verde', kcal: 170, items: ['1 scoop proteína vegetal', 'espinaca', '1/2 plátano'] },
        { type: 'Cena', name: 'Verduras rostizadas con lenteja', kcal: 450, items: ['1 taza lentejas', 'calabaza y pimiento', '1 cucharada aceite de oliva', 'hierbas'] },
      ],
    },
  ],
}
