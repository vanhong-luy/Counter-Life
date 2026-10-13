"use client";

import React, { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/AppIcon";

export default function QuoteCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({
    address: "",
    phone: "",
    project_description: "",
  });
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="quote" className="py-20 bg-[#2C3E2D]">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-start transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          {/* Left: CTA copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-[#A8B8A0] rounded px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-6">
              Free Quote
            </div>
            <h2 className="text-section-heading font-bold text-white leading-tight mb-4">
              Ready to Protect
              <br />
              Your Home?
            </h2>
            <div className="h-0.5 w-12 bg-accent mb-6" />
            <p className="text-base text-[#A8B8A0] leading-relaxed mb-8 max-w-md">
              Get a detailed quote with no pressure and no hidden fees.
              We&apos;ll assess your roof, explain every line item, and let you
              decide.
            </p>

            {/* Trust signals */}
            <div className="space-y-4">
              {[
                {
                  icon: "ShieldCheckIcon",
                  label: "10-Year Guarantee",
                  sub: "Workmanship warranty on every job",
                },
                {
                  icon: "ClockIcon",
                  label: "Same-Day Response",
                  sub: "Quote delivered within 24 hours",
                },
                {
                  icon: "CurrencyDollarIcon",
                  label: "No Hidden Fees",
                  sub: "Price matches quote, always",
                },
                {
                  icon: "StarIcon",
                  label: "4.9★ Rated",
                  sub: "From 800+ verified reviews",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon
                      name={item.icon as any}
                      size={16}
                      className="text-[#A8B8A0]"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{item.label}</p>
                    <p className="text-xs text-[#7A8E72]">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Quote Form */}
          <div>
            <div className="bg-[#F5F0E8] rounded p-8">
              {!submitted ? (
                <>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Request a Free Quote
                  </h3>
                  <p className="text-sm text-muted mb-6">
                    We&apos;ll call you back within 2 hours.
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Property address"
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      className="input-warm w-full px-4 py-3.5 text-sm"
                      maxLength={255}
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      className="input-warm w-full px-4 py-3.5 text-sm"
                      maxLength={30}
                      required
                    />
                    <textarea
                      placeholder="Describe your project (e.g., full replacement, repair, inspection...)"
                      value={form.project_description}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          project_description: e.target.value,
                        })
                      }
                      className="input-warm w-full px-4 py-3.5 text-sm resize-none h-28"
                      maxLength={2000}
                      required
                    />
                    <button
                      type="submit"
                      className="btn-primary w-full py-4 text-sm"
                    >
                      Get My Free Quote
                    </button>
                    <p className="text-xs text-center text-muted-foreground">
                      No spam. No pressure. Just honest pricing.
                    </p>
                  </form>
                </>
              ) : (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Icon
                      name="CheckCircleIcon"
                      size={28}
                      className="text-accent"
                      variant="solid"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Quote Request Sent!
                  </h3>
                  <p className="text-sm text-muted max-w-xs mx-auto">
                    Our team will review your project and call you back within 2
                    hours with a detailed estimate.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
