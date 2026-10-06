import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "./form-field";

describe("FormField", () => {
  it("enlaza etiqueta, control y mensaje de error", () => {
    render(
      <FormField id="email" label="Correo" error="Escribe un correo válido.">
        {(control) => <input {...control} />}
      </FormField>,
    );
    const input = screen.getByLabelText("Correo");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Escribe un correo válido.");
  });
});
