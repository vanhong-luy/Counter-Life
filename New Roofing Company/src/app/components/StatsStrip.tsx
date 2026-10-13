'use client';

import React, { useEffect, useRef, useState } from 'react';

const stats = [
  { value: '20+', label: 'Years in Business' },
  { value: '3,400+', label: 'Roofs Installed' },
  { value: '98%', label: 'Customer Satisfaction' },
  { value: '10-yr', label: 'Workmanship Guarantee' },
];

export default function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref?.current) observer?.observe(ref?.current);
    return () => observer?.disconnect();
  }, []);

  return (
    <section ref={ref} className="bg-[#2C3E2D] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x-0 lg:divide-x divide-white/10">
          {stats?.map((stat, i) => (
            <div
              key={stat?.label}
              className={`text-center lg:text-left lg:pl-8 first:pl-0 transition-all duration-700 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                {stat?.value}
              </div>
              <div className="text-sm text-[#A8B8A0] uppercase tracking-wider">
                {stat?.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}