"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { NavItem, Social } from "@/content/site";
import type { CaseStudy } from "@/content/caseStudies";
import NavLinks from "./NavLinks";
import SocialIcons from "@/components/ui/SocialIcons";
import Button from "@/components/ui/Button";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import MotionSwitcher from "@/components/motion/MotionSwitcher";
import EditableText from "@/components/admin/editable/EditableText";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useHeroSlots } from "@/components/layout/HeroSlots";

/**
 * Desktop header cluster (nav + tagline/socials + language + Connect) that keeps
 * everything on one line, shedding width in stages as the header narrows:
 *
 *   stage 1 — hide the "Home" link
 *   stage 2 — fold "Our Team" + "Our Partners" into a "More" dropdown
 *
 * The Connect button and language selector are always stacked vertically. The
 * stage is chosen by measuring the cluster's natural width against the available
 * space and stepping up while it overflows / back down (with a little hysteresis)
 * as room returns. Collapsing is disabled in edit mode so admins see and can edit
 * every link.
 */
const MAX_STAGE = 2;
/** The widest the services strip may ever be in the header row. */
const STRIP_CAP = 480; // 30rem — the longest title beside its clip, on one line

export default function DesktopNav({
  nav,
  socials,
  tagline,
  editMode,
  caseStudies,
}: {
  nav: NavItem[];
  socials: Social[];
  tagline: string;
  editMode: boolean;
  caseStudies: CaseStudy[];
}) {
  const { t, locale } = useLocale();
  const { setHeaderTagline } = useHeroSlots();
  const active = !editMode;
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [rawStage, setStage] = useState(0);
  // How wide the strip's socket may be: the room actually left in the row once
  // everything else has been laid out, capped at STRIP_CAP. The nav cluster
  // sizes to its content, so without this the strip would push the cluster left
  // until it ran into the logo.
  const [stripMax, setStripMax] = useState(STRIP_CAP);
  const socketRef = useRef<HTMLDivElement | null>(null);
  // The nav's left column and, inside it, the row the strip shares with the
  // social icons — the two the cap is worked out from.
  const columnRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const setSocket = (el: HTMLDivElement | null) => {
    socketRef.current = el;
    setHeaderTagline(el);
  };
  // The cluster's natural width the last time we rendered each stage. Recorded so
  // re-expansion is decided against the previous stage's *actual* width (which is
  // stable), rather than against the width at which it happened to overflow.
  const neededAt = useRef<number[]>([]);

  useLayoutEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    // The recorded stage widths are language-specific (a stage is wider in
    // Spanish than English, etc.), so drop them whenever the locale changes —
    // otherwise a switch to shorter copy leaves stale, too-large widths that
    // keep the nav collapsed even though the links would now fit again.
    neededAt.current = [];

    const measure = () => {
      const avail = container.clientWidth;
      const needed = content.offsetWidth;

      // How wide the strip may be, worked out rather than probed for, so it
      // settles in one pass: what it is now, plus the row's spare width (the
      // room its own column has over this row), plus whatever the cluster as a
      // whole has left beside the logo — negative when it is already over, in
      // which case this takes the overflow back off the strip.
      const socket = socketRef.current;
      const column = columnRef.current;
      const row = rowRef.current;
      if (socket && column && row) {
        const headroom = column.offsetWidth - row.offsetWidth;
        const allowed = socket.offsetWidth + headroom + (avail - needed);
        setStripMax(Math.max(0, Math.min(STRIP_CAP, allowed)));
      }

      setStage((s) => {
        neededAt.current[s] = needed;
        // Not enough room: shed the next stage of width.
        if (needed > avail + 1 && s < MAX_STAGE) return s + 1;
        // Room has returned: undo a stage once the previous (wider) layout fits.
        // When that stage's width is unknown (e.g. right after a locale change
        // cleared the cache) step down optimistically and re-measure — if it
        // overflows the next pass collapses again with a fresh width recorded.
        if (s > 0) {
          const prev = neededAt.current[s - 1];
          if (prev == null || avail >= prev) return s - 1;
        }
        return s;
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(content);
    // The strip's own width changes as it sheds words and titles, which changes
    // what the row has spare — so watch it too.
    if (socketRef.current) ro.observe(socketRef.current);
    return () => ro.disconnect();
  }, [active, locale]);

  const stage = active ? rawStage : 0;
  const hideHome = stage >= 1;
  const condenseMore = stage >= 2;

  return (
    <div
      ref={containerRef}
      className="hidden min-w-0 flex-1 items-center justify-end sm:flex"
    >
      <div ref={contentRef} className="flex flex-none items-center gap-8">
        <div ref={columnRef} className="flex h-16 flex-col items-end justify-between sm:h-24">
          <NavLinks
            nav={nav}
            hideHome={hideHome}
            condenseMore={condenseMore}
            caseStudies={caseStudies}
          />
          <div ref={rowRef} className="flex min-w-0 items-center gap-5">
            {/* The tagline is off for visitors — the homepage hero portals its
                services strip into this spot instead (see HeroSlots). It stays
                in edit mode so the field is still editable in place, and it is
                the fallback wherever there is no hero to fill the socket. */}
            {editMode && (
              <EditableText
                path="site.tagline"
                value={tagline}
                as="span"
                className="font-din text-base tracking-wide text-white/80"
              />
            )}
            {/* The strip's socket. Its height clears the strip's own — a title
                may run to two lines — so nothing of the strip, its clip least of
                all, is cut off by this box. Sized by its own content so it hugs the
                social icons, and capped at the room actually left beside the
                logo (see stripMax) so it can never grow into it — the strip
                itself sheds a title's words, then the title, as that room runs
                out (see HomeHero). */}
            <div
              ref={setSocket}
              style={{ maxWidth: `${stripMax}px` }}
              className="flex h-14 items-center overflow-hidden empty:hidden"
            />
            <SocialIcons socials={socials} iconClassName="h-6 w-6" editPathBase="site.socials" />
          </div>
        </div>

        {/* Connect + the two "how would you like to be shown this" settings,
            spread to the column height. */}
        <div className="flex h-16 flex-col items-end justify-between sm:h-24">
          <Button href="/contact-us" className="text-lg">{t("Connect")}</Button>
          <div className="flex items-center gap-5">
            <MotionSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
