"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NavItem, Social } from "@/content/site";
import SocialIcons from "@/components/ui/SocialIcons";
import Button from "@/components/ui/Button";
import { useT } from "@/components/i18n/LocaleProvider";

/** Below this width the swipe-to-open gesture is active (matches the `sm` bp). */
const MOBILE_MAX = 750;
/** How far a mostly-horizontal drag must travel to trigger open/close. */
const SWIPE_THRESHOLD = 60;

/**
 * Walk up from `el` looking for something that already consumes horizontal
 * drags — a carousel (tagged `data-x-swipe`) or a genuinely horizontally
 * scrollable container — so a swipe there scrolls that element instead of
 * opening the menu.
 */
function startsInHorizontalScroller(el: EventTarget | null): boolean {
  let node = el as HTMLElement | null;
  while (node && node !== document.body) {
    if (node.nodeType === 1) {
      if (node.hasAttribute("data-x-swipe")) return true;
      const ox = getComputedStyle(node).overflowX;
      if ((ox === "auto" || ox === "scroll") && node.scrollWidth > node.clientWidth + 1) {
        return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

/** Hamburger + right-hand drawer menu for mobile (< sm). Opens from the
 * hamburger tap or a left-swipe anywhere on the page; closes from the backdrop,
 * the close button, or Escape. */
export default function MobileMenu({
  nav,
  socials,
}: {
  nav: NavItem[];
  socials: Social[];
}) {
  const [open, setOpen] = useState(false);
  const t = useT();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Left-swipe anywhere on the page opens the drawer (unless the swipe began in
  // a container that scrolls horizontally on its own, e.g. the card carousel).
  useEffect(() => {
    if (open) return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (!mq.matches || e.touches.length !== 1) {
        tracking = false;
        return;
      }
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = !startsInHorizontalScroller(e.target);
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      // A mostly-vertical drag is a scroll — stop tracking this gesture.
      if (Math.abs(dy) >= Math.abs(dx)) {
        tracking = false;
        return;
      }
      if (dx <= -SWIPE_THRESHOLD) {
        setOpen(true);
        tracking = false;
      }
    };
    const onEnd = () => {
      tracking = false;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 flex-col items-center justify-center gap-[6px]"
      >
        <span className="block h-[3px] w-7 bg-cream" />
        <span className="block h-[3px] w-7 bg-cream" />
        <span className="block h-[3px] w-7 bg-cream" />
      </button>

      {/* Dimmed backdrop — tap to close. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Right-hand drawer: 80% width, contents anchored to the bottom. */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-4/5 flex-col bg-navy shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-end px-5 py-6">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="text-4xl leading-none text-white"
          >
            &times;
          </button>
        </div>
        <nav aria-label="Site" className="mt-auto flex flex-col items-center gap-7 px-8 pb-12">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="font-heading text-3xl uppercase tracking-wide text-white hover:text-gold"
            >
              {t(item.label)}
            </Link>
          ))}
          <Button href="/contact-us" className="mt-4" onClick={() => setOpen(false)}>
            {t("Connect")}
          </Button>
          <SocialIcons socials={socials} className="mt-8" />
        </nav>
      </div>
    </div>
  );
}
