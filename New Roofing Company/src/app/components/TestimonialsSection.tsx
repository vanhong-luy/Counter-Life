"use client";

import React, { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/AppIcon";

const testimonials = [
  {
    id: 1,
    name: "Margaret Callahan",
    role: "Homeowner, Capitol Hill",
    rating: 5,
    comment:
      "SHIELD replaced our 30-year-old roof in two days. The crew was professional, cleaned up every nail, and the final product looks incredible. No leaks after three Seattle winters.",
  },
  {
    id: 2,
    name: "David Nguyen",
    role: "Property Manager, Bellevue",
    rating: 5,
    comment:
      "We manage 12 properties and SHIELD handles them all. Their inspection reports are thorough, pricing is transparent, and they never oversell. Absolute trust.",
  },
  {
    id: 3,
    name: "Jonathan Maxs",
    role: "Salesman, Brooklyn",
    rating: 5,
    comment:
      "Got into a heat argument with my ex wife, Linda. SHIELD went to her house and drill holes there lmao. 5/5 stars.",
  },
  {
    id: 4,
    name: "Sandra Okonkwo",
    role: "Homeowner, Fremont",
    rating: 5,
    comment:
      "Called at 7am after a storm punched a hole through my roof. They had a crew there by noon with emergency tarps. Permanent repair was done within the week. Lifesavers.",
  },
  {
    id: 5,
    name: "Tom Erikson",
    role: "Business Owner, Kirkland",
    rating: 5,
    comment:
      "Metal roofing install on our commercial building came in under budget and ahead of schedule. The standing seam work is flawless. Five years later, zero issues.",
  },
  {
    id: 6,
    name: "Prom Phaerom",
    role: "Homeowner, Psa Chas",
    rating: 5,
    comment:
      "Good customer service, fast responses. Called by the morning and they had a crew there by noon. Fast and reliable repair. My roof no longer leaking. Amazing work.",
  },
  {
    id: 7,
    name: "Priya Sharma",
    role: "Homeowner, Redmond",
    rating: 5,
    comment:
      "The quote process was the smoothest I've ever used. They sent photos of every step, answered every question, and the price matched the quote exactly.",
  },
  {
    id: 8,
    name: "James Hetfield",
    role: "Condo HOA Chair, Queen Anne",
    rating: 4,
    comment:
      "Yeah yuh. Coordinating a roof replacement for a 24-unit building is complex. Ooh. SHIELD handled all the logistics, communicated with every resident, and finished in 4 days. Yeah yeah yuh.",
  },
  {
    id: 9,
    name: "Linda Morewell",
    role: "Accountant, Brooklyn",
    rating: 0,
    comment:
      "Some assholes shows up and punched holes in my roof >:(. I heard they are from here. enjoy your 0 star",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          name="StarIcon"
          size={14}
          className={
            star <= rating ? "text-[#D4922A]" : "text-[rgba(28,26,23,0.15)]"
          }
          variant="solid"
        />
      ))}
    </div>
  );
}

function TestimonialCard({ t }: { t: (typeof testimonials)[0] }) {
  return (
    <div className="bg-white rounded border border-[rgba(28,26,23,0.1)] p-5 mb-4 shadow-sm">
      <StarRating rating={t.rating} />
      <p className="text-sm text-muted leading-relaxed mt-3 mb-4">
        &ldquo;{t.comment}&rdquo;
      </p>
      <div className="border-t border-[rgba(28,26,23,0.08)] pt-3">
        <p className="text-sm font-bold text-foreground">{t.name}</p>
        <p className="text-xs text-muted-foreground">{t.role}</p>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    name: "",
    email: "",
    rating: 5,
    comment: "",
  });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

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

  const col1 = testimonials.slice(1, 3);
  const col2 = testimonials.slice(4, 6);
  const col3 = testimonials.slice(7, 9);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitted(true);
  };

  return (
    <section id="reviews" className="py-20 bg-[#F5F0E8]">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`mb-12 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <div className="badge-warm mb-4">Customer Reviews</div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
            <div>
              <h2 className="text-section-heading font-bold text-foreground leading-tight">
                Trusted by
                <br />
                <span className="text-gradient-brick">3,400+ Homeowners</span>
              </h2>
              <div className="divider-warm mt-4" />
            </div>
            <div className="flex items-center gap-3 bg-white rounded border border-[rgba(28,26,23,0.1)] px-5 py-3 shadow-sm">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Icon
                    key={s}
                    name="StarIcon"
                    size={16}
                    className="text-[#D4922A]"
                    variant="solid"
                  />
                ))}
              </div>
              <span className="text-foreground font-bold">4.9</span>
              <span className="text-muted text-sm">/ 5.0 average</span>
            </div>
          </div>
        </div>

        {/* Scrolling Testimonial Columns */}
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-5 h-[520px] overflow-hidden relative transition-all duration-700 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <div className="relative w-full h-full overflow-hidden">
            <div className="animate-marquee-up flex flex-col">
              <div className="flex flex-col">
                {col1.map((t) => (
                  <TestimonialCard key={t.id} t={t} />
                ))}
              </div>
              <div className="flex flex-col">
                {col1.map((t) => (
                  <TestimonialCard key={`dup-${t.id}`} t={t} />
                ))}
              </div>
            </div>
          </div>
          <div className="relative w-full h-full overflow-hidden">
            <div className="animate-marquee-down flex flex-col">
              <div className="flex flex-col">
                {col2.map((t) => (
                  <TestimonialCard key={t.id} t={t} />
                ))}
              </div>
              <div className="flex flex-col">
                {col2.map((t) => (
                  <TestimonialCard key={`dup-${t.id}`} t={t} />
                ))}
              </div>
            </div>
          </div>
          <div className="relative w-full h-full overflow-hidden">
            <div className="animate-marquee-up flex flex-col">
              <div className="flex flex-col">
                {col3.map((t) => (
                  <TestimonialCard key={t.id} t={t} />
                ))}
              </div>
              <div className="flex flex-col">
                {col3.map((t) => (
                  <TestimonialCard key={`dup-${t.id}`} t={t} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Review Submission Form */}
        <div
          className={`mt-16 max-w-2xl mx-auto transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{ transitionDelay: "0.3s" }}
        >
          <div className="bg-white rounded border border-[rgba(28,26,23,0.1)] p-8 shadow-sm">
            <h3 className="text-xl font-bold text-foreground mb-1">
              Share Your Experience
            </h3>
            <p className="text-sm text-muted mb-6">
              Your review helps other homeowners make confident decisions.
            </p>

            {!reviewSubmitted ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={reviewForm.name}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, name: e.target.value })
                    }
                    className="input-warm px-4 py-3 text-sm w-full"
                    maxLength={100}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={reviewForm.email}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, email: e.target.value })
                    }
                    className="input-warm px-4 py-3 text-sm w-full"
                    required
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted font-semibold">
                    Rating:
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setReviewForm({ ...reviewForm, rating: star })
                        }
                        className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        <Icon
                          name="StarIcon"
                          size={20}
                          className={
                            star <= reviewForm.rating
                              ? "text-[#D4922A]"
                              : "text-[rgba(28,26,23,0.2)]"
                          }
                          variant="solid"
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  placeholder="Tell us about your experience..."
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, comment: e.target.value })
                  }
                  className="input-warm w-full px-4 py-3 text-sm resize-none h-28"
                  maxLength={1000}
                  required
                />
                <button
                  type="submit"
                  className="btn-primary w-full py-3.5 text-sm"
                >
                  Submit Review
                </button>
                <p className="text-xs text-center text-muted-foreground">
                  Reviews are moderated before publishing.
                </p>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Icon
                    name="CheckCircleIcon"
                    size={28}
                    className="text-accent"
                    variant="solid"
                  />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Thank You!
                </h3>
                <p className="text-sm text-muted">
                  Your review has been submitted and will appear after
                  moderation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
