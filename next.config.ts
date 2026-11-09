import type { NextConfig } from "next";

const googleMaps = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
const googleHosts = "https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com";

// Sin nonces: Next.js necesita scripts en línea para hidratar la página.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${googleMaps ? ` ${googleHosts}` : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://tile.openstreetmap.org${googleMaps ? ` ${googleHosts}` : ""}`,
  "font-src 'self'",
  `connect-src 'self'${googleMaps ? ` ${googleHosts}` : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // En desarrollo Next.js necesita eval y WebSockets, que esta política bloquearía.
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
