"use client";

import { useEffect, useRef, useState } from "react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import type { InstagramPost } from "@/content/home";
import { wixImage } from "@/lib/wix";
import { PLACEHOLDER_IMG } from "@/lib/adminClient";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import LinkChip from "@/components/admin/editable/LinkChipPopover";
import ListControls, { AddChip } from "@/components/admin/editable/ListControls";
import { usePrefersReducedMotion } from "@/components/ui/useReducedMotion";

type Instagram = {
  eyebrow: string;
  heading: string;
  handle: string;
  href: string;
  ctaLabel: string;
  posts: InstagramPost[];
};

const IG_GLYPH =
  "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.12 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.12.66.66 1.33 1.07 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.12-1.38.66-.66 1.07-1.33 1.38-2.12.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.12C21.32 1.35 20.65.94 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zM12 16a4 4 0 114-4 4 4 0 01-4 4zm6.41-10.4a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z";

const TILTS = ["-rotate-3", "rotate-2", "-rotate-2", "rotate-3", "-rotate-1", "rotate-2"];
const DRIFT_SPEED = 32; // px/s idle leftward drift

/**
 * Instagram preview strip: a film-strip of tilted post cards drifts slowly
 * sideways forever, eases to a stop while hovered (or keyboard-focused), and
 * each card straightens + lifts on hover with an Instagram overlay. Posts are
 * CMS-managed (image / link / caption). Edit mode renders a static grid with
 * the full edit affordances; reduced motion gets a hand-scrollable strip.
 */
export default function InstagramFeed({ instagram: serverIg }: { instagram: Instagram }) {
  const ig = useCmsValue("home.instagram", serverIg);
  const editMode = useEditMode();
  const reduced = usePrefersReducedMotion();

  const stripRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(2);

  const drifting = !editMode && !reduced && ig.posts.length > 0;

  // Duplicate the post run until it more than covers the widest viewport.
  useEffect(() => {
    if (!drifting) return;
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const run = track.querySelector<HTMLElement>("[data-run]");
      const runW = run?.offsetWidth ?? 0;
      if (runW > 0) setCopies(Math.max(2, Math.ceil(window.innerWidth / runW) + 1));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [drifting, ig.posts]);

  // Constant drift that eases to a halt on hover or keyboard focus and back
  // up on leave, never resetting position (same trick as the hero CTA grid).
  // Hover and focus pause independently, so mousing away doesn't restart the
  // drift under a keyboard user; focusing a card that has drifted out of view
  // jumps the strip so the focused card is visible.
  useEffect(() => {
    if (!drifting) return;
    // The hook's first paint predates its matchMedia effect — bail sync too.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const strip = stripRef.current;
    const track = trackRef.current;
    if (!strip || !track) return;

    let pos = 0;
    let factor = 1; // eased 1 = drifting, 0 = paused
    let target = 1;
    let hovered = false;
    let focused = false;
    let focusEl: HTMLElement | null = null;
    let last: number | null = null;
    let raf = 0;

    const sync = () => (target = hovered || focused ? 0 : 1);
    const onEnter = () => {
      hovered = true;
      sync();
    };
    const onLeave = () => {
      hovered = false;
      sync();
    };
    const onFocusIn = (e: Event) => {
      focused = true;
      focusEl = (e.target as HTMLElement).closest("a");
      sync();
    };
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget && strip.contains(e.relatedTarget as Node)) return;
      focused = false;
      focusEl = null;
      sync();
    };
    strip.addEventListener("mouseenter", onEnter);
    strip.addEventListener("mouseleave", onLeave);
    strip.addEventListener("focusin", onFocusIn);
    strip.addEventListener("focusout", onFocusOut);

    const tick = (t: number) => {
      if (last == null) last = t;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      factor += (target - factor) * Math.min(1, dt * 5);

      const run = track.querySelector<HTMLElement>("[data-run]");
      const runW = run?.offsetWidth ?? 0;
      if (runW > 0) {
        if (focusEl) {
          // Shift the strip so the focused card sits fully inside the viewport.
          const r = focusEl.getBoundingClientRect();
          const s = strip.getBoundingClientRect();
          if (r.left < s.left) pos -= s.left - r.left + 24;
          else if (r.right > s.right) pos += r.right - s.right + 24;
          focusEl = null;
        }
        pos = ((pos % runW) + runW) % runW;
        pos = (pos + DRIFT_SPEED * factor * dt) % runW;
        track.style.transform = `translate3d(${-pos}px,0,0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // The edit-mode/reduced-motion branches reuse this DOM node — leave it clean.
      track.style.transform = "";
      strip.removeEventListener("mouseenter", onEnter);
      strip.removeEventListener("mouseleave", onLeave);
      strip.removeEventListener("focusin", onFocusIn);
      strip.removeEventListener("focusout", onFocusOut);
    };
  }, [drifting, copies, ig.posts]);

  const postSrc = (p: InstagramPost) =>
    p.img ? (p.img.startsWith("http") ? p.img : wixImage(p.img, 600, 600)) : PLACEHOLDER_IMG;

  const postCard = (p: InstagramPost, i: number, interactive: boolean, clone = false) => {
    const media = (
      <>
        <EditableImage
          path={`home.instagram.posts.${i}.img`}
          raw={p.img}
          src={postSrc(p)}
          alt={p.caption || "Instagram post"}
          className="h-full w-full object-cover"
        />
        <div
          className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-navy/90 via-navy/30 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100${
            editMode ? " pointer-events-none" : ""
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 self-end fill-gold" aria-hidden="true">
            <path d={IG_GLYPH} />
          </svg>
          <p className="font-body text-sm leading-snug text-white/90">{p.caption}</p>
        </div>
      </>
    );
    if (!interactive) return media;
    return (
      <a
        href={p.href || ig.href}
        target="_blank"
        rel="noreferrer noopener"
        tabIndex={clone ? -1 : undefined}
        aria-label={p.caption ? `Instagram: ${p.caption}` : "Open Instagram post"}
        className={`group relative block aspect-square w-44 shrink-0 overflow-hidden rounded-2xl bg-navy-soft shadow-lg transition-transform duration-300 hover:z-10 hover:rotate-0 hover:scale-[1.06] focus-visible:z-10 focus-visible:rotate-0 focus-visible:scale-[1.06] sm:w-56 ${
          TILTS[i % TILTS.length]
        }`}
      >
        {media}
      </a>
    );
  };

  const run = (ariaHidden: boolean, key: number) => (
    <div
      key={key}
      data-run={key === 0 ? "" : undefined}
      aria-hidden={ariaHidden || undefined}
      className="flex w-max shrink-0 items-center gap-6 pr-6 sm:gap-8 sm:pr-8"
    >
      {ig.posts.map((p, i) => (
        <span key={i} className="block py-8">
          {postCard(p, i, true, ariaHidden)}
        </span>
      ))}
    </div>
  );

  return (
    <section className="relative w-full overflow-hidden bg-navy pb-24 pt-20 sm:pb-28">
      {/* Warm corner glows, a nod to the gradient app icon */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-gold/[0.06] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-0 h-[380px] w-[380px] rounded-full bg-blue-muted/20 blur-3xl"
      />
      <Container className="relative">
        <RevealOnScroll>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <EditableText
                path="home.instagram.eyebrow"
                value={ig.eyebrow}
                as="p"
                className="font-display text-f6 lowercase text-gold"
              />
              <EditableText
                path="home.instagram.heading"
                value={ig.heading}
                as="h2"
                className="mt-2 font-heading text-f3 leading-none text-white"
              />
            </div>
            <div className="pb-2">
              {editMode ? (
                <span className="font-display text-f7 lowercase text-white/70">
                  <EditableText path="home.instagram.handle" value={ig.handle} />
                  <LinkChip link={{ path: "home.instagram.href", value: ig.href }} />
                </span>
              ) : (
                <a
                  href={ig.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-display text-f7 lowercase text-white/70 transition hover:text-gold"
                >
                  {ig.handle}
                </a>
              )}
            </div>
          </div>
        </RevealOnScroll>
      </Container>

      {editMode ? (
        <Container key="ig-edit" className="relative mt-10">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {ig.posts.map((p, i) => (
              <div key={i} className="relative">
                <ListControls
                  listPath="home.instagram.posts"
                  index={i}
                  count={ig.posts.length}
                  label="post"
                  className="right-2 top-2"
                />
                <div className="group relative aspect-square overflow-hidden rounded-2xl bg-navy-soft">
                  <EditableImage
                    path={`home.instagram.posts.${i}.img`}
                    raw={p.img}
                    src={postSrc(p)}
                    alt={p.caption || "Instagram post"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-2 font-body text-xs text-white/70">
                  <EditableText
                    path={`home.instagram.posts.${i}.caption`}
                    value={p.caption}
                    multiline
                  />
                  <LinkChip
                    link={{ path: `home.instagram.posts.${i}.href`, value: p.href }}
                  />
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <AddChip listPath="home.instagram.posts" label="post" />
          </div>
        </Container>
      ) : reduced ? (
        <div key="ig-static" className="gallery-scroll mt-6 overflow-x-auto">
          <div className="gallery-pad flex w-max items-center gap-6 sm:gap-8">
            {ig.posts.map((p, i) => (
              <span key={i} className="block py-8">
                {postCard(p, i, true)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div key="ig-drift" ref={stripRef} className="mt-6 flex overflow-hidden">
          <div ref={trackRef} className="flex w-max will-change-transform">
            {Array.from({ length: copies }, (_, c) => run(c > 0, c))}
          </div>
        </div>
      )}

      <Container className="relative">
        <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
          <Button href={ig.href} variant="gold">
            {editMode ? (
              <EditableText path="home.instagram.ctaLabel" value={ig.ctaLabel} />
            ) : (
              ig.ctaLabel
            )}
          </Button>
        </div>
      </Container>
    </section>
  );
}
