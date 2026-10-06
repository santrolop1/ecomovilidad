import type {
  Branch,
  Cart,
  ContactMessageInput,
  CreateOrderInput,
  FaqGroup,
  HomeContent,
  LoginInput,
  NewsItem,
  Order,
  Product,
  ProductCategory,
  ProductFilters,
  ProductListResult,
  RegisterInput,
  RentalVehicle,
  Service,
  Session,
  TimeSlot,
  User,
} from "@/types";

/**
 * Contratos de la capa de datos. Las páginas y componentes dependen de estas
 * interfaces, nunca de una implementación concreta (mock o real).
 * Las rutas indicadas son las de FastAPI bajo /api/v1.
 */
export interface CatalogApi {
  /** GET /products */
  listProducts(filters?: ProductFilters): Promise<ProductListResult>;
  /** GET /products/:slug — null si no existe. */
  getProductBySlug(slug: string): Promise<Product | null>;
  /** GET /products?destacados=true&limite=N */
  listFeaturedProducts(limit?: number): Promise<Product[]>;
  /** GET /categories */
  listCategories(): Promise<ProductCategory[]>;
}

export interface BranchesApi {
  /** GET /branches */
  listBranches(): Promise<Branch[]>;
}

export interface RentalsApi {
  /** Oferta de vehículos de alquiler con tarifas. SIN backend: siempre mock. */
  listRentalVehicles(): Promise<RentalVehicle[]>;
  /** Franjas de entrega (RF 7.1). SIN endpoint: siempre mock; FastAPI valida los ids. */
  listTimeSlots(date: string): Promise<TimeSlot[]>;
}

/** Carrito del usuario autenticado (RF 6.3). Los visitantes usan el carrito local. */
export interface CartApi {
  /** GET /cart */
  getCart(): Promise<Cart>;
  /** POST /cart/items */
  addItem(productId: string, quantity: number): Promise<Cart>;
  /** PATCH /cart/items/:id */
  updateItem(itemId: string, quantity: number): Promise<Cart>;
  /** DELETE /cart/items/:id */
  removeItem(itemId: string): Promise<Cart>;
}

export interface OrdersApi {
  /** POST /orders (requiere sesión) */
  createOrder(input: CreateOrderInput): Promise<Order>;
}

export interface ContentApi {
  /** Contenido CMS (RF 1.1). SIN backend: siempre mock. */
  getHomeContent(): Promise<HomeContent>;
  listNews(): Promise<NewsItem[]>;
  listFaqs(): Promise<FaqGroup[]>;
  listServices(): Promise<Service[]>;
  /** SIN backend: en modo real responde "no disponible". */
  sendContactMessage(input: ContactMessageInput): Promise<{ id: string }>;
}

export interface AuthApi {
  /** POST /auth/login */
  login(input: LoginInput): Promise<Session>;
  /** POST /auth/register */
  register(input: RegisterInput): Promise<Session>;
  /** POST /auth/logout */
  logout(): Promise<void>;
  /** GET /auth/me — null si no hay sesión válida. */
  me(): Promise<User | null>;
}

export interface ApiClient {
  catalog: CatalogApi;
  branches: BranchesApi;
  rentals: RentalsApi;
  cart: CartApi;
  orders: OrdersApi;
  content: ContentApi;
  auth: AuthApi;
}
