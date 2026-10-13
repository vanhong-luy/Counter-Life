"use client";

import React, { useState } from "react";
import Icon from "@/components/ui/AppIcon";

export default function InspectionFormSection() {
  const [form, setForm] = useState({ address: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="py-16 bg-[#EDE8DC]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded border border-[rgba(28,26,23,0.1)] p-8 sm:p-12 shadow-sm text-center">
          <div className="w-12 h-12 rounded bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <Icon
              name="ClipboardDocumentCheckIcon"
              size={24}
              className="text-accent"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Schedule a Free Inspection
          </h2>
          <div className="divider-warm mx-auto mb-5" />
          <p className="text-muted mb-8 max-w-md mx-auto">
            Our licensed inspectors will assess your roof&apos;s condition,
            photograph every concern, and deliver a written report - at no cost,
            with no obligation.
          </p>

          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 max-w-md mx-auto"
            >
              <input
                type="text"
                placeholder="Property address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input-warm w-full px-4 py-3.5 text-sm"
                maxLength={255}
                required
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-warm w-full px-4 py-3.5 text-sm"
                maxLength={30}
                required
              />
              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-sm"
              >
                <Icon name="CalendarDaysIcon" size={16} />
                Book My Free Inspection
              </button>
              <p className="text-xs text-muted-foreground">
                Response within 2 hours - No credit card required
              </p>
            </form>
          ) : (
            <div className="py-6">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Icon
                  name="CheckCircleIcon"
                  size={24}
                  className="text-accent"
                  variant="solid"
                />
              </div>
              <p className="text-foreground font-bold mb-2">
                Inspection Request Received!
              </p>
              <p className="text-sm text-muted">
                We'll call you within 2 hours to confirm your appointment.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
