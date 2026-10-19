"use server";

import { api } from "@/lib/api";
import { type ActionResult, runAction } from "@/lib/action-result";
import type { CustomerRental, RentalQuote } from "@/types";
import { rentalBookingSchema, rentalPeriodSchema } from "./lib/schema";

/** Precio y unidades libres para un periodo (POST /rental-offers/:id/quote). No aparta nada. */
export async function quoteRental(input: unknown): Promise<ActionResult<RentalQuote>> {
  return runAction(rentalPeriodSchema, input, ({ productId, ...period }) => api.rentals.quote(productId, period));
}

/** Aparta una unidad por el plazo de pago (POST /rentals). Después se abre el pago. */
export async function bookRental(input: unknown): Promise<ActionResult<CustomerRental>> {
  return runAction(rentalBookingSchema, input, (data) => api.rentals.createRental(data));
}
