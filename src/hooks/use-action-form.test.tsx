import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { useActionForm } from "./use-action-form";

const schema = z.object({ price: z.union([z.literal(""), z.coerce.number()]).transform((v) => (v === "" ? null : v)) });

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("useActionForm", () => {
  it("envía al servidor la entrada original, no la transformada", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, data: null });
    const { result } = renderHook(() => useActionForm(schema, action), { wrapper });
    act(() => result.current.submit({ price: "" }, document.createElement("form")));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0][0]).toEqual({ price: "" });
  });

  it("no llama al servidor si la validación del cliente falla", () => {
    const action = vi.fn();
    const { result } = renderHook(() => useActionForm(z.object({ name: z.string().min(2, "Corto") }), action), { wrapper });
    act(() => result.current.submit({ name: "a" }, document.createElement("form")));
    expect(action).not.toHaveBeenCalled();
    expect(result.current.fieldErrors).toEqual({ name: "Corto" });
  });
});
