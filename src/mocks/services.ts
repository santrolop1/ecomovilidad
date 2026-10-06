import type { Service } from "@/types";

export const servicesMock: Service[] = [
  {
    id: "svc-venta",
    slug: "venta",
    title: "Venta de vehículos nuevos",
    summary: "Bicicletas, patinetas, patines y drones con garantía y factura electrónica.",
    details: [
      "Filtra por categoría, precio, marca y especificaciones técnicas.",
      "Al agregar un producto al carrito, lo apartamos por 15 minutos mientras completas el pago.",
      "Recibes la factura electrónica en PDF y XML en tu correo.",
    ],
    icon: "store",
    href: "/catalogo",
  },
  {
    id: "svc-alquiler",
    slug: "alquiler",
    title: "Alquiler por horas, días o semanas",
    summary: "Vehículos revisados, con casco y accesorios, para recoger en sucursal o recibir en casa.",
    details: [
      "Solo alquilamos equipos que están dentro de su ciclo de mantenimiento.",
      "Recoge y devuelve en cualquier punto de servicio que ofrezca alquiler.",
      "Si un equipo falla durante el alquiler, lo reemplazamos.",
    ],
    icon: "key",
    href: "/alquiler",
  },
  {
    id: "svc-domicilios",
    slug: "domicilios",
    title: "Domicilios con seguimiento",
    summary: "Sigue en el mapa el recorrido de tu pedido hasta la puerta.",
    details: [
      "Te enviamos un enlace por SMS o correo para ver el recorrido en tiempo real.",
      "Eliges la franja horaria de entrega según la disponibilidad del día.",
      "La entrega se confirma con un código QR único o con tu firma digital.",
    ],
    icon: "truck",
    href: "/servicios#domicilios",
  },
  {
    id: "svc-mantenimiento",
    slug: "mantenimiento",
    title: "Mantenimiento preventivo",
    summary: "Revisiones programadas según kilómetros recorridos u horas de vuelo.",
    details: [
      "Agenda la recogida de tu vehículo en una franja horaria.",
      "Cada intervención queda registrada: piezas, técnico responsable y fecha de salida del taller.",
      "Disponible en las sucursales con taller.",
    ],
    icon: "wrench",
    href: "/servicios#mantenimiento",
  },
  {
    id: "svc-puntos",
    slug: "puntos-de-servicio",
    title: "Puntos de servicio",
    summary: "Sucursales para comprar, recoger, devolver y hacer mantenimiento.",
    details: [
      "Consulta la disponibilidad por categoría en cada sucursal.",
      "Horarios extendidos entre semana y atención los sábados.",
    ],
    icon: "map-pin",
    href: "/sucursales",
  },
];
