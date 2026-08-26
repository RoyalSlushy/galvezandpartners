"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CaseStudy } from "@/content/caseStudies";
import { useT } from "@/components/i18n/LocaleProvider";
import { resolveImage } from "@/lib/adminClient";
import { focusPosition } from "@/lib/wix";
import { ChevronDownIcon } from "@/components/admin/icons";

/** How long the cursor has to rest on the link before the panel drops. Long
 * enough that sweeping across "Our Work" on the way to another nav item never
 * throws a full-width panel over the page, short enough that someone reaching
 * for it doesn't feel the wait (the well-worn hover-intent range is 150–300ms).
 * Keyboard focus and a click are deliberate, so they skip it. */
const OPEN_DELAY_MS = 200;
/** How long the panel stays open after the cursor leaves, so travelling from
 * the nav link down to the panel across the header doesn't close it. */
const CLOSE_DELAY_MS = 180;
/** Case studies shown in the panel. */
const MAX_CARDS = 4;

/**
 * The "Our Work" nav item as a mega menu: hovering (or focusing) the link drops
 * a full-width panel below the header showing the case studies, each with its
 * opening frame, plus a link through to the full works index. The link itself
 * still navigates, so nothing depends on the panel.
 *
 * The panel is `fixed` under the header rather than absolutely placed inside the
 * nav item, so it can span the viewport regardless of how narrow the nav column
 * is. Nothing in the header establishes a containing block for fixed children
 * (its `isolate` makes a stacking context, not a containing block), so it lands
 * where it should.
 *
 * Both edges are deferred. Opening waits for the cursor to rest on the link, so
 * a sweep across it on the way to another nav item never drops the panel over
 * the page; closing waits too, since crossing the header between the link and
 * the panel would otherwise leave the hover target. Either wait is cancelled by
 * the cursor arriving in the other half.
 */
export default function WorkMegaMenu({
  href,
  label,
  studies,
  linkClassName,
  active,
}: {
  href: string;
  label: string;
  studies: CaseStudy[];
  linkClassName: string;
  active: boolean;
}) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const openTimer = useRef<number | undefined>(undefined);

  /** Open now — for the deliberate ways in (focus, and the cursor arriving in
   * the panel itself while it is still on its way out). */
  const openNow = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openTimer.current);
    setOpen(true);
  }, []);
  /** Open only if the cursor is still here once the delay is up. */
  const scheduleOpen = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  }, []);
  const scheduleClose = useCallback(() => {
    // A pending open is abandoned outright: leaving before the delay is up is
    // exactly the pass-through this guards against.
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, []);
  useEffect(
    () => () => {
      window.clearTimeout(closeTimer.current);
      window.clearTimeout(openTimer.current);
    },
    [],
  );

  // Any route change closes it — following a card shouldn't leave it hanging.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const cards = studies.filter((s) => s?.slug).slice(0, MAX_CARDS);

  return (
    <li
      className="relative"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        onFocus={openNow}
        className={`${linkClassName} inline-flex items-center gap-1`}
      >
        {label}
        {cards.length > 0 && (
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        )}
      </Link>

      {cards.length > 0 && (
        <div
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
          className={`fixed inset-x-0 top-[var(--header-h)] z-40 hidden border-y border-white/10 bg-navy-soft/95 shadow-2xl backdrop-blur transition duration-200 sm:block ${
            open
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0"
          }`}
        >
          <div className="mx-auto flex max-w-site flex-col gap-6 px-8 py-8">
            <div className="flex items-baseline justify-between gap-6">
              <p className="font-din text-[11px] uppercase tracking-[0.3em] text-gold">
                {t("Stories We've Told.")}
              </p>
              <Link
                href={href}
                className="font-din text-[11px] uppercase tracking-[0.2em] text-white/60 transition hover:text-gold"
              >
                {t("See All Works")} ↗
              </Link>
            </div>

            <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {cards.map((study) => {
                const cover = study.gallery?.find(Boolean) ?? "";
                return (
                  <li key={study.slug}>
                    <Link
                      href={`/case-study/${study.slug}`}
                      className="group block"
                      tabIndex={open ? 0 : -1}
                    >
                      <div className="relative overflow-hidden border-b-2 border-gold/70 bg-navy">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveImage(cover, 480, 320)}
                          alt=""
                          loading="lazy"
                          style={{ objectPosition: focusPosition(cover) }}
                          className="aspect-[3/2] w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                      <p className="mt-3 font-heading text-base leading-tight text-white transition group-hover:text-gold">
                        {study.title}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}
