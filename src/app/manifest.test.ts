import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("recursos de instalación móvil", () => {
  it("publica iconos PNG reales con las dimensiones declaradas y un alcance que incluye el inicio", () => {
    const app = manifest();
    expect(new URL(app.start_url!, "https://demo.example").pathname.startsWith(app.scope!)).toBe(true);
    expect(app.display).toBe("standalone");
    expect(app.icons?.some((icon) => icon.purpose === "maskable")).toBe(true);
    for (const icon of app.icons!) {
      const png = readFileSync(path.join(process.cwd(), "public", icon.src));
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
    const apple = readFileSync(path.join(process.cwd(), "public/icons/apple-touch-icon.png"));
    expect([apple.readUInt32BE(16), apple.readUInt32BE(20)]).toEqual([180, 180]);
  });
});
