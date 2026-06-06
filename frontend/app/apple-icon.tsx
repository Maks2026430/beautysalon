import { ImageResponse } from "next/og";

// Иконка для iOS («Добавить на экран «Домой»»). iOS сам скругляет углы.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6E3D52",
          color: "#F7F1EA",
          fontSize: 120,
          fontWeight: 600,
          fontFamily: "serif",
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
