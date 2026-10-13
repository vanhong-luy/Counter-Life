"use client";

import React, { useEffect, useRef, useState } from "react";
import AppImage from "@/components/ui/AppImage";
import Icon from "@/components/ui/AppIcon";

type Category =
  | "All"
  | "Installation"
  | "Repair"
  | "Metal"
  | "Vegetative"
  | "Custom";

const allProjects = [
  {
    id: 1,
    title: "Capitol Hill Full Replacement",
    description:
      "Complete tear-off and reinstall of a 2,400 sq ft craftsman home. Architectural shingles, new ice barrier, and full ventilation upgrade.",
    category: "Installation" as Category,
    image: "https://images.unsplash.com/photo-1618424115228-4a551264376a",
    alt: "Newly completed dark grey shingle roof on a two-story craftsman home, lush landscaping, bright overcast Seattle sky",
    is_visible: true,
  },
  {
    id: 2,
    title: "Bellevue Standing Seam Metal",
    description:
      "Standing seam metal roof on a contemporary home. Charcoal Kynar 500 finish with concealed fasteners and integrated snow guards.",
    category: "Metal" as Category,
    image: "https://images.unsplash.com/photo-1720876470648-ba8b314b47ff",
    alt: "Modern two-story home with charcoal standing seam metal roof, surrounded by mature evergreens, overcast sky",
    is_visible: true,
  },
  {
    id: 3,
    title: "Fremont Emergency Storm Repair",
    description:
      "Emergency response after a wind event displaced 40 shingles. Same-day tarping, followed by full section replacement matching existing material.",
    category: "Repair" as Category,
    image: "https://images.unsplash.com/photo-1577439083093-566f654c8b48",
    alt: "Aerial view of residential street in Fremont Seattle showing various rooftops, green trees, grey sky",
    is_visible: true,
  },
  {
    id: 4,
    title: "Kirkland Commercial Flat Roof",
    description:
      "8,000 sq ft TPO membrane installation on a light industrial building. Fully adhered system with 60-mil membrane and 20-year manufacturer warranty.",
    category: "Installation" as Category,
    image:
      "https://img.rocket.new/generatedImages/rocket_gen_img_1620843f5-1772133506401.png",
    alt: "Commercial building with white TPO flat roof membrane, industrial setting, grey overcast sky",
    is_visible: true,
  },
  {
    id: 5,
    title: "Queen Anne Leak Diagnosis",
    description:
      "Persistent leak traced to failed step flashing at a dormer. Full flashing replacement, new counter-flashing, and sealant work. Dry ever since.",
    category: "Repair" as Category,
    image:
      "https://img.rocket.new/generatedImages/rocket_gen_img_11de6231d-1767033142365.png",
    alt: "Roofer working on step flashing repair near a dormer on a residential home, tools visible, overcast day",
    is_visible: true,
  },
  {
    id: 6,
    title: "Redmond Corrugated Metal",
    description:
      "Exposed-fastener corrugated metal roof on a contemporary barn-style ADU. Weathered zinc finish with integrated gutter system.",
    category: "Metal" as Category,
    image:
      "https://img.rocket.new/generatedImages/rocket_gen_img_1271bcedd-1772064757812.png",
    alt: "Corrugated metal roof on a barn-style accessory dwelling unit, zinc patina finish, surrounded by Pacific Northwest forest",
    is_visible: true,
  },
  {
    id: 7,
    title: "Ballard Composition Shingle",
    description:
      "Full replacement on a 1940s bungalow. CertainTeed Landmark Pro shingles with a 50-year limited warranty. New attic ventilation installed.",
    category: "Installation" as Category,
    image: "https://images.unsplash.com/photo-1646837823025-f3f0d62331bd",
    alt: "Workers completing shingle installation on a craftsman bungalow in Ballard Seattle, ladders visible, sunny afternoon",
    is_visible: true,
  },
  {
    id: 8,
    title: "Eastlake Green Roof",
    description:
      "Extensive vegetative roof system on a 3-story mixed-use building. Sedum mat system with waterproofing membrane and drainage layer.",
    category: "Vegetative" as Category,
    image: "https://images.unsplash.com/photo-1606599935071-a13d3b55acc0",
    alt: "Green roof with sedum plants on a modern urban building, Seattle skyline visible in background, overcast sky",
    is_visible: true,
  },
  {
    id: 9,
    title: "I just made this one up :D",
    description: "This is for testing.",
    category: "Repair" as Category,
    image: "https://media1.tenor.com/m/U_YCcOcf5pwAAAAC/sully-monsters-inc.gif",
    alt: "Green roof with sedum plants on a modern urban building, Seattle skyline visible in background, overcast sky",
    is_visible: true,
  },
  {
    id: 10,
    title: "I just made this one up too :D",
    description: "This is for testing too.",
    category: "Repair" as Category,
    image: "",
    alt: "Green roof with sedum plants on a modern urban building, Seattle skyline visible in background, overcast sky",
    is_visible: true,
  },
];

const categories: Category[] = [
  "All",
  "Installation",
  "Repair",
  "Metal",
  "Vegetative",
];

const categoryBadge: Record<string, string> = {
  Installation: "bg-[#2C3E2D] text-white",
  Repair: "bg-[#5C4A2A] text-white",
  Metal: "bg-accent text-white",
  Vegetative: "bg-[#3A5C3A] text-white",
};

const PAGE_SIZE = 6;

export default function ProjectsGallery() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [page, setPage] = useState(1);

  const filtered =
    activeCategory === "All"
      ? allProjects.filter((p) => p.is_visible)
      : allProjects.filter(
          (p) => p.is_visible && p.category === activeCategory,
        );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const handleCategoryChange = (cat: Category) => {
    setActiveCategory(cat);
    setPage(1);
  };

  return (
    <section ref={ref} className="py-16 bg-[#F5F0E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Category Filter */}
        <div
          className={`flex flex-wrap gap-2 mb-10 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-5 py-2.5 rounded text-sm font-semibold transition-all duration-200 min-h-[44px] border ${
                activeCategory === cat
                  ? "bg-accent text-white border-accent"
                  : "bg-white border-[rgba(28,26,23,0.15)] text-muted hover:text-foreground hover:border-[rgba(28,26,23,0.3)]"
              }`}
            >
              {cat}
              {cat !== "All" && (
                <span className="ml-2 text-xs opacity-60">
                  (
                  {
                    allProjects.filter(
                      (p) => p.is_visible && p.category === cat,
                    ).length
                  }
                  )
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {paginated.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((project, i) => (
                <div
                  key={project.id}
                  className={`bg-white rounded border border-[rgba(28,26,23,0.1)] overflow-hidden card-warm-hover group shadow-sm transition-all duration-700 ${
                    visible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${i * 0.08}s` }}
                >
                  <div className="relative h-52 overflow-hidden">
                    <AppImage
                      src={project.image}
                      alt={project.alt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-block text-xs font-bold px-2.5 py-1 rounded ${categoryBadge[project.category] || "bg-white/80 text-foreground"}`}
                      >
                        {project.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h2 className="text-base font-bold text-foreground mb-2">
                      {project.title}
                    </h2>
                    <p className="text-sm text-muted leading-relaxed line-clamp-3">
                      {project.description}
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
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
                    ),
                  )}
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

            <p className="text-center text-xs text-muted-foreground mt-6">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
              projects
            </p>
          </>
        ) : (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded bg-[rgba(28,26,23,0.06)] flex items-center justify-center mx-auto mb-4">
              <Icon name="FolderOpenIcon" size={24} className="text-muted" />
            </div>
            <p className="text-foreground font-bold mb-2">
              No projects in this category yet
            </p>
            <p className="text-sm text-muted">
              Check back soon - we're always completing new work.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
