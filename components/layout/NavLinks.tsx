"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/content/site";
import { useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import EditableText from "@/components/admin/editable/EditableText";
import ListControls from "@/components/admin/editable/ListControls";

/**
 * Desktop nav with an active-page gold underline. The underline is a pseudo-
 * element that scales in from its center (transform-only, so the 2px stroke
 * weight stays constant); the active link sits at full size while inactive
 * links shrink slightly. All three transition together when the route changes.
 */
export default function NavLinks({
  nav,
  className = "",
}: {
  nav: NavItem[];
  className?: string;
}) {
  const pathname = usePathname();
  const editMode = useEditMode();
  const t = useT();
  return (
    <nav aria-label="Site" className={className}>
      <ul className="flex items-center gap-10">
        {nav.map((item, i) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={i} className={editMode ? "relative" : undefined}>
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
                aria-current={active ? "page" : undefined}
                className={`relative inline-block font-heading text-lg transition duration-300 hover:text-sky-200 after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-center after:bg-gold after:transition-transform after:duration-300 ${
                  active
                    ? "scale-100 text-white after:scale-x-100"
                    : "scale-90 text-white/90 after:scale-x-0"
                }`}
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
          );
        })}
      </ul>
    </nav>
  );
}
