import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ff155d",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: "-0.05em",
        }}
      >
        PV
      </div>
    ),
    { ...size },
  );
}
