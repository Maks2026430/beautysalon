import { BotProvider } from "@/components/bot/BotProvider";
import { ChatWidget } from "@/components/bot/ChatWidget";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Services } from "@/components/landing/Services";
import { StatsBand } from "@/components/landing/StatsBand";
import { Masters } from "@/components/landing/Masters";
import { Reviews } from "@/components/landing/Reviews";
import { Contacts } from "@/components/landing/Contacts";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <BotProvider>
      <Header />
      <main>
        <Hero />
        <Services />
        <StatsBand />
        <Masters />
        <Reviews />
        <Contacts />
      </main>
      <Footer />
      <ChatWidget />
    </BotProvider>
  );
}
