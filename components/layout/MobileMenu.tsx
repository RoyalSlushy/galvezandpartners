"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem, Social } from "@/content/site";
import SocialIcons from "@/components/ui/SocialIcons";
import Button from "@/components/ui/Button";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import MotionSwitcher from "@/components/motion/MotionSwitcher";
import { useT } from "@/components/i18n/LocaleProvider";
import CtaGrid from "@/components/sections/home/CtaGrid";
import EditableImage from "@/components/admin/editable/EditableImage";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useHeroSlots } from "@/components/layout/HeroSlots";
import { createPortal } from "react-dom";
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
  // The floating bottom nav starts as a corner hamburger and expands into a
  // bottom header once the first screen has been scrolled past.
  const [expanded, setExpanded] = useState(false);
  const t = useT();
  const pathname = usePathname();

  // Header picture (right half of the mobile header). Draft-aware so the admin
  // media picker updates it live; a bare Wix id is resized, a full URL used as-is.
  const headerImg = useCmsValue("site.headerImage", headerImage);
  const editMode = useEditMode();
  const { heroCta, setHeaderMedia } = useHeroSlots();
  // While the hero is on screen the hamburger sits inside its CTA bar rather
  // than floating over the cityscape; once the first screen is scrolled past
  // (or on a page with no hero) it goes back to the floating bar.
  const inHeroCta = !expanded && heroCta !== null;
  const headerSrc = headerImg.startsWith("http") ? headerImg : wixImage(headerImg, 480, 360);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Current page label for the expanded bottom header's center slot.
  const currentNav = nav.find((item) => isActive(item.href));
  const currentLabel = currentNav ? t(currentNav.label) : "";

  // Expand the floating nav once the viewport has scrolled past ~half the first
  // screen (into the next section).
  useEffect(() => {
    const onScroll = () => setExpanded(window.scrollY > window.innerHeight * 0.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // The logo now fills its column's full width (its height follows from the
  // SVG's own aspect ratio, not a fixed size), so the picture's top-padding —
  // which keeps its top from passing the logo's top — has to be measured
  // rather than assumed. Track the logo's rendered offset from the header row.
  const headerRowRef = useRef<HTMLDivElement>(null);
  const logoImgRef = useRef<HTMLImageElement>(null);
  const [logoTop, setLogoTop] = useState(0);

  useEffect(() => {
    const row = headerRowRef.current;
    const logo = logoImgRef.current;
    if (!row || !logo) return;
    const measure = () => {
      setLogoTop(logo.getBoundingClientRect().top - row.getBoundingClientRect().top);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    ro.observe(logo);
    return () => ro.disconnect();
  }, []);

  // Keep the drawer's nav links from growing tall enough to collide with the
  // logo at the top of the drawer: when the links (which wrap on narrow phones
  // or in longer locales) would overflow the room left below the logo, shrink
  // the link type via a `--gp-nav-scale` custom property the spans size against.
  // Both drawers are measured; only their roots + logo blocks are observed
  // (never the nav), so applying the scale can't feed back into a re-measure.
  const navSig = nav.map((n) => t(n.label)).join("");
  useEffect(() => {
    const root = headerRowRef.current;
    if (!root) return;
    const drawers = Array.from(root.querySelectorAll<HTMLElement>("[data-gp-drawer]"));
    if (!drawers.length) return;
    const MIN = 0.55; // never shrink the links below this fraction
    const GAP = 24; // breathing room to keep between the logo and the links
    const fit = () => {
      for (const drawer of drawers) {
        const head = drawer.querySelector<HTMLElement>("[data-gp-drawer-head]");
        const nav = drawer.querySelector<HTMLElement>("[data-gp-drawer-nav]");
        if (!head || !nav) continue;
        drawer.style.setProperty("--gp-nav-scale", "1");
        const avail = drawer.clientHeight - head.offsetHeight - GAP;
        if (avail <= 0) continue;
        // Shrink the type until the block fits (fixed-point iteration: the nav
        // height falls as the scale does, so a few passes converge).
        let scale = 1;
        for (let i = 0; i < 8 && nav.scrollHeight > avail && scale > MIN; i++) {
          scale = Math.max(MIN, scale * (avail / nav.scrollHeight));
          drawer.style.setProperty("--gp-nav-scale", scale.toFixed(3));
        }
        // With the final type size settled, size each active underline to the
        // label's bottom visual line (a Range yields one rect per line), so a
        // wrapped label underlines only its last line at that line's width.
        const spans = nav.querySelectorAll<HTMLElement>("[data-gp-nav-span]");
        spans.forEach((span) => {
          const range = document.createRange();
          range.selectNodeContents(span);
          const rects = range.getClientRects();
          if (!rects.length) return;
          const last = rects[rects.length - 1];
          const box = span.getBoundingClientRect();
          // Relative to the span's own left edge, so any drawer/rise transform
          // cancels out.
          span.style.setProperty("--ul-x", `${last.left - box.left}px`);
          span.style.setProperty("--ul-w", `${last.width}px`);
        });
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    for (const drawer of drawers) {
      ro.observe(drawer);
      const head = drawer.querySelector<HTMLElement>("[data-gp-drawer-head]");
      if (head) ro.observe(head);
    }
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navSig, open]);

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
        data-gp-drawer=""
        style={{ ["--gp-nav-scale" as string]: 1 }}
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

        <div data-gp-drawer-head="" className="relative z-10 px-10 py-10">
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
          data-gp-drawer-nav=""
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
                    (masked shift-up, staggered by index). Its size scales with
                    --gp-nav-scale so it never crowds the logo (see the fit
                    effect). The active item's gold underline scales in from its
                    center — its geometry (--ul-x / --ul-w) is measured to the
                    label's bottom line, so a wrapped label underlines just that
                    line (not the full width of the widest line above it). */}
                <span
                  data-gp-nav-span
                  style={
                    {
                      transitionDelay: shown ? `${120 + i * 70}ms` : "0ms",
                      // The underline grows in a beat after the text has risen,
                      // so the center-out scale reads as its own gesture.
                      "--ul-delay": shown ? `${260 + i * 70}ms` : "0ms",
                      // Defaults (whole box) until the bottom line is measured.
                      "--ul-x": "0px",
                      "--ul-w": "100%",
                      fontSize: "calc(1.875rem * var(--gp-nav-scale, 1))",
                    } as React.CSSProperties
                  }
                  className={`relative inline-block font-heading uppercase leading-[1.1] tracking-wide transition-transform duration-500 ease-out hover:text-gold after:absolute after:-bottom-1 after:left-[var(--ul-x)] after:h-0.5 after:w-[var(--ul-w)] after:origin-center after:bg-gold after:transition-transform after:duration-300 after:[transition-delay:var(--ul-delay)] ${
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
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <MotionSwitcher />
            </div>
            <SocialIcons socials={socials} />
          </div>
        </nav>
      </div>
    );
  };

  return (
    <div
      ref={headerRowRef}
      className={`flex w-full self-stretch sm:hidden ${
        // Home lets the header fade into the hero (see Header.tsx), so it needs
        // no divider; every other page gets a bottom underline under the logo +
        // header-image row to separate it from the content below.
        pathname === "/" ? "" : "border-b border-white/15"
      }`}
    >
      {/* Mobile header row: the logo (left 60%) opens the drawer on tap and fills
          its column's full width at its own aspect ratio; the picture (remaining
          40%) fills the header's full height so its bottom sits flush against the
          hero below. */}
      <button
        type="button"
        aria-label={t("Open menu")}
        aria-expanded={open}
        onClick={() => {
          setSide("right");
          setOpen(true);
        }}
        className="flex w-[60%] items-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={logoImgRef} src="/logo.svg" alt="Galvez & Partners" className="w-full h-auto" />
      </button>
      {/* The picture is bottom-anchored (flush with the hero) and padded down to
          the logo's measured top offset, so its top never passes the logo's top.
          object-contain keeps the whole image in view without distortion. */}
      {/* The right-hand header cell. The picture that used to fill it is hidden
          for visitors at every viewport (it stays in edit mode so the field
          remains pickable — it still backs the hero gradient's eyedropper); on
          the homepage the hero portals its services carousel in here instead
          (see HeroSlots). */}
      <div
        ref={setHeaderMedia}
        className="ml-3 flex w-[40%] items-stretch overflow-hidden"
        style={editMode ? { paddingTop: logoTop } : undefined}
      >
        {editMode && (
          <EditableImage
            path="site.headerImage"
            raw={headerImg}
            src={headerSrc}
            alt=""
            className="h-full w-full object-contain object-bottom"
          />
        )}
      </div>

      {/* The hamburger's home while the hero is on screen: the trailing end of
          the hero's CTA bar, right of its button (see HeroSlots). */}
      {inHeroCta &&
        heroCta &&
        createPortal(
          <button
            type="button"
            aria-label={t("Open menu")}
            aria-expanded={open}
            onClick={() => {
              setSide("right");
              setOpen(true);
            }}
            className="-ml-0.5 flex w-10 shrink-0 items-center justify-center border-2 border-navy text-navy transition hover:bg-navy hover:text-gold"
          >
            <HamburgerIcon className="h-5 w-5" />
          </button>,
          heroCta,
        )}

      {/* Floating bottom nav (mobile only). On a page with no hero it's a gold
          hamburger button in the bottom-right corner; once the first screen is
          scrolled past it grows into a full-width glassmorphic bottom header —
          logotype (left), current page (center), hamburger (right). */}
      <div
        className={`fixed z-30 flex items-center overflow-hidden shadow-2xl transition-all duration-500 ease-out sm:hidden ${
          inHeroCta ? "pointer-events-none opacity-0" : ""
        } ${
          expanded
            ? "bottom-0 right-0 h-16 w-screen gap-3 border-t border-white/15 bg-navy/40 px-4 text-white backdrop-blur-xl"
            : "bottom-3 right-4 h-12 w-12 justify-center gap-0 bg-gold text-navy"
        }`}
      >
        <Link
          href="/"
          aria-label="Galvez & Partners — home"
          className={`overflow-hidden font-display leading-none tracking-tight transition-all duration-300 ${
            expanded ? "w-auto text-[1.7rem] opacity-100" : "pointer-events-none w-0 text-[1.7rem] opacity-0"
          }`}
        >
          G+P
        </Link>
        <span
          className={`min-w-0 flex-1 truncate text-center font-heading text-sm uppercase tracking-wide text-white/90 transition-opacity duration-300 ${
            expanded ? "opacity-100" : "w-0 flex-none opacity-0"
          }`}
        >
          {currentLabel}
        </span>
        <button
          type="button"
          aria-label={t("Open menu")}
          aria-expanded={open}
          onClick={() => {
            setSide("right");
            setOpen(true);
          }}
          className="flex shrink-0 items-center justify-center"
        >
          <HamburgerIcon className="h-6 w-6" />
        </button>
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

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
