'use client';

import React, { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

export default function ServicesHero() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  return (
    <section className="relative pt-32 pb-16 bg-[#F5F0E8] border-b border-[rgba(28,26,23,0.08)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`max-w-3xl transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="badge-warm mb-5">
            <Icon name="HomeModernIcon" size={12} className="text-accent" />
            Our Services
          </div>
          <h1 className="text-hero-xl font-bold tracking-tight leading-[1.05] text-foreground mb-5">
            Every Roof.<br />
            <span className="text-gradient-brick">Every Problem.</span><br />
            Solved.
          </h1>
          <div className="divider-warm mb-5" />
          <p className="text-lg text-muted leading-relaxed max-w-xl">
            From a single missing shingle to a complete commercial re-roof, our licensed crews handle it all with the same attention to detail and 10-year guarantee.
          </p>
        </div>
      </div>
    </section>
  );
}