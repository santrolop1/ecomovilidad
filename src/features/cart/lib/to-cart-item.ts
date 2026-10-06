import type { CartItem, Product } from "@/types";

export function productToCartItem(product: Product): Omit<CartItem, "quantity"> {
  const [image] = product.images;
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    image: image ? { src: image.src, alt: image.alt } : undefined,
    unitPrice: product.price,
    maxQuantity: product.stock.available,
  };
}
