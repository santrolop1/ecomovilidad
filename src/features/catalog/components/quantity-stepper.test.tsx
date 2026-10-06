import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuantityStepper } from "./quantity-stepper";

describe("QuantityStepper", () => {
  it("deshabilita los botones en los límites", () => {
    render(<QuantityStepper label="Cantidad" value={1} max={1} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Disminuir cantidad" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Aumentar cantidad" })).toBeDisabled();
  });

  it("notifica el nuevo valor", () => {
    const onChange = vi.fn();
    render(<QuantityStepper label="Cantidad" value={2} max={5} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar cantidad" }));
    expect(onChange).toHaveBeenCalledWith(3);
    expect(screen.getByRole("group", { name: "Cantidad" })).toBeInTheDocument();
  });
});
