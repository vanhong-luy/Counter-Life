"use client";

import React, { useEffect, useRef, useState } from "react";
import AppImage from "@/components/ui/AppImage";
import Icon from "@/components/ui/AppIcon";

const allServices = [
  {
    id: 1,
    title: "Asphalt Shingle Installation",
    slug: "asphalt-shingle-installation",
    description:
      "The most popular roofing choice in the Pacific Northwest. We install 3-tab, architectural, and designer shingles from GAF, Owens Corning, and CertainTeed. Every installation includes ice-and-water shield, proper ventilation, and full cleanup.",
    image:
      "https://img.rocket.new/generatedImages/rocket_gen_img_12f8d042c-1773164488093.png",
    alt: "Workers laying new architectural shingles on a residential roof, ladder visible, sunny day",
    icon: "HomeIcon",
    stat: "From $6,800",
    is_featured: true,
    sort_order: 1,
  },
  {
    id: 2,
    title: "Emergency Roof Repair",
    slug: "emergency-roof-repair",
    description:
      "Storm damage, fallen trees, sudden leaks — we respond same-day with emergency tarping and permanent repair solutions. Available 365 days a year, 7am–9pm. No after-hours surcharge.",
    image:
      "https://img.rocket.new/generatedImages/rocket_gen_img_1d033a768-1779362425641.png",
    alt: "Roofer on a wet roof in rain gear making emergency repairs to damaged shingles",
    icon: "WrenchScrewdriverIcon",
    stat: "From $340",
    is_featured: true,
    sort_order: 2,
  },
  {
    id: 3,
    title: "Standing Seam Metal Roofing",
    slug: "standing-seam-metal-roofing",
    description:
      "50-year lifespan, superior weather resistance, and significant energy savings. Our metal roofing systems use 26-gauge steel with a Kynar 500 coating — the gold standard for Pacific Northwest durability.",
    image: "https://images.unsplash.com/photo-1607883106439-0ebde616cf15",
    alt: "Close-up detail of standing seam metal roof panels in dark charcoal, crisp lines, overcast sky",
    icon: "BuildingOfficeIcon",
    stat: "From $12,000",
    is_featured: true,
    sort_order: 3,
  },
  {
    id: 4,
    title: "Gutter Installation & Repair",
    slug: "gutter-installation-repair",
    description:
      "Seamless aluminum gutters, K-style and half-round profiles, custom-fitted to your home. Includes gutter guards to eliminate clogging and downspout extensions for proper drainage.",
    image: "https://images.unsplash.com/photo-1725486201987-040aa4c3a611",
    alt: "New seamless aluminum gutters installed on white trim of a craftsman bungalow, autumn leaves nearby",
    icon: "ArrowPathRoundedSquareIcon",
    stat: "From $680",
    is_featured: false,
    sort_order: 4,
  },
  {
    id: 5,
    title: "Roof Inspection & Maintenance",
    slug: "roof-inspection-maintenance",
    description:
      "Annual or bi-annual inspections with a 40-point checklist, drone photography, and a written report. Catch problems before they become expensive. Recommended after every major storm.",
    image:
      "https://img.rocket.new/generatedImages/rocket_gen_img_1fc65963e-1772177990861.png",
    alt: "Inspector on a residential roof with tablet, examining shingles and flashing closely, bright day",
    icon: "MagnifyingGlassIcon",
    stat: "From $199",
    is_featured: false,
    sort_order: 5,
  },
  {
    id: 6,
    title: "Flat & Low-Slope Roofing",
    slug: "flat-low-slope-roofing",
    description:
      "TPO, EPDM, and modified bitumen systems for commercial and residential flat roofs. Fully adhered or mechanically fastened, with 20-year manufacturer warranties on select systems.",
    image:
      "https://img.rocket.new/generatedImages/rocket_gen_img_1900b6c0b-1772132149261.png",
    alt: "Commercial flat roof with TPO membrane, rooftop HVAC units, urban Seattle skyline in background",
    icon: "Squares2X2Icon",
    stat: "From $4,200",
    is_featured: false,
    sort_order: 6,
  },
];

const PAGE_SIZE = 6;

export default function ServicesGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(allServices.length / PAGE_SIZE);
  const paginatedServices = allServices.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-16 bg-[#F5F0E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedServices.map((service, i) => (
            <div
              key={service.id}
              className={`bg-white rounded border border-[rgba(28,26,23,0.1)] overflow-hidden card-warm-hover group shadow-sm transition-all duration-700 ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <AppImage
                  src={service.image}
                  alt={service.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  {service.is_featured && (
                    <span className="bg-accent text-white text-xs font-bold px-2.5 py-1 rounded">
                      Featured
                    </span>
                  )}
                  <span className="bg-white/90 text-foreground text-xs font-bold px-2.5 py-1 rounded">
                    {service.stat}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon
                      name={service.icon as any}
                      size={16}
                      className="text-accent"
                    />
                  </div>
                  <h2 className="text-base font-bold text-foreground leading-snug">
                    {service.title}
                  </h2>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded border border-[rgba(28,26,23,0.15)] text-sm font-semibold text-muted hover:text-foreground hover:border-[rgba(28,26,23,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] bg-white"
            >
              <Icon name="ChevronLeftIcon" size={16} />
              Previous
            </button>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded text-sm font-bold transition-all min-h-[44px] min-w-[44px] ${
                    p === page
                      ? "bg-accent text-white"
                      : "bg-white border border-[rgba(28,26,23,0.15)] text-muted hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-2 px-5 py-2.5 rounded border border-[rgba(28,26,23,0.15)] text-sm font-semibold text-muted hover:text-foreground hover:border-[rgba(28,26,23,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] bg-white"
            >
              Next
              <Icon name="ChevronRightIcon" size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
