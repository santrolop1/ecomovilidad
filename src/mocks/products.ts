import type { BranchStock, Product, ProductSpec, StockStatus } from "@/types";

const LOW_STOCK_THRESHOLD = 5;

function stockFrom(byBranch: BranchStock[]): Product["stock"] {
  const available = byBranch.reduce((sum, entry) => sum + entry.quantity, 0);
  const status: StockStatus =
    available === 0 ? "out_of_stock" : available <= LOW_STOCK_THRESHOLD ? "low_stock" : "in_stock";
  return { status, available, byBranch };
}

/** Foto real (Wikimedia Commons) si existe; sin foto la UI muestra "Imagen pendiente". */
const PHOTOGRAPHED = new Set([
  "aeroandes-mini-4k",
  "aeroandes-pro-6k",
  "andina-pliega-20",
  "andina-ruta-mecanica",
  "condor-trail-29",
  "condor-x-terreno",
  "nimbo-explorer-4k",
  "patinova-city-80",
  "patinova-fit-84",
  "rueda-norte-city-lite",
  "rueda-norte-commuter-pro",
  "velox-junior-ajustable",
  "voltra-s2-urbana",
  "voltra-urbana-e1",
])

function imagesFor(slug: string, name: string): Product["images"] {
  return PHOTOGRAPHED.has(slug) ? [{ src: `/images/products/${slug}.webp`, alt: name }] : [];
}

type ProductSeed = Omit<Product, "images" | "stock"> & { byBranch: BranchStock[] };

function product({ byBranch, ...seed }: ProductSeed): Product {
  return { ...seed, images: imagesFor(seed.slug, seed.name), stock: stockFrom(byBranch) };
}

const spec = (key: string, label: string, value: string | number, unit?: string, facet?: boolean): ProductSpec => ({
  key,
  label,
  value,
  ...(unit ? { unit } : {}),
  ...(facet ? { facet } : {}),
});

/**
 * Marcas ficticias: los datos son de demostración y no representan
 * referencias comerciales reales.
 */
export const productsMock: Product[] = [
  // ───────────── Bicicletas
  product({
    id: "prd-001",
    slug: "voltra-urbana-e1",
    sku: "BIC-VOL-E1",
    name: "Voltra Urbana E1",
    brand: "Voltra",
    category: "bicicletas",
    shortDescription: "Bicicleta eléctrica urbana con asistencia al pedaleo y batería extraíble.",
    description:
      "Pensada para trayectos diarios en ciudad. Cuadro de aluminio, motor trasero de 250 W con cinco niveles de asistencia y batería extraíble que puedes cargar en casa o en la oficina.",
    price: 5_890_000,
    compareAtPrice: 6_490_000,
    specs: [
      spec("tipo", "Tipo", "Urbana", undefined, true),
      spec("asistencia", "Asistencia", "Eléctrica", undefined, true),
      spec("autonomia", "Autonomía", 70, "km"),
      spec("velocidad", "Velocidad máxima asistida", 25, "km/h"),
      spec("bateria", "Batería", 504, "Wh"),
      spec("peso", "Peso", 22, "kg"),
      spec("rin", "Rin", "28 in"),
    ],
    highlights: ["Batería extraíble", "Luces integradas", "Frenos de disco hidráulicos"],
    rentalVehicleSlug: "bicicleta-electrica-urbana",
    featured: true,
    createdAt: "2026-08-12T10:00:00-05:00",
    byBranch: [
      { branchId: "br-bga-cabecera", quantity: 6 },
      { branchId: "br-flo-canaveral", quantity: 4 },
      { branchId: "br-gir-centro", quantity: 2 },
    ],
  }),
  product({
    id: "prd-002",
    slug: "andina-pliega-20",
    sku: "BIC-AND-P20",
    name: "Andina Pliega 20",
    brand: "Andina Cycles",
    category: "bicicletas",
    shortDescription: "Plegable eléctrica para combinar con Metrolínea o el carro.",
    description:
      "Se pliega en menos de 15 segundos y cabe bajo el escritorio. Motor de 250 W, batería integrada en el tubo y rines de 20 pulgadas para maniobrar en tráfico.",
    price: 4_390_000,
    specs: [
      spec("tipo", "Tipo", "Plegable", undefined, true),
      spec("asistencia", "Asistencia", "Eléctrica", undefined, true),
      spec("autonomia", "Autonomía", 50, "km"),
      spec("velocidad", "Velocidad máxima asistida", 25, "km/h"),
      spec("bateria", "Batería", 360, "Wh"),
      spec("peso", "Peso", 17.5, "kg"),
      spec("rin", "Rin", "20 in"),
    ],
    highlights: ["Plegado en 15 s", "17,5 kg", "Guardabarros incluidos"],
    featured: false,
    createdAt: "2026-07-03T10:00:00-05:00",
    byBranch: [
      { branchId: "br-bga-cabecera", quantity: 3 },
      { branchId: "br-bga-centro", quantity: 2 },
    ],
  }),
  product({
    id: "prd-003",
    slug: "condor-trail-29",
    sku: "BIC-CON-T29",
    name: "Kóndor Trail 29",
    brand: "Kóndor",
    category: "bicicletas",
    shortDescription: "Eléctrica de montaña con motor central y suspensión doble.",
    description:
      "Motor central de alto torque para subir sin perder tracción, suspensión delantera y trasera de 130 mm y batería de 625 Wh para rutas largas fuera de la ciudad.",
    price: 9_450_000,
    specs: [
      spec("tipo", "Tipo", "Montaña", undefined, true),
      spec("asistencia", "Asistencia", "Eléctrica", undefined, true),
      spec("autonomia", "Autonomía", 90, "km"),
      spec("velocidad", "Velocidad máxima asistida", 25, "km/h"),
      spec("bateria", "Batería", 625, "Wh"),
      spec("peso", "Peso", 24, "kg"),
      spec("rin", "Rin", "29 in"),
    ],
    highlights: ["Motor central 85 Nm", "Suspensión doble", "Transmisión 12 velocidades"],
    featured: true,
    createdAt: "2026-09-01T10:00:00-05:00",
    byBranch: [
      { branchId: "br-flo-canaveral", quantity: 2 },
      { branchId: "br-bga-cabecera", quantity: 1 },
    ],
  }),
  product({
    id: "prd-004",
    slug: "andina-ruta-mecanica",
    sku: "BIC-AND-RM",
    name: "Andina Ruta",
    brand: "Andina Cycles",
    category: "bicicletas",
    shortDescription: "Bicicleta urbana mecánica, liviana y de bajo mantenimiento.",
    description:
      "Para quienes prefieren pedalear sin motor. Cuadro de aluminio, transmisión interna de 3 velocidades y correa de carbono que no requiere lubricación.",
    price: 1_890_000,
    specs: [
      spec("tipo", "Tipo", "Urbana", undefined, true),
      spec("asistencia", "Asistencia", "Mecánica", undefined, true),
      spec("peso", "Peso", 12.8, "kg"),
      spec("rin", "Rin", "28 in"),
      spec("transmision", "Transmisión", "Interna 3 velocidades"),
    ],
    highlights: ["Transmisión por correa", "12,8 kg", "Sin cadena que lubricar"],
    featured: false,
    createdAt: "2026-05-20T10:00:00-05:00",
    byBranch: [
      { branchId: "br-bga-centro", quantity: 5 },
      { branchId: "br-gir-centro", quantity: 4 },
      { branchId: "br-pie-centro", quantity: 3 },
    ],
  }),

  // ───────────── Patinetas
  product({
    id: "prd-101",
    slug: "voltra-s2-urbana",
    sku: "PAT-VOL-S2",
    name: "Voltra S2",
    brand: "Voltra",
    category: "patinetas",
    shortDescription: "Patineta eléctrica urbana con doble freno y llantas sin cámara.",
    description:
      "Motor de 350 W, freno regenerativo más freno de disco trasero y llantas de 10 pulgadas sin cámara para absorber el pavimento irregular.",
    price: 2_690_000,
    compareAtPrice: 2_990_000,
    specs: [
      spec("uso", "Uso", "Urbana", undefined, true),
      spec("proteccion", "Resistencia al agua", "IPX5", undefined, true),
      spec("autonomia", "Autonomía", 40, "km"),
      spec("velocidad", "Velocidad máxima", 25, "km/h"),
      spec("potencia", "Potencia", 350, "W"),
      spec("peso", "Peso", 16, "kg"),
    ],
    highlights: ["Llantas 10 in sin cámara", "Doble freno", "App con bloqueo"],
    rentalVehicleSlug: "patineta-electrica-urbana",
    featured: true,
    createdAt: "2026-08-25T10:00:00-05:00",
    byBranch: [
      { branchId: "br-bga-cabecera", quantity: 8 },
      { branchId: "br-bga-centro", quantity: 6 },
      { branchId: "br-flo-canaveral", quantity: 7 },
      { branchId: "br-pie-centro", quantity: 4 },
    ],
  }),
  product({
    id: "prd-102",
    slug: "rueda-norte-city-lite",
    sku: "PAT-RN-CL",
    name: "Rueda Norte City Lite",
    brand: "Rueda Norte",
    category: "patinetas",
    shortDescription: "La más liviana del catálogo: 12 kg y plegado en un paso.",
    description:
      "Ideal para trayectos cortos y para subirla al apartamento. Motor de 250 W, batería de 280 Wh y manubrio plegable.",
    price: 1_790_000,
    specs: [
      spec("uso", "Uso", "Urbana", undefined, true),
      spec("proteccion", "Resistencia al agua", "IPX4", undefined, true),
      spec("autonomia", "Autonomía", 25, "km"),
      spec("velocidad", "Velocidad máxima", 25, "km/h"),
      spec("potencia", "Potencia", 250, "W"),
      spec("peso", "Peso", 12, "kg"),
    ],
    highlights: ["12 kg", "Plegado en un paso", "Carga completa en 4 h"],
    featured: false,
    createdAt: "2026-06-14T10:00:00-05:00",
    byBranch: [
      { branchId: "br-gir-centro", quantity: 5 },
      { branchId: "br-bga-centro", quantity: 4 },
    ],
  }),
  product({
    id: "prd-103",
    slug: "condor-x-terreno",
    sku: "PAT-CON-XT",
    name: "Kóndor X Terreno",
    brand: "Kóndor",
    category: "patinetas",
    shortDescription: "Doble motor y suspensión para lomas y vías destapadas.",
    description:
      "Dos motores de 500 W, suspensión delantera y trasera y llantas todo terreno de 11 pulgadas. Pensada para las pendientes de la meseta de Bucaramanga y la subida a Piedecuesta.",
    price: 4_590_000,
    specs: [
      spec("uso", "Uso", "Todo terreno", undefined, true),
      spec("proteccion", "Resistencia al agua", "IPX5", undefined, true),
      spec("autonomia", "Autonomía", 60, "km"),
      spec("velocidad", "Velocidad máxima", 25, "km/h"),
      spec("potencia", "Potencia", 1000, "W"),
      spec("peso", "Peso", 29, "kg"),
    ],
    highlights: ["Doble motor", "Suspensión completa", "Pendientes de hasta 25%"],
    featured: true,
    createdAt: "2026-09-10T10:00:00-05:00",
    byBranch: [{ branchId: "br-flo-canaveral", quantity: 3 }],
  }),
  product({
    id: "prd-104",
    slug: "rueda-norte-commuter-pro",
    sku: "PAT-RN-CP",
    name: "Rueda Norte Commuter Pro",
    brand: "Rueda Norte",
    category: "patinetas",
    shortDescription: "Autonomía extendida para recorridos largos entre semana.",
    description:
      "Batería de 610 Wh para ir y volver del trabajo varios días sin cargar. Pantalla integrada, direccionales y suspensión delantera.",
    price: 3_390_000,
    specs: [
      spec("uso", "Uso", "Urbana", undefined, true),
      spec("proteccion", "Resistencia al agua", "IPX5", undefined, true),
      spec("autonomia", "Autonomía", 65, "km"),
      spec("velocidad", "Velocidad máxima", 25, "km/h"),
      spec("potencia", "Potencia", 500, "W"),
      spec("peso", "Peso", 21, "kg"),
    ],
    highlights: ["65 km de autonomía", "Direccionales", "Suspensión delantera"],
    featured: false,
    createdAt: "2026-04-02T10:00:00-05:00",
    byBranch: [],
  }),

  // ───────────── Patines
  product({
    id: "prd-201",
    slug: "patinova-city-80",
    sku: "PTN-PNV-C80",
    name: "Patinova City 80",
    brand: "Patinova",
    category: "patines",
    shortDescription: "Patines de línea urbanos con bota semirrígida y ruedas de 80 mm.",
    description:
      "Bota semirrígida con cierre de hebilla y cordones, chasis de aluminio y ruedas de 80 mm que equilibran velocidad y control para la ciclovía.",
    price: 689_000,
    specs: [
      spec("tipo", "Tipo", "Urbano", undefined, true),
      spec("ruedas", "Ruedas", "4 × 80 mm", undefined, true),
      spec("rodamientos", "Rodamientos", "ABEC 7"),
      spec("tallas", "Tallas", "36 – 44"),
      spec("peso", "Peso del par", 2.9, "kg"),
    ],
    highlights: ["Chasis de aluminio", "Freno trasero intercambiable", "Tallas 36 – 44"],
    featured: true,
    createdAt: "2026-07-21T10:00:00-05:00",
    byBranch: [
      { branchId: "br-bga-cabecera", quantity: 5 },
      { branchId: "br-flo-canaveral", quantity: 3 },
      { branchId: "br-gir-centro", quantity: 3 },
    ],
  }),
  product({
    id: "prd-202",
    slug: "patinova-fit-84",
    sku: "PTN-PNV-F84",
    name: "Patinova Fit 84",
    brand: "Patinova",
    category: "patines",
    shortDescription: "Para entrenamiento y distancias largas, con ruedas de 84 mm.",
    description:
      "Bota ventilada, plantilla acolchada y ruedas de 84 mm para mantener el ritmo en recorridos largos sin cansar el pie.",
    price: 849_000,
    specs: [
      spec("tipo", "Tipo", "Fitness", undefined, true),
      spec("ruedas", "Ruedas", "4 × 84 mm", undefined, true),
      spec("rodamientos", "Rodamientos", "ABEC 9"),
      spec("tallas", "Tallas", "37 – 45"),
      spec("peso", "Peso del par", 3.1, "kg"),
    ],
    highlights: ["Bota ventilada", "ABEC 9", "Plantilla acolchada"],
    featured: false,
    createdAt: "2026-06-30T10:00:00-05:00",
    byBranch: [
      { branchId: "br-bga-centro", quantity: 2 },
      { branchId: "br-gir-centro", quantity: 2 },
    ],
  }),
  product({
    id: "prd-203",
    slug: "velox-carrera-110",
    sku: "PTN-VLX-C110",
    name: "Velox Carrera 110",
    brand: "Velox",
    category: "patines",
    shortDescription: "Patines de velocidad con bota de carbono y tres ruedas de 110 mm.",
    description:
      "Para patinadores de competencia: bota baja de fibra de carbono, chasis de 3 × 110 mm y rodamientos de precisión.",
    price: 1_290_000,
    specs: [
      spec("tipo", "Tipo", "Velocidad", undefined, true),
      spec("ruedas", "Ruedas", "3 × 110 mm", undefined, true),
      spec("rodamientos", "Rodamientos", "ILQ-9"),
      spec("tallas", "Tallas", "35 – 45"),
      spec("peso", "Peso del par", 2.2, "kg"),
    ],
    highlights: ["Bota de carbono", "3 × 110 mm", "2,2 kg el par"],
    featured: false,
    createdAt: "2026-09-18T10:00:00-05:00",
    byBranch: [{ branchId: "br-bga-cabecera", quantity: 4 }],
  }),
  product({
    id: "prd-204",
    slug: "velox-junior-ajustable",
    sku: "PTN-VLX-JR",
    name: "Velox Junior Ajustable",
    brand: "Velox",
    category: "patines",
    shortDescription: "Patines ajustables a cuatro tallas para niños y niñas.",
    description:
      "Crecen con quien los usa: se ajustan a cuatro tallas. Bota rígida con soporte de tobillo y ruedas de 72 mm para aprender con control.",
    price: 459_000,
    specs: [
      spec("tipo", "Tipo", "Urbano", undefined, true),
      spec("ruedas", "Ruedas", "4 × 72 mm", undefined, true),
      spec("rodamientos", "Rodamientos", "ABEC 5"),
      spec("tallas", "Tallas", "30 – 37 (ajustable)"),
      spec("peso", "Peso del par", 2.4, "kg"),
    ],
    highlights: ["Ajustable a 4 tallas", "Soporte de tobillo", "Ruedas de 72 mm"],
    featured: false,
    createdAt: "2026-03-11T10:00:00-05:00",
    byBranch: [
      { branchId: "br-bga-centro", quantity: 4 },
      { branchId: "br-flo-canaveral", quantity: 3 },
    ],
  }),

  // ───────────── Drones
  product({
    id: "prd-301",
    slug: "aeroandes-mini-4k",
    sku: "DRN-AA-M4K",
    name: "AeroAndes Mini 4K",
    brand: "AeroAndes",
    category: "drones",
    shortDescription: "Dron compacto de menos de 250 g con cámara 4K estabilizada.",
    description:
      "Plegable y fácil de llevar. Cámara 4K en cardán de tres ejes, 31 minutos de vuelo y retorno automático al punto de despegue cuando la batería está baja.",
    price: 2_890_000,
    specs: [
      spec("camara", "Cámara", "4K", undefined, true),
      spec("clase", "Clase de peso", "Menos de 250 g", undefined, true),
      spec("vuelo", "Tiempo de vuelo", 31, "min"),
      spec("alcance", "Alcance de transmisión", 10, "km"),
      spec("peso", "Peso", 249, "g"),
      spec("rth", "Retorno automático (RTH)", "Sí"),
    ],
    highlights: ["Menos de 250 g", "Cardán de 3 ejes", "Retorno automático"],
    featured: true,
    createdAt: "2026-08-05T10:00:00-05:00",
    byBranch: [
      { branchId: "br-bga-cabecera", quantity: 2 },
      { branchId: "br-flo-canaveral", quantity: 1 },
      { branchId: "br-pie-centro", quantity: 1 },
    ],
  }),
  product({
    id: "prd-302",
    slug: "aeroandes-pro-6k",
    sku: "DRN-AA-P6K",
    name: "AeroAndes Pro 6K",
    brand: "AeroAndes",
    category: "drones",
    shortDescription: "Cámara 6K, sensores de obstáculos omnidireccionales y 45 min de vuelo.",
    description:
      "Para producción audiovisual e inspecciones. Sensor de una pulgada, detección de obstáculos en todas las direcciones y geocercas configurables.",
    price: 7_990_000,
    specs: [
      spec("camara", "Cámara", "6K", undefined, true),
      spec("clase", "Clase de peso", "Más de 250 g", undefined, true),
      spec("vuelo", "Tiempo de vuelo", 45, "min"),
      spec("alcance", "Alcance de transmisión", 15, "km"),
      spec("peso", "Peso", 895, "g"),
      spec("rth", "Retorno automático (RTH)", "Sí"),
    ],
    highlights: ["Sensor de 1 in", "Detección omnidireccional", "Geocercas configurables"],
    featured: false,
    createdAt: "2026-09-22T10:00:00-05:00",
    byBranch: [{ branchId: "br-bga-cabecera", quantity: 1 }],
  }),
  product({
    id: "prd-303",
    slug: "nimbo-explorer-4k",
    sku: "DRN-NIM-E4K",
    name: "Nimbo Explorer 4K",
    brand: "Nimbo",
    category: "drones",
    shortDescription: "Equilibrio entre precio y desempeño para tus primeros vuelos.",
    description:
      "Cámara 4K a 60 fps, 34 minutos de vuelo, modos de vuelo asistido y retorno automático. Incluye dos baterías.",
    price: 3_990_000,
    specs: [
      spec("camara", "Cámara", "4K", undefined, true),
      spec("clase", "Clase de peso", "Más de 250 g", undefined, true),
      spec("vuelo", "Tiempo de vuelo", 34, "min"),
      spec("alcance", "Alcance de transmisión", 12, "km"),
      spec("peso", "Peso", 570, "g"),
      spec("rth", "Retorno automático (RTH)", "Sí"),
    ],
    highlights: ["Dos baterías incluidas", "4K a 60 fps", "Vuelo asistido"],
    rentalVehicleSlug: "dron-fotografia",
    featured: false,
    createdAt: "2026-05-28T10:00:00-05:00",
    byBranch: [
      { branchId: "br-flo-canaveral", quantity: 1 },
      { branchId: "br-gir-centro", quantity: 1 },
    ],
  }),
];
