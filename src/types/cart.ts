export interface CartItem {
  /** Id de la línea en el carrito remoto (PATCH/DELETE /cart/items/:id). */
  id?: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  /** Ausente si el producto aún no tiene foto ("Imagen pendiente"). */
  image?: { src: string; alt: string };
  /** Precio unitario en COP en el momento de agregarlo. */
  unitPrice: number;
  quantity: number;
  /** Máximo permitido según inventario disponible. */
  maxQuantity: number;
  /** Fin de la reserva temporal (RF 6.2), hora del servidor. Solo carrito con sesión. */
  reservedUntil?: string;
}

export interface Cart {
  /** Identificador del carrito remoto (RF 6.3). Ausente en el carrito local. */
  id?: string;
  items: CartItem[];
  updatedAt: string;
  /** Minutos de la reserva temporal (solo carrito con sesión). */
  reservationMinutes?: number;
  /** Hora del servidor al responder (para corregir el reloj del contador). */
  serverTime?: string;
}
