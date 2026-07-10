"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NavItem } from "@/content/site";
import { useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import ListControls from "@/components/admin/editable/ListControls";

/** The two links that collapse into the "More" dropdown when space is tight. */
const MORE_HREFS = ["/our-team", "/our-partners"];

/** Shared link styling: an active-page gold underline that scales in from its
 * center (transform-only, so the 2px stroke weight stays constant); the active
 * link sits at full size while inactive links shrink slightly. */
function linkClass(active: boolean) {
  return `relative inline-block font-heading text-[1.35rem] transition duration-300 hover:text-sky-200 after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-center after:bg-gold after:transition-transform after:duration-300 ${
    active
      ? "scale-100 text-white after:scale-x-100"
      : "scale-90 text-white/90 after:scale-x-0"
  }`;
}

/**
 * Desktop nav. The parent (DesktopNav) measures the header and asks this list to
 * shed width in stages: `hideHome` drops the Home link, and `condenseMore` folds
 * "Our Team" and "Our Partners" into a hover "More" dropdown. Both are always
 * false in edit mode, so admins keep every link inline and editable.
 */
export default function NavLinks({
  nav,
  className = "",
  hideHome = false,
  condenseMore = false,
}: {
  nav: NavItem[];
  className?: string;
  hideHome?: boolean;
  condenseMore?: boolean;
}) {
  const pathname = usePathname();
  const editMode = useEditMode();
  const t = useT();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Keep the original index alongside each item so edit controls stay wired to
  // the right `site.nav.*` path even after items are filtered out.
  const indexed = nav.map((item, i) => ({ item, i }));
  const moreItems = condenseMore
    ? indexed.filter(({ item }) => MORE_HREFS.includes(item.href))
    : [];
  let mainItems = condenseMore
    ? indexed.filter(({ item }) => !MORE_HREFS.includes(item.href))
    : indexed;
  if (hideHome) mainItems = mainItems.filter(({ item }) => item.href !== "/");

  return (
    <nav aria-label="Site" className={className}>
      <ul className="flex items-center gap-10">
        {mainItems.map(({ item, i }) => (
          <li key={item.href} className={editMode ? "relative" : undefined}>
            {editMode && (
              <ListControls
                listPath="site.nav"
                index={i}
                count={nav.length}
                label="menu link"
                className="-top-8 left-1/2 -translate-x-1/2"
              />
            )}
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={linkClass(isActive(item.href))}
            >
              {editMode ? (
                <EditableText
                  path={`site.nav.${i}.label`}
                  value={item.label}
                  link={{ path: `site.nav.${i}.href`, value: item.href }}
                />
              ) : (
                t(item.label)
              )}
            </Link>
          </li>
        ))}

        {moreItems.length > 0 && (
          <MoreMenu items={moreItems.map(({ item }) => item)} active={moreItems.some(({ item }) => isActive(item.href))} />
        )}
      </ul>
    </nav>
  );
}

/**
 * The "More" nav item: a trigger that reveals a small dropdown of the collapsed
 * links on hover or keyboard focus. It reads as active when the current route is
 * one of its items.
 */
function MoreMenu({ items, active }: { items: NavItem[]; active: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <li
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        className={`${linkClass(active)} cursor-default`}
      >
        {t("More")}
      </button>
      <div
        role="menu"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        className={`absolute right-0 top-full z-50 mt-3 min-w-[11rem] overflow-hidden rounded-xl border border-white/10 bg-navy-soft shadow-xl transition ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        {items.map((item) => {
          const itemActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              aria-current={itemActive ? "page" : undefined}
              className={`block px-4 py-2.5 font-heading text-base tracking-wide transition hover:bg-white/5 ${
                itemActive ? "text-gold-bright" : "text-white/85"
              }`}
            >
              {t(item.label)}
            </Link>
          );
        })}
      </div>
    </li>
  );
}
