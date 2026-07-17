"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { NavItem, Social } from "@/content/site";
import NavLinks from "./NavLinks";
import SocialIcons from "@/components/ui/SocialIcons";
import Button from "@/components/ui/Button";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import EditableText from "@/components/admin/editable/EditableText";
import { useT } from "@/components/i18n/LocaleProvider";

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

export default function DesktopNav({
  nav,
  socials,
  tagline,
  editMode,
}: {
  nav: NavItem[];
  socials: Social[];
  tagline: string;
  editMode: boolean;
}) {
  const t = useT();
  const active = !editMode;
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [rawStage, setStage] = useState(0);
  // The cluster's natural width the last time we rendered each stage. Recorded so
  // re-expansion is decided against the previous stage's *actual* width (which is
  // stable), rather than against the width at which it happened to overflow.
  const neededAt = useRef<number[]>([]);

  useLayoutEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const avail = container.clientWidth;
      const needed = content.offsetWidth;
      setStage((s) => {
        neededAt.current[s] = needed;
        // Not enough room: shed the next stage of width.
        if (needed > avail + 1 && s < MAX_STAGE) return s + 1;
        // Room has returned: undo a stage once the previous (wider) layout fits.
        if (s > 0) {
          const prev = neededAt.current[s - 1];
          if (prev != null && avail >= prev) return s - 1;
        }
        return s;
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(content);
    return () => ro.disconnect();
  }, [active]);

  const stage = active ? rawStage : 0;
  const hideHome = stage >= 1;
  const condenseMore = stage >= 2;

  return (
    <div
      ref={containerRef}
      className="hidden min-w-0 flex-1 items-center justify-end sm:flex"
    >
      <div ref={contentRef} className="flex flex-none items-center gap-8">
        <div className="flex h-16 flex-col items-end justify-between sm:h-24">
          <NavLinks nav={nav} hideHome={hideHome} condenseMore={condenseMore} />
          <div className="flex items-center gap-5">
            <EditableText
              path="site.tagline"
              value={editMode ? tagline : t(tagline)}
              as="span"
              className="font-din text-base tracking-wide text-white/80"
            />
            <SocialIcons socials={socials} iconClassName="h-6 w-6" editPathBase="site.socials" />
          </div>
        </div>

        {/* Connect + language selector always stacked, spread to the column height. */}
        <div className="flex h-16 flex-col items-end justify-between sm:h-24">
          <Button href="/contact-us" className="text-lg">{t("Connect")}</Button>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
