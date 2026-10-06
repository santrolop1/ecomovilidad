import { describe, expect, it } from "vitest";
import { clientIpFromHeaders } from "./client-ip";

describe("clientIpFromHeaders", () => {
  it("prefiere la IP que fija Cloudflare", () => {
    const headers = new Headers({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "1.2.3.4, 203.0.113.7" });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("ignora las entradas de X-Forwarded-For que escribe el cliente", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.20" });
    expect(clientIpFromHeaders(headers)).toBe("198.51.100.20");
  });

  it("usa X-Real-IP o nada si no hay proxy", () => {
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "127.0.0.1" }))).toBe("127.0.0.1");
    expect(clientIpFromHeaders(new Headers())).toBeNull();
  });
});
