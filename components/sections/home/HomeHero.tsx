"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import Carousel from "@/components/ui/Carousel";
import CtaGrid from "@/components/sections/home/CtaGrid";
import type { HeroGradient, Service } from "@/content/home";
import { DEFAULT_HERO_GRADIENT } from "@/content/home";
import { heroGradientCss, heroBottomBandCss } from "@/lib/heroGradient";
import HeroPhotoCards from "@/components/sections/home/HeroPhotoCards";
import {
  useAdmin,
  useCmsValue,
  useEditMode,
} from "@/components/admin/AdminProvider";
import { resolveImage } from "@/lib/adminClient";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls from "@/components/admin/editable/ListControls";
import useFitText from "@/components/ui/useFitText";
import { wixImage } from "@/lib/wix";
import { useRevealPhase } from "@/components/motion/useRevealPhase";
import { useMinWidth } from "@/components/ui/useMinWidth";
import { useHeroSlots } from "@/components/layout/HeroSlots";

type Hero = {
  headline: string;
  sub: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
  gradient?: HeroGradient;
};

/** Fit the type to a single line below the `sm` breakpoint (see useFitText). */
const MOBILE = "(max-width: 750px)";
/** Matches the `sm` breakpoint upward — where the carousel title is fit to
 * two lines (see HeroServiceSlide). */
const DESKTOP = "(min-width: 751px)";

/**
 * The entrance beats, in ms after the veil lifts. The film goes first and the
 * copy climbs out of it, so the sequence reads as one movement rather than
 * four things arriving at once.
 */
const BEAT = {
  image: 0,
  headline: 260,
  sub: 400,
  carousel: 520,
  /** The CTA bar. */
  cta: 620,
  /** The button itself, opening out of the bar once the bar has landed. */
  button: 780,
} as const;

/**
 * Homepage hero: fills the viewport below the header. The hero film
 * (home.hero.image — an image slot that also takes an uploaded video) is the
 * whole section: it is laid full-bleed behind everything, and every other hero
 * element — headline, sub, services carousel, CTA — sits over it, minimized to
 * a column of bars along the bottom so the footage stays the subject.
 *
 * The services carousel is reduced to its titles; hovering the strip plays that
 * service's backdrop clip full-bleed over the hero film, multiplied into it so
 * the clip's white ground drops out and only its artwork rides the footage.
 * That layer lives here rather than inside the slide on purpose: mix-blend-mode
 * only reaches the nearest stacking context, and the carousel's own slide
 * wrappers (transform + z-index) would trap it short of the film.
 *
 * The whole thing makes one choreographed entrance (see the [data-gp-hero]
 * rules in globals.css), held until the page veil lifts so it plays to someone
 * actually looking at it rather than to the back of the veil. It runs once per
 * load, follows the site-wide motion setting, and is skipped entirely with
 * motion off — where the hero is simply there, as it is for a visitor with no
 * JS at all.
 */
export default function HomeHero({
  hero: serverHero,
  services: serverServices,
}: {
  hero: Hero;
  services: Service[];
}) {
  const hero = useCmsValue("home.hero", serverHero);
  const services = useCmsValue("home.services", serverServices);
  const gradient = useCmsValue<HeroGradient>(
    "home.hero.gradient",
    serverHero.gradient ?? DEFAULT_HERO_GRADIENT,
  );
  const editMode = useEditMode();
  const t = useT();
  const tv = useEditableT();

  const phase = useRevealPhase();

  // Which service's backdrop clip is showing, and the <video> elements to drive.
  // Playback is hover-only: hovering a carousel title loops that clip; on
  // hover-exit it keeps playing (no snap back mid-frame) until the current pass
  // ends, then rests paused at the start — see the 'ended' handler below.
  const [hovered, setHovered] = useState<number | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const videos = videoRefs.current.filter(Boolean) as HTMLVideoElement[];
    const onEnded = (e: Event) => {
      const v = e.currentTarget as HTMLVideoElement;
      v.pause();
      v.currentTime = 0;
    };
    videos.forEach((v) => v.addEventListener("ended", onEnded));
    return () => videos.forEach((v) => v.removeEventListener("ended", onEnded));
  }, [services]);

  const onSlideHoverStart = (index: number) => {
    setHovered(index);
    const v = videoRefs.current[index];
    if (!v) return;
    v.loop = true;
    v.play().catch(() => {});
  };
  const onSlideHoverEnd = (index: number) => {
    setHovered((h) => (h === index ? null : h));
    const v = videoRefs.current[index];
    // Stop looping but keep playing — the 'ended' listener above rewinds to the
    // start once the current pass actually finishes.
    if (v) v.loop = false;
  };

  const slides = services.map((s, i) => (
    <HeroServiceSlide
      key={i}
      service={s}
      index={i}
      count={services.length}
      editMode={editMode}
      tv={tv}
      onHoverStart={() => onSlideHoverStart(i)}
      onHoverEnd={() => onSlideHoverEnd(i)}
    />
  ));

  // The services strip has two homes: the middle of the hero's desktop row, or
  // — on mobile, where the hero has no room for it — the masthead's right-hand
  // cell, reached by portal so it stays inside this tree (see HeroSlots).
  const { headerMedia, setHeroCta } = useHeroSlots();
  const desktop = useMinWidth(751);
  const servicesStrip = (
    <div
      data-hero-rise
      style={{ ["--d" as string]: `${BEAT.carousel}ms` }}
      className="relative flex min-w-0 flex-1 items-stretch overflow-hidden border-white/10 bg-navy-soft/45 backdrop-blur-sm max-sm:h-full max-sm:border-l sm:border"
    >
      <Carousel
        slides={slides}
        ariaLabel={t("Our services")}
        className="flex w-full flex-col justify-center"
        chrome={false}
      />
    </div>
  );

  return (
    // Pinned to the top of the viewport: the header scrolls away and the
    // sections below scroll up and over the hero, the cityscape skyline rising
    // with them (see page.tsx). On mobile the bottom band (--cityscape-h) is
    // left clear so the cityscape sits in the initial viewport against it; on
    // desktop (sm+) that padding is dropped so the hero elements get the full
    // height and the cityscape starts just below the fold. The gradient is
    // admin-authored via the mobile header image config's color picker and
    // affects only this section — it now backs the film (visible wherever the
    // footage doesn't cover, e.g. while it loads).
    <section
      data-gp-hero={phase ?? undefined}
      className="hero-breathe hero-fill sticky top-0 z-0 flex w-full flex-col overflow-hidden pt-0 pb-[var(--cityscape-h)] sm:pb-8"
      style={
        {
          // Linear ramp on mobile, a horizontal band across the bottom of the
          // viewport on desktop (see .hero-fill in globals.css, which picks the
          // variable per breakpoint).
          "--hero-grad": heroGradientCss(gradient),
          "--hero-grad-desktop": heroBottomBandCss(gradient),
        } as CSSProperties
      }
    >
      {/* Decorative case-study "photocards" sprinkled into the side gutters —
          outside the film's frame, which on desktop ends at the body bounds. */}
      <HeroPhotoCards />

      {/* The film's frame: edge to edge on mobile, and on desktop the body
          column, its edges flush with the header's content bounds (same
          max-w-site + px-8 as the masthead row). Everything below is scoped to
          it — the film, the blended backdrops, the scrims and the hero's own
          content — so the whole hero reads as one framed screen. */}
      <div className="mx-auto flex min-h-0 w-full max-w-site flex-1 sm:px-8">
      <div className="hero-frame relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* The hero film, full-bleed across the frame. The wipe needs a box of its
          own: EditableImage owns the media element's class list, and clipping it
          directly would fight it. */}
      <div
        data-hero-wipe
        style={{ ["--d" as string]: `${BEAT.image}ms` }}
        className="absolute inset-0 z-0 will-change-[clip-path,transform]"
      >
        <EditableImage
          path="home.hero.image"
          raw={hero.image}
          src={
            hero.image.startsWith("http")
              ? hero.image
              : wixImage(hero.image, 1920, 1200)
          }
          alt={t("Galvez & Partners storytelling")}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Hovered service backdrop, over the film. `multiply` makes the clip's
          white ground transparent — the film shows straight through it — while
          its artwork darkens into the footage. Only the hovered one is opaque;
          the rest fade out in place. */}
      {services.map((s, i) =>
        s.media ? (
          <div
            key={i}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] mix-blend-multiply transition-opacity duration-500"
            style={{ opacity: hovered === i ? 1 : 0 }}
          >
            <EditableImage
              path={`home.services.${i}.media`}
              raw={s.media}
              src={resolveImage(s.media, 1600, 1000)}
              alt=""
              className="h-full w-full object-cover"
              playbackRate={0.75}
              autoPlayVideo={false}
              loopVideo={false}
              videoRef={(el) => {
                videoRefs.current[i] = el;
              }}
            />
          </div>
        ) : null,
      )}

      {/* Legibility scrim: the copy and bars sit in the lower half, so the
          footage is darkened toward the bottom and left largely clear up top. */}
      <div
        aria-hidden
        className={`absolute inset-0 z-[2] bg-gradient-to-t from-navy/85 via-navy/35 to-navy/10${
          editMode ? " pointer-events-none" : ""
        }`}
      />
      {/* Lower slice of the masthead scrim (see .masthead-scrim in globals.css):
          a multiply shadow that continues down from the header and fades out
          toward the bottom of the hero. */}
      <div
        aria-hidden
        className="masthead-scrim masthead-scrim--hero pointer-events-none absolute inset-0 z-[2]"
      />
      {/* Everything else, enveloped in the film: minimized bars along the
          bottom — stacked on mobile, side by side across the foot of the frame
          on desktop. */}
      <div className="hero-shell relative z-10 flex min-h-0 flex-1 flex-col justify-end gap-2 p-4 sm:flex-row sm:items-end sm:gap-3 sm:p-6">
        <div className="min-w-0 sm:flex-1">
          <FitLine
            path="home.hero.headline"
            value={tv(hero.headline)}
            as="h1"
            beat={BEAT.headline}
            max={40}
            min={18}
            className="font-heading leading-none text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] sm:whitespace-normal sm:text-[clamp(1.6rem,3.2vw,2.9rem)]"
          />
          <FitLine
            path="home.hero.sub"
            value={tv(hero.sub)}
            as="p"
            beat={BEAT.sub}
            max={20}
            min={8}
            className="mt-1 font-body text-white/85 drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)] sm:mt-2 sm:whitespace-normal sm:text-[clamp(0.85rem,1.2vw,1.05rem)]"
          />
        </div>

        {/* Services, minimized to a single-line title strip over the film — on
            desktop the middle of the row, on mobile lifted out of the hero
            entirely and portaled into the masthead (below). */}
        {desktop ? servicesStrip : null}

        {/* CTA, minimized to one bar for every viewport: the "Ready?" line and
            its button side by side, with the cta grid still playing behind. */}
        <div
          data-hero-rise
          style={{ ["--d" as string]: `${BEAT.cta}ms` }}
          className="hero-cta relative flex shrink-0 items-center justify-between gap-4 overflow-hidden bg-gold px-4 py-2 sm:justify-center sm:px-6 sm:py-2.5"
        >
          <CtaGrid />
          <p className="relative z-10 font-display text-2xl leading-none text-navy sm:text-3xl">
            {t("Ready?")}
          </p>
          <span
            data-hero-open
            style={{ ["--d" as string]: `${BEAT.button}ms` }}
            className="relative z-10 inline-block"
          >
            <Button
              href={hero.ctaHref}
              variant="gold"
              className="border-2 border-navy px-4 py-2 text-sm hover:bg-navy hover:text-gold sm:text-base"
            >
              {editMode ? (
                <EditableText
                  path="home.hero.ctaLabel"
                  value={hero.ctaLabel}
                  link={{ path: "home.hero.ctaHref", value: hero.ctaHref }}
                />
              ) : (
                t(hero.ctaLabel)
              )}
            </Button>
          </span>
          {/* Socket for the mobile menu's hamburger, which comes down out of its
              floating bar to sit right of the CTA button while the hero is on
              screen (see HeroSlots). Empty — and zero-width — on desktop. */}
          <span ref={setHeroCta} className="relative z-10 flex items-center empty:hidden sm:hidden" />
        </div>
      </div>
      </div>
      </div>

      {/* Mobile: the services strip rides in the masthead's right-hand cell,
          where the header picture used to be. It stays part of this tree, so it
          keeps driving the blended backdrops over the film. */}
      {!desktop && headerMedia ? createPortal(servicesStrip, headerMedia) : null}
    </section>
  );
}

/**
 * A CMS-editable line of text that is shrunk (mobile only) to fit on a single
 * line within its container. The inner text sizes in `em`, so the fitted
 * font-size set on the wrapper scales it; at `sm`+ the wrapper size is cleared
 * and the `sm:` type classes take over.
 */
function FitLine({
  path,
  value,
  as,
  className,
  max,
  min,
  beat,
}: {
  path: string;
  value: string;
  as: "h1" | "p";
  className: string;
  max: number;
  min: number;
  /** Delay, in ms, of this line's beat in the hero entrance. The wrapper is
   * already clipped for the fit, so the line has an edge to climb out from. */
  beat?: number;
}) {
  const { ref } = useFitText<HTMLDivElement>({
    max,
    min,
    singleLine: true,
    query: MOBILE,
    deps: [value],
  });
  return (
    <div
      ref={ref}
      data-hero-line={beat === undefined ? undefined : ""}
      style={
        beat === undefined ? undefined : { ["--d" as string]: `${beat}ms` }
      }
      className="overflow-hidden"
    >
      <EditableText
        path={path}
        value={value}
        as={as}
        className={`inline-block max-w-full whitespace-nowrap text-[1em] ${className}`}
      />
    </div>
  );
}

/**
 * One services carousel slide, minimized to its title. Hovering it plays that
 * service's backdrop clip over the hero film (the parent owns that layer and
 * the playback). The description is no longer shown to visitors, but stays
 * rendered in edit mode so it remains editable in place.
 */
function HeroServiceSlide({
  service,
  index,
  count,
  editMode,
  tv,
  onHoverStart,
  onHoverEnd,
}: {
  service: Service;
  index: number;
  count: number;
  editMode: boolean;
  tv: (s: string) => string;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const admin = useAdmin();
  const media = service.media ?? "";
  // Mobile: shrink the title to the (small) masthead cell the strip rides in.
  const { ref } = useFitText<HTMLDivElement>({
    max: 15,
    min: 7,
    query: MOBILE,
    deps: [service.title],
  });
  // Desktop: shrink the title (only if needed) so it never exceeds two lines in
  // its box — no clamp/ellipsis, so no text is ever hidden.
  const { ref: headingRef } = useFitText<HTMLDivElement>({
    max: 28,
    min: 15,
    query: DESKTOP,
    deps: [service.title],
  });

  return (
    <div
      className="hero-slide relative flex h-full flex-col justify-center px-3 py-2 sm:px-6 sm:py-3"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      {editMode && (
        <>
          <ListControls
            listPath="home.services"
            index={index}
            count={count}
            label="service"
            className="right-8 top-2 sm:right-12"
          />
          {/* The backdrop plays over the hero film rather than in this card, so
              edit mode gets this chip to open its media picker. */}
          <button
            type="button"
            onClick={() =>
              admin.openImagePicker({
                path: `home.services.${index}.media`,
                raw: media,
              })
            }
            className="absolute left-8 top-2 z-20 border border-dashed border-white/30 px-3 py-1 font-heading text-xs text-white/60 transition hover:border-gold/60 hover:text-gold sm:left-12"
          >
            {media ? "backdrop" : "add backdrop"}
          </button>
        </>
      )}
      <div ref={ref} className="relative z-[1] overflow-hidden">
        <div ref={headingRef} className="hero-slide-heading">
          <EditableText
            path={`home.services.${index}.title`}
            value={tv(service.title)}
            as="h3"
            className="font-display text-[1em] leading-[1.1] text-sky-200 sm:leading-[1.15]"
          />
        </div>
        {editMode && (
          <EditableText
            path={`home.services.${index}.description`}
            value={tv(service.description)}
            as="p"
            multiline
            className="hero-slide-body mt-2 max-w-xl whitespace-pre-line font-body text-sm leading-snug text-white/60"
          />
        )}
      </div>
    </div>
  );
}
