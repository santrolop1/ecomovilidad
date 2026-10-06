import { z } from "zod";
import { consentField, emailField, fullNameField, phoneField } from "@/lib/validation";

export const contactTopics = [
  { value: "compra", label: "Compra de un vehículo" },
  { value: "alquiler", label: "Alquiler" },
  { value: "domicilio", label: "Estado de un domicilio" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "otro", label: "Otro tema" },
] as const;

export const contactSchema = z.object({
  fullName: fullNameField,
  email: emailField,
  phone: z.union([z.literal(""), phoneField]).optional().transform((value) => value || undefined),
  topic: z.enum(["compra", "alquiler", "domicilio", "mantenimiento", "otro"], { error: "Elige un tema." }),
  message: z.string().trim().min(10, "Cuéntanos un poco más (mínimo 10 caracteres).").max(2000, "Máximo 2.000 caracteres."),
  dataConsent: consentField,
});

export type ContactFormValues = z.infer<typeof contactSchema>;
