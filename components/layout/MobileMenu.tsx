"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem, Social } from "@/content/site";
import SocialIcons from "@/components/ui/SocialIcons";
import Button from "@/components/ui/Button";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useT } from "@/components/i18n/LocaleProvider";
import CtaGrid from "@/components/sections/home/CtaGrid";
import EditableImage from "@/components/admin/editable/EditableImage";
import { useCmsValue } from "@/components/admin/AdminProvider";
import { wixImage } from "@/lib/wix";

type Side = "left" | "right";

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

/** Hamburger + dual-side drawer menu for mobile (< sm). The swipe direction picks
 * the side: a right-swipe opens a left-hand drawer, a left-swipe opens a
 * right-hand one (the hamburger tap defaults to the right). Each drawer aligns
 * its contents toward its own edge and closes on a swipe back toward that edge
 * (or the backdrop / Escape). */
export default function MobileMenu({
  nav,
  socials,
  headerImage,
}: {
  nav: NavItem[];
  socials: Social[];
  headerImage: string;
}) {
  const [open, setOpen] = useState(false);
  // Which edge the drawer is docked to; set by the opening gesture.
  const [side, setSide] = useState<Side>("right");
  const t = useT();
  const pathname = usePathname();

  // Header picture (right half of the mobile header). Draft-aware so the admin
  // media picker updates it live; a bare Wix id is resized, a full URL used as-is.
  const headerImg = useCmsValue("site.headerImage", headerImage);
  const headerSrc = headerImg.startsWith("http") ? headerImg : wixImage(headerImg, 480, 360);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Lock body scroll while the drawer is open. Using `position: fixed` with a
  // preserved offset (rather than just `overflow: hidden`) keeps iOS Safari from
  // scrolling behind the drawer, and restoring the offset on close avoids the
  // page jumping back to the top.
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const { body } = document;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A horizontal swipe anywhere on the page opens a drawer, with the direction
  // choosing the side: swipe right → left-hand drawer, swipe left → right-hand
  // drawer. Ignored when the swipe began in a container that scrolls
  // horizontally on its own (e.g. the card carousel).
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
      if (dx >= SWIPE_THRESHOLD) {
        setSide("left");
        setOpen(true);
        tracking = false;
      } else if (dx <= -SWIPE_THRESHOLD) {
        setSide("right");
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

  // A swipe on the open drawer back toward its own edge closes it: swipe left
  // for a left-hand drawer, swipe right for a right-hand one.
  const closeStart = useRef<{ x: number; y: number } | null>(null);
  const closeTracking = useRef(false);
  const onDrawerTouchStart = (e: React.TouchEvent) => {
    closeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    closeTracking.current = true;
  };
  const onDrawerTouchMove = (e: React.TouchEvent) => {
    if (!closeTracking.current || !closeStart.current) return;
    const dx = e.touches[0].clientX - closeStart.current.x;
    const dy = e.touches[0].clientY - closeStart.current.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dy) > Math.abs(dx)) {
      closeTracking.current = false;
      return;
    }
    const closing = side === "left" ? dx <= -SWIPE_THRESHOLD : dx >= SWIPE_THRESHOLD;
    if (closing) {
      setOpen(false);
      closeTracking.current = false;
    }
  };
  const onDrawerTouchEnd = () => {
    closeTracking.current = false;
  };

  // Each side has its own drawer element so it only ever slides along its own
  // edge — a single element that flipped `left-0`/`right-0` would visibly animate
  // across the screen when the docked side changed. Only the drawer matching the
  // current `side` is shown; the other stays parked off its edge.
  const renderDrawer = (drawerSide: Side) => {
    const shown = open && side === drawerSide;
    const alignRight = drawerSide === "right";
    return (
      <div
        key={drawerSide}
        className={`fixed inset-y-0 z-50 flex w-4/5 flex-col bg-gradient-to-b from-navy to-navy-soft shadow-2xl transition-transform duration-300 ease-out ${
          alignRight ? "right-0" : "left-0"
        } ${
          shown ? "translate-x-0" : alignRight ? "translate-x-full" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!shown}
        onTouchStart={onDrawerTouchStart}
        onTouchMove={onDrawerTouchMove}
        onTouchEnd={onDrawerTouchEnd}
      >
        {/* Drifting "GALVEZ" letterform grid, cream-tinted to read on the navy
            drawer, fading out below its top third. */}
        <CtaGrid
          className="drawer-glyph-grid"
          glyphClassName="bg-cream"
          fontClassName="text-cream"
          scale={1.5}
        />

        <div className="relative z-10 px-10 py-10">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            aria-label="Galvez & Partners — home"
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Galvez & Partners" className="h-auto w-full" />
          </Link>
        </div>

        <nav
          aria-label="Site"
          className={`relative z-10 mt-auto flex flex-col gap-6 px-8 pb-12 ${
            alignRight ? "items-end text-right" : "items-start text-left"
          }`}
        >
          {nav.map((item, i) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className="block overflow-hidden pb-2"
              >
                {/* The link text rises into view from behind this clipped edge
                    (masked shift-up, staggered by index). The active item's gold
                    underline scales in from its center — the same treatment the
                    desktop nav uses. */}
                <span
                  style={
                    {
                      transitionDelay: shown ? `${120 + i * 70}ms` : "0ms",
                      // The underline grows in a beat after the text has risen,
                      // so the center-out scale reads as its own gesture.
                      "--ul-delay": shown ? `${260 + i * 70}ms` : "0ms",
                    } as React.CSSProperties
                  }
                  className={`relative inline-block font-heading text-3xl uppercase tracking-wide transition-transform duration-500 ease-out hover:text-gold after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-center after:bg-gold after:transition-transform after:duration-300 after:[transition-delay:var(--ul-delay)] ${
                    shown ? "translate-y-0" : "translate-y-full"
                  } ${active ? "text-white" : "text-white/90"} ${
                    shown && active ? "after:scale-x-100" : "after:scale-x-0"
                  }`}
                >
                  {t(item.label)}
                </span>
              </Link>
            );
          })}
          <div
            style={{ transitionDelay: shown ? `${120 + nav.length * 70}ms` : "0ms" }}
            className={`w-full transition-all duration-500 ease-out ${
              shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <Button href="/contact-us" className="mt-2 w-full" onClick={() => setOpen(false)}>
              {t("Connect")}
            </Button>
          </div>
          <div
            style={{ transitionDelay: shown ? `${190 + nav.length * 70}ms` : "0ms" }}
            className={`mt-6 flex w-full items-center justify-between transition-all duration-500 ease-out ${
              shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <LanguageSwitcher openUp />
            <SocialIcons socials={socials} />
          </div>
        </nav>
      </div>
    );
  };

  return (
    <div className="flex w-full self-stretch sm:hidden">
      {/* Mobile header row: the logo (left half) opens the drawer on tap; the
          picture (remaining 40%) fills the header's full height so its bottom
          sits flush against the hero below. */}
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => {
          setSide("right");
          setOpen(true);
        }}
        className="flex w-[60%] items-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Galvez & Partners" className="h-16 w-auto" />
      </button>
      {/* The picture is bottom-anchored (flush with the hero) and padded down so
          its top starts at the logo's top line — the logo is centered in the
          header, so that offset is half the leftover height above a 4rem logo.
          object-contain keeps the whole image in view without distortion. */}
      <div className="w-[40%] overflow-hidden pt-[calc((var(--header-h)_-_4rem)/2)]">
        <EditableImage
          path="site.headerImage"
          raw={headerImg}
          src={headerSrc}
          alt=""
          className="h-full w-full object-contain object-bottom"
        />
      </div>

      {/* Dimmed backdrop — tap to close. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {renderDrawer("left")}
      {renderDrawer("right")}
    </div>
  );
}
