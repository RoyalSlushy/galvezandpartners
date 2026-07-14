"use client";

import { useEffect, useRef } from "react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Carousel, { useCarouselSlide } from "@/components/ui/Carousel";
import CtaGrid from "@/components/sections/home/CtaGrid";
import type { HeroGradient, Service } from "@/content/home";
import { DEFAULT_HERO_GRADIENT } from "@/content/home";
import { heroGradientCss } from "@/lib/heroGradient";
import { useAdmin, useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { resolveImage } from "@/lib/adminClient";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import ListControls from "@/components/admin/editable/ListControls";
import useFitText from "@/components/ui/useFitText";
import { wixImage } from "@/lib/wix";

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
/** Matches the `sm` breakpoint upward — where the carousel heading is fit to
 * two lines (see HeroServiceSlide). */
const DESKTOP = "(min-width: 751px)";

/**
 * Homepage hero: fills the viewport below the header. On mobile everything —
 * image, CTA pill, services carousel and the skyline footer — is sized to fit
 * within one viewport height; type that would overflow is shrunk to fit (the
 * hero heading and sub each collapse onto a single line). Desktop keeps the
 * original grid + "Ready?" CTA card.
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
  // Admins edit the English source, so translation is suppressed in edit mode.
  const tv = (s: string) => (editMode ? s : t(s));

  const slides = services.map((s, i) => (
    <HeroServiceSlide
      key={i}
      service={s}
      index={i}
      count={services.length}
      editMode={editMode}
      tv={tv}
    />
  ));

  return (
    // Pinned to the top of the viewport: the header scrolls away and the
    // sections below scroll up and over the hero, the cityscape skyline rising
    // with them (see page.tsx). On mobile the bottom band (--cityscape-h) is
    // left as bare gradient so the cityscape sits in the initial viewport
    // against it; on desktop (sm+) that padding is dropped so the hero elements
    // get the full height and the cityscape starts just below the fold. The
    // gradient is admin-authored via the mobile header image config's color
    // picker and affects only this section.
    <section
      className="hero-breathe hero-fill sticky top-0 z-0 flex w-full flex-col overflow-hidden pt-0 pb-[var(--cityscape-h)] sm:overflow-visible sm:pb-0"
      style={{ backgroundImage: heroGradientCss(gradient) }}
    >
      <Container className="hero-shell flex min-h-0 flex-1 flex-col">
        <div className="hero-grid min-h-0 flex-1">
          <div className="hero-main relative min-h-0 overflow-hidden rounded-2xl [container-type:inline-size] sm:min-h-[280px]">
            <EditableImage
              path="home.hero.image"
              raw={hero.image}
              src={hero.image.startsWith("http") ? hero.image : wixImage(hero.image, 1280, 800)}
              alt="Galvez & Partners storytelling"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className={`absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent${
                editMode ? " pointer-events-none" : ""
              }`}
            />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-10">
              <FitLine
                path="home.hero.headline"
                value={tv(hero.headline)}
                as="h1"
                max={44}
                min={18}
                className="font-heading leading-none text-white sm:text-[clamp(2rem,4.5cqi,3rem)]"
              />
              <FitLine
                path="home.hero.sub"
                value={tv(hero.sub)}
                as="p"
                max={22}
                min={8}
                className="mt-2 font-body text-white/85 sm:mt-3 sm:text-[clamp(0.95rem,2.6cqi,1.4rem)]"
              />
            </div>
          </div>

          {/* Mobile CTA: a single full-width gold pill between the image and the
              carousel card. Swapped for the "Ready?" card at the sm breakpoint. */}
          <div className="hero-cta sm:hidden">
            <Button
              href={hero.ctaHref}
              variant="gold"
              className="w-full py-3.5 text-xl font-bold normal-case"
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
          </div>

          <div className="hero-carousel hero-card relative flex min-h-0 overflow-hidden rounded-2xl bg-navy-soft py-4 sm:py-10">
            <Carousel slides={slides} ariaLabel="Our services" className="flex w-full flex-col justify-center" />
          </div>

          <div className="hero-cta relative hidden min-h-0 items-center justify-center overflow-hidden rounded-2xl bg-gold p-6 text-center sm:flex">
            <CtaGrid />
            <div className="relative z-10">
              <p className="font-display text-f6 leading-none text-navy">{t("Ready?")}</p>
              <Button href={hero.ctaHref} variant="gold" className="mt-4 border-2 border-navy hover:bg-navy hover:text-gold">
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
            </div>
          </div>
        </div>
      </Container>
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
}: {
  path: string;
  value: string;
  as: "h1" | "p";
  className: string;
  max: number;
  min: number;
}) {
  const { ref } = useFitText<HTMLDivElement>({
    max,
    min,
    singleLine: true,
    query: MOBILE,
    deps: [value],
  });
  return (
    <div ref={ref} className="overflow-hidden">
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
 * One services carousel slide. On mobile the title + body are shrunk together
 * to fit the card's (bounded) height so nothing is clipped or overflows the
 * viewport; on desktop the original type sizes and side-by-side layout apply.
 */
function HeroServiceSlide({
  service,
  index,
  count,
  editMode,
  tv,
}: {
  service: Service;
  index: number;
  count: number;
  editMode: boolean;
  tv: (s: string) => string;
}) {
  const admin = useAdmin();
  const media = service.media ?? "";
  const { ref } = useFitText<HTMLDivElement>({
    max: 19,
    min: 9,
    query: MOBILE,
    deps: [service.title, service.description],
  });
  // Desktop: shrink the heading (only if needed) so it never exceeds two lines
  // in its box — no clamp/ellipsis, so no text is ever hidden.
  const { ref: headingRef } = useFitText<HTMLDivElement>({
    max: 32,
    min: 15,
    query: DESKTOP,
    deps: [service.title],
  });

  // Backdrop video playback state machine:
  //  - idle (default): paused at the start.
  //  - hover: plays on loop; on hover-exit it keeps playing (no snap back to
  //    the start) until the current pass ends, then rests at the start.
  //  - swipe: plays through once, then rests at the start.
  //  - autoscroll / arrows / dots / keyboard / leaving the slide: paused at
  //    the start, immediately (no fade-out grace — the slide is off-stage).
  const { isActive, cause } = useCarouselSlide(index);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnded = () => {
      v.pause();
      v.currentTime = 0;
    };
    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, [media]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = isActive;

    if (!isActive) {
      v.pause();
      v.currentTime = 0;
      v.loop = false;
      return;
    }
    if (!wasActive) {
      v.pause();
      v.currentTime = 0;
      v.loop = false;
      if (cause === "swipe") {
        v.play().catch(() => {});
      }
    }
  }, [isActive, cause]);

  const onBackdropHoverStart = () => {
    const v = videoRef.current;
    if (!v) return;
    v.loop = true;
    v.play().catch(() => {});
  };
  const onBackdropHoverEnd = () => {
    const v = videoRef.current;
    if (!v) return;
    // Stop looping but keep playing — the 'ended' listener above rewinds to
    // the start once the current pass actually finishes.
    v.loop = false;
  };

  return (
    <div
      className="hero-slide relative flex h-full flex-col justify-center px-8 pb-7 pt-2 sm:px-12 sm:py-3"
      onMouseEnter={onBackdropHoverStart}
      onMouseLeave={onBackdropHoverEnd}
    >
      {/* Decorative backdrop slot: a gif / mp4 / svg sitting to the right,
          behind the text, tilted 15° counterclockwise at 10% opacity. The
          filter chain collapses the media to a single gold-family hue
          (grayscale → invert → sepia ≈ the theme's gold at ~35°), turning its
          white background black; the screen blend then drops that black out,
          so white areas vanish and only the artwork glows in the one hue.
          The blend can't reach the real card behind it — the carousel slide
          wrapper's transform isolates this subtree — so the media screens
          against a local stand-in painted in the card's exact color, which
          composites identically. The rotated layer intentionally bleeds past
          the slide's edges — the card container's rounded overflow-hidden
          masks it. */}
      {media ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-[-12%] right-[-6%] z-0 w-[55%] -rotate-[15deg] opacity-10"
        >
          <div className="relative isolate h-full w-full">
            <div className="absolute inset-0 bg-navy-soft" />
            <EditableImage
              path={`home.services.${index}.media`}
              raw={media}
              src={resolveImage(media, 700, 900)}
              alt=""
              className="relative h-full w-full object-cover mix-blend-screen [filter:grayscale(1)_invert(1)_sepia(1)_saturate(5)_hue-rotate(-12deg)]"
              playbackRate={0.75}
              autoPlayVideo={false}
              loopVideo={false}
              videoRef={videoRef}
            />
          </div>
        </div>
      ) : null}
      {editMode && (
        <>
          <ListControls
            listPath="home.services"
            index={index}
            count={count}
            label="service"
            className="right-8 top-2 sm:right-12"
          />
          {/* The backdrop itself is pointer-transparent (it sits behind the
              text), so edit mode gets this chip to open its media picker. */}
          <button
            type="button"
            onClick={() =>
              admin.openImagePicker({ path: `home.services.${index}.media`, raw: media })
            }
            className="absolute left-8 top-2 z-20 rounded-full border border-dashed border-white/30 px-3 py-1 font-heading text-xs text-white/60 transition hover:border-gold/60 hover:text-gold sm:left-12"
          >
            {media ? "backdrop" : "add backdrop"}
          </button>
        </>
      )}
      <div
        ref={ref}
        className="hero-slide-fit relative z-[1] flex min-h-0 flex-1 flex-col justify-center overflow-hidden sm:block sm:overflow-visible"
      >
        {/* On mobile the heading scales with the shared fit (capped so it never
            rivals the hero headline); on desktop it's fit to two lines within
            this box (see .hero-slide-heading in globals.css). */}
        <div ref={headingRef} className="hero-slide-heading">
          <EditableText
            path={`home.services.${index}.title`}
            value={tv(service.title)}
            as="h3"
            className="font-display text-[min(2em,1.55rem)] leading-none text-sky-200 sm:text-[1em] sm:leading-[1.15] sm:text-balance"
          />
        </div>
        <EditableText
          path={`home.services.${index}.description`}
          value={tv(service.description)}
          as="p"
          multiline
          className="hero-slide-body mt-1 max-w-xl whitespace-pre-line font-body text-[0.92em] leading-snug text-white/80 sm:mt-3 sm:text-lg"
        />
      </div>
    </div>
  );
}
