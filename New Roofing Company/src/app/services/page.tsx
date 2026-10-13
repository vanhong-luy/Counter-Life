import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServicesHero from "@/app/services/components/ServicesHero";
import ServicesGrid from "@/app/services/components/ServicesGrid";
import InspectionFormSection from "@/app/services/components/InspectionFormSection";

export const metadata = {
  title: "SHIELD - Expert Roofing for Phnom Penh",
  description:
    "Explore SHIELD's full range of roofing services: installation, repair, metal roofing, gutters, and emergency response across Seattle and the Eastside.",
};

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <ServicesHero />
      <ServicesGrid />
      <InspectionFormSection />
      <Footer />
    </main>
  );
}
