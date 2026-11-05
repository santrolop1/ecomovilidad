import type { RentalVehicle, TimeSlot } from "@/types";

export const rentalVehiclesMock: RentalVehicle[] = [
  {
    id: "rnt-001",
    slug: "bicicleta-electrica-urbana",
    name: "Bicicleta eléctrica urbana",
    category: "bicicletas",
    description: "Asistencia al pedaleo, batería cargada y casco incluido. Lista para moverte por la ciudad.",
    image: { src: "/images/products/voltra-urbana-e1.webp", alt: "Bicicleta eléctrica urbana de alquiler" },
    rates: [
      { unit: "hora", price: 15_000 },
      { unit: "dia", price: 65_000 },
      { unit: "semana", price: 290_000 },
    ],
    features: ["Casco incluido", "Candado en U", "Hasta 70 km de autonomía"],
    availability: [
      { branchId: "br-bga-cabecera", available: 6 },
      { branchId: "br-bga-centro", available: 3 },
      { branchId: "br-flo-canaveral", available: 5 },
      { branchId: "br-gir-centro", available: 2 },
    ],
    maintenance: { status: "operational", thresholdUsage: 0.42, thresholdUnit: "km" },
  },
  {
    id: "rnt-002",
    slug: "patineta-electrica-urbana",
    name: "Patineta eléctrica urbana",
    category: "patinetas",
    description: "Ligera, con doble freno y luces. Perfecta para trayectos cortos y la última milla.",
    image: { src: "/images/products/voltra-s2-urbana.webp", alt: "Patineta eléctrica urbana de alquiler" },
    rates: [
      { unit: "hora", price: 12_000 },
      { unit: "dia", price: 55_000 },
      { unit: "semana", price: 240_000 },
    ],
    features: ["Casco incluido", "Luces delantera y trasera", "Hasta 40 km de autonomía"],
    availability: [
      { branchId: "br-bga-cabecera", available: 9 },
      { branchId: "br-bga-centro", available: 7 },
      { branchId: "br-flo-canaveral", available: 8 },
      { branchId: "br-gir-centro", available: 5 },
      { branchId: "br-pie-centro", available: 4 },
    ],
    maintenance: { status: "operational", thresholdUsage: 0.67, thresholdUnit: "km" },
  },
  {
    id: "rnt-003",
    slug: "patines-urbanos",
    name: "Patines de línea urbanos",
    category: "patines",
    description: "Patines con protecciones para rodillas, codos y muñecas. Elige tu talla al reservar.",
    image: { src: "/images/products/patinova-city-80.webp", alt: "Patines de línea urbanos de alquiler" },
    rates: [
      { unit: "hora", price: 8_000 },
      { unit: "dia", price: 30_000 },
    ],
    features: ["Kit de protecciones", "Tallas 34 – 45", "Ruedas de 80 mm"],
    availability: [
      { branchId: "br-bga-cabecera", available: 4 },
      { branchId: "br-flo-canaveral", available: 3 },
      { branchId: "br-gir-centro", available: 2 },
    ],
    maintenance: { status: "operational", thresholdUsage: 0.3, thresholdUnit: "km" },
  },
  {
    id: "rnt-004",
    slug: "dron-fotografia",
    name: "Dron para fotografía",
    category: "drones",
    description: "Cámara 4K, dos baterías y geocercas configuradas según la zona de vuelo autorizada.",
    image: { src: "/images/products/nimbo-explorer-4k.webp", alt: "Dron cuadricóptero de alquiler" },
    rates: [
      { unit: "dia", price: 180_000 },
      { unit: "semana", price: 900_000 },
    ],
    features: ["Dos baterías", "Retorno automático (RTH)", "Geocerca activa"],
    availability: [
      { branchId: "br-bga-cabecera", available: 2 },
      { branchId: "br-flo-canaveral", available: 1 },
      { branchId: "br-pie-centro", available: 1 },
    ],
    maintenance: { status: "operational", thresholdUsage: 0.55, thresholdUnit: "horas_vuelo" },
    requirements: [
      "La operación debe cumplir los Reglamentos Aeronáuticos de Colombia (RAC 100 y RAC 91) de la AEROCIVIL.",
      "El dron no puede salir de la geocerca configurada; si se acerca al límite, regresa al punto de despegue.",
    ],
  },
  {
    // Activo al 93% del umbral: el catálogo de alquiler debe ocultarlo (RF 3.2).
    id: "rnt-005",
    slug: "patineta-todo-terreno",
    name: "Patineta todo terreno",
    category: "patinetas",
    description: "Doble motor y suspensión completa para lomas.",
    image: { src: "/images/products/condor-x-terreno.webp", alt: "Patineta todo terreno de alquiler" },
    rates: [
      { unit: "hora", price: 18_000 },
      { unit: "dia", price: 80_000 },
    ],
    features: ["Doble motor", "Suspensión completa"],
    availability: [{ branchId: "br-flo-canaveral", available: 2 }],
    maintenance: { status: "operational", thresholdUsage: 0.93, thresholdUnit: "km" },
  },
];

/** Franjas de entrega y recogida para el modo mock; en modo real el cupo sale del backend (CU-06). */
export const timeSlotsMock: TimeSlot[] = [
  { id: "slot-08", label: "8:00 a. m. – 10:00 a. m.", start: "08:00", end: "10:00", available: true },
  { id: "slot-10", label: "10:00 a. m. – 12:00 m.", start: "10:00", end: "12:00", available: true },
  { id: "slot-12", label: "12:00 m. – 2:00 p. m.", start: "12:00", end: "14:00", available: false },
  { id: "slot-14", label: "2:00 p. m. – 4:00 p. m.", start: "14:00", end: "16:00", available: true },
  { id: "slot-16", label: "4:00 p. m. – 6:00 p. m.", start: "16:00", end: "18:00", available: true },
];
