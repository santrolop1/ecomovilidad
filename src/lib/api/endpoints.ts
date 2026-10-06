/** Rutas de FastAPI relativas a API_BASE_URL (que incluye /api/v1). */
export const endpoints = {
  products: "/products",
  product: (slug: string) => `/products/${encodeURIComponent(slug)}`,
  categories: "/categories",
  branches: "/branches",
  cart: "/cart",
  cartItems: "/cart/items",
  cartItem: (id: string) => `/cart/items/${encodeURIComponent(id)}`,
  orders: "/orders",
  authLogin: "/auth/login",
  authRegister: "/auth/register",
  authLogout: "/auth/logout",
  authMe: "/auth/me",
} as const;
