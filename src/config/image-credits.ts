/**
 * Créditos de las fotografías de producto (Wikimedia Commons). Las licencias
 * CC BY y CC BY-SA exigen atribución: se muestran en la ficha de producto y
 * en /creditos. Las fotos son REFERENCIALES del tipo de producto: el catálogo
 * actual es de demostración.
 */
export interface ImageCredit {
  file: string;
  title: string;
  author: string;
  license: string;
  licenseUrl?: string;
  source: string;
}

export const imageCredits: ImageCredit[] = [
  {
    file: "/images/products/voltra-urbana-e1.webp",
    title: "Cowboy 3 pedelec on a cloudy day.jpg",
    author: "Elmschrat",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Cowboy_3_pedelec_on_a_cloudy_day.jpg",
  },
  {
    file: "/images/products/andina-pliega-20.webp",
    title: "Lulu Bike Electric side view.jpg",
    author: "Glurois",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Lulu_Bike_Electric_side_view.jpg",
  },
  {
    file: "/images/products/condor-trail-29.webp",
    title: "Amflow PL Carbon Pro Electric Mountain Bike.jpg",
    author: "TaurusEmerald",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Amflow_PL_Carbon_Pro_Electric_Mountain_Bike.jpg",
  },
  {
    file: "/images/products/andina-ruta-mecanica.webp",
    title: "Gazelle bicycle, Bratislava, 2023-01-30 11.19.37.jpg",
    author: "Andrej Shadura",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Gazelle_bicycle,_Bratislava,_2023-01-30_11.19.37.jpg",
  },
  {
    file: "/images/products/voltra-s2-urbana.webp",
    title: "E-Scooter am Wegesrand 20240708 HOF0418 RAW-Export.png",
    author: "PantheraLeo1359531",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
    source: "https://commons.wikimedia.org/wiki/File:E-Scooter_am_Wegesrand_20240708_HOF0418_RAW-Export.png",
  },
  {
    file: "/images/products/rueda-norte-city-lite.webp",
    title: "Xiaomi M365 blanche.jpg",
    author: "Axel.206",
    license: "CC0",
    licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Xiaomi_M365_blanche.jpg",
  },
  {
    file: "/images/products/condor-x-terreno.webp",
    title: "Dualtron Victor.jpg",
    author: "Amo0202",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Dualtron_Victor.jpg",
  },
  {
    file: "/images/products/rueda-norte-commuter-pro.webp",
    title: "Ninebot Kickscooter F2 Apodaca 01.jpg",
    author: "Sahaquiel9102",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Ninebot_Kickscooter_F2_Apodaca_01.jpg",
  },
  {
    file: "/images/products/patinova-city-80.webp",
    title: "Fila inline skates-bg.png",
    author: "Santeri Viinamäki",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Fila_inline_skates-bg.png",
  },
  {
    file: "/images/products/patinova-fit-84.webp",
    title: "Rollerblade Igniter S90 fitness inline skate.png",
    author: "Krochoman",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    source: "https://commons.wikimedia.org/wiki/File:Rollerblade_Igniter_S90_fitness_inline_skate.png",
  },
  {
    file: "/images/products/velox-junior-ajustable.webp",
    title: "Child's Inline Skates-bg.png",
    author: "Jillsphone1",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:Child%27s_Inline_Skates-bg.png",
  },
  {
    file: "/images/products/aeroandes-mini-4k.webp",
    title: "2024 Dron DJI Mini 4 Pro (01).jpg",
    author: "Jacek Halicki",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:2024_Dron_DJI_Mini_4_Pro_(01).jpg",
  },
  {
    file: "/images/products/aeroandes-pro-6k.webp",
    title: "DJI - Drohne Mavic 4 Pro.JPG",
    author: "C.Stadler/Bwag",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source: "https://commons.wikimedia.org/wiki/File:DJI_-_Drohne_Mavic_4_Pro.JPG",
  },
  {
    file: "/images/products/nimbo-explorer-4k.webp",
    title: "Quadcopter camera drone in flight.jpg",
    author: "Josh Sorenson",
    license: "CC0",
    licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    source: "https://commons.wikimedia.org/wiki/File:Quadcopter_camera_drone_in_flight.jpg",
  },
];

export function findImageCredit(src: string): ImageCredit | undefined {
  return imageCredits.find((credit) => credit.file === src);
}
