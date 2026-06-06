import { ImageResponse } from "next/og";
import { salon } from "@/lib/data";

export const alt = "Lumière — эстетическая косметология и красота";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Подгружаем кириллический шрифт (Cormorant Garamond) для satori.
// Старый User-Agent → Google отдаёт TTF (satori не умеет woff2).
// Если не удалось — вернём null и отрисуем латинский запасной вариант.
async function loadFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&text=${encodeURIComponent(
      text,
    )}`;
    const css = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; rv:10.0) Gecko/20100101 Firefox/10.0",
      },
    }).then((r) => r.text());
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);
    if (!src) return null;
    const res = await fetch(src[1]);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function Image() {
  const eyebrow = salon.tagline.toUpperCase();
  const slogan = salon.slogan;
  const domain = salon.email.split("@")[1] ?? "";
  const footer = `${domain} · ${salon.phone}`;

  const font = await loadFont(eyebrow + salon.name + slogan + footer);

  const plum = "#6E3D52";
  const cream = "#F7F1EA";
  const accent = "#A85D6E";

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
          padding: "90px",
          background: plum,
          color: cream,
          fontFamily: font ? "Cormorant" : "sans-serif",
        }}
      >
        {/* Декоративные пятна */}
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -120,
            width: 440,
            height: 440,
            borderRadius: 9999,
            background: "rgba(168,93,110,0.45)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            left: -120,
            width: 420,
            height: 420,
            borderRadius: 9999,
            background: "rgba(83,45,63,0.7)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 16, height: 16, borderRadius: 9999, background: accent }} />
          <div style={{ fontSize: 30, letterSpacing: 8, color: "rgba(247,241,234,0.75)" }}>
            {font ? eyebrow : "AESTHETIC BEAUTY SALON"}
          </div>
        </div>

        <div style={{ fontSize: 170, fontWeight: 600, lineHeight: 1, marginTop: 24 }}>
          {salon.name}
        </div>

        <div
          style={{
            fontSize: 40,
            color: "rgba(247,241,234,0.82)",
            marginTop: 18,
            maxWidth: 920,
          }}
        >
          {font ? slogan : "Beauty & aesthetic cosmetology"}
        </div>

        <div style={{ fontSize: 30, color: "rgba(247,241,234,0.6)", marginTop: 48 }}>
          {footer}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "Cormorant", data: font, style: "normal", weight: 600 }] : undefined,
    },
  );
}
