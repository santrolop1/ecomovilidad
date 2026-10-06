import type { ProductCategory } from "@/types";

export const categoriesMock: ProductCategory[] = [
  {
    slug: "bicicletas",
    name: "Bicicletas",
    description: "Urbanas, plegables y de montaña con asistencia eléctrica.",
    image: { src: "/images/products/voltra-urbana-e1.webp", alt: "Foto de referencia: bicicletas" },
  },
  {
    slug: "patinetas",
    name: "Patinetas",
    description: "Patinetas eléctricas para recorridos diarios en ciudad.",
    image: { src: "/images/products/voltra-s2-urbana.webp", alt: "Foto de referencia: patinetas" },
  },
  {
    slug: "patines",
    name: "Patines",
    description: "Patines de línea para ciudad, fitness y velocidad.",
    image: { src: "/images/products/patinova-city-80.webp", alt: "Foto de referencia: patines" },
  },
  {
    slug: "drones",
    name: "Drones",
    description: "Drones para fotografía y uso profesional, con geocercas configuradas.",
    image: { src: "/images/products/aeroandes-mini-4k.webp", alt: "Foto de referencia: drones" },
  },
];
