import React from "react";
import Link from "next/link";
import Icon from "@/components/ui/AppIcon";

export default function Footer() {
  return (
    <footer className="bg-[#1C1A17] text-[#C8BFB0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-accent rounded flex items-center justify-center flex-shrink-0">
                <Icon name="HomeModernIcon" size={20} className="text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-white tracking-tight leading-none block">
                  SHIELD
                </span>
                <span className="text-[10px] text-[#8A7E70] tracking-widest uppercase leading-none">
                  Dangkor, Phnom Penh
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Phnom Penh's trusted roofing contractor since 2004. Licensed,
              bonded, and backed by a 10-year workmanship guarantee.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <a
                href="tel:2065550174"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Icon
                  name="PhoneIcon"
                  size={14}
                  className="text-accent"
                  variant="solid"
                />
                (206) 555-0174
              </a>
              <a
                href="mailto:hello@roofpro.com"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Icon name="EnvelopeIcon" size={14} className="text-accent" />
                receptionist@shield.com
              </a>
              <span className="flex items-center gap-2">
                <Icon
                  name="MapPinIcon"
                  size={14}
                  className="text-accent"
                  variant="solid"
                />
                Dangkor, Phnom Penh 98101
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-white">
              Pages
            </span>
            <nav className="flex flex-col gap-2">
              {[
                { label: "Home", href: "/" },
                { label: "Services", href: "/services" },
                { label: "Projects", href: "/projects" },
                { label: "Get a Quote", href: "/#quote" },
              ]?.map((l) => (
                <Link
                  key={l?.href}
                  href={l?.href}
                  className="text-sm hover:text-white transition-colors py-0.5"
                >
                  {l?.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Hours */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-white">
              Hours
            </span>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <span>Mon - Fri</span>
                <span className="text-white">7am - 6pm</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Saturday</span>
                <span className="text-white">8am - 4pm</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Sunday</span>
                <span>Closed</span>
              </div>
              <div className="mt-2 pt-2 border-t border-white/10 text-xs text-accent font-semibold">
                Emergency line: 24/7
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#6B5E50]">
          <span>
            © {new Date()?.getFullYear()} SHIELD Inc. All rights reserved.
          </span>
          <div className="flex gap-4">
            {["Terms"]?.map((l) => (
              <Link
                key={l}
                href="put-terms-link-here"
                className="hover:text-white transition-colors"
              >
                {l}
              </Link>
            ))}
            {["Privacy"]?.map((l) => (
              <Link
                key={l}
                href="put-privacy-link-here"
                className="hover:text-white transition-colors"
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
