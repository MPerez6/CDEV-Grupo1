/**
 * Registro de Modelos 3D (src/config/modelRegistry.ts)
 * Catálogo validado de assets GLTF/GLB disponibles en frontend/public/models
 */

export interface ModelAssetInfo {
  url: string;
  name: string;
  meshCount: number;
  description: string;
  defaultTargetSize?: number;
}

export const MODEL_REGISTRY = {
  TABLA: {
    url: '/models/Tabla.glb',
    name: 'Mesa Rústica de Madera',
    meshCount: 1,
    description: 'Mesada rústica de madera para apoyo de utensilios y tabla de corte del asador',
    defaultTargetSize: 1.15,
  },
  CARBON: {
    url: '/models/carbon.glb',
    name: 'Carbón Individual',
    meshCount: 1,
    description: 'Pedazo individual de carbón para pala y brasas bajo la parrilla',
    defaultTargetSize: 0.1,
  },
  CARBON_FOGONERO: {
    url: '/models/carbon_fogonero.glb',
    name: 'Lecho de Carbón para Fogonero',
    meshCount: 1,
    description: 'Pila de carbón para la base y cuna del fogonero criollo',
    defaultTargetSize: 0.46,
  },
  CUCHILLO_EN_MADERA: {
    url: '/models/cuchillo_en_madera.glb',
    name: 'Cuchillo Parrillero Clavado en Tabla',
    meshCount: 6,
    description: 'Cuchillo gaucho criollo clavado en tabla de corte de quebracho',
    defaultTargetSize: 0.44,
  },
  BOTELLA_DE_VINO_VIEJA: {
    url: '/models/botella_de_vino_vieja.glb',
    name: 'Botella de Vino Rústica',
    meshCount: 1,
    description: 'Botella de vino tinto añejo para la mesada del asador',
    defaultTargetSize: 0.35,
  },
  PALA_Y_ATIZADOR: {
    url: '/models/pala_y_atizador.glb',
    name: 'Juego de Pala y Atizador',
    meshCount: 27,
    description: 'Herramientas de hierro forjado: Pala en X<0 y Atizador en X>0',
    defaultTargetSize: 0.65,
  },
  VACIO: {
    url: '/models/vacio.glb',
    name: 'Corte de Vacío Vacuno',
    meshCount: 1,
    description: 'Corte tradicional de vacío argentino para asar a fuego lento',
    defaultTargetSize: 0.38,
  },
  CHORIZO: {
    url: '/models/chorizo.glb',
    name: 'Chorizo Criollo',
    meshCount: 1,
    description: 'Chorizo parrillero puro de cerdo y vaca',
    defaultTargetSize: 0.22,
  },
  CHORIPAN: {
    url: '/models/choripan.glb',
    name: 'Choripán Gaucho',
    meshCount: 1,
    description: 'Choripán completo con pan crujiente',
    defaultTargetSize: 0.28,
  },
  PACKAGED_MEAT: {
    url: '/models/packaged_meat.glb',
    name: 'Carne Empacada',
    meshCount: 1,
    description: 'Paquete de carne sellada para la carnicería',
    defaultTargetSize: 0.35,
  },
  ARBOLES: {
    url: '/models/arboles.glb',
    name: 'Árboles Pampeanos',
    meshCount: 2,
    description: 'Árboles para vegetación pampeana de fondo',
    defaultTargetSize: 6.0,
  },
  CEIBO: {
    url: '/models/ceibo.glb',
    name: 'Ceibo Flor Nacional',
    meshCount: 12,
    description: 'Árbol de Ceibo criollo con flor roja',
    defaultTargetSize: 5.0,
  },
  FOGONERO_CRIOLLO: {
    url: '/models/fogonero_criollo.glb',
    name: 'Fogonero Criollo GLB',
    meshCount: 1,
    description: 'Brasero canasto cilíndrico completo',
    defaultTargetSize: 0.6,
  },
  PARRILLA_DOBLE: {
    url: '/models/parrilla_doble.glb',
    name: 'Parrilla Doble Completa',
    meshCount: 38,
    description: 'Estructura pesada de parrilla metálica doble',
    defaultTargetSize: 1.2,
  },
  BARBECUE_GRILL: {
    url: '/models/outdoor+barbecue+grill+3d+model.glb',
    name: 'Barbecue Grill',
    meshCount: 1,
    description: 'Modelo alternativo de asador de exterior',
    defaultTargetSize: 1.1,
  },
} as const;

export type ModelRegistryKey = keyof typeof MODEL_REGISTRY;
