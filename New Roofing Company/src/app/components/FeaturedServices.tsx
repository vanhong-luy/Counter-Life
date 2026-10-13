"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppImage from "@/components/ui/AppImage";
import Icon from "@/components/ui/AppIcon";

const services = [
  {
    id: 1,
    title: "Roof Installation",
    description:
      "Complete new roof installations using premium asphalt shingles, metal panels, and composite materials. Every job includes a 10-year workmanship warranty.",
    image:
      "https://images.pexels.com/photos/33944130/pexels-photo-33944130.jpeg",
    alt: "Workers installing new asphalt shingles on a residential rooftop under bright daylight",
    icon: "HomeIcon",
    stat: "From $6,800",
  },
  {
    id: 2,
    title: "Roof Repair",
    description:
      "Emergency leak repairs, storm damage restoration, and preventive maintenance. We diagnose and fix the root cause - not just the symptom.",
    image:
      "https://img.rocket.new/generatedImages/rocket_gen_img_11de6231d-1767033142365.png",
    alt: "Roofer repairing damaged shingles on a residential roof, sunny exterior environment",
    icon: "WrenchScrewdriverIcon",
    stat: "From $340",
  },
  {
    id: 3,
    title: "Metal Roofing",
    description:
      "Standing seam and corrugated metal roofing with 50-year lifespans. Energy-efficient, weather-resistant, and built for the Pacific Northwest climate.",
    image: "https://images.unsplash.com/photo-1613744095894-cc7eac914a64",
    alt: "Close-up of standing seam metal roof panels in charcoal grey, modern industrial building",
    icon: "BuildingOfficeIcon",
    stat: "From $12,000",
  },
];

export default function FeaturedServices() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="services" className="py-20 bg-[#F5F0E8]">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`mb-12 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <div className="badge-warm mb-4">What We Do</div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
            <div>
              <h2 className="text-section-heading font-bold text-foreground leading-tight">
                Services Built on
                <br />
                <span className="text-gradient-brick">
                  20 Years of Experience
                </span>
              </h2>
              <div className="divider-warm mt-4" />
            </div>
            <Link
              href="/services"
              className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-[#9E3E22] transition-colors"
            >
              All Services
              <Icon name="ArrowRightIcon" size={16} />
            </Link>
          </div>
        </div>

        {/* Services - asymmetric layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Large card */}
          <div
            className={`lg:col-span-3 card-warm rounded overflow-hidden card-warm-hover group transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "0.1s" }}
          >
            <div className="relative h-64 overflow-hidden">
              <AppImage
                src={services[0].image}
                alt={services[0].alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              <div className="absolute top-4 left-4 bg-white/90 rounded px-3 py-1.5">
                <span className="text-xs font-bold text-accent">
                  {services[0].stat}
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center">
                  <Icon
                    name={services[0].icon as any}
                    size={16}
                    className="text-accent"
                  />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {services[0].title}
                </h3>
              </div>
              <p className="text-sm text-muted leading-relaxed mb-4">
                {services[0].description}
              </p>
              <Link
                href="/services"
                className="text-sm font-semibold text-accent hover:text-[#9E3E22] transition-colors flex items-center gap-1"
              >
                Learn more <Icon name="ArrowRightIcon" size={14} />
              </Link>
            </div>
          </div>

          {/* Two stacked cards */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {services.slice(1).map((service, i) => (
              <div
                key={service.id}
                className={`card-warm rounded overflow-hidden card-warm-hover group flex-1 transition-all duration-700 ${
                  visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${0.2 + i * 0.1}s` }}
              >
                <div className="relative h-36 overflow-hidden">
                  <AppImage
                    src={service.image}
                    alt={service.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 rounded px-2.5 py-1">
                    <span className="text-xs font-bold text-accent">
                      {service.stat}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded bg-accent/10 flex items-center justify-center">
                      <Icon
                        name={service.icon as any}
                        size={14}
                        className="text-accent"
                      />
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      {service.title}
                    </h3>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
