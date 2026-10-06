"use server";

import { api } from "@/lib/api";
import { type ActionResult, runAction } from "@/lib/action-result";
import { contactSchema } from "./lib/schema";

export async function sendContactMessage(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(contactSchema, input, (data) => api.content.sendContactMessage(data));
}
