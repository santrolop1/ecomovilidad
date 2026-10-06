/**
 * Plantilla de imagen Open Graph (1200×630) compartida por la home y las
 * fichas de producto. Solo usa estilos soportados por `next/og` (flexbox).
 */
export const OG_SIZE = { width: 1200, height: 630 };

interface OgCardProps {
  eyebrow: string;
  title: string;
  footer: string;
}

export function OgCard({ eyebrow, title, footer }: OgCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#07111F",
        color: "#F8FAFC",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#39E58C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 22, height: 22, borderRadius: 11, background: "#07111F" }} />
        </div>
        <div style={{ fontSize: 30, fontWeight: 700 }}>EcoMovilidad</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 28, color: "#9FB0C5" }}>{eyebrow}</div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980 }}>{title}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
        <div style={{ width: 120, height: 6, borderRadius: 3, background: "#39E58C" }} />
        <div>{footer}</div>
      </div>
    </div>
  );
}
