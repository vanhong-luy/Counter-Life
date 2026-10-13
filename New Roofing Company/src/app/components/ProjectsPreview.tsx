"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppImage from "@/components/ui/AppImage";
import Icon from "@/components/ui/AppIcon";

const projects = [
  {
    id: 1,
    title: "Capitol Hill Full Replacement",
    category: "Installation",
    image:
      "https://img.rocket.new/generatedImages/rocket_gen_img_14d905a69-1768661539895.png",
    alt: "Newly installed dark grey shingle roof on a two-story craftsman home, bright overcast sky",
  },
  {
    id: 2,
    title: "Bellevue Metal Roofing",
    category: "Metal",
    image: "https://images.unsplash.com/photo-1720876470648-ba8b314b47ff",
    alt: "Modern home with standing seam metal roof in charcoal, surrounded by tall evergreen trees",
  },
  {
    id: 3,
    title: "Fremont Storm Repair",
    category: "Repair",
    image: "https://images.unsplash.com/photo-1577439083093-566f654c8b48",
    alt: "Aerial view of residential neighborhood with varied rooftops, Pacific Northwest region",
  },
  {
    id: 4,
    title: "Kirkland Commercial Flat",
    category: "Installation",
    image: "https://images.unsplash.com/photo-1731865843702-44bf19cc2123",
    alt: "Commercial building with flat membrane roof system, industrial area, grey cloudy sky",
  },
];

const categoryBadge: Record<string, string> = {
  Installation: "bg-[#2C3E2D] text-white",
  Metal: "bg-accent text-white",
  Repair: "bg-[#5C4A2A] text-white",
};

export default function ProjectsPreview() {
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
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="projects" className="py-20 section-stripe">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`mb-12 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <div className="badge-warm mb-4">Our Work</div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
            <div>
              <h2 className="text-section-heading font-bold text-foreground leading-tight">
                Recent Projects
                <br />
                <span className="text-gradient-brick">Across Seattle</span>
              </h2>
              <div className="divider-warm mt-4" />
            </div>
            <Link
              href="/projects"
              className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-[#9E3E22] transition-colors"
            >
              View All Projects
              <Icon name="ArrowRightIcon" size={16} />
            </Link>
          </div>
        </div>

        {/* Grid: 1 large + 3 smaller */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Large featured */}
          <div
            className={`lg:row-span-2 relative group rounded overflow-hidden cursor-pointer card-warm-hover transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "0.1s", minHeight: "320px" }}
          >
            <AppImage
              src={projects[0].image}
              alt={projects[0].alt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1C1A17]/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <span
                className={`inline-block text-xs font-bold px-2.5 py-1 rounded mb-2 ${categoryBadge[projects[0].category] || "bg-white/20 text-white"}`}
              >
                {projects[0].category}
              </span>
              <h3 className="text-base font-bold text-white">
                {projects[0].title}
              </h3>
            </div>
          </div>

          {/* Remaining 3 */}
          {projects.slice(1).map((project, i) => (
            <div
              key={project.id}
              className={`relative group rounded overflow-hidden h-48 cursor-pointer card-warm-hover transition-all duration-700 ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${0.2 + i * 0.1}s` }}
            >
              <AppImage
                src={project.image}
                alt={project.alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1A17]/75 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span
                  className={`inline-block text-xs font-bold px-2 py-0.5 rounded mb-1.5 ${categoryBadge[project.category] || "bg-white/20 text-white"}`}
                >
                  {project.category}
                </span>
                <h3 className="text-sm font-bold text-white">
                  {project.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
