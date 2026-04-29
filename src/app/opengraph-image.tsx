import { ImageResponse } from "next/og";

export const alt = "LingayatBandhu — Lingayat matrimony";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #1c1917 0%, #431407 42%, #ea580c 100%)",
          color: "white",
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.02em" }}>LingayatBandhu</div>
        <div style={{ fontSize: 26, fontWeight: 400, marginTop: 16, opacity: 0.92 }}>
          Lingayat matrimony — find your match
        </div>
      </div>
    ),
    { ...size }
  );
}
