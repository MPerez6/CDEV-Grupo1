/**
 * PARÁMETROS PROVISIONALES. Son valores ajustables, no resultados físicos validados.
 * Las reglas ya acordadas se mantienen: parrilla fija, brasero a la izquierda,
 * carbón/leña secos, caída de brasas, cinco capas por corte.
 */
export const CONFIG = {
  // --- Reloj y paso de simulación ---
  /** Multiplicador de velocidad del tiempo simulado respecto del tiempo real (4 = 1 s real equivale a 4 s simulados; ritmo 2.5x más pausado y realista que el valor original de 10). */
  timeScale: 4,
  /** Duración fija (en segundos simulados) de cada paso de integración física y térmica. */
  simulationStepSeconds: 0.25,
  /** Límite máximo de sub-pasos ejecutados por frame para evitar bloqueos si cae el framerate. */
  simulationMaxStepsPerFrame: 25,

  // --- Dimensiones y grilla térmica de la parrilla ---
  /** Cantidad de columnas de sectores térmicos a lo ancho de la parrilla (eje X). */
  gridColumns: 6,
  /** Cantidad de filas de sectores térmicos desde el frente hacia el fondo de la parrilla (eje Z). */
  gridRows: 4,
  /** Ancho físico útil de la parrilla en metros (0.9 m = 90 cm). */
  grillWidthM: 0.9,
  /** Profundidad física útil de la parrilla en metros (0.6 m = 60 cm). */
  grillDepthM: 0.6,

  // --- Combustión de brasas y tiempos de encendido en el brasero ---
  /** Masa inicial en gramos de cada porción estándar de brasa generada por una pieza de combustible. */
  emberMassG: 50,
  /** Velocidad base de consumo (en gramos por minuto simulado) para una brasa de referencia de 50 g al 100 % de masa. */
  initialBurnGPerMinute: 1.2,
  /** Minutos simulados a calor pleno necesarios para que una pieza de carbón vegetal madure al 100 % y caiga como brasa. */
  charcoalHeatingMinutes: 13,
  /** Minutos simulados a calor pleno necesarios para que una pieza de leña fina madure al 100 % y caiga como brasa. */
  smallWoodHeatingMinutes: 10,
  /** Minutos simulados a calor pleno necesarios para que un tronco de leña gruesa madure al 100 % y caiga como brasa. */
  largeWoodHeatingMinutes: 18,
  /** Segundos simulados que arde cada manojo de papel/ramitas colocado bajo el brasero (300 s = 5 min). */
  tinderBurnSecondsPerBundle: 300,
  /** Progreso mínimo (0 a 1) a partir del cual el carbón o la leña fina se consideran encendidos y entregan calor propio. */
  fuelIgnitionProgress: 0.25,
  /** Progreso mínimo (0 a 1) a partir del cual un tronco de leña gruesa se considera encendido y sostiene su combustión. */
  largeWoodIgnitionProgress: 0.15,
  /** Progreso (0 a 1) de una pieza vecina a partir del cual se considera fuego establecido capaz de prender leña gruesa a ritmo normal. */
  establishedFireProgress: 0.60,
  /** Factor reductor de calentamiento para la leña gruesa cuando solo recibe fuego inicial de papel sin brasas/leña fina asentadas. */
  largeWoodStarterFactor: 0.09,
  /** Paso máximo interno (en segundos simulados) al actualizar el brasero para no saltear el agotamiento del papel. */
  brazierMaxStepSeconds: 0.25,

  // --- Capacidad y geometría de la pila del brasero ---
  /** Columnas de espacios por capa dentro de la canasta del brasero. */
  brazierPileColumns: 2,
  /** Filas de espacios por capa dentro de la canasta del brasero. */
  brazierPileRows: 2,
  /** Cantidad de niveles/capas verticales que admite la canasta del brasero (capacidad total = columnas × filas × capas). */
  brazierPileLayers: 3,
  /** Cantidad de espacios horizontales que ocupa un tronco de leña gruesa dentro de una capa del brasero. */
  brazierLargeWoodSlots: 2,
  /** Exposición al fuego del papel inicial para cada uno de los 4 espacios de una capa del brasero (de más expuesto a menos expuesto). */
  brazierStarterExposure: [1, 0.90, 0.80, 0.72],
  /** Fracción del calor del papel que logra atravesar hacia cada capa superior del brasero (atenuación por altura). */
  brazierStarterLeakPerLayer: 0.10,
  /** Coeficiente de transferencia de calor por contacto desde una pieza encendida hacia otra ubicada en la capa inmediatamente superior. */
  brazierHeatUpward: 0.85,
  /** Coeficiente de transferencia de calor por contacto entre piezas vecinas de la misma capa horizontal. */
  brazierHeatSideways: 0.80,
  /** Coeficiente de transferencia de calor por contacto desde una pieza encendida hacia otra ubicada en la capa inmediatamente inferior. */
  brazierHeatDownward: 0.18,

  // --- Balance energético y radiación en la parrilla ---
  /** Poder calorífico del combustible en Joules por kilogramo consumido (30.8 MJ/kg). */
  heatOfCombustionJPerKg: 30_800_000,
  /** Fracción de la energía bruta de combustión que llega como radiación térmica útil al plano de cocción (18 %). */
  thermalDelivery: 0.18,
  /** Fracción de la masa quemada de una brasa que se convierte en ceniza residual (5 %). */
  ashFraction: 0.05,
  /** Proporción de la potencia útil de una brasa que impacta directamente en su propio sector de la parrilla (80 %). */
  radiantCellShare: 0.8,
  /** Proporción de la potencia útil de una brasa que se reparte a cada uno de los 4 sectores ortogonales vecinos (4 × 5 % = 20 %). */
  radiantNeighbourShare: 0.05,

  // --- Propiedades térmicas y objetivos base de la carne ---
  /** Temperatura ambiente del patio en grados Celsius (°C). */
  ambientC: 25,
  /** Temperatura inicial de los cortes al salir de refrigeración en grados Celsius (°C). */
  meatInitialC: 5,
  /** Densidad media de la carne en kg/m³ (usada para calcular volumen y área de transferencia). */
  meatDensityKgM3: 1070,
  /** Calor específico de la carne en J/(kg·K) (mayor inercia térmica: 4200 vs 3800 original, requiere más energía por cada °C de aumento). */
  meatSpecificHeatJKgK: 4200,
  /** Conductividad térmica interna de la carne en W/(m·K) entre sus 5 capas (0.40 vs 0.48 original: el calor tarda más en llegar al centro). */
  meatConductivityWmK: 0.40,
  /** Masa por defecto en kg para el modelo térmico base (matambre de referencia: 1.5 kg). */
  meatMassKg: 1.5,
  /** Espesor por defecto en metros para el modelo térmico base (0.015 m = 1.5 cm). */
  meatThicknessM: 0.015,
  /** Coeficiente de absorción térmica superficial de la carne ante el flujo radiante de las brasas (56 % vs 60 % original, cocción más gradual). */
  meatAbsorptivity: 0.56,
  /** Coeficiente de pérdida de calor por convección hacia el aire ambiente en las caras expuestas, en W/(m²·K). */
  meatSurfaceConvectionWm2K: 12.5,
  /** Cantidad de capas térmicas discretas simuladas por cada pieza de carne (5 capas). */
  meatLayerCount: 5,
  /** Temperatura interna mínima objetivo en el centro (capa central) en °C para considerar cocido el corte base. */
  meatTargetCenterMinC: 68,
  /** Temperatura interna máxima objetivo en el centro en °C antes de considerarlo pasado de cocción. */
  meatTargetCenterMaxC: 74,
  /** Nivel mínimo de dorado superficial (reacción de Maillard, escala 0–100) requerido en ambas caras. */
  meatBrowningMin: 30,
  /** Nivel máximo de dorado superficial recomendable antes de empezar a quemar la superficie. */
  meatBrowningMax: 60,
} as const;
