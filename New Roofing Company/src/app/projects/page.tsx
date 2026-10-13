import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProjectsHero from '@/app/projects/components/ProjectsHero';
import ProjectsGallery from '@/app/projects/components/ProjectsGallery';

export const metadata = {
  title: 'Roofing Projects Portfolio — RoofPro Seattle',
  description: 'Browse RoofPro\'s completed roofing projects across Seattle: full replacements, metal roofing, storm repairs, and commercial installations.',
};

export default function ProjectsPage() {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <ProjectsHero />
      <ProjectsGallery />
      <Footer />
    </main>
  );
}