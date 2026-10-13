"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/AppIcon";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Projects", href: "/projects" },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#F5F0E8] shadow-[0_2px_12px_rgba(28,26,23,0.1)] py-3 border-b border-[rgba(28,26,23,0.1)]"
            : "bg-[#F5F0E8]/95 py-4 border-b border-[rgba(28,26,23,0.08)]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-accent rounded flex items-center justify-center flex-shrink-0">
              <Icon name="HomeModernIcon" size={20} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-lg text-foreground tracking-tight leading-none block">
                SHIELD
              </span>
              <span className="text-[10px] text-muted tracking-widest uppercase leading-none">
                Dangkor, Phnom Penh
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks?.map((link) => {
              const isActive =
                pathname === link?.href ||
                (link?.href !== "/" && pathname?.startsWith(link?.href));
              return (
                <Link
                  key={link?.href}
                  href={link?.href}
                  className={`px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                    isActive
                      ? "text-accent border-b-2 border-accent"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {link?.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="tel:2065550174"
              className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground transition-colors"
            >
              <Icon
                name="PhoneIcon"
                size={15}
                className="text-accent"
                variant="solid"
              />
              (206) 555-0174
            </a>
            <Link
              href="/#quote"
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              Free Quote
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded text-muted hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <Icon name={menuOpen ? "XMarkIcon" : "Bars3Icon"} size={24} />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-foreground/30" />
          <div
            className="absolute top-0 left-0 right-0 bg-[#F5F0E8] border-b border-[rgba(28,26,23,0.12)] pt-20 pb-8 px-6"
            onClick={(e) => e?.stopPropagation()}
          >
            <nav className="flex flex-col gap-1">
              {navLinks?.map((link) => {
                const isActive =
                  pathname === link?.href ||
                  (link?.href !== "/" && pathname?.startsWith(link?.href));
                return (
                  <Link
                    key={link?.href}
                    href={link?.href}
                    className={`px-4 py-3.5 text-base font-semibold transition-colors duration-200 min-h-[44px] flex items-center border-b border-[rgba(28,26,23,0.06)] ${
                      isActive
                        ? "text-accent"
                        : "text-foreground hover:text-accent"
                    }`}
                  >
                    {link?.label}
                  </Link>
                );
              })}
              <div className="mt-4 flex flex-col gap-3">
                <a
                  href="tel:2065550174"
                  className="flex items-center gap-2 px-4 py-3 text-base font-semibold text-muted min-h-[44px]"
                >
                  <Icon
                    name="PhoneIcon"
                    size={18}
                    className="text-accent"
                    variant="solid"
                  />
                  (206) 555-0174
                </a>
                <Link
                  href="/#quote"
                  className="btn-primary flex items-center justify-center gap-2 px-5 py-3.5 text-base min-h-[44px]"
                >
                  Get a Free Quote
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
