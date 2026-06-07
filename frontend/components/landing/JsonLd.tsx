import { salon } from "@/lib/data";
import { siteUrl } from "@/lib/siteUrl";

// Структурированные данные Schema.org (BeautySalon) — помогают поисковикам
// показывать карточку организации с адресом, телефоном и часами работы.
export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: salon.name,
    description: salon.tagline,
    url: siteUrl,
    image: `${siteUrl}/opengraph-image`,
    telephone: salon.phoneHref.replace("tel:", ""),
    email: salon.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: salon.address,
      addressLocality: "Москва",
      addressCountry: "RU",
    },
    openingHours: "Mo-Su 09:00-21:00",
    priceRange: "₽₽",
  };

  return (
    <script
      type="application/ld+json"
      // Контент статичный и доверенный (наши же данные) — XSS-риска нет.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
