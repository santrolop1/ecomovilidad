import type {
  Branch,
  Cart,
  ConsentRecord,
  ContactMessageInput,
  CreateOrderInput,
  CustomerOrder,
  FaqGroup,
  HomeContent,
  LoginInput,
  NewsItem,
  Order,
  Product,
  ProductCategory,
  ProductFilters,
  ProductListResult,
  ProfileInput,
  CreateRentalInput,
  CustomerRental,
  PaymentConfig,
  PaymentResult,
  PaymentSimulation,
  PaymentStart,
  RefundRequest,
  RegisterInput,
  RentalOffer,
  RentalPeriodInput,
  RentalQuote,
  Service,
  Session,
  TimeSlot,
  ManualPayment,
  DeliveryTracking,
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
  /** GET /rental-offers — vehículos que se alquilan, tarifas y unidades por sucursal. */
  listOffers(): Promise<RentalOffer[]>;
  /** POST /rental-offers/:productId/quote — precio y unidades libres (no aparta nada). */
  quote(productId: string, input: RentalPeriodInput): Promise<RentalQuote>;
  /** POST /rentals — aparta una unidad por el plazo de pago (requiere sesión). */
  createRental(input: CreateRentalInput): Promise<CustomerRental>;
  /** GET /rentals — alquileres del usuario autenticado. */
  listRentals(): Promise<CustomerRental[]>;
  /** GET /rentals/:id — null si no existe o es de otro usuario. */
  getRental(id: string): Promise<CustomerRental | null>;
  /** POST /rentals/:id/cancel — solo sin pagar (CU-15) */
  cancelRental(id: string): Promise<CustomerRental>;
  /** POST /rentals/:id/refund-request — pagado y sin entregar (CU-15) */
  requestRentalRefund(id: string, reason: string): Promise<RefundRequest>;
  /** Franjas de entrega (RF 7.1). SIN endpoint: siempre mock; FastAPI valida los ids. */
  listTimeSlots(date: string, branchId?: string): Promise<TimeSlot[]>;
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
  /** POST /orders (requiere sesión y carrito reservado) */
  createOrder(input: CreateOrderInput): Promise<Order>;
  /** GET /orders — pedidos del usuario autenticado */
  listOrders(): Promise<CustomerOrder[]>;
  /** GET /orders/:id — null si no existe o es de otro usuario */
  getOrder(id: string): Promise<CustomerOrder | null>;
  /** POST /orders/:id/cancel — solo sin pagar (CU-15) */
  cancelOrder(id: string): Promise<CustomerOrder>;
  /** POST /orders/:id/refund-request — pagado y sin entregar (CU-15) */
  requestOrderRefund(id: string, reason: string): Promise<RefundRequest>;
  /** GET /tracking/:token — seguimiento público (CU-07); null si el enlace no existe. */
  getTracking(token: string): Promise<DeliveryTracking | null>;
}

export interface PaymentsApi {
  /** GET /payments/config — si los pagos en línea están configurados. */
  getConfig(): Promise<PaymentConfig>;
  /** POST /payments — URL del Web Checkout de Wompi para un pedido o alquiler pendiente. */
  start(target: { orderId?: string; rentalId?: string }): Promise<PaymentStart>;
  /** POST /payments/verify — el backend consulta la transacción a la pasarela. */
  verify(transactionId: string): Promise<PaymentResult>;
  /** GET /payments/simulator/:reference — pasarela simulada (null si no aplica o no es del usuario). */
  getSimulation(reference: string): Promise<PaymentSimulation | null>;
  /** GET /payments/manual/:reference — instrucciones del pago manual (null si no aplica o no es del usuario). */
  getManualPayment(reference: string): Promise<ManualPayment | null>;
  /** POST /payments/simulator/:reference — aprobar o rechazar en la pasarela simulada; devuelve la transacción. */
  simulate(reference: string, decision: "approved" | "declined"): Promise<{ transactionId: string }>;
}

export interface ContentApi {
  /** Propuesta de valor y banners editables en el panel (RF 1.1); el hero es fijo. */
  getHomeContent(): Promise<HomeContent>;
  /** Noticias publicadas (RF 1.1). */
  listNews(): Promise<NewsItem[]>;
  listFaqs(): Promise<FaqGroup[]>;
  listServices(): Promise<Service[]>;
  /** POST /contact — sin sesión, con límite de envíos. */
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
  /** PATCH /auth/me — solo datos personales */
  updateProfile(input: ProfileInput): Promise<User>;
  /** POST /auth/password */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  /** POST /auth/password-reset/request — misma respuesta exista o no la cuenta */
  requestPasswordReset(email: string): Promise<void>;
  /** POST /auth/password-reset/confirm */
  confirmPasswordReset(token: string, newPassword: string): Promise<void>;
  /** GET /auth/me/consents — evidencia Ley 1581 */
  listConsents(): Promise<ConsentRecord[]>;
}

export interface ApiClient {
  catalog: CatalogApi;
  branches: BranchesApi;
  rentals: RentalsApi;
  cart: CartApi;
  orders: OrdersApi;
  payments: PaymentsApi;
  content: ContentApi;
  auth: AuthApi;
}
