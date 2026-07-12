"use client";

import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Carousel from "@/components/ui/Carousel";
import CtaGrid from "@/components/sections/home/CtaGrid";
import type { Service } from "@/content/home";
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
};

/** Fit the type to a single line below the `sm` breakpoint (see useFitText). */
const MOBILE = "(max-width: 750px)";

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
    <section className="hero-breathe hero-fill flex w-full flex-col overflow-hidden bg-gradient-to-b from-navy via-navy to-blue-muted/50 pb-0 pt-0 sm:overflow-visible sm:pb-4">
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

      <HeroSkyline />
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
  return (
    <div className="hero-slide relative flex h-full flex-col justify-center px-8 pb-7 pt-2 sm:px-12 sm:py-3">
      {/* Decorative backdrop slot: a gif / mp4 / svg sitting to the right,
          behind the text, tilted 15° counterclockwise at 20% opacity. The
          filter chain collapses the media to a single gold-family hue
          (grayscale → invert → sepia ≈ the theme's gold at ~35°), turning its
          white background black; the screen blend on this layer then drops
          that black out against the card, so white areas vanish and only the
          artwork glows in the one hue. The rotated layer intentionally bleeds
          past the slide's edges — the card container's rounded
          overflow-hidden masks it. */}
      {media ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-[-12%] right-[-6%] z-0 w-[55%] -rotate-[15deg] opacity-20 mix-blend-screen"
        >
          <EditableImage
            path={`home.services.${index}.media`}
            raw={media}
            src={resolveImage(media, 700, 900)}
            alt=""
            className="h-full w-full object-cover [filter:grayscale(1)_invert(1)_sepia(1)_saturate(1.75)]"
          />
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
        <EditableText
          path={`home.services.${index}.title`}
          value={tv(service.title)}
          as="h3"
          className="font-display text-[2em] leading-none text-sky-200 sm:text-[2.025rem]"
        />
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

/**
 * Mobile-only hero footer: a downtown skyline silhouette (two depth layers)
 * over a warm sunset glow, bleeding to the full viewport width and sitting
 * flush with the bottom of the hero.
 */
function HeroSkyline() {
  return (
    <div aria-hidden className="relative shrink-0 sm:hidden">
      {/* Sunset glow the buildings sit against — ramps up into a bright cream
          horizon behind the rooftops. */}
      <div className="absolute inset-x-0 bottom-0 h-full bg-[linear-gradient(to_bottom,transparent_0%,rgba(243,216,176,0.18)_38%,rgba(248,232,198,0.75)_70%,#fdf2d6_100%)]" />
      <svg
        viewBox="0 0 800 150"
        preserveAspectRatio="xMidYMax meet"
        className="relative block w-full"
      >
        {/* Back row: taller, hazier towers. */}
        <g fill="#4d608a" opacity="0.7">
          <rect x="20" y="55" width="34" height="95" />
          <rect x="95" y="30" width="28" height="120" />
          <rect x="107" y="12" width="3" height="18" />
          <rect x="165" y="62" width="40" height="88" />
          <rect x="270" y="25" width="30" height="125" />
          <rect x="283" y="8" width="3" height="17" />
          <rect x="350" y="52" width="36" height="98" />
          <rect x="455" y="38" width="30" height="112" />
          <rect x="530" y="60" width="42" height="90" />
          <rect x="635" y="30" width="32" height="120" />
          <rect x="649" y="12" width="3" height="18" />
          <rect x="720" y="64" width="40" height="86" />
        </g>
        {/* Front row: shorter, darker buildings with sunset gaps between them. */}
        <g fill="#2c3550">
          <rect x="0" y="92" width="52" height="58" />
          <rect x="68" y="78" width="48" height="72" />
          <rect x="135" y="100" width="52" height="50" />
          <rect x="205" y="84" width="46" height="66" />
          <rect x="280" y="104" width="58" height="46" />
          <rect x="360" y="88" width="50" height="62" />
          <rect x="440" y="74" width="44" height="76" />
          <rect x="505" y="100" width="54" height="50" />
          <rect x="580" y="84" width="48" height="66" />
          <rect x="648" y="104" width="54" height="46" />
          <rect x="715" y="80" width="40" height="70" />
          <rect x="770" y="100" width="30" height="50" />
        </g>
      </svg>
    </div>
  );
}
