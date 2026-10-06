import type { Branch } from "@/types";

/**
 * Sucursales DE DEMOSTRACIÓN en el área metropolitana de Bucaramanga.
 * Nombres, direcciones, teléfonos y coordenadas son ficticios hasta que
 * EcoMovilidad entregue los datos reales. Deben coincidir con
 * backend/app/db/seed_data.json.
 */
const UPDATED_AT = "2026-10-06T08:00:00-05:00";

const weekdayHours = { days: "Lunes a viernes", opens: "08:00", closes: "19:00" };
const saturdayHours = { days: "Sábados", opens: "09:00", closes: "17:00" };
const sundayHours = { days: "Domingos y festivos", opens: "10:00", closes: "15:00" };

export const branchesMock: Branch[] = [
  {
    id: "br-bga-cabecera",
    slug: "bucaramanga-cabecera",
    name: "Cabecera",
    city: "Bucaramanga",
    neighborhood: "Cabecera del Llano",
    address: "Carrera 35 # 48-20",
    location: { lat: 7.1172, lng: -73.1095 },
    phone: "+57 607 000 0101",
    hours: [weekdayHours, saturdayHours, sundayHours],
    services: ["venta", "alquiler", "mantenimiento", "recogida", "devolucion"],
    inventory: [
      { category: "bicicletas", available: 14 },
      { category: "patinetas", available: 22 },
      { category: "patines", available: 9 },
      { category: "drones", available: 3 },
    ],
    inventoryUpdatedAt: UPDATED_AT,
    isDemo: true,
  },
  {
    id: "br-bga-centro",
    slug: "bucaramanga-centro",
    name: "Centro",
    city: "Bucaramanga",
    neighborhood: "Centro",
    address: "Calle 35 # 19-40",
    location: { lat: 7.119, lng: -73.124 },
    phone: "+57 607 000 0102",
    hours: [weekdayHours, saturdayHours],
    services: ["venta", "alquiler", "recogida", "devolucion"],
    inventory: [
      { category: "bicicletas", available: 8 },
      { category: "patinetas", available: 15 },
      { category: "patines", available: 4 },
      { category: "drones", available: 0 },
    ],
    inventoryUpdatedAt: UPDATED_AT,
    isDemo: true,
  },
  {
    id: "br-flo-canaveral",
    slug: "floridablanca-canaveral",
    name: "Cañaveral",
    city: "Floridablanca",
    neighborhood: "Cañaveral",
    address: "Carrera 25 # 30-15",
    location: { lat: 7.0695, lng: -73.104 },
    phone: "+57 607 000 0201",
    hours: [weekdayHours, saturdayHours, sundayHours],
    services: ["venta", "alquiler", "mantenimiento", "recogida", "devolucion"],
    inventory: [
      { category: "bicicletas", available: 11 },
      { category: "patinetas", available: 18 },
      { category: "patines", available: 6 },
      { category: "drones", available: 2 },
    ],
    inventoryUpdatedAt: UPDATED_AT,
    isDemo: true,
  },
  {
    id: "br-gir-centro",
    slug: "giron-centro",
    name: "Girón Centro",
    city: "Girón",
    neighborhood: "Centro histórico",
    address: "Calle 30 # 25-10",
    location: { lat: 7.0705, lng: -73.169 },
    phone: "+57 607 000 0301",
    hours: [weekdayHours, saturdayHours],
    services: ["venta", "alquiler", "recogida", "devolucion"],
    inventory: [
      { category: "bicicletas", available: 6 },
      { category: "patinetas", available: 12 },
      { category: "patines", available: 5 },
      { category: "drones", available: 1 },
    ],
    inventoryUpdatedAt: UPDATED_AT,
    isDemo: true,
  },
  {
    id: "br-pie-centro",
    slug: "piedecuesta-centro",
    name: "Piedecuesta Centro",
    city: "Piedecuesta",
    neighborhood: "Centro",
    address: "Carrera 6 # 9-20",
    location: { lat: 6.989, lng: -73.051 },
    phone: "+57 607 000 0401",
    hours: [weekdayHours, saturdayHours],
    services: ["venta", "alquiler", "mantenimiento", "recogida", "devolucion"],
    inventory: [
      { category: "bicicletas", available: 7 },
      { category: "patinetas", available: 10 },
      { category: "patines", available: 0 },
      { category: "drones", available: 2 },
    ],
    inventoryUpdatedAt: UPDATED_AT,
    isDemo: true,
  },
];
