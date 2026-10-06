"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { useSession } from "@/features/auth/use-session";
import type { ActionResult } from "@/lib/action-result";
import type { Cart, CartItem } from "@/types";
import {
  addRemoteCartItem,
  clearRemoteCart,
  getRemoteCart,
  mergeLocalCart,
  removeRemoteCartItem,
  updateRemoteCartItem,
} from "./actions";
import { type CartAction, cartReducer, createEmptyCart, getItemCount, getSubtotal, getTotal } from "./lib/cart-reducer";
import { createLocalCartStorage, type CartStorage } from "./lib/cart-storage";
import { toLocalClock, vanishedItems } from "./lib/reservation";

export const cartQueryKey = ["cart"] as const;

interface CartContextValue {
  cart: Cart;
  /** false mientras se resuelve la sesión o se lee el carrito. */
  isReady: boolean;
  /** true si el carrito vive en el backend (usuario con sesión). */
  isRemote: boolean;
  itemCount: number;
  subtotal: number;
  total: number;
  addItem(item: Omit<CartItem, "quantity">, quantity?: number): void;
  removeItem(productId: string): void;
  setQuantity(productId: string, quantity: number): void;
  clear(): void;
  /** Tras crear un pedido: el backend ya convirtió el carrito remoto. */
  completeOrder(): void;
  /** Vuelve a consultar el carrito al servidor (p. ej. cuando vence una reserva). */
  refresh(): void;
}

const CartContext = createContext<CartContextValue | null>(null);

interface LocalState {
  cart: Cart;
  isReady: boolean;
}

function localReducer(state: LocalState, action: CartAction): LocalState {
  return { cart: cartReducer(state.cart, action), isReady: state.isReady || action.type === "hydrate" };
}

async function unwrap(request: Promise<ActionResult<Cart>>): Promise<Cart> {
  const result = await request;
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

/**
 * Visitantes: carrito local (localStorage). Usuarios con sesión: carrito
 * persistente en FastAPI (RF 6.3), con actualizaciones optimistas.
 */
export function CartProvider({ children, storage }: { children: ReactNode; storage?: CartStorage }) {
  const queryClient = useQueryClient();
  const { user, isLoading: sessionLoading } = useSession();
  const isRemote = user !== null;

  const storageRef = useRef<CartStorage | null>(storage ?? null);
  const [local, dispatch] = useReducer(localReducer, undefined, () => ({ cart: createEmptyCart(), isReady: false }));

  useEffect(() => {
    storageRef.current ??= createLocalCartStorage();
    dispatch({ type: "hydrate", cart: storageRef.current.load() ?? createEmptyCart() });
  }, []);

  useEffect(() => {
    if (local.isReady) storageRef.current?.save(local.cart);
  }, [local]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === null || !event.key.startsWith("ecomovilidad:cart")) return;
      dispatch({ type: "hydrate", cart: storageRef.current?.load() ?? createEmptyCart() });
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const remote = useQuery({
    queryKey: cartQueryKey,
    queryFn: async () => toLocalClock(await unwrap(getRemoteCart()), Date.now()),
    enabled: isRemote,
    // Las reservas vencen en el servidor: se vuelve a consultar cada minuto.
    refetchInterval: 60_000,
  });

  // Al llegar el vencimiento más próximo (+1 s) se consulta al servidor y se
  // reintenta cada 3 s hasta que libere la reserva. El servidor decide; esto
  // solo evita que la UI muestre una reserva que ya no existe.
  const earliestExpiry = isRemote
    ? (remote.data?.items.flatMap((item) => (item.reservedUntil ? [item.reservedUntil] : [])).sort()[0] ?? null)
    : null;
  useEffect(() => {
    if (!earliestExpiry) return;
    const refetch = () => void queryClient.invalidateQueries({ queryKey: cartQueryKey });
    let retry: ReturnType<typeof setInterval> | undefined;
    const wait = Math.max(0, new Date(earliestExpiry).getTime() - Date.now()) + 1000;
    const timeout = setTimeout(() => {
      refetch();
      retry = setInterval(refetch, 3000);
    }, wait);
    return () => {
      clearTimeout(timeout);
      clearInterval(retry);
    };
  }, [earliestExpiry, queryClient]);

  // Aviso cuando el servidor retiró productos por reserva vencida (RF 6.2).
  const removedByUser = useRef(new Set<string>());
  const previousItems = useRef<CartItem[] | null>(null);
  useEffect(() => {
    if (!isRemote || !remote.data) {
      previousItems.current = null;
      return;
    }
    const gone = previousItems.current ? vanishedItems(previousItems.current, remote.data.items, removedByUser.current) : [];
    if (gone.length > 0) {
      toast.warning(`La reserva de ${gone.join(", ")} venció y lo quitamos del carrito.`, {
        description: "Puedes agregarlo de nuevo si sigue disponible.",
      });
    }
    previousItems.current = remote.data.items;
    removedByUser.current.clear();
  }, [isRemote, remote.data]);

  // Al iniciar sesión, el carrito local se fusiona con el de la cuenta.
  const mergedForUser = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !local.isReady || mergedForUser.current === user.id) return;
    mergedForUser.current = user.id;
    if (local.cart.items.length === 0) return;
    const lines = local.cart.items.map(({ productId, quantity }) => ({ productId, quantity }));
    void mergeLocalCart(lines).then((result) => {
      if (!result.ok) return;
      queryClient.setQueryData(cartQueryKey, toLocalClock(result.data, Date.now()));
      dispatch({ type: "clear" });
    });
  }, [user, local, queryClient]);

  const value = useMemo<CartContextValue>(() => {
    const cart = isRemote ? (remote.data ?? createEmptyCart()) : local.cart;

    async function mutateRemote(optimistic: CartAction, request: () => Promise<ActionResult<Cart>>) {
      const previous = queryClient.getQueryData<Cart>(cartQueryKey);
      if (previous) queryClient.setQueryData(cartQueryKey, cartReducer(previous, optimistic));
      const result = await request();
      if (result.ok) {
        queryClient.setQueryData(cartQueryKey, toLocalClock(result.data, Date.now()));
      } else {
        if (previous) queryClient.setQueryData(cartQueryKey, previous);
        toast.error(result.message);
      }
    }

    const lineId = (productId: string) => cart.items.find((item) => item.productId === productId)?.id;
    const markRemoved = (...productIds: string[]) => productIds.forEach((id) => removedByUser.current.add(id));

    return {
      cart,
      isRemote,
      isReady: !sessionLoading && (isRemote ? remote.isSuccess : local.isReady),
      itemCount: getItemCount(cart),
      subtotal: getSubtotal(cart),
      total: getTotal(cart),
      addItem(item, quantity = 1) {
        const action: CartAction = { type: "add", item, quantity };
        if (!isRemote) return dispatch(action);
        void mutateRemote(action, () => addRemoteCartItem(item.productId, quantity));
      },
      removeItem(productId) {
        const action: CartAction = { type: "remove", productId };
        if (!isRemote) return dispatch(action);
        const id = lineId(productId);
        markRemoved(productId);
        if (id) void mutateRemote(action, () => removeRemoteCartItem(id));
      },
      setQuantity(productId, quantity) {
        const action: CartAction = { type: "setQuantity", productId, quantity };
        if (!isRemote) return dispatch(action);
        const id = lineId(productId);
        if (!id) return;
        if (quantity <= 0) markRemoved(productId);
        void mutateRemote(action, () => (quantity > 0 ? updateRemoteCartItem(id, quantity) : removeRemoteCartItem(id)));
      },
      clear() {
        if (!isRemote) return dispatch({ type: "clear" });
        markRemoved(...cart.items.map((item) => item.productId));
        void mutateRemote({ type: "clear" }, () => clearRemoteCart());
      },
      completeOrder() {
        if (!isRemote) return dispatch({ type: "clear" });
        markRemoved(...cart.items.map((item) => item.productId));
        void queryClient.invalidateQueries({ queryKey: cartQueryKey });
      },
      refresh() {
        if (isRemote) void queryClient.invalidateQueries({ queryKey: cartQueryKey });
      },
    };
  }, [isRemote, remote.data, remote.isSuccess, local, sessionLoading, queryClient]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de <CartProvider>.");
  return context;
}
