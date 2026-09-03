# Roadmap / pendientes

## PRIORITARIO — Campo de lesiones / limitaciones físicas
**Por qué:** es una app de ejercicio. Hoy alguien con rodilla o espalda lesionada
recibe la MISMA rutina que alguien sin limitaciones. Riesgo real de daño.

**Cuándo se haga, debe:**
- Ir **junto a la pregunta de equipo** en el onboarding (mismo paso "Tu entrenamiento").
- Ser **omitible** (igual que lugar/equipo).
- Guardarse en `profiles` (columna nueva, p. ej. `injuries text`) y viajar por
  `cloudSync` como el resto.
- En el prompt de rutina (y en el del día alterno de Fase 4), tener la **MISMA
  prioridad de seguridad que las alergias en la dieta**: es una restricción dura,
  NUNCA prescribir ejercicios que carguen la zona lesionada; ofrecer alternativas.
- Editarse desde **Editar preferencias** (Perfil).

**Preparado:** el prompt del día alterno (Fase 4, `buildWorkoutDayMessages`) ya
deja el hueco para recibir este dato sin rehacerse — solo hay que inyectar una
línea de "lesiones" cuando exista la columna.
