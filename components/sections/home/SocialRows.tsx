"use client";

import type { Social } from "@/content/site";
import { SOCIAL_PATHS } from "@/components/ui/SocialIcons";
import { useCmsValue, useEditMode } from "@/components/admin/AdminProvider";
import { useT } from "@/components/i18n/LocaleProvider";

/**
 * The account's name as it reads on that network, taken from the profile URL:
 * the first path segment that is not a network's own routing word
 * ("company", "posts" …), with an @ in front unless it already has one.
 * Falls back to the host when there is no path to go on.
 */
function handleFor(href: string): string {
  try {
    const url = new URL(href);
    const skip = new Set(["company", "in", "pages", "posts", "user", "channel", "c"]);
    const seg = url.pathname.split("/").filter((p) => p && !skip.has(p.toLowerCase()))[0];
    if (!seg) return url.host.replace(/^www\./, "");
    return seg.startsWith("@") ? seg : `@${seg}`;
  } catch {
    return href;
  }
}

/**
 * The rest of the site's social links, as rows under the Instagram section's
 * Follow button: each network's mark, its name and the account's handle, with
 * an arrow that leans in on hover. Instagram is left out — the section above
 * is already its. The list is the site-wide one (site.socials), so a link
 * edited in the header or footer changes here too; it is edited there, not
 * here.
 */
export default function SocialRows({ socials: serverSocials }: { socials: Social[] }) {
  const socials = useCmsValue("site.socials", serverSocials);
  const editMode = useEditMode();
  const t = useT();
  const rows = (socials ?? []).filter((s) => s?.href && s.icon !== "instagram");
  if (rows.length === 0) return null;

  return (
    <div className="mx-auto mt-10 w-full max-w-xl">
      <p className="text-center font-heading text-[11px] uppercase tracking-[0.2em] text-white/40">
        {t("Or find us on")}
      </p>
      <ul className="mt-4 border-t border-white/10">
        {rows.map((s, i) => (
          <li key={i} className="border-b border-white/10">
            <a
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`${s.label} — ${handleFor(s.href)}`}
              tabIndex={editMode ? -1 : undefined}
              className={`group flex items-center gap-4 px-2 py-4 transition-colors duration-300 hover:bg-white/[0.03] focus-visible:bg-white/[0.03] focus-visible:outline-none ${
                editMode ? "pointer-events-none" : ""
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/15 text-white/70 transition-colors duration-300 group-hover:border-gold/60 group-hover:text-gold group-focus-visible:border-gold/60 group-focus-visible:text-gold">
                <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
                  <path d={SOCIAL_PATHS[s.icon]} />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-sm uppercase tracking-[0.14em] text-white">
                  {s.label}
                </span>
                <span className="block truncate font-body text-sm text-white/50">
                  {handleFor(s.href)}
                </span>
              </span>
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 text-white/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold group-focus-visible:translate-x-1 group-focus-visible:text-gold"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
