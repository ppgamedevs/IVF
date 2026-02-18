import Header from "../components/Header";
import Hero from "../components/Hero";
import TrustBar from "../components/TrustBar";
import Benefits from "../components/Benefits";
import LeadForm from "../components/LeadForm";
import FAQ from "../components/FAQ";
import FinalCTA from "../components/FinalCTA";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
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
