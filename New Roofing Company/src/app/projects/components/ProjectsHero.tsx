'use client';

import React, { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

export default function ProjectsHero() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  return (
    <section className="relative pt-32 pb-16 bg-[#F5F0E8] border-b border-[rgba(28,26,23,0.08)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`max-w-3xl transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="badge-warm mb-5">
            <Icon name="PhotoIcon" size={12} className="text-accent" />
            Our Portfolio
          </div>
          <h1 className="text-hero-xl font-bold tracking-tight leading-[1.05] text-foreground mb-5">
            3,400 Roofs.<br />
            <span className="text-gradient-brick">Zero Compromises.</span>
          </h1>
          <div className="divider-warm mb-5" />
          <p className="text-lg text-muted leading-relaxed max-w-xl">
            Every project in our portfolio represents a homeowner who trusted us with their biggest investment. Browse our completed work across Seattle and the Eastside.
          </p>
        </div>
      </div>
    </section>
  );
}