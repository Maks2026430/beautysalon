import { Reveal } from "@/components/landing/Reveal";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal className={align === "center" ? "text-center" : "text-left"}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-3 text-4xl font-medium text-espresso md:text-5xl">{title}</h2>
      {subtitle && (
        <p
          className={`mt-4 text-base text-espresso/60 ${
            align === "center" ? "mx-auto max-w-xl" : "max-w-xl"
          }`}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
