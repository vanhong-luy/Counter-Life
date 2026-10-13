"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/AppIcon";
import AppImage from "@/components/ui/AppImage";

export default function HeroSection() {
  const [formData, setFormData] = useState({ address: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="relative pt-24 overflow-hidden bg-[#F5F0E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[calc(100vh-80px)]">
          {/* Left: Content */}
          <div
            className={`flex flex-col justify-center py-16 lg:py-24 pr-0 lg:pr-12 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <div className="badge-warm mb-6">
              <Icon
                name="ShieldCheckIcon"
                size={12}
                className="text-accent"
                variant="solid"
              />
              Phnom Penh's #1 Rated Roofing Company
            </div>

            <h1 className="text-hero-xl font-bold tracking-tight leading-[1.05] text-foreground mb-6">
              Honest Work.
              <br />
              <span className="text-gradient-brick">Solid Roofs.</span>
              <br />
              Since 2004.
            </h1>

            <p className="text-lg text-muted leading-relaxed mb-8 max-w-lg">
              From a missing shingle to a full replacement -- we show up on
              time, explain every step, and stand behind our work with a 10-year
              guarantee.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 mb-10">
              {[
                { icon: "CheckBadgeIcon", text: "Licensed & Bonded" },
                { icon: "ClockIcon", text: "Same-Day Inspections" },
                { icon: "CurrencyDollarIcon", text: "No Hidden Fees" },
              ].map((b) => (
                <div
                  key={b.text}
                  className="flex items-center gap-1.5 text-sm font-semibold text-muted"
                >
                  <Icon
                    name={b.icon as any}
                    size={16}
                    className="text-accent"
                    variant="solid"
                  />
                  {b.text}
                </div>
              ))}
            </div>

            {/* Inspection Form */}
            {!submitted ? (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-lg"
              >
                <input
                  type="text"
                  placeholder="Your property address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="input-warm flex-1 px-4 py-3 text-sm"
                  maxLength={255}
                  required
                />

                <input
                  type="tel"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="input-warm sm:w-36 px-4 py-3 text-sm"
                  maxLength={30}
                  required
                />

                <button
                  type="submit"
                  className="btn-primary px-6 py-3 text-sm whitespace-nowrap"
                >
                  Book Inspection
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-[#EDE8DC] border border-[rgba(28,26,23,0.12)] rounded max-w-lg">
                <Icon
                  name="CheckCircleIcon"
                  size={22}
                  className="text-accent flex-shrink-0"
                  variant="solid"
                />
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Request received!
                  </p>
                  <p className="text-xs text-muted">
                    We&apos;ll call you within 2 hours to confirm.
                  </p>
                </div>
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              Free inspection - No obligation - Response within 2 hours
            </p>

            {/* CTA row */}
            <div className="flex items-center gap-4 mt-8">
              <Link
                href="/projects"
                className="btn-outline px-6 py-2.5 text-sm"
              >
                View Our Work
              </Link>
              <a
                href="tel:2065550174"
                className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground transition-colors"
              >
                <Icon
                  name="PhoneIcon"
                  size={16}
                  className="text-accent"
                  variant="solid"
                />
                (206) 555-0174
              </a>
            </div>
          </div>

          {/* Right: Photo */}
          <div
            className={`relative hidden lg:block transition-all duration-1000 ${visible ? "opacity-100" : "opacity-0"}`}
          >
            <div className="absolute inset-0 overflow-hidden">
              <AppImage
                src="https://images.pexels.com/photos/37623615/pexels-photo-37623615.jpeg"
                alt="A bunch of dudes working on a roof. idk on some random dude's house."
                fill
                className="object-cover object-center"
                sizes="50vw"
                priority
              />

              {/* Warm overlay on left edge to blend */}
              <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#F5F0E8] to-transparent" />
            </div>

            {/* Floating stat card */}
            <div className="absolute bottom-12 left-8 bg-white rounded shadow-lg px-5 py-4 border border-[rgba(28,26,23,0.08)]">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">3,400+</div>
                  <div className="text-xs text-muted uppercase tracking-wider">
                    Roofs Installed
                  </div>
                </div>
                <div className="w-px h-10 bg-[rgba(28,26,23,0.1)]" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">20+</div>
                  <div className="text-xs text-muted uppercase tracking-wider">
                    Years Serving Phnom Penh
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
