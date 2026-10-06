import type { FaqGroup, HomeContent, NewsItem } from "@/types";

/** Contenido que el CMS administrará (RF 1.1). */
export const homeContentMock: HomeContent = {
  hero: {
    title: "Movilidad que se mueve contigo.",
    subtitle: "Compra, alquila y recibe movilidad eléctrica donde la necesitas.",
    primaryCta: { label: "Explorar vehículos", href: "/catalogo" },
    secondaryCta: { label: "Ver alquileres", href: "/alquiler" },
  },
  valuePropositions: [
    {
      id: "vp-entrega",
      title: "Entrega con seguimiento",
      description: "Recibes un enlace para ver el domicilio en el mapa y confirmas la entrega con un código QR.",
      icon: "truck",
    },
    {
      id: "vp-mantenimiento",
      title: "Flota siempre revisada",
      description: "Los equipos de alquiler salen del catálogo antes de llegar a su límite de mantenimiento.",
      icon: "wrench",
    },
    {
      id: "vp-pagos",
      title: "Paga como prefieras",
      description: "PSE, tarjetas de crédito y débito o billeteras digitales, con factura electrónica.",
      icon: "credit-card",
    },
    {
      id: "vp-datos",
      title: "Tus datos protegidos",
      description: "Tratamos tu información conforme a la Ley 1581 de 2012 y solo con tu autorización.",
      icon: "shield",
    },
  ],
  banners: [
    {
      id: "bn-temporada",
      title: "Temporada de ciclovía",
      description: "Bicicletas eléctricas urbanas con precio especial durante octubre.",
      cta: { label: "Ver bicicletas", href: "/catalogo?categoria=bicicletas" },
      startsAt: "2026-10-01T00:00:00-05:00",
      endsAt: "2026-10-31T23:59:59-05:00",
    },
  ],
};

export const newsMock: NewsItem[] = [
  {
    id: "nw-001",
    slug: "nuevo-punto-piedecuesta",
    title: "Abrimos punto de servicio en Piedecuesta",
    excerpt: "Ya ofrecemos venta, alquiler y taller de mantenimiento en Piedecuesta. Dato de demostración.",
    publishedAt: "2026-09-28T09:00:00-05:00",
  },
  {
    id: "nw-002",
    slug: "seguimiento-de-domicilios",
    title: "Ahora puedes seguir tu domicilio en el mapa",
    excerpt: "Cada pedido incluye un enlace de seguimiento enviado por SMS o correo electrónico.",
    publishedAt: "2026-09-15T09:00:00-05:00",
  },
  {
    id: "nw-003",
    slug: "drones-con-geocerca",
    title: "Drones de alquiler con geocerca activa",
    excerpt: "Todos los drones de la flota operan dentro de zonas delimitadas conforme a la AEROCIVIL.",
    publishedAt: "2026-08-30T09:00:00-05:00",
  },
];

/** FAQ del portal (SRS 3.7). */
export const faqMock: FaqGroup[] = [
  {
    id: "faq-compras",
    title: "Compras y pagos",
    items: [
      {
        id: "faq-c1",
        question: "¿Qué medios de pago aceptan?",
        answer: "PSE, tarjetas de crédito y débito y billeteras digitales locales. El pago se procesa en una pasarela autorizada; EcoMovilidad no almacena los datos de tu tarjeta.",
      },
      {
        id: "faq-c2",
        question: "¿Cuánto tiempo apartan un producto en el carrito?",
        answer: "Cuando agregas un producto al carrito lo reservamos durante 15 minutos. Si no se completa el pago en ese tiempo, vuelve a estar disponible para otros clientes.",
      },
      {
        id: "faq-c3",
        question: "¿Recibo factura electrónica?",
        answer: "Sí. Generamos la factura electrónica conforme a la DIAN y la enviamos a tu correo en formatos PDF y XML.",
      },
      {
        id: "faq-c4",
        question: "¿Puedo retractarme de una compra en línea?",
        answer: "Sí. El Estatuto del Consumidor (Ley 1480 de 2011) reconoce el derecho de retracto en las compras a distancia. Escríbenos desde la página de contacto para iniciar el proceso.",
      },
    ],
  },
  {
    id: "faq-alquiler",
    title: "Alquiler",
    items: [
      {
        id: "faq-a1",
        question: "¿Por cuánto tiempo puedo alquilar?",
        answer: "Según el vehículo, por horas, días o semanas. Las tarifas disponibles se muestran en cada vehículo.",
      },
      {
        id: "faq-a2",
        question: "¿Dónde recojo y devuelvo el vehículo?",
        answer: "En cualquier sucursal que ofrezca alquiler, o en tu dirección eligiendo una franja horaria de entrega y recogida.",
      },
      {
        id: "faq-a3",
        question: "¿Qué pasa si el vehículo falla durante el alquiler?",
        answer: "Contáctanos y gestionamos el reemplazo. Además, retiramos del catálogo los equipos que se acercan a su límite de mantenimiento para prevenir fallas.",
      },
    ],
  },
  {
    id: "faq-domicilios",
    title: "Domicilios",
    items: [
      {
        id: "faq-d1",
        question: "¿Cómo sigo mi pedido?",
        answer: "Te enviamos un enlace por SMS o correo electrónico para ver en el mapa el recorrido del domiciliario. El pedido pasa por los estados Creado, Asignado, En recogida, En tránsito y Entregado.",
      },
      {
        id: "faq-d2",
        question: "¿Cómo se confirma la entrega?",
        answer: "El domiciliario escanea el código QR único de tu orden. Como alternativa, puedes firmar digitalmente en su aplicación junto con tu número de documento.",
      },
    ],
  },
  {
    id: "faq-drones",
    title: "Drones",
    items: [
      {
        id: "faq-dr1",
        question: "¿Qué normas aplican para volar un dron?",
        answer: "La operación de drones en Colombia está regulada por la AEROCIVIL en los Reglamentos Aeronáuticos de Colombia (RAC 100 y RAC 91). Te recomendamos revisarlos antes de volar.",
      },
      {
        id: "faq-dr2",
        question: "¿Qué es la geocerca de los drones de alquiler?",
        answer: "Es una zona virtual delimitada en el mapa. Los drones de la flota no pueden salir de ella y, si lo intentan, el sistema genera una alerta y el dron regresa a su punto de despegue.",
      },
    ],
  },
  {
    id: "faq-datos",
    title: "Datos personales",
    items: [
      {
        id: "faq-p1",
        question: "¿Cómo tratan mis datos personales?",
        answer: "Conforme a la Ley 1581 de 2012. Solo tratamos tus datos con tu autorización expresa y para las finalidades informadas. Consulta la política de tratamiento de datos.",
      },
    ],
  },
];
