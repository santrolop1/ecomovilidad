import { env } from "./env";

export interface NavItem {
  label: string;
  href: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Datos institucionales. Los datos de contacto son PROVISIONALES hasta que
 * EcoMovilidad confirme los oficiales (ver ESTADO.md).
 */
export const siteConfig = {
  name: "EcoMovilidad",
  legalName: "EcoMovilidad Colombia S.A.S.",
  url: env.siteUrl,
  locale: "es_CO",
  description:
    "Compra, alquila y recibe bicicletas, patinetas eléctricas, patines y drones en Bucaramanga, Floridablanca, Girón y Piedecuesta, con entrega a domicilio y puntos de servicio.",
  contact: {
    email: "hola@ecomovilidad.co",
    phone: "+57 607 000 0000",
    phoneHref: "tel:+576070000000",
  },
  mainNav: [
    { label: "Catálogo", href: "/catalogo" },
    { label: "Alquiler", href: "/alquiler" },
    { label: "Servicios", href: "/servicios" },
    { label: "Sucursales", href: "/sucursales" },
    { label: "Ayuda", href: "/ayuda" },
  ] satisfies NavItem[],
  footerNav: [
    {
      title: "Comprar",
      items: [
        { label: "Bicicletas", href: "/catalogo?categoria=bicicletas" },
        { label: "Patinetas", href: "/catalogo?categoria=patinetas" },
        { label: "Patines", href: "/catalogo?categoria=patines" },
        { label: "Drones", href: "/catalogo?categoria=drones" },
      ],
    },
    {
      title: "Servicios",
      items: [
        { label: "Alquiler", href: "/alquiler" },
        { label: "Domicilios y mantenimiento", href: "/servicios" },
        { label: "Puntos de servicio", href: "/sucursales" },
      ],
    },
    {
      title: "Compañía",
      items: [
        { label: "Nosotros", href: "/nosotros" },
        { label: "Centro de ayuda", href: "/ayuda" },
        { label: "Contacto", href: "/contacto" },
      ],
    },
    {
      title: "Legal",
      items: [
        { label: "Tratamiento de datos", href: "/privacidad" },
        { label: "Términos y condiciones", href: "/terminos" },
        { label: "Créditos de imágenes", href: "/creditos" },
      ],
    },
  ] satisfies NavGroup[],
} as const;
