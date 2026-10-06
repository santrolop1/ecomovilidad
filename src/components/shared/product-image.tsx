import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  image?: { src: string; alt: string };
  /** `sizes` de next/image según el ancho que ocupa en cada breakpoint. */
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Texto más pequeño para miniaturas. */
  compact?: boolean;
}

/**
 * Foto del producto (siempre dentro de un contenedor con posición relativa y
 * tamaño definido). Sin foto real muestra "Imagen pendiente" en lugar de
 * inventar una ilustración.
 */
export function ProductImage({ image, sizes, priority = false, className, compact = false }: ProductImageProps) {
  if (!image) {
    return (
      <div
        role="img"
        aria-label="Imagen pendiente"
        className={cn("absolute inset-0 grid place-items-center bg-muted text-muted-foreground", className)}
      >
        <span className="flex flex-col items-center gap-1.5 text-center">
          <ImageOff className={compact ? "size-4" : "size-6"} aria-hidden="true" />
          {!compact && <span className="text-xs font-medium">Imagen pendiente</span>}
        </span>
      </div>
    );
  }
  return (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={70}
      className={cn("object-cover", className)}
    />
  );
}
