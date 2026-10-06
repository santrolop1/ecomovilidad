"use client";

import Image from "next/image";
import { useState } from "react";
import { ProductImage } from "@/components/shared/product-image";
import type { ImageAsset } from "@/types";
import { cn } from "@/lib/utils";

export function ProductGallery({ images }: { images: ImageAsset[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-muted">
        <ProductImage image={active} priority sizes="(min-width: 1024px) 55vw, 100vw" />
      </div>
      {images.length > 1 && (
        <ul className="flex gap-3" aria-label="Imágenes del producto">
          {images.map((image, index) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ver imagen ${index + 1} de ${images.length}: ${image.alt}`}
                aria-pressed={index === activeIndex}
                className={cn(
                  "relative block size-20 overflow-hidden rounded-xl border-2 bg-muted transition-colors sm:size-24",
                  index === activeIndex ? "border-ink" : "border-transparent hover:border-ink/30",
                )}
              >
                <Image src={image.src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
