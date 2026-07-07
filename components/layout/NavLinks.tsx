"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/content/site";

/** Desktop nav with an active-page gold underline. */
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
                className={`font-heading text-lg transition hover:text-gold ${
                  active
                    ? "text-white [text-decoration:underline_2px_#e6b367] underline-offset-8"
                    : "text-white/90"
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
