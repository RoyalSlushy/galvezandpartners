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
const EXPAND_BUFFER = 16; // px of extra room required before re-expanding a stage

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
  // Width the container had at the moment each stage overflowed, so we know when
  // there is enough room to undo it.
  const thresholds = useRef<number[]>([]);

  useLayoutEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const avail = container.clientWidth;
      const needed = content.offsetWidth;
      setStage((s) => {
        if (needed > avail + 1 && s < MAX_STAGE) {
          thresholds.current[s] = avail;
          return s + 1;
        }
        if (s > 0) {
          const th = thresholds.current[s - 1];
          if (th != null && avail > th + EXPAND_BUFFER) return s - 1;
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
        <div className="flex h-16 flex-col items-end justify-between sm:h-20">
          <NavLinks nav={nav} hideHome={hideHome} condenseMore={condenseMore} />
          <div className="flex items-center gap-5">
            <EditableText
              path="site.tagline"
              value={editMode ? tagline : t(tagline)}
              as="span"
              className="font-din text-sm tracking-wide text-white/80"
            />
            <SocialIcons socials={socials} iconClassName="h-5 w-5" editPathBase="site.socials" />
          </div>
        </div>

        {/* Connect + language selector always stacked vertically. */}
        <div className="flex flex-col items-end gap-2">
          <Button href="/contact-us">{t("Connect")}</Button>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
