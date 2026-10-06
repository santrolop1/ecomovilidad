"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { type CityCluster, METRO_BOUNDS, METRO_CANVAS, project } from "@/features/branches/lib/geo";

const { width: WIDTH, height: HEIGHT } = METRO_CANVAS;

/**
 * Red de puntos de servicio del área metropolitana de Bucaramanga. La ruta se dibuja
 * una sola vez al cargar; con movimiento reducido aparece completa.
 */
export function HeroRoute({ cities }: { cities: CityCluster[] }) {
  const reduceMotion = useReducedMotion();
  // De norte a sur para que la ruta tenga una dirección legible.
  const ordered = [...cities].sort((a, b) => b.location.lat - a.location.lat);
  const points = ordered.map((city) => ({ city, ...project(city.location, METRO_BOUNDS, WIDTH, HEIGHT) }));
  const route = points
    .map(({ x, y }, i) => {
      if (i === 0) return `M${x} ${y}`;
      const prev = points[i - 1];
      const midY = (prev.y + y) / 2;
      return `C${prev.x} ${midY} ${x} ${midY} ${x} ${y}`;
    })
    .join(" ");

  return (
    <LazyMotion features={domAnimation} strict>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-full w-full" aria-hidden="true">
        <defs>
          <pattern id="hero-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="var(--ink-3)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={WIDTH} height={HEIGHT} rx="24" fill="url(#hero-grid)" />
        <m.path
          d={route}
          fill="none"
          stroke="var(--volt)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, ease: [0.65, 0, 0.35, 1], delay: 0.2 }}
        />
        {points.map(({ city, x, y }, index) => (
          <m.g
            key={city.city}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 + index * 0.4, duration: 0.35 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          >
            <circle cx={x} cy={y} r="11" fill="var(--volt)" fillOpacity="0.16" />
            <circle cx={x} cy={y} r="5" fill="var(--volt)" />
            <text
              x={x < WIDTH * 0.25 || x > WIDTH * 0.6 ? x - 16 : x + 16}
              y={y + 4}
              textAnchor={x < WIDTH * 0.25 || x > WIDTH * 0.6 ? "end" : "start"}
              className="fill-paper text-[13px] font-medium"
            >
              {city.city}
            </text>
          </m.g>
        ))}
      </svg>
    </LazyMotion>
  );
}
