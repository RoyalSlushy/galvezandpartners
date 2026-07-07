"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/content/site";

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
  return (
    <nav aria-label="Site" className={className}>
      <ul className="flex items-center gap-10">
        {nav.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-block font-heading text-lg transition duration-300 hover:text-sky-200 after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-center after:bg-gold after:transition-transform after:duration-300 ${
                  active
                    ? "scale-100 text-white after:scale-x-100"
                    : "scale-90 text-white/90 after:scale-x-0"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
