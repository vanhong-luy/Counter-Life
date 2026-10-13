import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/app/components/HeroSection";
import StatsStrip from "@/app/components/StatsStrip";
import FeaturedServices from "@/app/components/FeaturedServices";
import ProjectsPreview from "@/app/components/ProjectsPreview";
import TestimonialsSection from "@/app/components/TestimonialsSection";
import QuoteCTA from "@/app/components/QuoteCTA";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <HeroSection />
      <StatsStrip />
      <FeaturedServices />
      <ProjectsPreview />
      <TestimonialsSection />
      <QuoteCTA />
      <Footer />
    </main>
  );
}
