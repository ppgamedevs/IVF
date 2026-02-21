import { getTranslations } from "next-intl/server";
import Header from "../components/Header";
import Hero from "../components/Hero";
import TrustBar from "../components/TrustBar";
import Benefits from "../components/Benefits";
import LeadForm from "../components/LeadForm";
import FAQ from "../components/FAQ";
import FinalCTA from "../components/FinalCTA";
import Footer from "../components/Footer";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export default async function Home({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: "faq" });
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_KEYS.map((qKey) => {
      const aKey = qKey.replace("q", "a") as "a1" | "a2" | "a3" | "a4" | "a5";
      const name = String(t(qKey)).trim() || "FAQ";
      const text = String(t(aKey)).trim() || "—";
      return {
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      };
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <Benefits />
        <LeadForm />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
