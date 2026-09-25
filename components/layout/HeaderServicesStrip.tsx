"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Carousel, { CarouselContext } from "@/components/ui/Carousel";
import type { Service } from "@/content/home";
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
import { useMinWidth } from "@/components/ui/useMinWidth";
import { useMotionOff } from "@/components/motion/MotionProvider";
import { useHeroSlots } from "@/components/layout/HeroSlots";

/** Where the strip goes when it is clicked — the works index it is advertising. */
const WORKS_HREF = "/our-works";

/** Fit the type to a single line below the `sm` breakpoint (see useFitText). */
const MOBILE = "(max-width: 750px)";
/** Matches the `sm` breakpoint upward — where the title is fit to two lines. */
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
 * box instead of the masthead it is standing on. The same goes for the arrival
 * below: the drift is a transform, and a transform makes a stacking context too,
 * so it rides on the clip as well.
 */
const BACKDROP_OPACITY = 0.2;

/**
 * How the clip arrives when its service comes up. The slides themselves cut
 * (see Carousel) — fading them would dip the light between two services and,
 * for the length of the fade, cut the arriving clip's blend off from the
 * surface it stands on. So the clip does the moving instead: it drifts and
 * settles under its title, on its own transform, while the title is simply
 * there. Opacity is left out of it — the clip rests at BACKDROP_OPACITY whether
 * its slide is up or not, so it is painted and decoding either way (see
 * ServiceClip).
 */
const ARRIVAL = "transition-transform duration-700 ease-out";
const ARRIVED = "translate-x-0 scale-100";
const ARRIVING = "translate-x-[6%] scale-[1.06]";

/**
 * Shortened forms for the service titles, used only where the strip is standing
 * in the masthead with the nav crowding it (see `short` below). Whole words,
 * matched case-insensitively and replaced in the title's own case, so a
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
 * The services carousel as it lives in the masthead — the same strip on every
 * page. It is portalled into one of two sockets (see HeroSlots): the desktop
 * header's tagline spot, bare; or, below `sm`, the mobile header's right-hand
 * cell beside the logo. Rendered by whoever owns the masthead on that page —
 * the homepage hero (so its clips keep the hero's context) and the header
 * everywhere else — never both, or the two would land in the same socket.
 *
 * It gives way by degrees as the window narrows rather than in one jump, and
 * never leaves the masthead: full titles, then shortened ones once the nav
 * starts crowding it (see fitTitle), then the clip alone. Below sm it moves to
 * the header cell beside the logo, where the titles come back and the clip
 * rides under one rather than beside it — the cell is too narrow to hold the
 * two side by side, but it holds them stacked.
 */
export default function HeaderServicesStrip({
  services: serverServices,
}: {
  services: Service[];
}) {
  const services = useCmsValue("home.services", serverServices);
  const editMode = useEditMode();
  const t = useT();
  const tv = useEditableT();

  // Playback is hover-only: hovering a title loops that service's clip; on
  // hover-exit it keeps playing (no snap back mid-frame) until the current pass
  // ends, then rests paused at the start — see the 'ended' handler below.
  // Pull a service's clip down before its slide is on screen. Videos are
  // mounted for every slide, so this is only about the ones a browser has left
  // unfetched; an image source is already on its way by the time it is mounted.
  const preload = useCallback((index: number) => {
    const v = clipRefs.current[index];
    if (v && v.readyState < 2) v.load();
  }, []);
  const clipRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const videosFor = (index: number) =>
    [clipRefs.current[index]].filter(Boolean) as HTMLVideoElement[];

  useEffect(() => {
    const videos = clipRefs.current.filter(Boolean) as HTMLVideoElement[];
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

  const { headerMedia, headerTagline } = useHeroSlots();
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
    <ServiceSlide
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
      clipRef={(el) => {
        clipRefs.current[i] = el;
      }}
    />
  ));

  if (!stripSocket) return null;
  return createPortal(
    <StripShell
      className={
        desktop
          ? // Sized by its own content and flushed right, so whichever title is
            // showing ends against the social icons — which it must not run
            // over, so this one keeps its bounds.
            "hero-strip-flush items-center overflow-hidden px-4"
          : // No panel of its own and no rule down its edge: the strip stands on
            // the masthead itself, so the clip blends against it rather than a
            // tint over it, and runs past the cell toward the logo rather than
            // stopping at a border.
            "h-full flex-1 items-stretch"
      }
      ariaLabel={t("Our services")}
      editMode={editMode}
      slides={slides}
    />,
    stripSocket,
  );
}

/**
 * The strip's shell: the carousel, wrapped so that clicking anywhere on it goes
 * through to the works index — the titles are what it is advertising, so the
 * whole strip is the link rather than each title separately. A drag is not a
 * click: the carousel takes swipes, so a press that travels is let through to it
 * and the navigation suppressed. Edit mode gets a plain box instead, where a
 * click has to land on the text it is editing.
 */
function StripShell({
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
  // Whether the strip keeps its clip inside its own bounds is the caller's to
  // say (see the two socket classes): the masthead cell lets it run out, the
  // tagline spot does not.
  const shell = `relative flex min-w-0 ${className}`;

  if (editMode) {
    return <div className={shell}>{carousel}</div>;
  }

  return (
    <Link
      href={WORKS_HREF}
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
 * One service in the strip: its title, sitting on the bottom edge of the slide,
 * with the service's clip standing behind it.
 */
function ServiceSlide({
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
  clipRef,
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
  /** Called when this slide becomes the one up next, so its clip can be fetched
   * before it is on screen. */
  onPreload: () => void;
  /** The clip's <video>, so the parent can play and preload it on hover. */
  clipRef: (el: HTMLVideoElement | null) => void;
}) {
  const admin = useAdmin();
  const media = service.media ?? "";
  // The slide the carousel will land on next fetches its clip now, so it is
  // decoded, mapped and blended by the time it arrives rather than fading in
  // once it is already on screen.
  const { current } = useContext(CarouselContext);
  const isActive = index === current;
  const isNext = count > 1 && index === (current + 1) % count;
  // Through a ref so a fresh callback identity on every render doesn't re-fire
  // the fetch — only actually becoming the next slide should.
  const preloadRef = useRef(onPreload);
  preloadRef.current = onPreload;
  useEffect(() => {
    if (isNext && media) preloadRef.current();
  }, [isNext, media]);
  // Held on the white-out blend until the clip has a frame: blended, a
  // half-loaded one is not a faint version of itself but a raw box of the map
  // applied to nothing (see ServiceClip).
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
              active={isActive}
              clipRef={clipRef}
              onReady={() => setReady(true)}
              className="h-full max-h-full w-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div
            aria-hidden
            // Unclipped: the oversized, tilted clip is meant to run past the
            // slide it backs (the masthead cell it sits in lets it out — the
            // tagline spot still holds it in).
            className="pointer-events-none absolute inset-0"
          >
            {/* A quarter larger than the box it fills and turned off square, so
                the tilt still covers the corners it would otherwise open up.
                Both the size and the turn ride on the clip itself, never on the
                wrapper — a transform makes a stacking context, and the blend
                needs the wrapper not to (see BACKDROP_OPACITY).
                max-w-none: preflight caps media at max-width:100%, which would
                clamp the extra quarter back to the box's own width. */}
            <ServiceClip
              index={index}
              media={media}
              ready={ready}
              active={isActive}
              clipRef={clipRef}
              onReady={() => setReady(true)}
              className="absolute -left-[12.5%] -top-[12.5%] h-[125%] w-[125%] max-w-none rotate-[-15deg] object-cover"
              style={{ opacity: BACKDROP_OPACITY }}
            />
          </div>
        )
      ) : null}
    </div>
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
 *
 * When its service comes up it drifts into place (see ARRIVAL), on its own
 * transform so the blend survives the move. With motion off it is simply there.
 */
function ServiceClip({
  index,
  media,
  ready,
  active,
  className,
  style,
  clipRef,
  onReady,
}: {
  index: number;
  media: string;
  /** Whether the clip has a frame to paint (see the note above). */
  ready: boolean;
  /** Whether this clip's service is the one the strip is showing. */
  active: boolean;
  className: string;
  style?: React.CSSProperties;
  clipRef: (el: HTMLVideoElement | null) => void;
  onReady: () => void;
}) {
  const motionOff = useMotionOff();
  const arrival = motionOff ? "" : `${ARRIVAL} ${active ? ARRIVED : ARRIVING}`;
  return (
    <EditableImage
      path={`home.services.${index}.media`}
      raw={media}
      src={resolveImage(media, 240, 160)}
      alt=""
      className={`${ready ? "mix-blend-screen" : "mix-blend-multiply"} ${MEDIA_MAP} ${arrival} ${className}`}
      style={style}
      playbackRate={0.75}
      autoPlayVideo={false}
      loopVideo={false}
      videoRef={clipRef}
      onReady={onReady}
    />
  );
}
