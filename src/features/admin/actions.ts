"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { type ActionResult, runAction } from "@/lib/action-result";
import { adminApi } from "@/lib/api/admin";
import { orderStatuses, rentalStatuses, rentalUnitStatuses } from "@/lib/api/admin-schemas";
import {
  branchFormSchema,
  categoryFormSchema,
  courierFormSchema,
  deliveryStatusSchema,
  deliveryValidationSchema,
  productFormSchema,
  stockUpdateSchema,
} from "./lib/schemas";

/**
 * Acciones del panel. FastAPI vuelve a validar el rol de administrador y el
 * token CSRF en cada llamada: estas acciones no conceden permisos por sí solas.
 * Tras cada cambio se invalida la caché pública afectada (catálogo, sucursales).
 */
const idSchema = z.string().uuid("Identificador inválido.");

function refreshStorefront(...tags: string[]) {
  for (const tag of tags) updateTag(tag);
}

export async function createProduct(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(productFormSchema, input, async (data) => {
    const product = await adminApi.createProduct(data);
    refreshStorefront("products", "categories");
    return { id: product.id };
  });
}

export async function updateProduct(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(productFormSchema, input, async (data) => {
    const product = await adminApi.updateProduct(idSchema.parse(id), data);
    refreshStorefront("products", "categories");
    return { id: product.id };
  });
}

export async function setProductActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  return runAction(z.boolean(), isActive, async (value) => {
    await adminApi.updateProduct(idSchema.parse(id), { isActive: value });
    refreshStorefront("products", "branches");
    return null;
  });
}

export async function setStock(productId: string, branchId: string, input: unknown): Promise<ActionResult<null>> {
  return runAction(stockUpdateSchema, input, async (data) => {
    await adminApi.setStock(idSchema.parse(productId), idSchema.parse(branchId), data);
    refreshStorefront("products", "branches");
    return null;
  });
}

export async function createCourier(input: unknown): Promise<ActionResult<null>> {
  return runAction(courierFormSchema, input, async (data) => {
    await adminApi.createCourier(data);
    return null;
  });
}

export async function setCourierActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  return runAction(z.boolean(), isActive, async (value) => {
    await adminApi.updateCourier(idSchema.parse(id), { isActive: value });
    return null;
  });
}

export async function assignDelivery(id: string, courierId: unknown): Promise<ActionResult<null>> {
  return runAction(z.string().uuid("Elige un domiciliario."), courierId, async (value) => {
    await adminApi.assignDelivery(idSchema.parse(id), value);
    return null;
  });
}

export async function changeDeliveryStatus(id: string, input: unknown): Promise<ActionResult<null>> {
  return runAction(deliveryStatusSchema, input, async (data) => {
    await adminApi.updateDelivery(idSchema.parse(id), data);
    return null;
  });
}

export async function validateDelivery(id: string, input: unknown): Promise<ActionResult<null>> {
  return runAction(deliveryValidationSchema, input, async (data) => {
    await adminApi.validateDelivery(idSchema.parse(id), data);
    return null;
  });
}

export async function createCategory(input: unknown): Promise<ActionResult<null>> {
  return runAction(categoryFormSchema, input, async (data) => {
    await adminApi.createCategory(data);
    refreshStorefront("categories", "products");
    return null;
  });
}

export async function updateCategory(id: string, input: unknown): Promise<ActionResult<null>> {
  return runAction(categoryFormSchema, input, async (data) => {
    await adminApi.updateCategory(idSchema.parse(id), data);
    refreshStorefront("categories", "products");
    return null;
  });
}

export async function createBranch(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(branchFormSchema, input, async (data) => {
    const branch = await adminApi.createBranch(data);
    refreshStorefront("branches", "products");
    return { id: branch.id };
  });
}

export async function updateBranch(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(branchFormSchema, input, async (data) => {
    const branch = await adminApi.updateBranch(idSchema.parse(id), data);
    refreshStorefront("branches", "products");
    return { id: branch.id };
  });
}

export async function setBranchActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  return runAction(z.boolean(), isActive, async (value) => {
    await adminApi.updateBranch(idSchema.parse(id), { isActive: value });
    refreshStorefront("branches", "products");
    return null;
  });
}

export async function changeOrderStatus(id: string, status: unknown): Promise<ActionResult<null>> {
  return runAction(z.enum(orderStatuses), status, async (value) => {
    await adminApi.updateOrderStatus(idSchema.parse(id), value);
    refreshStorefront("products", "branches");
    return null;
  });
}

export async function changeRentalStatus(id: string, status: unknown): Promise<ActionResult<null>> {
  return runAction(z.enum(rentalStatuses), status, async (value) => {
    await adminApi.updateRentalStatus(idSchema.parse(id), value);
    refreshStorefront("rental-offers");
    return null;
  });
}

export async function setRentalUnitStatus(id: string, status: unknown): Promise<ActionResult<null>> {
  return runAction(z.enum(rentalUnitStatuses), status, async (value) => {
    await adminApi.updateRentalUnit(idSchema.parse(id), value);
    refreshStorefront("rental-offers");
    return null;
  });
}

export async function resolveRefund(kind: "pedido" | "alquiler", id: string): Promise<ActionResult<null>> {
  return runAction(idSchema, id, async (value) => {
    if (kind === "pedido") await adminApi.resolveOrderRefund(value);
    else await adminApi.resolveRentalRefund(value);
    refreshStorefront("products", "branches", "rental-offers");
    return null;
  });
}

export async function setUserActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  return runAction(z.boolean(), isActive, async (value) => {
    await adminApi.setUserActive(idSchema.parse(id), value);
    return null;
  });
}
