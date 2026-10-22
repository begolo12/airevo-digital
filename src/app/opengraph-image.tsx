import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const alt = `${site.name} — software yang dipakai`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FBF6EC",
          padding: 72,
          color: "#23201D",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#F6E7B4",
              border: "2px solid #23201D",
              borderRadius: 12,
              fontSize: 32,
              fontWeight: 900,
            }}
          >
            A
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
            airevo digital
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#6B6254",
            }}
          >
            Software studio · Indonesia
          </div>
          <div
            style={{
              fontSize: 82,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: -2.5,
              maxWidth: 940,
            }}
          >
            Software yang dipakai, bukan hanya dipamerkan.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {["Keluarga", "Ops", "Keuangan"].map((name) => (
            <div
              key={name}
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                border: "2px solid #D6C7AC",
                background: "#FFFDF8",
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
