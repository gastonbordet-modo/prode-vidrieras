import { ImageResponse } from "next/og";

export const alt = "Prode Vidrieras — Mundial 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #17002f 0%, #36224b 60%, #58053d 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            color: "#ff155d",
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: "16px",
              height: "16px",
              background: "#ff155d",
              borderRadius: "9999px",
            }}
          />
          Mundial 2026
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div
            style={{
              fontSize: "120px",
              fontWeight: 800,
              lineHeight: 1,
              color: "#ffffff",
            }}
          >
            Prode Vidrieras
          </div>
          <div
            style={{
              fontSize: "36px",
              color: "#ad9bcb",
              fontWeight: 400,
            }}
          >
            Pronostiquen, compitan, ganen el bragging right.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "#ad9bcb",
            fontSize: "22px",
          }}
        >
          <span>Equipo Vidrieras · Modo</span>
          <span style={{ color: "#00d8fc", fontWeight: 600 }}>
            prode-vidrieras-reservas-m.vercel.app
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
