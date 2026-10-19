import { z } from "zod";
import { todayInBogota } from "@/lib/dates";
import { consentField, emailField, fullNameField, phoneField } from "@/lib/validation";

/** Alcance operativo: área metropolitana de Bucaramanga (igual que el backend). */
export const serviceAreaCities = ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta"] as const;

export const documentTypes = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "NIT", label: "NIT" },
  { value: "PAS", label: "Pasaporte" },
] as const;

const MAX_ITEMS = 20;

export const checkoutSchema = z
  .object({
    items: z
      .array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(10) }))
      .min(1, "Tu carrito está vacío.")
      .max(MAX_ITEMS),
    customer: z.object({
      fullName: fullNameField,
      email: emailField,
      phone: phoneField,
      documentType: z.enum(["CC", "CE", "NIT", "PAS"], { error: "Elige un tipo de documento." }),
      documentNumber: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9-]{5,20}$/, "Escribe un número de documento válido."),
    }),
    fulfillment: z.object({
      method: z.enum(["domicilio", "recogida"], { error: "Elige cómo quieres recibir tu pedido." }),
      address: z.string().trim().max(160).optional(),
      city: z.enum(serviceAreaCities, { error: "Solo hacemos domicilios en el área metropolitana de Bucaramanga." }).optional(),
      branchId: z.string().optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha.")
        .refine((date) => date >= todayInBogota(), "La fecha no puede ser anterior a hoy."),
      timeSlotId: z.string().min(1, "Elige una franja horaria."),
    }),
    dataConsent: consentField,
    policyVersion: z.string().max(20).optional(),
  })
  .superRefine((values, ctx) => {
    const { method, address, city, branchId } = values.fulfillment;
    if (method === "domicilio") {
      if (!address || address.length < 5)
        ctx.addIssue({ code: "custom", path: ["fulfillment", "address"], message: "Escribe la dirección de entrega." });
      if (!city) ctx.addIssue({ code: "custom", path: ["fulfillment", "city"], message: "Elige el municipio." });
    }
    if (method === "recogida" && !branchId) {
      ctx.addIssue({ code: "custom", path: ["fulfillment", "branchId"], message: "Elige la sucursal de recogida." });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
