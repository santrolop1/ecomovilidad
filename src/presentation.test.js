import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const presentation = readFileSync(path.join(process.cwd(), "public/presentacion.html"), "utf8");
function openDeck(hash = "") {
  return new JSDOM(presentation, {
    url: `https://demo.example/presentacion.html${hash}`,
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
}

describe("presentación de EcoMovilidad", () => {
  it("muestra el guion con N, lo actualiza al navegar y lo oculta con Escape", () => {
    const dom = openDeck();
    const { document, KeyboardEvent } = dom.window;
    const key = (value) => document.body.dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true }));
    const panel = document.getElementById("notes");
    expect(panel.hidden).toBe(true);
    key("n");
    expect(panel.hidden).toBe(false);
    expect(document.getElementById("toggle-notes")?.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("notes-content")?.textContent).toContain("Buenos días");
    key("ArrowRight");
    expect(document.getElementById("counter")?.textContent).toBe("2 / 16");
    expect(panel.hidden).toBe(false);
    expect(document.getElementById("notes-content")?.textContent).toContain("Pensemos en tres situaciones");
    key("N");
    expect(panel.hidden).toBe(true);
    key("n");
    key("Escape");
    expect(panel.hidden).toBe(true);
    dom.window.close();
  });

  it("respeta los límites, permite saltar a otra diapositiva y conserva los guiones de ambos expositores", () => {
    const dom = openDeck("#diapositiva-999");
    const { document, KeyboardEvent, Event } = dom.window;
    expect(document.getElementById("counter")?.textContent).toBe("16 / 16");
    expect(document.getElementById("next").disabled).toBe(true);
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(document.getElementById("prev").disabled).toBe(true);
    const jump = document.getElementById("jump");
    jump.value = "13";
    jump.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.getElementById("counter")?.textContent).toBe("14 / 16");
    const notes = document.getElementById("notes-content")?.textContent;
    expect(notes).toContain("Santiago");
    expect(notes).toContain("Elías");
    jump.dispatchEvent(new KeyboardEvent("keydown", { key: "n", bubbles: true }));
    expect(document.getElementById("notes").hidden).toBe(true);
    const visible = [...document.querySelectorAll(".slide")].filter(slide => !slide.hidden);
    expect(visible).toHaveLength(1);
    expect(document.querySelectorAll("template")).toHaveLength(16);
    dom.window.close();
  });

  it("incluye capturas y scripts sin dependencias de red para abrir el HTML descargado", () => {
    const dom = openDeck();
    const { document } = dom.window;
    expect(document.querySelectorAll("script[src], link[rel=stylesheet], iframe")).toHaveLength(0);
    const images = [...document.querySelectorAll("img")];
    expect(images).toHaveLength(2);
    expect(images.every(image => image.getAttribute("src")?.startsWith("data:image/jpeg;base64,"))).toBe(true);
    dom.window.close();
  });
});
