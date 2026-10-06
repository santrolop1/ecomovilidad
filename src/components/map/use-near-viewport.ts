"use client";

import { type RefObject, useEffect, useState } from "react";

/** true cuando el elemento se acerca al viewport: para no descargar el mapa si nadie lo ve. */
export function useNearViewport(ref: RefObject<Element | null>, rootMargin = "400px"): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || near) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin, near]);
  return near;
}
