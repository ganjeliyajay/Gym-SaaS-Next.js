import FAQSection from "../components/landing/FAQSection"
import FeaturesSection from "../components/landing/FeaturesSection"
import Footer from "../components/landing/Footer"
import HeroSection from "../components/landing/HeroSection"
import Navbar from "../components/landing/Navbar"
import PricingSection from "../components/landing/PricingSection"
import TestimonialsSection from "../components/landing/TestimonialsSection"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#070b14]">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <Footer />
    </main>
  )
}
