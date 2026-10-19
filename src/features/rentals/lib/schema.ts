import { z } from "zod";
import { documentTypes } from "@/features/checkout/lib/schema";
import { consentField, emailField, fullNameField, phoneField } from "@/lib/validation";

const isoDateTime = z.iso.datetime({ offset: true, error: "Elige la fecha y la hora." });

export const rentalPeriodSchema = z
  .object({
    productId: z.uuid("Vehículo no válido."),
    branchId: z.uuid("Elige la sucursal."),
    startAt: isoDateTime,
    endAt: isoDateTime,
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    path: ["endAt"],
    message: "La devolución debe ser después de la recogida.",
  });

export const rentalBookingSchema = z
  .object({
    productId: z.uuid("Vehículo no válido."),
    branchId: z.uuid("Elige la sucursal."),
    startAt: isoDateTime,
    endAt: isoDateTime,
    customer: z.object({
      fullName: fullNameField,
      email: emailField,
      phone: phoneField,
      documentType: z.enum(documentTypes.map((d) => d.value) as ["CC", "CE", "NIT", "PAS"], {
        error: "Elige un tipo de documento.",
      }),
      documentNumber: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9-]{5,20}$/, "Escribe un número de documento válido."),
    }),
    dataConsent: consentField,
    policyVersion: z.string().max(20).optional(),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    path: ["endAt"],
    message: "La devolución debe ser después de la recogida.",
  });
