import Navbar from "@/components/landing/Navbar"
import HeroSection from "@/components/landing/HeroSection"
import FeaturesSection from "@/components/landing/FeaturesSection"
import HowItWorksSection from "@/components/landing/HowItWorksSection"
import PricingSection from "@/components/landing/PricingSection"
import TestimonialsSection from "@/components/landing/TestimonialsSection"
import FAQSection from "@/components/landing/FAQSection"
import Footer from "@/components/landing/Footer"
import LandingMotion from "@/components/landing/LandingMotion"

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      {/* Global landing-page interactions */}
      <LandingMotion />

      {/* Navigation */}
      <Navbar />

      {/* Hero */}
      <HeroSection />

      {/* Features */}
      <section id="features">
        <FeaturesSection />
      </section>

      {/* How It Works */}
      <section id="how-it-works">
        <HowItWorksSection />
      </section>

      {/* Pricing */}
      <section id="pricing">
        <PricingSection />
      </section>

      {/* Reviews */}
      <section id="reviews">
        <TestimonialsSection />
      </section>

      {/* FAQ */}
      <section id="faq">
        <FAQSection />
      </section>

      {/* Footer */}
      <Footer />
    </main>
  )
}
