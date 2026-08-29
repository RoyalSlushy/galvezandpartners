"use client";

import { type CSSProperties } from "react";
import Button from "@/components/ui/Button";
import CtaGrid from "@/components/sections/home/CtaGrid";
import type { HeroGradient, Service } from "@/content/home";
import { DEFAULT_HERO_GRADIENT } from "@/content/home";
import { heroGradientCss, heroBottomBandCss } from "@/lib/heroGradient";
import HeroPhotoCards from "@/components/sections/home/HeroPhotoCards";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT, useEditableT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import EditableImage from "@/components/admin/editable/EditableImage";
import useFitText from "@/components/ui/useFitText";
import { wixImage } from "@/lib/wix";
import { useRevealPhase } from "@/components/motion/useRevealPhase";
import { useHeroSlots } from "@/components/layout/HeroSlots";
import HeaderServicesStrip from "@/components/layout/HeaderServicesStrip";

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
 * The services carousel is not part of that column: it stands in the masthead
 * at every width, and every page has it (see HeaderServicesStrip). This page
 * renders it so its clips sit in the hero's own tree; the header renders the
 * same strip on every other page. The film itself is left alone.
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

  // The mobile menu's hamburger comes down into the hero's CTA bar while the
  // hero is on screen (see HeroSlots).
  const { setHeroCta } = useHeroSlots();

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
            className="mt-1 font-body text-white/85 drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)] sm:mt-1 sm:whitespace-normal sm:text-[clamp(0.85rem,1.2vw,1.05rem)]"
          />
        </div>

        {/* The services strip is not here: it lives in the masthead at every
            width (see the portal below). */}

        {/* CTA, minimized to one bar for every viewport: the "Ready?" line and
            its button side by side, with the cta grid still playing behind. */}
        <div
          data-hero-rise
          style={{ ["--d" as string]: `${BEAT.cta}ms` }}
          className="hero-cta relative flex shrink-0 items-center justify-between gap-4 overflow-hidden bg-gold px-4 py-4 sm:justify-center sm:px-6 sm:py-5"
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

      {/* The strip in the masthead, at every width (see HeaderServicesStrip).
          The hero renders it on this page so its clips sit in the hero's own
          tree; every other page's header renders the same strip itself. */}
      <HeaderServicesStrip services={services} />
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
