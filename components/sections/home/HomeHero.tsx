"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Carousel, { CarouselContext } from "@/components/ui/Carousel";
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

/** Where the strip goes when it is clicked — the works index it is advertising. */
const WORKS_HREF = "/our-works";

/** Fit the type to a single line below the `sm` breakpoint (see useFitText). */
const MOBILE = "(max-width: 750px)";
/** Matches the `sm` breakpoint upward — where the carousel title is fit to
 * two lines (see HeroServiceSlide). */
const DESKTOP = "(min-width: 751px)";

/**
 * The gradient map every service clip is played through, paired with
 * `mix-blend-screen`.
 *
 * `invert` does the mapping: the white ground turns black, and screen drops
 * black out — so the ground goes transparent and whatever the clip sits on
 * shows through untouched. Black ink turns white and stays white. The rotation
 * carries what invert leaves of the artwork's teal (a light red) round to a
 * golden yellow, and the saturate deepens it; neither touches white or black,
 * which have no hue to turn.
 */
const MEDIA_MAP = "[filter:invert(1)_hue-rotate(60deg)_saturate(1.3)]";

/**
 * How far up the clip comes when it is standing behind a title rather than
 * beside it: enough to read as the surface the words are set on, not so much
 * that it competes with them.
 *
 * It rides on the clip itself, never on a wrapper — `mix-blend-screen` blends an
 * element with the backdrop of its own stacking context, and an ancestor at less
 * than full opacity would make one, leaving the clip to blend against the empty
 * box instead of the masthead it is standing on.
 */
const BACKDROP_OPACITY = 0.28;

/**
 * Shortened forms for the service titles, used only where the strip is standing
 * in the masthead with the nav crowding it (see `short` in HomeHero). Whole
 * words, matched case-insensitively and replaced in the title's own case, so a
 * CMS-authored title picks these up without being written for them; anything
 * unlisted is left alone.
 */
const SHORT_WORDS: Record<string, string> = {
  management: "mgmt",
  marketing: "mktg",
  production: "prod",
  productions: "prods",
  development: "dev",
  advertising: "ads",
  communications: "comms",
  photography: "photo",
  strategy: "strat",
  and: "&",
};

/** The title as it should read at this width — full, or with the long words in
 * SHORT_WORDS cut down to keep the strip clear of the nav. */
function fitTitle(title: string, short: boolean) {
  if (!short) return title;
  return title.replace(/[A-Za-z]+/g, (word) => {
    const swap = SHORT_WORDS[word.toLowerCase()];
    if (!swap) return word;
    // Carry the word's own casing over: ALL CAPS, Capitalized, or as written.
    if (word === word.toUpperCase()) return swap.toUpperCase();
    if (word[0] === word[0].toUpperCase()) {
      return swap[0].toUpperCase() + swap.slice(1);
    }
    return swap;
  });
}

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
 * The services carousel is reduced to its titles and moves into the masthead
 * (see HeroSlots); each title carries its service's backdrop clip beside it —
 * under it in the narrower mobile cell — and hovering plays it. The clip is
 * mapped and screened so its white ground drops out and only its artwork rides
 * whatever the strip is standing on; the film itself is left alone.
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
  // Pull a service's clip down before its slide is on screen. Videos are
  // mounted for every slide, so this is only about the ones a browser has left
  // unfetched; an image source is already on its way by the time it is mounted.
  const preload = useCallback((index: number) => {
    const v = thumbRefs.current[index];
    if (v && v.readyState < 2) v.load();
  }, []);
  // The clip plays in the strip itself, beside its title, at every width.
  const thumbRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const videosFor = (index: number) =>
    [thumbRefs.current[index]].filter(Boolean) as HTMLVideoElement[];

  useEffect(() => {
    const videos = thumbRefs.current.filter(Boolean) as HTMLVideoElement[];
    const onEnded = (e: Event) => {
      const v = e.currentTarget as HTMLVideoElement;
      v.pause();
      v.currentTime = 0;
    };
    videos.forEach((v) => v.addEventListener("ended", onEnded));
    return () => videos.forEach((v) => v.removeEventListener("ended", onEnded));
  }, [services]);

  const onSlideHoverStart = (index: number) => {
    videosFor(index).forEach((v) => {
      v.loop = true;
      v.play().catch(() => {});
    });
  };
  const onSlideHoverEnd = (index: number) => {
    // Stop looping but keep playing — the 'ended' listener above rewinds to the
    // start once the current pass actually finishes.
    videosFor(index).forEach((v) => {
      v.loop = false;
    });
  };

  // The services strip lives in the masthead at both sizes — in the tagline's
  // spot on desktop (bare, no card behind it), in the right-hand cell the header
  // picture used to fill on mobile — reached by portal so it stays inside this
  // tree and keeps driving the blended backdrops (see HeroSlots).
  //
  // It gives way by degrees as the window narrows rather than in one jump, and
  // never leaves the masthead: full titles, then shortened ones once the nav
  // starts crowding it (see fitTitle), then the clip alone. Below sm it moves to
  // the header cell beside the logo, where the titles come back and the clip
  // rides under one rather than beside it — the cell is too narrow to hold the
  // two side by side, but it holds them stacked.
  const { headerMedia, headerTagline, setHeroCta } = useHeroSlots();
  const desktop = useMinWidth(751);
  const roomy = useMinWidth(1440);
  const snug = useMinWidth(1152);
  const stripSocket = desktop ? headerTagline : headerMedia;
  const inMasthead = stripSocket === headerTagline;
  // Neither shortening nor dropping a title happens in edit mode, where what is
  // on screen has to be the text an admin is editing.
  const short = !editMode && inMasthead && !roomy;
  const clipOnly = !editMode && inMasthead && !snug;

  const slides = services.map((s, i) => (
    <HeroServiceSlide
      key={i}
      service={s}
      index={i}
      count={services.length}
      editMode={editMode}
      tv={tv}
      short={short}
      clipOnly={clipOnly}
      onHoverStart={() => onSlideHoverStart(i)}
      onHoverEnd={() => onSlideHoverEnd(i)}
      onPreload={() => preload(i)}
      thumbRef={(el) => {
        thumbRefs.current[i] = el;
      }}
    />
  ));

  const servicesStrip = (className: string) => (
    <ServicesStrip
      className={className}
      ariaLabel={t("Our services")}
      editMode={editMode}
      slides={slides}
    />
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
      {/* Everything else, enveloped in the film: minimized bars along the foot
          of the frame. On mobile a stack whose rhythm steps up — the sub sits
          close under the headline (they read as one block), then a wider, even
          gap to the CTA. On desktop they stand side by side in a row that is
          only as tall as the copy beside it, and the CTA stretches to that
          height rather than hugging its own contents; `contents` keeps the
          mobile stack flat inside the shell's own gap. */}
      <div className="hero-shell relative z-10 flex min-h-0 flex-1 flex-col justify-end gap-5 p-4 sm:p-6">
      <div className="contents sm:flex sm:items-stretch sm:gap-3">
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
            className="mt-2 font-body text-white/85 drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)] sm:mt-2 sm:whitespace-normal sm:text-[clamp(0.85rem,1.2vw,1.05rem)]"
          />
        </div>

        {/* The services strip is not here: it lives in the masthead at every
            width (see the portal below). */}

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
          {/* The button and the menu hug: one pair of controls at the end of the
              bar, sharing an edge rather than floating apart. */}
          <div className="relative z-10 flex items-stretch">
            <span
              data-hero-open
              style={{ ["--d" as string]: `${BEAT.button}ms` }}
              className="inline-block"
            >
              <Button
                href={hero.ctaHref}
                variant="gold"
                className="h-full border-2 border-navy px-4 py-2 text-sm hover:bg-navy hover:text-gold sm:text-base"
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
            {/* Socket for the mobile menu's hamburger, which comes down out of
                its floating bar to sit flush against the CTA button while the
                hero is on screen (see HeroSlots). Empty on desktop. */}
            <span ref={setHeroCta} className="flex items-stretch empty:hidden sm:hidden" />
          </div>
        </div>
      </div>
      </div>
      </div>
      </div>

      {/* The strip in the masthead: bare in the desktop tagline's spot, and in a
          bordered cell on mobile, where it stands against the logo. */}
      {stripSocket
        ? createPortal(
            servicesStrip(
              desktop
                ? // Sized by its own content and flushed right, so whichever
                  // title is showing ends against the social icons.
                  "hero-strip-flush items-center px-4"
                : // No panel of its own: the cell is transparent, so the strip
                  // stands on the masthead itself and the clip blends against
                  // it rather than against a tint over it.
                  "h-full flex-1 items-stretch border-l border-white/10",
            ),
            stripSocket,
          )
        : null}
    </section>
  );
}

/**
 * The services strip: the carousel, wrapped so that clicking anywhere on it goes
 * through to the works index — the titles are what it is advertising, so the
 * whole strip is the link rather than each title separately. A drag is not a
 * click: the carousel takes swipes, so a press that travels is let through to it
 * and the navigation suppressed. Edit mode gets a plain box instead, where a
 * click has to land on the text it is editing.
 */
function ServicesStrip({
  className,
  ariaLabel,
  editMode,
  slides,
}: {
  className: string;
  ariaLabel: string;
  editMode: boolean;
  slides: React.ReactNode[];
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const carousel = (
    <Carousel
      slides={slides}
      ariaLabel={ariaLabel}
      className="flex w-full flex-col justify-center"
      chrome={false}
    />
  );
  const shell = `relative flex min-w-0 overflow-hidden ${className}`;

  if (editMode) {
    return (
      <div
        data-hero-rise
        style={{ ["--d" as string]: `${BEAT.carousel}ms` }}
        className={shell}
      >
        {carousel}
      </div>
    );
  }

  return (
    <Link
      href={WORKS_HREF}
      data-hero-rise
      style={{ ["--d" as string]: `${BEAT.carousel}ms` }}
      className={shell}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        const from = start.current;
        start.current = null;
        if (!from) return;
        const travelled =
          Math.abs(e.clientX - from.x) > 8 || Math.abs(e.clientY - from.y) > 8;
        if (travelled) e.preventDefault();
      }}
    >
      {carousel}
    </Link>
  );
}

/**
 * One service's clip, mapped and screened (see MEDIA_MAP) so its white ground
 * drops out and only its artwork rides whatever the strip is standing on. The
 * caller owns the box and how the clip sits in it — backdrop behind a title, or
 * subject in a box of its own.
 *
 * Until it has a frame it is painted rather than hidden, on the blend that takes
 * white out instead of the one that takes black out: a video paints an opaque
 * black box before its first frame, which the map turns white, and white is what
 * `multiply` leaves untouched. So it loads and decodes on screen, in the box it
 * will occupy, showing nothing — and appears the moment it has something to
 * show, rather than being fetched behind a hidden element and fading in after.
 */
function ServiceClip({
  index,
  media,
  ready,
  className,
  style,
  thumbRef,
  onReady,
}: {
  index: number;
  media: string;
  /** Whether the clip has a frame to paint (see the note above). */
  ready: boolean;
  className: string;
  style?: React.CSSProperties;
  thumbRef: (el: HTMLVideoElement | null) => void;
  onReady: () => void;
}) {
  return (
    <EditableImage
      path={`home.services.${index}.media`}
      raw={media}
      src={resolveImage(media, 240, 160)}
      alt=""
      className={`${ready ? "mix-blend-screen" : "mix-blend-multiply"} ${MEDIA_MAP} ${className}`}
      style={style}
      playbackRate={0.75}
      autoPlayVideo={false}
      loopVideo={false}
      videoRef={thumbRef}
      onReady={onReady}
    />
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
  short,
  clipOnly,
  onHoverStart,
  onHoverEnd,
  onPreload,
  thumbRef,
}: {
  service: Service;
  index: number;
  count: number;
  editMode: boolean;
  tv: (s: string) => string;
  /** Whether to show the title's shortened form (see fitTitle). */
  short: boolean;
  /** Whether to drop the title entirely and stand on the clip alone — the last
   * step before the mobile layout, where the nav has taken the room the title
   * needs. A service with no clip keeps its title regardless. */
  clipOnly: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  /** Called when this slide becomes the one up next, so its clips can be
   * fetched before it is on screen. */
  onPreload: () => void;
  /** The clip's <video>, so the parent can play and preload it on hover. */
  thumbRef: (el: HTMLVideoElement | null) => void;
}) {
  const admin = useAdmin();
  const media = service.media ?? "";
  // The slide the carousel will land on next fetches its clips now, so they are
  // decoded, mapped and blended by the time it arrives rather than fading in
  // once it is already on screen.
  const { current } = useContext(CarouselContext);
  const isNext = count > 1 && index === (current + 1) % count;
  // Through a ref so a fresh callback identity on every render doesn't re-fire
  // the fetch — only actually becoming the next slide should.
  const preloadRef = useRef(onPreload);
  preloadRef.current = onPreload;
  useEffect(() => {
    if (isNext && media) preloadRef.current();
  }, [isNext, media]);
  // Held hidden until the clip has a frame: blended, a half-loaded one is not a
  // faint version of itself but a raw box of the map applied to nothing.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(false), [media]);
  // Mobile: shrink the title to the (small) masthead cell the strip rides in.
  const { ref } = useFitText<HTMLDivElement>({
    max: 15,
    min: 7,
    query: MOBILE,
    deps: [service.title, short],
  });
  // Desktop: shrink the title (only if needed) so it never exceeds two lines in
  // its box — no clamp/ellipsis, so no text is ever hidden.
  const { ref: headingRef } = useFitText<HTMLDivElement>({
    max: 22,
    min: 12,
    query: DESKTOP,
    deps: [service.title, short],
  });

  return (
    <div
      // The title sits on the slide's bottom edge, with the clip standing behind
      // it. min-h holds the strip's own height now that the clip is out of the
      // flow and no longer sets it — and gives the title a box to sit at the
      // foot of. On mobile that foot is the logo's own bottom edge, from the gap
      // the header row measures under it (see MobileMenu).
      className="hero-slide relative flex h-full gap-2 px-3 pb-[var(--gp-logo-gap,0.5rem)] pt-2 max-sm:flex-col max-sm:items-start max-sm:justify-end max-sm:gap-1.5 sm:min-h-[3rem] sm:items-end sm:gap-1.5 sm:px-0 sm:py-0"
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
          {/* The clip's own box is small, blended, and hidden until it has a
              frame, so edit mode gets this chip as a dependable way into its
              media picker. */}
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
      {/* Auto-width (not flex-1): in the masthead the strip is as wide as its
          widest title, and a filling box would leave the shorter ones stranded
          mid-strip instead of ending against the icons beside it. */}
      <div
        ref={ref}
        className={`relative z-[1] min-w-0 overflow-hidden ${
          clipOnly && media ? "hidden" : ""
        }`}
      >
        <div ref={headingRef} className="hero-slide-heading">
          <EditableText
            path={`home.services.${index}.title`}
            value={fitTitle(tv(service.title), short)}
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
      {/* The clip, behind the title: it fills the slide and covers it, so it
          reads as the surface the words are set on rather than a picture beside
          them. It is played through the map (see MEDIA_MAP) and blends against
          whatever the strip is actually standing on rather than a stand-in
          painted to match it (the carousel leaves its resting slide free of a
          stacking context for exactly this — and so does the wrapper here: it
          carries no opacity, z-index or transform of its own).
          Where the nav has taken the room for a title (clipOnly), the clip is
          the only thing in the strip: there it keeps a box of its own, contained
          rather than cropped and at full strength, since it is the subject and
          not a backdrop to anything. */}
      {media ? (
        clipOnly ? (
          <div
            aria-hidden
            className="h-8 w-14 shrink-0 overflow-hidden sm:h-12 sm:w-[5.25rem]"
          >
            <ServiceClip
              index={index}
              media={media}
              ready={ready}
              thumbRef={thumbRef}
              onReady={() => setReady(true)}
              className="h-full max-h-full w-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            {/* A quarter larger than the box it fills and turned off square, so
                the tilt still covers the corners it would otherwise open up.
                Both the size and the turn ride on the clip itself, never on the
                wrapper — a transform makes a stacking context, and the blend
                needs the wrapper not to (see BACKDROP_OPACITY). */}
            <ServiceClip
              index={index}
              media={media}
              ready={ready}
              thumbRef={thumbRef}
              onReady={() => setReady(true)}
              // max-w-none: preflight caps media at max-width:100%, which would
              // clamp the extra quarter back to the box's own width.
              className="absolute -left-[12.5%] -top-[12.5%] h-[125%] w-[125%] max-w-none rotate-[-15deg] object-cover"
              style={{ opacity: BACKDROP_OPACITY }}
            />
          </div>
        )
      ) : null}
    </div>
  );
}
